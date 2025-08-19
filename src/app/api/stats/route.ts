import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // Get daily stats
  const { data: dailyStats } = await supabase
    .from("daily_stats")
    .select("*")
    .order("date", { ascending: false })
    .limit(7);

  // Get team totals
  const { data: tickets } = await supabase.from("bugathon_tickets").select("*");

  const { data: scores } = await supabase.from("user_scores").select("*");

  const teamStats = {
    totalBugs: tickets?.filter((t) => t.status_category === "done").length || 0,
    totalPoints:
      scores?.reduce((sum, user) => sum + (user.total_points || 0), 0) || 0,
    activeUsers: scores?.length || 0,
    todayFixed: dailyStats?.[0]?.bugs_fixed || 0,
  };

  return NextResponse.json({
    daily: dailyStats || [],
    team: teamStats,
  });
}
