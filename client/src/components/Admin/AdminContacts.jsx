import React from "react";
import { motion } from "framer-motion";
import { Clock, User, Mail, MessageSquare, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip, formatDate } from "../AdminComponents";

export default function AdminContacts({
  contacts,
  contactLoading,
  contactPage,
  setContactPage,
  contactTotalPages,
  contactTotalCount,
  setSelectedContact
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 w-full"
    >
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Contact Inbox</h2>
          <p className="text-slate-505 text-xs mt-0.5">
            View list submissions from the landing page contact form.
          </p>
        </div>
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
          <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
            Queries Total
          </p>
          <p className="text-xl font-black text-blue-600 leading-none">
            {contactTotalCount}
          </p>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider">
                <th className="p-4 font-bold w-12">#</th>
                <th className="p-4 font-bold">Date</th>
                <th className="p-4 font-bold">Name</th>
                <th className="p-4 font-bold">Email</th>
                <th className="p-4 font-bold max-w-md">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {contactLoading ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center">
                    <div className="flex items-center justify-center gap-3 text-blue-600">
                      <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="font-semibold text-xs">Retrieving feedback...</span>
                    </div>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-10 text-center text-slate-400 font-semibold text-xs">
                    Inbox empty.
                  </td>
                </tr>
              ) : (
                contacts.map((contact, index) => (
                  <tr key={contact._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4 whitespace-nowrap text-slate-400 font-bold">
                      {(contactPage - 1) * 10 + index + 1}
                    </td>
                    <td className="p-4 whitespace-nowrap text-slate-500 text-xs flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(contact.createdAt)}
                    </td>
                    <td className="p-4 whitespace-nowrap font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        {contact.name}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap text-blue-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <a href={`mailto:${contact.email}`} className="hover:underline">
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
                        <Tooltip content="View full message details">
                          <button
                            onClick={() => setSelectedContact(contact)}
                            className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-md transition-colors shrink-0 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
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

        {/* Pagination Footer */}
        {!contactLoading && contacts.length > 0 && (
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Page <span className="text-slate-700 font-extrabold">{contactPage}</span> of{" "}
              <span className="text-slate-700 font-extrabold">{contactTotalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setContactPage((p) => Math.max(1, p - 1))}
                disabled={contactPage === 1}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-505 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setContactPage((p) => Math.min(contactTotalPages, p + 1))}
                disabled={contactPage === contactTotalPages}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-505 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
