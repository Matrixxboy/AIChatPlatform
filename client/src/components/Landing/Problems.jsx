import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Shield, Users, Heart, GraduationCap, Globe, ArrowUpRight } from 'lucide-react';

export default function Problems() {
  const problems = [
    { title: 'International Business', desc: 'Collaborate dynamically with overseas clients and partners without delayed, manual translation chains.', icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { title: 'Global Customer Support', desc: 'Solve support tickets and converse with global users instantly in their native language.', icon: Shield, color: 'text-brand bg-brand-50 border-brand-100' },
    { title: 'Remote Workforce', desc: 'Keep distributed teams unified. Align priorities without leaving anyone out of translation loops.', icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { title: 'Friends Across Borders', desc: 'Maintain meaningful global relationships without dealing with separate copy-paste translation tabs.', icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { title: 'Educational Academies', desc: 'Host international lectures and classrooms where students from all nations participate naturally.', icon: GraduationCap, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { title: 'Global Communities', desc: 'Build highly engaged multilingual chat boards, department channels, and global associations.', icon: Globe, color: 'text-amber-600 bg-amber-50 border-amber-100' }
  ];

  return (
    <section className="py-24 bg-white border-y border-slate-100 relative">
      <div className="max-w-7xl mx-auto px-6 text-center space-y-16">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight text-slate-900">
            Language Should Never Be A Barrier
          </h2>
          <p className="text-slate-500 font-medium text-base">
            Traditional translation software is clunky, slow, and separates teams. Biz-AiChat brings frictionless connection to every industry.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
          {problems.map((item, idx) => (
            <motion.div 
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-slate-50/50 rounded-3xl p-8 border border-slate-200/60 hover:border-brand/30 hover:bg-white transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="space-y-2.5">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-medium">{item.desc}</p>
                </div>
              </div>
              <div className="pt-6 flex items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-600 transition-colors cursor-pointer group">
                Learn more <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
