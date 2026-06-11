import React from "react";
import { motion } from "framer-motion";

export default function LanguagesOrbit({ languages }) {
  return (
    <section
      id="languages"
      className="py-24 bg-slate-50 overflow-hidden relative"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">
            Supported Languages & Dialects
          </h2>
          <p className="text-slate-500 font-medium text-base">
            Providing translation across the world's primary business languages.
          </p>
        </div>

        {/* Interactive Language Orbit Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {languages.map((lang, index) => (
            <motion.div
              key={lang.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-brand/40 p-4 rounded-2xl flex items-center gap-3.5 transition-all duration-300 hover:-translate-y-0.5 group cursor-default shadow-sm"
            >
              <div className="bg-slate-100 w-11 h-11 rounded-xl flex items-center justify-center border border-slate-200 group-hover:scale-105 transition-transform">
                <span className={`fi fi-${lang.countryCode} text-2xl`} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  {lang.name}
                </h4>
                <p className="text-[10.5px] text-slate-400 font-semibold">
                  {lang.native}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Glowing orbital aesthetic */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white rounded-full border border-slate-200 shadow-sm text-xs font-bold text-slate-500">
            <span className="w-2 h-2 bg-brand rounded-full animate-ping" />
            Continuously training our models to support more regional languages.
          </div>
        </div>
      </div>
    </section>
  );
}
