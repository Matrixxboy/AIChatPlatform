import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Image as ImageIcon, Users } from 'lucide-react';

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white border-y border-slate-100 relative">
      <div className="max-w-7xl mx-auto px-6 space-y-24">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">
            Features Built For Global Action
          </h2>
          <p className="text-slate-500 font-medium text-base">
            Everything you need for fluent, natural, cross-border conversations.
          </p>
        </div>

        <div className="space-y-20">
          {/* Feature 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand/5 text-brand rounded-full border border-brand/10 text-[10px] font-bold uppercase tracking-widest">
                Neural Layer
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-black text-slate-900">
                Real-Time AI Translation
              </h3>
              <p className="text-slate-500 text-base leading-relaxed font-medium">
                Experience instantaneous message translation while keeping your stream velocity active. Our model retains conversational continuity, local context, and vocabulary nuance seamlessly.
              </p>
              <ul className="space-y-3 font-semibold text-sm text-slate-600">
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand text-xs">✓</span>
                  Tone & context-aware phrase mapping
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand text-xs">✓</span>
                  Supports over 15 major languages
                </li>
              </ul>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-slate-50 border border-slate-200 p-6 rounded-3xl h-80 flex flex-col justify-center gap-4 relative overflow-hidden shadow-sm"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl" />
              <div className="bg-white p-4 rounded-2xl border border-slate-200 max-w-[80%] shadow-sm">
                <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Incoming Spanish</p>
                <p className="text-xs font-semibold text-slate-700">"Hola, ¿cómo va el desarrollo del proyecto?"</p>
              </div>
              <div className="flex justify-center my-1">
                <div className="bg-brand/10 text-brand border border-brand/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" /> AI Engine Processing
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 max-w-[80%] self-end shadow-sm">
                <p className="text-[10px] text-brand uppercase font-black mb-1">Natively English User Sees</p>
                <p className="text-xs font-semibold text-slate-800">"Hello, how is the project development going?"</p>
              </div>
            </motion.div>
          </div>

          {/* Feature 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center lg:flex-row-reverse">
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6 lg:order-2"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-500/5 text-purple-600 rounded-full border border-purple-500/10 text-[10px] font-bold uppercase tracking-widest">
                Rich Interaction
              </div>
              <h3 className="text-2xl sm:text-3xl font-display font-black text-slate-900">
                Rich Media Messaging
              </h3>
              <p className="text-slate-500 text-base leading-relaxed font-medium">
                Converse via text, share crisp photos, project attachments, and media files directly in your channels. Inline loaders and fast delivery ensure beautiful previews.
              </p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-slate-50 border border-slate-200 p-6 rounded-3xl h-80 flex items-center justify-center relative overflow-hidden lg:order-1 shadow-sm"
            >
              <div className="bg-white p-4 rounded-2xl border border-slate-200 w-full max-w-sm shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-600">P</div>
                    <span className="text-[10px] font-bold text-slate-800">Parth Patel</span>
                  </div>
                  <span className="text-[9px] text-slate-400">Just Now</span>
                </div>
                <div className="w-full h-36 bg-slate-100 rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-200 group">
                  <ImageIcon className="w-10 h-10 text-purple-500 animate-pulse" />
                  <div className="absolute bottom-3 left-3 z-20">
                    <p className="text-[10px] font-bold text-slate-800">Project_Mockup.jpg</p>
                    <p className="text-[8px] text-slate-400">1.4 MB • Image</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
