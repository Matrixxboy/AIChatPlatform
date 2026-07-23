import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  Lock,
  Shield,
  UserPlus,
  Layers,
  MessageSquare,
  Mail,
  Activity,
  Globe
} from "lucide-react";

export default function AdminOverview({
  stats,
  fetchOverviewStats,
  analytics,
  analyticsLoading,
  fetchAnalytics
}) {
  const handleRefreshAll = () => {
    fetchOverviewStats();
    fetchAnalytics();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 w-full"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">System Dashboard Overview</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Real-time usage statistics, demographics, and visual metrics.
          </p>
        </div>
        <button
          onClick={handleRefreshAll}
          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm transition-colors cursor-pointer"
        >
          Refresh All Data
        </button>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <Users className="w-5 h-5 text-blue-500 mb-3" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Users</p>
          <p className="text-2xl font-black text-slate-950 mt-1">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <UserCheck className="w-5 h-5 text-emerald-500 mb-3" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Active Users (24h)</p>
          <p className="text-2xl font-black text-slate-950 mt-1">{stats.activeUsers}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <Lock className="w-5 h-5 text-rose-500 mb-3" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Blocked Users</p>
          <p className="text-2xl font-black text-slate-955 mt-1">{stats.blockedUsers}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <Shield className="w-5 h-5 text-indigo-500 mb-3" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Staff Admins</p>
          <p className="text-2xl font-black text-slate-955 mt-1">{stats.adminCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <UserPlus className="w-5 h-5 text-cyan-500 mb-3" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">New Signups (7d)</p>
          <p className="text-2xl font-black text-slate-950 mt-1">{stats.newUsers}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <Layers className="w-5 h-5 text-purple-500 mb-3" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Channels</p>
          <p className="text-2xl font-black text-slate-955 mt-1">{stats.totalSessions}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <MessageSquare className="w-5 h-5 text-blue-500 mb-3" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Messages Sent</p>
          <p className="text-2xl font-black text-slate-955 mt-1">{stats.totalMessages}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <Mail className="w-5 h-5 text-teal-500 mb-3" />
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Contact Inbox</p>
          <p className="text-2xl font-black text-slate-955 mt-1">{stats.totalContacts}</p>
        </div>
      </div>

      {/* Visual Analytics section merged directly into the dashboard */}
      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-bold text-slate-800 mb-5 uppercase tracking-widest">
          Activity & Demographic Metrics
        </h3>

        {analyticsLoading ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-blue-600">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mr-3"></div>
            <span className="font-bold text-xs">Computing chart values...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily user registrations */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
              <h3 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-500" /> User Registrations (Last 7 Days)
              </h3>
              <div className="h-48 flex items-end justify-between gap-3 pt-6">
                {analytics.userGrowth && analytics.userGrowth.map((day) => {
                  const maxVal = Math.max(...analytics.userGrowth.map(d => d.count), 1);
                  const pct = (day.count / maxVal) * 85;
                  return (
                    <div key={day.date} className="flex-1 h-full flex flex-col justify-end items-center group">
                      <span className="text-[10px] text-blue-600 font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {day.count}
                      </span>
                      <div
                        style={{ height: `${Math.max(pct, 4)}%` }}
                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md group-hover:from-blue-550 group-hover:to-indigo-400 transition-all duration-305 shadow-sm"
                      ></div>
                      <span className="text-[9px] text-slate-400 mt-2 font-bold uppercase">
                        {day.date.substring(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Messages */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
              <h3 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-500" /> Messages Transmitted (7 Days)
              </h3>
              <div className="h-48 flex items-end justify-between gap-3 pt-6">
                {analytics.messageGrowth && analytics.messageGrowth.map((day) => {
                  const maxVal = Math.max(...analytics.messageGrowth.map(d => d.count), 1);
                  const pct = (day.count / maxVal) * 85;
                  return (
                    <div key={day.date} className="flex-1 h-full flex flex-col justify-end items-center group">
                      <span className="text-[10px] text-indigo-655 font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {day.count}
                      </span>
                      <div
                        style={{ height: `${Math.max(pct, 4)}%` }}
                        className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-md group-hover:from-indigo-455 group-hover:to-purple-400 transition-all duration-305 shadow-sm"
                      ></div>
                      <span className="text-[9px] text-slate-400 mt-2 font-bold uppercase">
                        {day.date.substring(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Demanded Languages */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 lg:col-span-2">
              <h3 className="text-xs font-bold text-slate-700 mb-6 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-600" /> Top Configured User Languages
              </h3>
              <div className="space-y-4">
                {analytics.topLanguages && analytics.topLanguages.map((lang) => {
                  const totalLang = analytics.topLanguages.reduce((sum, item) => sum + item.count, 0) || 1;
                  const percent = ((lang.count / totalLang) * 100).toFixed(0);
                  return (
                    <div key={lang.language} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700">{lang.language}</span>
                        <span className="text-blue-600">{lang.count} users ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                        <div
                          style={{ width: `${percent}%` }}
                          className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Informative widget */}
      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-5">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
          <Activity className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 text-sm">Lightweight Administrative Shell Active</h4>
          <p className="text-xs text-slate-500 leading-normal mt-0.5">
            Modifying system parameters (role flags, soft removals, lock states) creates records in the audit trail. Use the Directory panel to manage access credentials.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
