import React from "react";
import {
  Layers,
  Users,
  Mail,
  BarChart2,
  Download,
  LogOut,
  Shield,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "../AdminComponents";

export default function AdminSidebar({
  tab,
  isSidebarCollapsed,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  handleExportCSV,
  onLogout,
}) {
  const navigate = useNavigate();

  return (
    <aside
      className={`bg-white border-r border-slate-200 p-3 flex flex-col justify-between flex-shrink-0 transition-all duration-300 h-screen md:h-[calc(100vh-64px)] overflow-y-auto z-40
        fixed top-0 md:top-16 bottom-0 left-0 md:static md:translate-x-0 shadow-lg md:shadow-none
        ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        ${isSidebarCollapsed ? "w-[70px] md:items-center" : "w-64"}
      `}
    >
      <div className="space-y-4 w-full">
        {/* Mobile Header Branding - visible only on mobile drawer */}
        <div className="flex items-center justify-between px-3 py-2.5 mb-2 border-b border-slate-100 md:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm leading-tight text-slate-900 tracking-tight">
                Biz-Insights
              </h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                Control Panel
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isSidebarCollapsed && (
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3">
            Overview
          </p>
        )}
        <nav className="space-y-1 w-full flex flex-col items-center">
          <Tooltip
            content={isSidebarCollapsed ? "Overview Stats" : ""}
            placement="right"
          >
            <button
              onClick={() => navigate("/admin/dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === "overview"
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 border border-transparent"
              } ${isSidebarCollapsed ? "justify-center p-2.5" : ""}`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Dashboard Overview</span>}
            </button>
          </Tooltip>

          <Tooltip
            content={isSidebarCollapsed ? "User Directory" : ""}
            placement="right"
          >
            <button
              onClick={() => navigate("/admin/users")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === "users"
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-955 border border-transparent"
              } ${isSidebarCollapsed ? "justify-center p-2.5" : ""}`}
            >
              <Users className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>User Directory</span>}
            </button>
          </Tooltip>

          <Tooltip
            content={isSidebarCollapsed ? "Contact Queries" : ""}
            placement="right"
          >
            <button
              onClick={() => navigate("/admin/contacts")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tab === "contacts"
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 border border-transparent"
              } ${isSidebarCollapsed ? "justify-center p-2.5" : ""}`}
            >
              <Mail className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Contact Inquiries</span>}
            </button>
          </Tooltip>
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-100 w-full flex justify-center">
        <Tooltip content={isSidebarCollapsed ? "Logout" : ""} placement="right">
          {/* <button
            onClick={handleExportCSV}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer border border-emerald-100 ${
              isSidebarCollapsed ? "justify-center p-2" : ""
            }`}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            {!isSidebarCollapsed && <span>Export CSV</span>}
          </button> */}
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-red-100 ${
              isSidebarCollapsed ? "justify-center p-2" : ""
            }`}
            title="Sign out of panel"
          >
            <LogOut className="w-3.5 h-3.5" />
            {!isSidebarCollapsed && <span>Sign Out</span>}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
