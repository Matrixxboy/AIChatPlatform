import React from "react";
import { motion } from "framer-motion";

export default function UseCases() {
  const usecases = [
    {
      role: "Global Enterprise Teams",
      desc: "Collaborate dynamically with cross-border departments, maintain sync, and improve daily deliverables without language latency.",
      usecase: "Real-time department channels",
    },
    {
      role: "Global Customer Support",
      desc: "Allow local support executives to answer international issues in their user's native languages immediately.",
      usecase: "High satisfaction CSAT scores",
    },
    {
      role: "Multilingual Remote Staff",
      desc: "Drive communication alignment and cross-department collaboration within a fully distributed workforce.",
      usecase: "Increased trust & efficiency",
    },
    {
      role: "Educational Organizations",
      desc: "Enable global experts to teach online while international students read in their preferred target vocabulary.",
      usecase: "Democratized classrooms",
    },
    {
      role: "International Communities",
      desc: "Build community channels, chat panels, and discussion grids where global participants converse naturally.",
      usecase: "Maximized platform growth",
    },
    {
      role: "Multinational Sales Channels",
      desc: "Accelerate deal closing rates by letting account executives negotiate directly in the client's native tongue.",
      usecase: "Improved conversion pipeline",
    },
  ];

  return (
    <section
      id="use-cases"
      className="py-24 bg-white border-y border-slate-100 relative"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">
            Engineered For Diverse Workflows
          </h2>
          <p className="text-slate-500 font-medium text-base">
            Explore how global operations are leveraging Biz-OmniLang to break
            operational barriers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {usecases.map((uc, idx) => (
            <motion.div
              key={uc.role}
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="bg-slate-50/50 p-8 rounded-3xl border border-slate-200/85 hover:bg-white hover:border-brand/20 hover:shadow-xl transition-all space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="text-xs font-bold text-brand uppercase tracking-widest bg-brand/5 border border-brand/10 px-3 py-1 rounded-md inline-block">
                  {uc.usecase}
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {uc.role}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  {uc.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
