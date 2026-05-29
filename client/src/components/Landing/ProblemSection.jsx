import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle, AlertTriangle, ArrowRight, Zap, Copy, ShieldAlert } from 'lucide-react';

export default function ProblemSection() {
  return (
    <section id="problems-analysis" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Title Block */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">
            Why Traditional Translation Fails
          </h2>
          <p className="text-slate-500 font-medium text-base">
            Manual translation tabs, delayed copy-pastes, and out-of-context slang ruin business communications. Here is how Biz-AiChat solves it.
          </p>
        </div>

        {/* Before vs After Side-by-Side Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
          
          {/* Left Side: The Painful Status Quo */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-red-50/50 rounded-3xl p-8 border border-red-100 flex flex-col justify-between space-y-8"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-full border border-red-200 text-xs font-bold uppercase tracking-widest">
                <AlertTriangle className="w-4 h-4" /> Traditional Messy Workflow
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                The Friction of Manual Tools
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed font-semibold">
                Copying messages to external tabs, struggling to translate idioms, and losing momentum breaks client trust and team sync.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { title: 'Exhaustive Copy-Pasting', desc: 'Leaving your active chat window constantly to copy text into Google Translate.', icon: Copy },
                { title: 'Slang & Context Errors', desc: 'Literal word-by-word systems fail to capture local idioms or technical vocabulary.', icon: ShieldAlert },
                { title: '40%+ Conversation Delays', desc: 'Waiting for team members to compile, translate, and re-type replies.', icon: XCircle }
              ].map((item) => (
                <div key={item.title} className="bg-white/80 p-4 rounded-2xl border border-red-100/50 flex gap-4 items-start shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shrink-0">
                    <item.icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Side: The Biz-AiChat Flow */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-brand-50/50 rounded-3xl p-8 border border-brand-100/60 flex flex-col justify-between space-y-8"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-100 text-brand rounded-full border border-brand-200/50 text-xs font-bold uppercase tracking-widest animate-pulse">
                <Zap className="w-4 h-4 text-amber-500" /> Biz-AiChat Experience
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Seamless Real-time Conversing
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed font-semibold">
                Type naturally. Speak naturally. All messages convert instantly on-the-fly, keeping tone, velocity, and clarity intact.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { title: 'Zero App-Switching Needed', desc: 'All incoming and outgoing texts translate automatically directly inside your chat threads.', icon: CheckCircle },
                { title: 'Nuanced Idiomatic Accuracy', desc: 'Our neural models read slang and professional syntax to preserve intended meaning.', icon: CheckCircle },
                { title: 'Milliseconds Delivery Speed', desc: 'Zero lag. Real-time translation sync matches standard communication speed.', icon: Zap }
              ].map((item) => (
                <div key={item.title} className="bg-white/80 p-4 rounded-2xl border border-brand-100/30 flex gap-4 items-start shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100/50 flex items-center justify-center text-brand shrink-0">
                    <item.icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
