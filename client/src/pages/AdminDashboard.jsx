import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Mail,
  User,
  Clock,
  MessageSquare,
  Database,
  Eye,
  X,
} from "lucide-react";
import api from "../api";
import { useNavigate } from "react-router-dom";

function AdminDashboard({ user, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedContact, setSelectedContact] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchContacts(page);
  }, [page]);

  const fetchContacts = async (pageNumber) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/contact?page=${pageNumber}&limit=10`);
      setContacts(res.data.contacts);
      setTotalPages(res.data.totalPages);
      setTotalCount(res.data.total);
    } catch (err) {
      console.error("Failed to fetch contacts", err);
      if (err.response?.status === 403 || err.response?.status === 401) {
        onLogout();
        navigate("/admin-login");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white h-[70px] px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Admin Console</h1>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Biz-Translate Manager
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold">{user.name}</p>
            <p className="text-[11px] text-brand-400 uppercase font-bold tracking-widest">
              {user.role}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-white"
            title="Log out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              Contact Queries
            </h2>
            <p className="text-slate-500 text-sm">
              Manage submissions from the landing page contact form.
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
              Total Queries
            </p>
            <p className="text-xl font-black text-brand-600 leading-none">
              {totalCount}
            </p>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold w-12">#</th>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Name</th>
                  <th className="p-4 font-bold">Email</th>
                  <th className="p-4 font-bold max-w-md">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center">
                      <div className="flex items-center justify-center gap-3 text-brand-600">
                        <div className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                        <span className="font-semibold">
                          Loading records...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : contacts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-10 text-center text-slate-400 font-medium"
                    >
                      No contact queries found.
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact, index) => (
                    <tr
                      key={contact._id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="p-4 whitespace-nowrap text-slate-500 font-bold text-xs">
                        {(page - 1) * 10 + index + 1}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-500 font-medium text-xs flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(contact.createdAt)}
                      </td>
                      <td className="p-4 whitespace-nowrap font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {contact.name}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap text-brand-600 font-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <a
                            href={`mailto:${contact.email}`}
                            className="hover:underline"
                          >
                            {contact.email}
                          </a>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 max-w-md">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex gap-2 min-w-0">
                            <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <p className="truncate">{contact.message}</p>
                          </div>
                          <button
                            onClick={() => setSelectedContact(contact)}
                            className="p-1.5 hover:bg-slate-200 text-brand-600 rounded-md transition-colors shrink-0"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!loading && contacts.length > 0 && (
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-sm text-slate-500 font-medium">
                Showing page{" "}
                <span className="font-bold text-slate-900">{page}</span> of{" "}
                <span className="font-bold text-slate-900">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Details Dialog */}
      <AnimatePresence>
        {selectedContact && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedContact(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-brand-600" />
                  Query Details
                </h3>
                <button
                  onClick={() => setSelectedContact(null)}
                  className="p-2 hover:bg-slate-200 text-slate-400 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Sender Name
                      </p>
                      <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        {selectedContact.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Date
                      </p>
                      <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {formatDate(selectedContact.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Email Address
                    </p>
                    <p className="text-sm font-medium text-brand-600 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a
                        href={`mailto:${selectedContact.email}`}
                        className="hover:underline"
                      >
                        {selectedContact.email}
                      </a>
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Full Message
                    </p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {selectedContact.message}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-sm transition-colors text-sm"
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
