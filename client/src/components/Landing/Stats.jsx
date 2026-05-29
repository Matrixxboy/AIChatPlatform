import React from 'react';
import { motion } from 'framer-motion';
import { Globe, Users, Zap, ShieldCheck } from 'lucide-react';

export default function Stats() {
  const stats = [
    { value: '150+', label: 'Countries Connected', icon: Globe, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { value: '25M+', label: 'Messages Translated', icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { value: '99.9%', label: 'Uptime Reliability', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { value: '250K+', label: 'Active Business Users', icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' }
  ];

  return (
    <section className="py-16 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-6 rounded-2xl hover:bg-slate-50/50 transition-colors text-center sm:text-left"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight font-display">
                  {stat.value}
                </h3>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
