"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Target,
  TrendingUp,
  Users,
  Zap,
  Bug,
  Award,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface LeaderboardEntry {
  user_name: string;
  bugs_reported: number;
  bugs_fixed: number;
  total_points: number;
  badges: string[];
  rank: number;
  current_streak: number;
}

interface DailyStat {
  date: string;
  bugs_created: number;
  bugs_fixed: number;
  points_earned: number;
}

export default function BugathonDashboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [teamStats, setTeamStats] = useState({
    totalBugs: 0,
    totalPoints: 0,
    activeUsers: 0,
    todayFixed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch leaderboard
      const leaderboardRes = await fetch("/api/leaderboard");
      const leaderboardData = await leaderboardRes.json();
      setLeaderboard(leaderboardData);

      // Fetch daily stats
      const statsRes = await fetch("/api/stats");
      const statsData = await statsRes.json();
      setDailyStats(statsData.daily);
      setTeamStats(statsData.team);

      setIsLoading(false);
      setLastSync(new Date());
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setIsLoading(false);
    }
  };

  const syncWithJira = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const result = await res.json();
      if (result.success) {
        await fetchDashboardData();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
    setIsLoading(false);
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return "👑";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-6xl font-bold text-white mb-4 flex items-center justify-center gap-4">
            <Bug className="w-12 h-12 text-yellow-400 animate-bounce" />
            BUGATHON ARENA
            <Bug className="w-12 h-12 text-yellow-400 animate-bounce" />
          </h1>
          <p className="text-xl text-gray-300">
            Squash bugs, earn points, become a legend!
          </p>

          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="bg-red-500/20 px-4 py-2 rounded-full flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white">LIVE TRACKING</span>
            </div>
            <button
              onClick={syncWithJira}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all"
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Sync with Jira
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total Bugs Fixed</p>
                <p className="text-3xl font-bold text-white">
                  {teamStats.totalBugs}
                </p>
              </div>
              <Target className="w-10 h-10 text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Total Points</p>
                <p className="text-3xl font-bold text-white">
                  {teamStats.totalPoints}
                </p>
              </div>
              <Trophy className="w-10 h-10 text-yellow-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Active Hunters</p>
                <p className="text-3xl font-bold text-white">
                  {teamStats.activeUsers}
                </p>
              </div>
              <Users className="w-10 h-10 text-blue-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm">Fixed Today</p>
                <p className="text-3xl font-bold text-white">
                  {teamStats.todayFixed}
                </p>
              </div>
              <Zap className="w-10 h-10 text-orange-400" />
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-400" />
              Leaderboard
            </h2>

            <div className="space-y-3">
              <AnimatePresence>
                {leaderboard.slice(0, 10).map((player, index) => (
                  <motion.div
                    key={player.user_name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`
                      p-4 rounded-lg flex items-center justify-between
                      ${
                        index === 0
                          ? "bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border border-yellow-400/50"
                          : index === 1
                          ? "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/50"
                          : index === 2
                          ? "bg-gradient-to-r from-orange-600/20 to-orange-700/20 border border-orange-500/50"
                          : "bg-white/5 hover:bg-white/10 transition-all"
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-white">
                        {getRankEmoji(player.rank)}
                      </div>
                      <div>
                        <p className="text-white font-semibold">
                          {player.user_name}
                        </p>
                        <div className="flex gap-4 text-sm text-gray-300">
                          <span>🐛 Fixed: {player.bugs_fixed}</span>
                          <span>🔍 Found: {player.bugs_reported}</span>
                        </div>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {player.badges?.slice(0, 3).map((badge, i) => (
                            <span
                              key={i}
                              className="text-xs bg-white/20 px-2 py-1 rounded-full"
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-400">
                        {player.total_points}
                      </p>
                      <p className="text-xs text-gray-400">points</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Charts */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-green-400" />
              Daily Progress
            </h2>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dailyStats}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="date" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="bugs_fixed"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: "#10b981", r: 6 }}
                  name="Bugs Fixed"
                />
                <Line
                  type="monotone"
                  dataKey="bugs_created"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: "#f59e0b", r: 6 }}
                  name="Bugs Reported"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Achievement Notifications */}
        {lastSync && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-4 right-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg shadow-lg"
          >
            <p className="text-sm">
              Last synced: {lastSync.toLocaleTimeString()}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
