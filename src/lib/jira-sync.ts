import axios from "axios";
import { supabase } from "./supabase";

interface JiraTicket {
  key: string;
  fields: {
    summary: string;
    status: { name: string; statusCategory: { key: string } };
    reporter: { accountId: string; displayName: string };
    assignee?: { accountId: string; displayName: string };
    customfield_10312?: { accountId: string; displayName: string }; // Assigned Dev
    customfield_10016?: number; // Sprint points field
    created: string;
    resolutiondate?: string;
    priority: { name: string };
    issuetype: { name: string };
  };
}

export class JiraSyncService {
  private domain: string;
  private auth: string;

  constructor() {
    this.domain = process.env.JIRA_DOMAIN!;
    const email = process.env.JIRA_EMAIL!;
    const token = process.env.JIRA_API_TOKEN!;
    this.auth = Buffer.from(`${email}:${token}`).toString("base64");
  }

  async syncBugathonData() {
    try {
      console.log("syncBugathonData");
      // Fetch tickets from Jira
      const tickets = await this.fetchJiraTickets();

      // Process and store in Supabase
      await this.processTickets(tickets);

      // Update user scores
      await this.updateUserScores();

      // Update daily stats
      await this.updateDailyStats();

      // Check for new achievements
      await this.checkAchievements();

      return { success: true, ticketsProcessed: tickets.length };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error("Sync failed because of axios:", {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          config: {
            method: error.config?.method,
            url: error.config?.url,
            headers: error.config?.headers,
          },
          code: error.code,
        });
      } else {
        console.error("Sync failed:", JSON.stringify(error, null, 2));
        console.error(JSON.stringify(error.response));
      }

      return { success: false, error };
    }
  }

  private async fetchJiraTickets(): Promise<JiraTicket[]> {
    const url = `https://${this.domain}.atlassian.net/rest/api/3/search/jql`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${this.auth}`,
        Accept: "application/json",
      },
      params: {
        jql: 'labels = "Bugathon"',
        fields:
          "key,summary,status,reporter,assignee,customfield_10016,created,resolutiondate,priority,issuetype",
        maxResults: 100,
      },
    });

    return response.data.issues;
  }

  private async processTickets(tickets: JiraTicket[]) {
    const processedTickets = tickets.map((ticket) => {
      const isNewBug = ticket.fields.summary
        .toUpperCase()
        .includes("[BUGATHON NEW]");
      const sprintPoints = ticket.fields.customfield_10016 || 0;
      const isDone = ticket.fields.status.statusCategory.key === "done";

      return {
        key: ticket.key,
        summary: ticket.fields.summary,
        is_new_bug: isNewBug,
        status: ticket.fields.status.name,
        status_category: ticket.fields.status.statusCategory.key,
        reporter_id: ticket.fields.reporter.accountId,
        reporter_name: ticket.fields.reporter.displayName,
        assignee_id: ticket.fields.assignee?.accountId || null,
        assignee_name: ticket.fields.assignee?.displayName || "Unassigned",
        sprint_points: sprintPoints,
        reporter_points: isNewBug ? sprintPoints * 0.5 : 0,
        assignee_points: isDone ? sprintPoints : 0,
        created_at: ticket.fields.created,
        resolved_at: ticket.fields.resolutiondate || null,
        priority: ticket.fields.priority.name,
        issue_type: ticket.fields.issuetype.name,
        last_updated: new Date().toISOString(),
      };
    });

    // Upsert tickets to Supabase
    const { error } = await supabase
      .from("bugathon_tickets")
      .upsert(processedTickets, { onConflict: "key" });

    if (error) throw error;
  }

  private async updateUserScores() {
    // Calculate scores from tickets
    const { data: tickets } = await supabase
      .from("bugathon_tickets")
      .select("*");

    if (!tickets) return;

    const userScores = new Map();

    tickets.forEach((ticket) => {
      // Process reporter points
      if (ticket.is_new_bug && ticket.reporter_name) {
        if (!userScores.has(ticket.reporter_name)) {
          userScores.set(ticket.reporter_name, {
            user_name: ticket.reporter_name,
            bugs_reported: 0,
            bugs_fixed: 0,
            reporter_points: 0,
            assignee_points: 0,
            total_points: 0,
          });
        }
        const user = userScores.get(ticket.reporter_name);
        user.bugs_reported++;
        user.reporter_points += ticket.reporter_points;
      }

      // Process assignee points
      if (
        ticket.status_category === "done" &&
        ticket.assignee_name !== "Unassigned"
      ) {
        if (!userScores.has(ticket.assignee_name)) {
          userScores.set(ticket.assignee_name, {
            user_name: ticket.assignee_name,
            bugs_reported: 0,
            bugs_fixed: 0,
            reporter_points: 0,
            assignee_points: 0,
            total_points: 0,
          });
        }
        const user = userScores.get(ticket.assignee_name);
        user.bugs_fixed++;
        user.assignee_points += ticket.assignee_points;
      }
    });

    // Calculate total points and badges
    const scoresArray = Array.from(userScores.values()).map((user) => {
      user.total_points = user.reporter_points + user.assignee_points;
      user.badges = this.calculateBadges(user);
      user.updated_at = new Date().toISOString();
      return user;
    });

    // Upsert to Supabase
    await supabase
      .from("user_scores")
      .upsert(scoresArray, { onConflict: "user_name" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private calculateBadges(user: any): string[] {
    const badges = [];

    // Bug Hunter badges
    if (user.bugs_reported >= 10) badges.push("🔍 Bug Hunter Elite");
    else if (user.bugs_reported >= 5) badges.push("🔎 Bug Hunter");

    // Bug Slayer badges
    if (user.bugs_fixed >= 10) badges.push("⚔️ Bug Slayer Supreme");
    else if (user.bugs_fixed >= 5) badges.push("🗡️ Bug Slayer");

    // Point badges
    if (user.total_points >= 100) badges.push("👑 Point Master");
    else if (user.total_points >= 50) badges.push("⭐ Rising Star");

    // All-rounder
    if (user.bugs_reported > 0 && user.bugs_fixed > 0) {
      badges.push("🎯 All-Rounder");
    }

    // Speed demon (if fixed bugs quickly)
    if (user.bugs_fixed >= 3) badges.push("🚀 Speed Demon");

    return badges.length > 0 ? badges : ["🌱 Participant"];
  }

  private async updateDailyStats() {
    const today = new Date().toISOString().split("T")[0];

    const { data: todayTickets } = await supabase
      .from("bugathon_tickets")
      .select("*")
      .gte("created_at", today);

    const { data: fixedToday } = await supabase
      .from("bugathon_tickets")
      .select("*")
      .eq("status_category", "done")
      .gte("resolved_at", today);

    const stats = {
      date: today,
      bugs_created: todayTickets?.length || 0,
      bugs_fixed: fixedToday?.length || 0,
      points_earned:
        fixedToday?.reduce((sum, t) => sum + t.assignee_points, 0) || 0,
      active_users: new Set([
        ...(todayTickets?.map((t) => t.reporter_name) || []),
        ...(fixedToday?.map((t) => t.assignee_name) || []),
      ]).size,
    };

    await supabase.from("daily_stats").upsert([stats], { onConflict: "date" });
  }

  private async checkAchievements() {
    // Check for new achievements and create notifications
    const { data: users } = await supabase
      .from("user_scores")
      .select("*")
      .order("total_points", { ascending: false });

    if (!users) return;

    // Check for first place achievement
    if (users[0]) {
      await this.grantAchievement(
        users[0].user_name,
        "🏆 Current Champion",
        "Leading the bugathon!"
      );
    }
  }

  private async grantAchievement(
    userName: string,
    badge: string,
    description: string
  ) {
    // Check if achievement already exists
    const { data: existing } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_name", userName)
      .eq("badge_name", badge)
      .single();

    if (!existing) {
      await supabase.from("achievements").insert([
        {
          user_name: userName,
          badge_name: badge,
          badge_icon: badge.split(" ")[0],
          description,
          earned_at: new Date().toISOString(),
        },
      ]);
    }
  }
}
