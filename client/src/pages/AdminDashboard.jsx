import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Clock,
  UserPlus,
  Edit2,
  Key,
  AlertTriangle,
  Mail,
  MessageSquare,
} from "lucide-react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import {
  ConfirmDialog,
  formatDate,
  toast,
} from "../components/AdminComponents";

// Import standard components
import AdminSidebar from "../components/Admin/AdminSidebar";
import AdminNavbar from "../components/Admin/AdminNavbar";
import AdminOverview from "../components/Admin/AdminOverview";
import AdminUsers from "../components/Admin/AdminUsers";
import AdminContacts from "../components/Admin/AdminContacts";

const languages = [
  "English",
  "Chinese (Mandarin)",
  "Spanish",
  "French",
  "German",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
  "Portuguese",
  "Russian",
  "Italian",
  "Dutch",
  "Turkish",
  "Gujarati",
];

function AdminDashboard({ user, onLogout, tab = "overview" }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Dashboard overall stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    adminCount: 0,
    newUsers: 0,
    totalSessions: 0,
    totalMessages: 0,
    totalContacts: 0,
  });

  // User management states
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [langFilter, setLangFilter] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalCount, setUserTotalCount] = useState(0);
  const [userLimit, setUserLimit] = useState(10);
  const [sortField, setSortField] = useState("username_asc");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userLoading, setUserLoading] = useState(false);

  // Selected single user detail modal
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Contact Queries states
  const [contacts, setContacts] = useState([]);
  const [contactPage, setContactPage] = useState(1);
  const [contactTotalPages, setContactTotalPages] = useState(1);
  const [contactTotalCount, setContactTotalCount] = useState(0);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);

  // Analytics states
  const [analytics, setAnalytics] = useState({
    userGrowth: [],
    messageGrowth: [],
    topLanguages: [],
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isBlockReasonOpen, setIsBlockReasonOpen] = useState(false);

  // Custom dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "danger",
    onConfirm: () => {},
  });

  const [bulkActionType, setBulkActionType] = useState(null); // "block", "delete", "role"

  // User forms inputs
  const [newUserForm, setNewUserForm] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "user",
    preferredLanguage: "English",
  });
  const [editUserForm, setEditUserForm] = useState({
    id: "",
    username: "",
    name: "",
    email: "",
    bio: "",
    preferredLanguage: "English",
  });
  const [passwordResetForm, setPasswordResetForm] = useState({
    id: "",
    username: "",
    password: "",
  });
  const [blockReasonForm, setBlockReasonForm] = useState({
    id: "",
    username: "",
    reason: "",
  });
  const [bulkActionForm, setBulkActionForm] = useState({
    reason: "",
    role: "user",
  });

  // Load overview stats
  const fetchOverviewStats = async () => {
    try {
      const res = await api.get("/api/admin/dashboard");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load dashboard summary stats", err);
      handleApiError(err);
    }
  };

  // Load User Directory
  const fetchUsers = async () => {
    setUserLoading(true);
    try {
      const params = new URLSearchParams({
        page_index: userPage,
        page_size: userLimit,
        sort: sortField,
      });
      if (searchQuery) params.append("search", searchQuery);
      if (roleFilter) params.append("role", roleFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (langFilter) params.append("language", langFilter);

      const res = await api.get(`/api/admin/users?${params.toString()}`);
      setUsers(res.data.users);
      setUserTotalPages(res.data.totalPages);
      setUserTotalCount(res.data.total);
    } catch (err) {
      console.error("Failed to fetch users", err);
      handleApiError(err);
    } finally {
      setUserLoading(false);
    }
  };

  // Load Contact Queries
  const fetchContacts = async () => {
    setContactLoading(true);
    try {
      const res = await api.get(`/api/contact?page=${contactPage}&limit=10`);
      setContacts(res.data.contacts);
      setContactTotalPages(res.data.totalPages);
      setContactTotalCount(res.data.total);
    } catch (err) {
      console.error("Failed to fetch contacts", err);
      handleApiError(err);
    } finally {
      setContactLoading(false);
    }
  };

  // Load Analytics
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get("/api/admin/analytics");
      setAnalytics(res.data);
    } catch (err) {
      console.error("Failed to load analytics details", err);
      handleApiError(err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleApiError = (err) => {
    if (err.response?.status === 403 || err.response?.status === 401) {
      onLogout();
      navigate("/login");
    }
  };

  useEffect(() => {
    setIsMobileSidebarOpen(false);
    if (tab === "overview") {
      fetchOverviewStats();
      fetchAnalytics();
    } else if (tab === "users") {
      fetchUsers();
    } else if (tab === "contacts") {
      fetchContacts();
    }
  }, [tab, userPage, userLimit, sortField, contactPage]);

  // Handle Search & Filter trigger
  const handleFilterSearch = (e) => {
    if (e) e.preventDefault();
    setUserPage(1);
    fetchUsers();
  };

  // View user detailed profile & log timeline & stats
  const handleViewUserDetails = async (userObj) => {
    setSelectedUserDetails(userObj);
    setDetailLoading(true);
    try {
      const [actRes, statRes] = await Promise.all([
        api.get(`/api/admin/users/${userObj._id}/activity`),
        api.get(`/api/admin/users/${userObj._id}/stats`),
      ]);
      setUserActivity(actRes.data);
      setUserStats(statRes.data);
    } catch (err) {
      console.error("Failed to load user detailed info", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Add new user
  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/admin/users", newUserForm);
      setIsAddUserOpen(false);
      setNewUserForm({
        username: "",
        password: "",
        name: "",
        email: "",
        role: "user",
        preferredLanguage: "English",
      });
      fetchUsers();
      fetchOverviewStats();
      toast.success("User added successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add user");
    }
  };

  // Edit user profile details
  const handleEditUserClick = (usr) => {
    setEditUserForm({
      id: usr._id,
      username: usr.username,
      name: usr.name,
      email: usr.email || "",
      bio: usr.bio || "",
      preferredLanguage: usr.preferredLanguage || "English",
    });
    setIsEditUserOpen(true);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/api/admin/users/${editUserForm.id}`, editUserForm);
      setIsEditUserOpen(false);
      fetchUsers();
      toast.success("User updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update user");
    }
  };

  // Password reset click & submit
  const handleResetPasswordClick = (usr) => {
    setPasswordResetForm({ id: usr._id, username: usr.username, password: "" });
    setIsResetPasswordOpen(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(
        `/api/admin/users/${passwordResetForm.id}/reset-password`,
        {
          password: passwordResetForm.password,
        },
      );
      setIsResetPasswordOpen(false);
      toast.success("Password reset completed successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reset password");
    }
  };

  // Toggle user block
  const handleBlockToggleClick = (usr) => {
    if (usr.isBlocked) {
      setConfirmDialog({
        isOpen: true,
        title: "Unblock User Access",
        message: `Are you sure you want to restore chat workspace access for ${usr.username}?`,
        type: "info",
        onConfirm: () => {
          api
            .patch(`/api/admin/users/${usr._id}/unblock`)
            .then(() => {
              setConfirmDialog({ isOpen: false });
              fetchUsers();
              fetchOverviewStats();
              toast.success("User account unblocked.");
            })
            .catch((err) => {
              setConfirmDialog({ isOpen: false });
              toast.error(
                err.response?.data?.detail || "Failed to unblock user",
              );
            });
        },
      });
    } else {
      setBlockReasonForm({ id: usr._id, username: usr.username, reason: "" });
      setIsBlockReasonOpen(true);
    }
  };

  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/api/admin/users/${blockReasonForm.id}/block`, {
        reason: blockReasonForm.reason,
      });
      setIsBlockReasonOpen(false);
      fetchUsers();
      fetchOverviewStats();
      toast.success("User account blocked.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to block user");
    }
  };

  // Promote / Demote Role
  const handleRoleChangeToggle = async (usr) => {
    const newRole = usr.role === "admin" ? "user" : "admin";
    setConfirmDialog({
      isOpen: true,
      title: "Modify User Role",
      message: `Are you sure you want to change the role of ${usr.username} to ${newRole.toUpperCase()}?`,
      type: "info",
      onConfirm: async () => {
        try {
          await api.patch(`/api/admin/users/${usr._id}/role`, {
            role: newRole,
          });
          setConfirmDialog({ isOpen: false });
          fetchUsers();
          fetchOverviewStats();
          toast.success("Role updated successfully.");
        } catch (err) {
          setConfirmDialog({ isOpen: false });
          toast.error(
            err.response?.data?.detail || "Failed to update user role",
          );
        }
      },
    });
  };

  // Soft Delete User
  const handleDeleteUser = async (usr) => {
    setConfirmDialog({
      isOpen: true,
      title: "Soft Delete User Account",
      message: `Warning: This action hides user "${usr.username}" from normal activities and chat views. Are you sure you want to soft delete?`,
      type: "danger",
      onConfirm: async () => {
        try {
          await api.delete(`/api/admin/users/${usr._id}`);
          setConfirmDialog({ isOpen: false });
          fetchUsers();
          fetchOverviewStats();
          toast.success("User account soft deleted.");
        } catch (err) {
          setConfirmDialog({ isOpen: false });
          toast.error(err.response?.data?.detail || "Failed to delete user");
        }
      },
    });
  };

  // User Row Checkbox
  const handleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(users.map((u) => u._id));
    } else {
      setSelectedUserIds([]);
    }
  };

  // Bulk operation triggers
  const handleBulkActionSubmit = async (e) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    try {
      if (bulkActionType === "block") {
        await api.post("/api/admin/users/bulk-block", {
          userIds: selectedUserIds,
          reason: bulkActionForm.reason,
        });
      } else if (bulkActionType === "unblock") {
        await api.post("/api/admin/users/bulk-unblock", {
          userIds: selectedUserIds,
        });
      } else if (bulkActionType === "delete") {
        await api.post("/api/admin/users/bulk-delete", {
          userIds: selectedUserIds,
        });
      }
      setBulkActionType(null);
      setSelectedUserIds([]);
      setBulkActionForm({ reason: "", role: "user" });
      fetchUsers();
      fetchOverviewStats();
      toast.success("Bulk operation executed successfully!");
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Failed to execute bulk action",
      );
    }
  };

  // CSV Export
  const handleExportCSV = async () => {
    try {
      const response = await api.get("/api/admin/export/users", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "users_export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV export download started.");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Top Header navbar - static */}
      <AdminNavbar
        user={user}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        onLogout={() => {
          onLogout();
          navigate("/login");
        }}
      />

      {/* Main Admin layout wrapper - hides outer scroll */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Mobile backdrop */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm md:hidden"
          />
        )}

        {/* Sidebar - fixed and doesn't scroll with content */}
        <AdminSidebar
          tab={tab}
          isSidebarCollapsed={isSidebarCollapsed}
          isMobileSidebarOpen={isMobileSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
          handleExportCSV={handleExportCSV}
          onLogout={() => {
            onLogout();
            navigate("/login");
          }}
        />

        {/* Content body - scrollable independently */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-10">
          <div className="max-w-7xl mx-auto w-full">
            {tab === "overview" && (
              <AdminOverview
                stats={stats}
                fetchOverviewStats={fetchOverviewStats}
                analytics={analytics}
                analyticsLoading={analyticsLoading}
                fetchAnalytics={fetchAnalytics}
              />
            )}

            {tab === "users" && (
              <AdminUsers
                users={users}
                userLoading={userLoading}
                userPage={userPage}
                setUserPage={setUserPage}
                userTotalPages={userTotalPages}
                userTotalCount={userTotalCount}
                userLimit={userLimit}
                setUserLimit={setUserLimit}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                langFilter={langFilter}
                setLangFilter={setLangFilter}
                sortField={sortField}
                setSortField={setSortField}
                selectedUserIds={selectedUserIds}
                handleSelectUser={handleSelectUser}
                handleSelectAll={handleSelectAll}
                handleFilterSearch={handleFilterSearch}
                setIsAddUserOpen={setIsAddUserOpen}
                handleExportCSV={handleExportCSV}
                handleViewUserDetails={handleViewUserDetails}
                handleEditUserClick={handleEditUserClick}
                handleResetPasswordClick={handleResetPasswordClick}
                handleRoleChangeToggle={handleRoleChangeToggle}
                handleBlockToggleClick={handleBlockToggleClick}
                handleDeleteUser={handleDeleteUser}
                bulkActionType={bulkActionType}
                setBulkActionType={setBulkActionType}
                handleBulkActionSubmit={handleBulkActionSubmit}
                languages={languages}
              />
            )}

            {tab === "contacts" && (
              <AdminContacts
                contacts={contacts}
                contactLoading={contactLoading}
                contactPage={contactPage}
                setContactPage={setContactPage}
                contactTotalPages={contactTotalPages}
                contactTotalCount={contactTotalCount}
                setSelectedContact={setSelectedContact}
              />
            )}
          </div>
        </main>
      </div>

      {/* CONFIRMATION DIALOG component */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false })}
      />

      {/* MODAL 1: ADD USER */}
      <AnimatePresence>
        {isAddUserOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddUserOpen(false)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full relative z-10 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
                  <UserPlus className="w-4 h-4 text-blue-650" /> Add New Account
                </h3>
                <button
                  onClick={() => setIsAddUserOpen(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserForm.username}
                    onChange={(e) =>
                      setNewUserForm({
                        ...newUserForm,
                        username: e.target.value,
                      })
                    }
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="e.g. janesmith"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserForm.name}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, name: e.target.value })
                    }
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="e.g. Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, email: e.target.value })
                    }
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="name@company.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newUserForm.password}
                    onChange={(e) =>
                      setNewUserForm({
                        ...newUserForm,
                        password: e.target.value,
                      })
                    }
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="Min 4 chars"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Role
                    </label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) =>
                        setNewUserForm({ ...newUserForm, role: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 focus:outline-none focus:bg-white"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Language
                    </label>
                    <select
                      value={newUserForm.preferredLanguage}
                      onChange={(e) =>
                        setNewUserForm({
                          ...newUserForm,
                          preferredLanguage: e.target.value,
                        })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 focus:outline-none focus:bg-white"
                    >
                      {languages.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddUserOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-sm shadow-blue-500/10"
                  >
                    Save User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDIT USER */}
      <AnimatePresence>
        {isEditUserOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditUserOpen(false)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full relative z-10 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
                  <Edit2 className="w-4 h-4 text-blue-650" /> Edit Profile
                  Details
                </h3>
                <button
                  onClick={() => setIsEditUserOpen(false)}
                  className="text-slate-400 hover:text-slate-655 cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editUserForm.username}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-505 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUserForm.name}
                    onChange={(e) =>
                      setEditUserForm({ ...editUserForm, name: e.target.value })
                    }
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editUserForm.email}
                    onChange={(e) =>
                      setEditUserForm({
                        ...editUserForm,
                        email: e.target.value,
                      })
                    }
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Biography (Bio)
                  </label>
                  <textarea
                    value={editUserForm.bio}
                    onChange={(e) =>
                      setEditUserForm({ ...editUserForm, bio: e.target.value })
                    }
                    rows="3"
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                  ></textarea>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Language
                  </label>
                  <select
                    value={editUserForm.preferredLanguage}
                    onChange={(e) =>
                      setEditUserForm({
                        ...editUserForm,
                        preferredLanguage: e.target.value,
                      })
                    }
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-550 focus:outline-none focus:bg-white"
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditUserOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-505 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Apply Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: PASSWORD RESET */}
      <AnimatePresence>
        {isResetPasswordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetPasswordOpen(false)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-sm w-full relative z-10 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
                  <Key className="w-4.5 h-4.5 text-amber-500" /> Reset Password
                </h3>
                <button
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="text-slate-400 hover:text-slate-650 cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <form
                onSubmit={handleResetPasswordSubmit}
                className="p-6 space-y-4"
              >
                <p className="text-xs text-slate-500 leading-normal">
                  Define a new passcode credential for{" "}
                  <span className="font-bold text-slate-850">
                    @{passwordResetForm.username}
                  </span>
                  .
                </p>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordResetForm.password}
                    onChange={(e) =>
                      setPasswordResetForm({
                        ...passwordResetForm,
                        password: e.target.value,
                      })
                    }
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="Min 4 characters"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetPasswordOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-550 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: BLOCK REASON */}
      <AnimatePresence>
        {isBlockReasonOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBlockReasonOpen(false)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-sm w-full relative z-10 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />{" "}
                  Restrict Account Access
                </h3>
                <button
                  onClick={() => setIsBlockReasonOpen(false)}
                  className="text-slate-400 hover:text-slate-655 cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <form onSubmit={handleBlockSubmit} className="p-6 space-y-4">
                <p className="text-xs text-slate-550 leading-normal">
                  State the administrative reason for blocking{" "}
                  <span className="font-bold text-slate-800">
                    @{blockReasonForm.username}
                  </span>
                  .
                </p>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Reason Description
                  </label>
                  <input
                    type="text"
                    required
                    value={blockReasonForm.reason}
                    onChange={(e) =>
                      setBlockReasonForm({
                        ...blockReasonForm,
                        reason: e.target.value,
                      })
                    }
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="e.g. Activity policy violation"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBlockReasonOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Restrict User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: BULK ACTION BLOCK */}
      <AnimatePresence>
        {bulkActionType === "block" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBulkActionType(null)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-sm w-full relative z-10 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-500" /> Bulk
                  Restrict Selected
                </h3>
                <button
                  onClick={() => setBulkActionType(null)}
                  className="text-slate-400 hover:text-slate-655 cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <form onSubmit={handleBulkActionSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Block Reason
                  </label>
                  <input
                    type="text"
                    required
                    value={bulkActionForm.reason}
                    onChange={(e) =>
                      setBulkActionForm({
                        ...bulkActionForm,
                        reason: e.target.value,
                      })
                    }
                    className="w-full bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="Provide description"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkActionType(null)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Restrict Users
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: DETAILED USER PROFILE & ACTIVITY TIMELINE */}
      <AnimatePresence>
        {selectedUserDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserDetails(null)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-blue-650" /> Account Stats
                  Summary
                </h3>
                <button
                  onClick={() => setSelectedUserDetails(null)}
                  className="text-slate-400 hover:text-slate-655 cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                  <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-xl font-bold text-slate-700 overflow-hidden border border-slate-350">
                    {selectedUserDetails.profileImage ? (
                      <img
                        src={selectedUserDetails.profileImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      selectedUserDetails.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-base font-extrabold text-slate-900">
                      {selectedUserDetails.name}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">
                      @{selectedUserDetails.username}
                    </p>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                      {selectedUserDetails.role}
                    </p>
                  </div>
                </div>

                {detailLoading ? (
                  <div className="text-center p-10 text-slate-400">
                    <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-xs font-semibold">
                      Retrieving statistics...
                    </span>
                  </div>
                ) : (
                  <>
                    {userStats && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">
                              Messages Sent
                            </p>
                            <p className="text-base font-black text-slate-900 mt-0.5">
                              {userStats.messagesSent}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">
                              Active Channels
                            </p>
                            <p className="text-base font-black text-slate-900 mt-0.5">
                              {userStats.sessionsCount}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">
                              Translations
                            </p>
                            <p className="text-base font-black text-slate-900 mt-0.5">
                              {userStats.translationsCount}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                            <p className="text-[9px] text-slate-400 font-bold uppercase">
                              Uploads
                            </p>
                            <p className="text-base font-black text-slate-900 mt-0.5">
                              {userStats.uploadsCount}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-100/50 text-center">
                            <p className="text-[9px] text-emerald-600 font-bold uppercase">
                              AI Input Tokens
                            </p>
                            <p className="text-base font-black text-emerald-800 mt-0.5">
                              {(userStats.inputTokens || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-100/50 text-center">
                            <p className="text-[9px] text-emerald-600 font-bold uppercase">
                              AI Output Tokens
                            </p>
                            <p className="text-base font-black text-emerald-800 mt-0.5">
                              {(userStats.outputTokens || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-rose-50/30 p-3 rounded-xl border border-rose-100/50 text-center col-span-2">
                            <p className="text-[9px] text-rose-600 font-bold uppercase">
                              Estimated AI Cost (INR)
                            </p>
                            <p className="text-base font-black text-rose-800 mt-0.5">
                              ₹{(userStats.costINR || 0).toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Activity Logs Timeline */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Recent Activity Logs
                      </h4>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-60 overflow-y-auto space-y-2.5 divide-y divide-slate-100">
                        {userActivity.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-6">
                            No activity logs recorded.
                          </p>
                        ) : (
                          userActivity.map((log, idx) => (
                            <div
                              key={idx}
                              className="pt-2 flex items-start justify-between gap-3 text-xs font-medium"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md font-bold mr-2 uppercase tracking-wide text-[8px]">
                                  {log.action}
                                </span>

                                <span className="text-slate-655 break-words">
                                  {JSON.stringify(log.metadata) !== "{}"
                                    ? JSON.stringify(log.metadata)
                                    : "Performed action"}
                                </span>
                              </div>

                              <span className="flex-shrink-0 text-[9px] text-slate-400 font-bold whitespace-nowrap">
                                {formatDate(log.createdAt)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedUserDetails(null)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm transition-colors text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 7: VIEW CONTACT DETAILS */}
      <AnimatePresence>
        {selectedContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedContact(null)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full relative z-10 overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-slate-150 bg-slate-50 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 flex items-center gap-2 text-sm">
                  <MessageSquare className="w-4.5 h-4.5 text-blue-650" /> Query
                  Details
                </h3>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Sender Name
                    </p>
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {selectedContact.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Date Received
                    </p>
                    <p className="text-xs font-medium text-slate-650 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(selectedContact.createdAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Email Address
                  </p>
                  <p className="text-xs font-medium text-blue-600 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="hover:underline"
                    >
                      {selectedContact.email}
                    </a>
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Full Message
                  </p>
                  <div className="bg-slate-55 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedContact.message}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-sm transition-colors text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminDashboard;
