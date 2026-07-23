import React from "react";
import { Shield, LogOut, PanelLeft, PanelLeftClose } from "lucide-react";

export default function AdminNavbar({
  user,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  onLogout
}) {
  const handleToggle = () => {
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 h-[64px] px-6 flex items-center justify-between shadow-sm shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors mr-1 cursor-pointer"
        >
          {isSidebarCollapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-sm leading-tight text-slate-900 tracking-tight">
            Biz-Insights
          </h1>
          <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
            Control Panel & Admin Console
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden md:block">
          <p className="text-xs font-bold text-slate-800">{user.name}</p>
          <p className="text-[9px] text-blue-600 uppercase font-bold tracking-widest">
            {user.role}
          </p>
        </div>
        <div className="w-px h-5 bg-slate-200 hidden md:block"></div>
        <button
          onClick={onLogout}
          className="p-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all text-slate-500 cursor-pointer shadow-sm"
          title="Sign out of panel"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
