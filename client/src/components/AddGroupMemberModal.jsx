import React, { useState, useEffect } from "react";
import { X, Search, Check, UserPlus } from "lucide-react";
import api from "../api";

export default function AddGroupMemberModal({ isOpen, onClose, sessionId, existingMembers = [], onAddSuccess }) {
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
      // Filter out users who are already in the group
      const filtered = (res.data || []).filter(
        (u) => !existingMembers.some((m) => String(m._id) === String(u._id))
      );
      setUsers(filtered);
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

  const handleAddMembers = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      setError("Please select at least one contact to add");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post(`/api/sessions/${sessionId}/members`, {
        userIds: selectedUserIds,
      });
      onAddSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to add members", err);
      setError(err.response?.data?.detail || "Could not add selected members");
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[6px]"
      />

      {/* Modal Card */}
      <div translate="no" className="notranslate bg-white rounded-2xl sm:rounded-[32px] p-4 sm:p-6 shadow-2xl max-w-2xl w-full relative z-10 border border-slate-100 flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand" />
            Add Members to Group
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-650 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 px-4 py-2.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-2xl border border-rose-100/60 shadow-sm shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleAddMembers} className="flex flex-col flex-1 overflow-hidden">
          <div className="relative mb-4 shrink-0">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search contact directory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-brand focus:bg-white transition-all shadow-inner placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex-1 overflow-y-auto my-2 border border-slate-100 rounded-2xl p-2.5 bg-slate-50/50">
            {isFetchingUsers ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Loading contact directory...
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-8">
                No users available to add
              </p>
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
                        <div className="w-9 h-9 rounded-2xl bg-slate-200 flex items-center justify-center font-extrabold text-xs uppercase text-slate-500 overflow-hidden shrink-0">
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
                            ? "bg-brand border-brand text-white"
                            : "border-slate-350 bg-white hover:border-slate-450"
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

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-55 text-slate-500 border border-slate-200/80 rounded-2xl font-bold text-xs cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-brand hover:bg-brand/90 text-white rounded-2xl font-black text-xs cursor-pointer shadow-sm shadow-brand/10 transition-all disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Selected"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
