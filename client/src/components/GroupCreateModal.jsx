import React, { useState, useEffect } from "react";
import { X, Search, Check, Users, Sparkles, UserPlus } from "lucide-react";
import api from "../api";

export default function GroupCreateModal({ isOpen, onClose, onCreateSuccess }) {
  const [groupName, setGroupName] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setGroupName("");
      setSelectedUserIds([]);
      setSearchQuery("");
      setSearchTerm("");
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchTerm);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchUsers = async () => {
    setIsFetchingUsers(true);
    try {
      const res = await api.get("/api/users");
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setIsFetchingUsers(false);
    }
  };

  const handleToggleUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError("Please name your group conversation");
      return;
    }
    if (selectedUserIds.length === 0) {
      setError("Add at least one member to start the conversation");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/api/sessions", {
        isGroup: true,
        groupName: groupName.trim(),
        participantIds: selectedUserIds,
      });
      onCreateSuccess(res.data);
      onClose();
    } catch (err) {
      console.error("Failed to create group", err);
      setError(err.response?.data?.detail || "Could not instantiate group room");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter((u) =>
    (u.fullName || u.name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const selectedUsers = users.filter((u) => selectedUserIds.includes(u._id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Premium Dark Glass Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[6px]"
      />

      {/* Modern High-End Modal Card */}
      <div translate="no" className="notranslate bg-white/95 rounded-2xl sm:rounded-[32px] p-4 sm:p-6 shadow-2xl max-w-2xl w-full relative z-10 border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-brand/10 rounded-2xl flex items-center justify-center text-brand">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                New Group Room
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Multi-Language Chat space
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-2xl border border-rose-100/60 shadow-sm shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateGroup} className="flex flex-col flex-1 overflow-hidden">
          {/* Group Inputs Area */}
          <div className="space-y-4 shrink-0">
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Group Name (e.g. Design Sync, Board)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-brand focus:bg-white transition-all shadow-inner placeholder:text-slate-400 font-medium"
              />
              <Sparkles className="absolute right-4 top-3.5 w-4 h-4 text-brand/35 pointer-events-none" />
            </div>

            {/* Selected Members Horizontal Carousel (Displays only if users are selected) */}
            {selectedUsers.length > 0 && (
              <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Selected ({selectedUsers.length})
                </p>
                <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 no-scrollbar scroll-smooth">
                  {selectedUsers.map((u) => (
                    <div
                      key={u._id}
                      className="relative flex flex-col items-center shrink-0 group cursor-pointer"
                      onClick={() => handleToggleUser(u._id)}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-brand/5 border border-brand/10 text-brand flex items-center justify-center font-black text-xs uppercase shadow-sm overflow-hidden">
                        {u.profileImage ? (
                          <img src={u.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          u.fullName ? u.fullName.slice(0, 2) : (u.name ? u.name.slice(0, 2) : "U")
                        )}
                      </div>
                      <div className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-slate-800 text-white rounded-full flex items-center justify-center border border-white hover:bg-rose-500 transition-colors shadow-sm">
                        <X className="w-2.5 h-2.5" />
                      </div>
                      <p className="text-[9px] font-semibold text-slate-600 mt-1 max-w-[45px] truncate text-center">
                        {u.fullName || u.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member Search input */}
            <div className="relative pt-1 border-t border-slate-100">
              <Search className="absolute left-3 top-4 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search contact directory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-brand focus:bg-white transition-all shadow-inner placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Search List */}
          <div className="flex-1 overflow-y-auto my-4 border border-slate-100 rounded-2xl p-2.5 bg-slate-50/50">
            {isFetchingUsers ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Loading contact list...
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-1.5">
                <UserPlus className="w-6 h-6 stroke-[1.5]" />
                <p className="text-center text-xs">No matching contacts</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u._id);
                  return (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => handleToggleUser(u._id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left ${
                        isSelected
                          ? "bg-brand/5 border border-brand/20 shadow-sm"
                          : "hover:bg-slate-100 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-slate-200 flex items-center justify-center font-extrabold text-xs uppercase text-slate-500 overflow-hidden">
                          {u.profileImage ? (
                            <img src={u.profileImage} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            u.fullName ? u.fullName.slice(0, 2) : (u.name ? u.name.slice(0, 2) : "U")
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {u.fullName || u.name}
                          </p>
                          <p className="text-[9px] text-brand uppercase font-bold tracking-widest mt-0.5">
                            Speaks {u.preferredLanguage || "English"}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-brand border-brand text-white scale-100"
                            : "border-slate-350 bg-white hover:border-slate-400"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3.5 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200/80 rounded-2xl font-bold text-xs cursor-pointer transition-all active:scale-98"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-brand hover:bg-brand/90 text-white rounded-2xl font-black text-xs cursor-pointer shadow-sm shadow-brand/10 transition-all disabled:opacity-50 active:scale-98"
            >
              {loading ? "Creating..." : "Launch Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
