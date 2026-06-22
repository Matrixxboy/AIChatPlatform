import React from "react";
import { motion } from "framer-motion";
import {
  Laptop,
  Phone,
  Globe,
  ArrowRight,
  UserPlus,
  Sparkles,
} from "lucide-react";

export default function PlatformShowcase({ handleStartChatting }) {
  return (
    <section className="py-24 bg-slate-50 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">
            The Biz-Translate Portal Experience
          </h2>
          <p className="text-slate-500 font-medium text-base">
            A visually premium dashboard built with modern messaging aesthetics,
            responsive structures, and advanced contact directory search.
          </p>
        </div>

        {/* Desktop & Mobile Mockup Frame */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative max-w-5xl mx-auto bg-white border border-slate-200 p-4 rounded-[32px] shadow-2xl flex flex-col md:flex-row gap-6 items-stretch"
        >
          {/* Desktop Side */}
          <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200/80 p-4 text-left flex flex-col justify-between h-[360px] relative overflow-hidden shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 to-transparent pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-brand animate-pulse" />
                <span className="text-xs font-bold text-slate-800">
                  Biz-Translate Web App
                </span>
              </div>
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              </div>
            </div>

            {/* Mock desktop chat UI layout */}
            <div className="flex-1 flex gap-4 mt-3">
              {/* Sidebar list mock */}
              <div className="w-1/3 border-r border-slate-200 pr-3 space-y-2 hidden.sm block relative">
                {/* Search highlights to illustrate how to add people */}
                <div className="relative group">
                  <div className="h-8 bg-white rounded-lg border border-brand/40 flex items-center px-2 text-[8px] text-brand font-black shadow-sm gap-1 animate-pulse">
                    <UserPlus className="w-3.5 h-3.5 text-brand" /> Search
                    @username...
                  </div>
                  {/* Floating Tutorial Tooltip */}
                  <div className="absolute -top-12 -left-2 bg-slate-900 text-white text-[7.5px] font-bold p-1.5 rounded-lg shadow-lg z-20 border border-slate-800 flex items-center gap-1.5 whitespace-nowrap animate-bounce">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Search & add
                    friends first!
                  </div>
                </div>

                <div className="p-2 bg-white rounded-lg flex items-center gap-2 border border-brand-100 shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-[8px]">
                    JD
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-800">
                      John (Spanish)
                    </p>
                    <p className="text-[7px] text-slate-400">Linked</p>
                  </div>
                </div>
                <div className="p-2 hover:bg-slate-100/40 rounded-lg flex items-center gap-2 border border-transparent">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-[8px]">
                    RA
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-700">
                      Rahul (Hindi)
                    </p>
                    <p className="text-[7px] text-slate-400">Offline</p>
                  </div>
                </div>
              </div>

              {/* Active active chat mock */}
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 max-w-[85%] shadow-sm">
                    <p className="text-[8px] font-bold text-brand">
                      Incoming Spanish
                    </p>
                    <p className="text-[10px] text-slate-800">
                      "Hola, ¿cómo estás?"
                    </p>
                  </div>
                  <div className="bg-brand p-2.5 rounded-xl border border-brand-600 max-w-[85%] self-end ml-auto shadow-md">
                    <p className="text-[8px] font-bold text-brand-100">
                      Auto-Translated to English
                    </p>
                    <p className="text-[10px] text-white">
                      "Hello, how are you?"
                    </p>
                  </div>
                </div>
                {/* Active Translation Indicator */}
                <div className="h-8 bg-white border border-slate-200 rounded-xl px-3 flex items-center justify-between text-[9px] text-slate-500 font-bold shadow-sm">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-brand" /> Translated to
                    English
                  </span>
                  <span className="text-brand font-extrabold flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-500 animate-spin" />{" "}
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Side */}
          <div className="w-full md:w-[240px] bg-slate-50 rounded-2xl border border-slate-200 p-4 text-left flex flex-col justify-between h-[360px] relative overflow-hidden shrink-0 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-brand animate-pulse" />
                <span className="text-[10px] font-bold text-slate-800">
                  Mobile View
                </span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="flex-1 flex flex-col justify-center gap-3 py-4">
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[8px] text-slate-400 font-bold">
                  NATIVE MESSAGE
                </p>
                <p className="text-[11px] font-semibold text-slate-700">
                  "आज मीटिंग कितने बजे है?"
                </p>
              </div>
              <div className="bg-brand p-3 rounded-2xl border border-brand-600 shadow-md">
                <p className="text-[8px] text-brand-100 font-bold">
                  AUTO TRANSLATED
                </p>
                <p className="text-[11px] font-semibold text-white">
                  "સાંજે 5 વાગ્યે"
                </p>
              </div>
            </div>
            <button
              onClick={handleStartChatting}
              className="w-full bg-brand hover:bg-brand-600 text-white font-extrabold text-[10px] py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1 shadow-md shadow-brand/10"
            >
              Access Mobile Chat <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
