import React from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  UserPlus,
  Download,
  Mail,
  Globe,
  Clock,
  Activity,
  Eye,
  Edit2,
  Key,
  Shield,
  Lock,
  Unlock,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Tooltip, StatusBadge, formatDate } from "../AdminComponents";

export default function AdminUsers({
  users,
  userLoading,
  userPage,
  setUserPage,
  userTotalPages,
  userTotalCount,
  userLimit,
  setUserLimit,
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  langFilter,
  setLangFilter,
  sortField,
  setSortField,
  selectedUserIds,
  handleSelectUser,
  handleSelectAll,
  handleFilterSearch,
  setIsAddUserOpen,
  handleExportCSV,
  handleViewUserDetails,
  handleEditUserClick,
  handleResetPasswordClick,
  handleRoleChangeToggle,
  handleBlockToggleClick,
  handleDeleteUser,
  bulkActionType,
  setBulkActionType,
  handleBulkActionSubmit,
  languages = [],
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 w-full"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">User Directory</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Manage active profiles, authentication permissions, block logs, and
            password adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-blue-500/10"
          >
            <UserPlus className="w-4 h-4" />
            Add Account
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white hover:bg-slate-55 text-slate-700 hover:text-slate-955 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Form */}
      <form
        onSubmit={handleFilterSearch}
        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search username, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-505 focus:outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-505 focus:outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active (Unblocked)</option>
            <option value="blocked">Blocked</option>
            <option value="deleted">Deleted</option>
          </select>

          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-505 focus:outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Languages</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-505 focus:outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="username_asc">Username (A-Z)</option>
            <option value="username_desc">Username (Z-A)</option>
            <option value="createdAt_desc">Newest Signups</option>
            <option value="createdAt_asc">Oldest Signups</option>
            <option value="lastLogin_desc">Recently Logged In</option>
          </select>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Items per page:</span>
            <select
              value={userLimit}
              onChange={(e) => {
                setUserLimit(Number(e.target.value));
                setUserPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-505 px-2 py-0.5"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/10"
          >
            <Filter className="w-3.5 h-3.5" />
            Apply Filters
          </button>
        </div>
      </form>

      {/* Bulk actions bar */}
      {selectedUserIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <span className="text-xs font-bold text-blue-700">
            {selectedUserIds.length} user{selectedUserIds.length > 1 ? "s" : ""}{" "}
            selected for bulk changes
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkActionType("block")}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
            >
              Bulk Block
            </button>
            <button
              onClick={() =>
                handleBulkActionSubmit({ preventDefault: () => {} })
              }
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
            >
              Bulk Unblock
            </button>
            <button
              onClick={() =>
                handleBulkActionSubmit({ preventDefault: () => {} })
              }
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
            >
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-505 text-[10px] uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      users.length > 0 &&
                      selectedUserIds.length === users.length
                    }
                    onChange={handleSelectAll}
                    className="rounded text-blue-650 bg-white border-slate-300 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-4 font-bold">User</th>
                <th className="p-4 font-bold">Details</th>
                <th className="p-4 font-bold">Security & Role</th>
                <th className="p-4 font-bold">Activity Metrics</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {userLoading ? (
                <tr>
                  <td colSpan="6" className="p-10 text-center">
                    <div className="flex items-center justify-center gap-3 text-blue-600">
                      <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="font-semibold text-xs">
                        Retrieving Directory...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="p-10 text-center text-slate-400 font-semibold text-xs"
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                users.map((usr) => (
                  <tr
                    key={usr._id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(usr._id)}
                        onChange={() => handleSelectUser(usr._id)}
                        className="rounded text-blue-655 bg-white border-slate-300 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-650 font-bold overflow-hidden">
                          {usr.profileImage ? (
                            <img
                              src={usr.profileImage}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            usr.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {usr.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            @{usr.username}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {usr.email || "No Email"}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          {usr.preferredLanguage || "English"}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 items-center">
                        <StatusBadge
                          type={usr.role === "admin" ? "admin" : "member"}
                          label={usr.role === "admin" ? "Admin" : "Member"}
                        />
                        <StatusBadge
                          type={usr.isBlocked ? "blocked" : "active"}
                          label={usr.isBlocked ? "Blocked" : "Active"}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-1 truncate">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />{" "}
                          Logged: {formatDate(usr.lastLogin)}
                        </p>
                        <p className="flex items-center gap-1 truncate">
                          <Activity className="w-3.5 h-3.5 text-slate-400" />{" "}
                          Seen: {formatDate(usr.lastSeen)}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Tooltip content="View statistics & logs">
                          <button
                            onClick={() => handleViewUserDetails(usr)}
                            className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-slate-400 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Edit profile fields">
                          <button
                            onClick={() => handleEditUserClick(usr)}
                            className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-slate-400 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Force reset credentials">
                          <button
                            onClick={() => handleResetPasswordClick(usr)}
                            className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-slate-400 transition-colors cursor-pointer"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip
                          content={
                            usr.role === "admin"
                              ? "Demote from admin role"
                              : "Promote to admin role"
                          }
                        >
                          <button
                            onClick={() => handleRoleChangeToggle(usr)}
                            className="p-1.5 hover:bg-slate-100 hover:text-slate-900 rounded-lg text-slate-400 transition-colors cursor-pointer"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip
                          content={
                            usr.isBlocked
                              ? "Unblock account access"
                              : "Block account access"
                          }
                        >
                          <button
                            onClick={() => handleBlockToggleClick(usr)}
                            className={`p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ${
                              usr.isBlocked
                                ? "text-rose-600 hover:text-rose-500"
                                : "text-slate-400 hover:text-amber-500"
                            }`}
                          >
                            {usr.isBlocked ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                          </button>
                        </Tooltip>
                        <Tooltip content="Soft delete account">
                          <button
                            onClick={() => handleDeleteUser(usr)}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-650 rounded-lg text-slate-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!userLoading && users.length > 0 && (
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Page{" "}
              <span className="text-slate-700 font-extrabold">{userPage}</span>{" "}
              of{" "}
              <span className="text-slate-700 font-extrabold">
                {userTotalPages}
              </span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={userPage === 1}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-505 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  setUserPage((p) => Math.min(userTotalPages, p + 1))
                }
                disabled={userPage === userTotalPages}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-505 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
