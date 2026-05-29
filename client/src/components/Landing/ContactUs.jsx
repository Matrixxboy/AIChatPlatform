import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  CheckCircle,
  Mail,
  User,
  MessageSquare,
  Phone,
  MapPin,
  Sparkles,
} from "lucide-react";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setFormData({ name: "", email: "", message: "" });
    }, 1500);
  };

  const contactDetails = [
    {
      title: "Email Support",
      value: "support@biz-aichat.com",
      desc: "Direct corporate email channel",
      icon: Mail,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      title: "Call Center",
      value: "+91 97243 35756",
      desc: "Mon-Fri from 9 AM to 6 PM EST",
      icon: Phone,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      title: "Global Office",
      value: "304, Luxuirya Trade hub, Surat. Gujrat - 395010",
      desc: "Corporate tech campus offices",
      icon: MapPin,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
  ];

  return (
    <section
      id="contact"
      className="py-24 bg-slate-50 relative overflow-hidden"
    >
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-100/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">
            Connect With Our Team
          </h2>
          <p className="text-slate-500 font-medium text-base">
            Have questions about enterprise custom setups, API integrations, or
            pricing models? Let's talk.
          </p>
        </div>

        {/* Responsive 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          {/* Left Column: Direct Info Cards */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />{" "}
                Contact Information
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                Reach out to our global accounts team. We provide rapid support
                channels and corporate consulting setups.
              </p>
            </div>

            <div className="space-y-4">
              {contactDetails.map((detail) => (
                <motion.div
                  key={detail.title}
                  whileHover={{ x: 4 }}
                  className="bg-white border border-slate-200/60 p-5 rounded-2xl flex gap-4 items-start shadow-sm"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${detail.color}`}
                  >
                    <detail.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {detail.title}
                    </h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {detail.desc}
                    </p>
                    <p className="text-sm text-brand font-black mt-2 font-display">
                      {detail.value}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive Form Card */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-xl relative overflow-hidden h-full flex flex-col justify-between"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand to-indigo-500" />

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="py-12 flex flex-col items-center justify-center text-center space-y-6 h-full"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shadow-sm animate-bounce">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        Message Sent Successfully!
                      </h3>
                      <p className="text-sm text-slate-500 font-semibold max-w-sm">
                        Thank you for connecting. Our global accounts manager
                        will reply within 4 hours.
                      </p>
                    </div>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    onSubmit={handleSubmit}
                    className="space-y-6 flex-1 flex flex-col justify-between"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name field */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                            Full Name
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Enter your name"
                              required
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 outline-none focus:border-brand focus:bg-white focus:shadow-sm transition-all text-sm font-medium text-slate-800"
                              value={formData.name}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  name: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>

                        {/* Email field */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                            Business Email
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                            <input
                              type="email"
                              placeholder="you@company.com"
                              required
                              className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 outline-none focus:border-brand focus:bg-white focus:shadow-sm transition-all text-sm font-medium text-slate-800"
                              value={formData.email}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  email: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Message field */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                          How can we help you?
                        </label>
                        <div className="relative">
                          <MessageSquare className="absolute left-4 top-5 w-4.5 h-4.5 text-slate-400" />
                          <textarea
                            placeholder="Describe your inquiry..."
                            rows="4"
                            required
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 outline-none focus:border-brand focus:bg-white focus:shadow-sm transition-all text-sm font-medium text-slate-800 resize-none"
                            value={formData.message}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                message: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-brand hover:bg-brand-600 text-white font-extrabold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md shadow-brand/10 group cursor-pointer mt-6"
                    >
                      <span className="text-sm">
                        {submitting ? "Sending Request..." : "Send Message"}
                      </span>
                      {!submitting && (
                        <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
