import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Globe,
  ArrowUpRight,
  RefreshCw,
  Wifi,
  Battery,
} from "lucide-react";

export default function Hero({
  navigate,
  handleStartChatting,
  languages,
  messages,
  typing,
}) {
  return (
    <section className="relative pt-12 pb-24 md:py-32 overflow-hidden bg-slate-50">
      {/* Soft decorative background circles */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-200/20 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-1/4 w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        {/* Left Text Column */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: "spring", damping: 20 }}
          className="lg:col-span-6 text-center lg:text-left space-y-8"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-brand/5 text-brand rounded-full border border-brand-100 text-xs font-bold uppercase tracking-widest mx-auto lg:mx-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            Next-Gen Multilingual Workspace
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-slate-900 leading-[1.1]">
            Speak Your Language.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand to-indigo-600">
              Understand Everyone.
            </span>
          </h1>

          <p className="text-lg text-slate-500 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
            Collaborate naturally in your preferred language while Biz-Translate
            instantly translates messages for every participant in real time.
            Share texts, images, and videos without boundaries.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button
              onClick={handleStartChatting}
              className="bg-brand text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-brand/20 hover:bg-brand-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 group text-base cursor-pointer"
            >
              Start Chatting
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#contact"
              className="bg-white text-slate-800 font-bold px-8 py-4 rounded-2xl hover:bg-slate-50 transition-all border border-slate-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              Request Demo
            </a>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">
              Supporting Over 15 Major Global Languages
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2.5 max-w-lg mx-auto lg:mx-0">
              {languages.slice(0, 8).map((lang) => (
                <span
                  key={lang.name}
                  className="px-3 py-1 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-full border border-slate-200/80 shadow-sm transition-all flex items-center gap-1.5 cursor-default hover:border-brand/40"
                >
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                </span>
              ))}
              <span className="px-3 py-1 bg-brand-50 text-xs font-bold text-brand rounded-full border border-brand-100 cursor-default animate-pulse">
                + More
              </span>
            </div>
          </div>
        </motion.div>

        {/* Right Showcase Column (Real-time translation animation) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-6 flex justify-center"
        >
          {/* Outer smartphone container with precise device styling */}
          <div className="relative w-full max-w-[340px] bg-slate-900 rounded-[50px] p-3 shadow-2xl border-[6px] border-slate-950">
            {/* Dynamic glare shine across screen */}
            <div className="absolute inset-3 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 rounded-[44px] pointer-events-none z-30" />

            {/* Notch Camera Capsule */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-950 rounded-full flex items-center justify-between px-3 z-30 shadow-inner">
              <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-800/80 flex items-center justify-center p-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-900" />
              </div>
              <div className="w-10 h-1 bg-slate-800 rounded-full" />
            </div>

            {/* Screen layout */}
            <div className="bg-slate-950 rounded-[40px] h-[580px] overflow-hidden flex flex-col border border-slate-950 relative shadow-inner">
              {/* Phone Status Bar */}
              <div className="h-10 bg-slate-900 px-6 flex justify-between items-center text-[10px] text-slate-300 font-bold z-20 shrink-0 pt-2">
                <span>9:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black uppercase tracking-tighter">
                    5G
                  </span>
                  <Wifi className="w-3.5 h-3.5 text-slate-350" />
                  <Battery className="w-4 h-4 text-slate-350" />
                </div>
              </div>

              {/* Chat Panel App Bar */}
              <div className="h-16 bg-slate-900 px-4 border-b border-slate-800/60 flex items-center gap-3 z-10 shrink-0 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand flex items-center justify-center text-brand font-black text-xs shadow-inner">
                  BA
                </div>
                <div>
                  <h3 className="text-xs font-black text-white">
                    Biz-Translate Neural Room
                  </h3>
                  <p className="text-[8px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />{" "}
                    Real-time active
                  </p>
                </div>
              </div>

              {/* Message Arena */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950 custom-scrollbar">
                {messages.length === 0 && !typing && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3 text-center">
                    <Globe
                      className="w-8 h-8 text-brand/35 animate-spin"
                      style={{ animationDuration: "6s" }}
                    />
                    <p className="text-[10px] font-bold uppercase tracking-wider">
                      Acquiring Translated Roster...
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${msg.sender === "Gujarati User" ? "items-start" : "items-end"}`}
                  >
                    {/* User flag & lang badge */}
                    <span className="text-[8px] font-bold text-slate-500 uppercase mb-1 px-1 flex items-center gap-1.5">
                      <span>{msg.sender}</span>
                      <span className="px-1.5 py-0.5 bg-slate-900 rounded text-slate-400 font-black border border-slate-800">
                        {msg.sender === "Gujarati User"
                          ? "🇬🇧/🇬🇯 Gujarati"
                          : "🇮🇳 Hindi"}
                      </span>
                    </span>

                    {/* Chat Bubble with neural neon glow */}
                    <div className="relative group max-w-[85%]">
                      <AnimatePresence>
                        {msg.translating && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-brand/20 rounded-2xl blur-md border border-brand animate-pulse z-0"
                          />
                        )}
                      </AnimatePresence>

                      <div
                        className={`relative z-10 px-4 py-3 rounded-2xl text-xs font-semibold border ${
                          msg.sender === "Gujarati User"
                            ? "bg-slate-900 border-slate-800 text-slate-200 shadow-sm"
                            : "bg-brand border-brand-600 text-white shadow-md shadow-brand/10"
                        }`}
                      >
                        {msg.translating ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-300" />
                            <span className="italic text-slate-400 text-[10.5px]">
                              Translating...
                            </span>
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </div>

                    {/* Status information */}
                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[8px] text-slate-655 text-slate-600 font-medium">
                        {msg.time}
                      </span>
                      {msg.isTranslated && (
                        <span className="text-[8px] text-brand-400 font-bold flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5 text-amber-400" />{" "}
                          Auto-Translated
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Typing status bubble */}
                {typing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-start"
                  >
                    <span className="text-[8px] font-bold text-slate-500 uppercase mb-1 px-1">
                      {typing} typing...
                    </span>
                    <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-1 shadow-inner">
                      <div
                        className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Bottom text bar mock */}
              <div className="h-14 bg-slate-900 px-4 border-t border-slate-800/60 flex items-center justify-between gap-2.5 shrink-0 pb-2">
                <div className="flex-1 bg-slate-950 rounded-full h-8 px-4 flex items-center text-[10px] text-slate-500 font-bold cursor-default border border-slate-800 shadow-inner">
                  Write securely...
                </div>
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white shadow-md">
                  <ArrowUpRight className="w-4 h-4 rotate-45" />
                </div>
              </div>
            </div>

            {/* Glowing active badge */}
            <div className="absolute -bottom-6 -right-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xl flex items-center gap-3 z-30">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center text-brand font-black shadow-sm">
                文
              </div>
              <div className="text-left">
                <h4 className="text-[10px] font-bold text-slate-800">
                  Neural Engine
                </h4>
                <p className="text-[8px] text-slate-400 font-semibold uppercase">
                  Active
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
