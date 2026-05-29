import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Zap, Globe, Image as ImageIcon, RefreshCw, Shield } from 'lucide-react';

export default function WhyLoveIt() {
  const cards = [
    { title: 'Speak Naturally', desc: 'No need to study vocabulary courses or struggle with dictionaries. Converse fluently in your home dialect.', icon: Heart, color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { title: 'Instant Processing', desc: 'Translations display dynamically. Our high-performance neural pipeline ensures milliseconds layer latency.', icon: Zap, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { title: 'Global Coverage', desc: 'Break borders and expand business networks. Build relationships with teams and partners anywhere.', icon: Globe, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { title: 'Rich Communication', desc: 'Converse via texts, clear graphic files, project mockups, or videos. Full features in one location.', icon: ImageIcon, color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { title: 'Invisible Experience', desc: 'The translation pipeline operates automatically behind the scene. No copy/pasting needed.', icon: RefreshCw, color: 'bg-brand/5 text-brand border-brand-100' },
    { title: 'Secure Messaging', desc: 'Private authentication tokens and advanced database layers protect all active channels and details.', icon: Shield, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' }
  ];

  return (
    <section className="py-24 bg-white border-t border-slate-100 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">
            Why Users Love Biz-AiChat
          </h2>
          <p className="text-slate-500 font-medium text-base">
            Designed from the ground up for elite human connection and zero friction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card, idx) => (
            <motion.div 
              key={card.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.06 }}
              className="bg-slate-50/50 p-8 rounded-3xl border border-slate-200/60 space-y-4 hover:bg-white hover:border-brand/20 hover:shadow-lg transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
