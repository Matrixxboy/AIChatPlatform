import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Globe, MessageSquare, Zap, UserPlus } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    { step: '01', title: 'Choose Your Preferred Language', desc: 'Upon sign-in, select the language you are most comfortable with. The entire platform matches this setting automatically.', detail: 'Switch or update anytime in your settings.', icon: Globe, iconColor: 'text-blue-500 bg-blue-50 border-blue-100' },
    { step: '02', title: 'Search & Add Your Contacts', desc: 'To start chatting with anyone, simply search for their @username in your active dashboard search bar and send a connection request.', detail: 'Connect securely with anyone worldwide.', icon: UserPlus, iconColor: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
    { step: '03', title: 'Write Normally in Your Tongue', desc: 'Type message boxes naturally. You never have to manually translate or use separate copy/paste tools.', detail: 'Write as if they speak your language.', icon: MessageSquare, iconColor: 'text-rose-500 bg-rose-50 border-rose-100' },
    { step: '04', title: 'Instant Neural Translation', desc: 'Biz-AiChat instantly translates all outbound and inbound texts to the respective preferred language of each user.', detail: 'Process occurs invisibly in milliseconds.', icon: Zap, iconColor: 'text-amber-500 bg-amber-50 border-amber-100' }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-slate-50 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">
            Frictionless, High-Speed Flow
          </h2>
          <p className="text-slate-500 font-medium text-base">
            Initiate communication channels across multiple borders in a few clicks.
          </p>
        </div>

        {/* Timeline steps */}
        <div className="relative">
          {/* Center connector line (Desktop only) */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-16 lg:space-y-24">
            {steps.map((stepObj, idx) => (
              <div key={stepObj.step} className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-0 relative ${
                idx % 2 === 0 ? '' : 'lg:flex-row-reverse'
              }`}>
                
                {/* Text panel */}
                <div className="w-full lg:w-1/2 flex justify-center px-0 lg:px-12">
                  <motion.div 
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm max-w-lg w-full space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-5xl font-black text-brand/10 font-display">{stepObj.step}</div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${stepObj.iconColor}`}>
                        <stepObj.icon className="w-5.5 h-5.5" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{stepObj.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed font-medium">{stepObj.desc}</p>
                    <div className="pt-3 border-t border-slate-100 text-xs font-bold text-slate-400 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      {stepObj.detail}
                    </div>
                  </motion.div>
                </div>

                {/* Bullet center dot */}
                <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center justify-center z-10">
                  <div className="w-10 h-10 rounded-full bg-white border-4 border-slate-200 flex items-center justify-center text-xs font-black text-brand shadow-sm">
                    {stepObj.step}
                  </div>
                </div>

                {/* Image/Mock space */}
                <div className="w-full lg:w-1/2 flex justify-center px-0 lg:px-12">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="bg-white rounded-3xl w-full max-w-md h-48 border border-slate-200/80 flex items-center justify-center overflow-hidden relative group shadow-sm"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-brand/5 to-transparent pointer-events-none" />
                    {idx === 0 && (
                      <div className="flex flex-col items-center gap-4">
                        <Globe className="w-12 h-12 text-brand animate-bounce" />
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-slate-50 border border-slate-200 text-[10px] font-bold rounded-lg text-brand shadow-sm">🇬🇧 English</span>
                          <span className="px-3 py-1 bg-slate-50 border border-slate-200 text-[10px] font-bold rounded-lg text-slate-500 shadow-sm">🇪🇸 Español</span>
                          <span className="px-3 py-1 bg-slate-50 border border-slate-200 text-[10px] font-bold rounded-lg text-slate-500 shadow-sm">🇮🇳 हिन्दी</span>
                        </div>
                      </div>
                    )}
                    {idx === 1 && (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                          <UserPlus className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-lg text-[10.5px] font-bold text-slate-600 shadow-sm flex items-center gap-2">
                          <span>Search:</span> <span className="text-slate-800 font-black">@parth_patel</span>
                        </div>
                      </div>
                    )}
                    {idx === 2 && (
                      <div className="flex flex-col items-center gap-3">
                        <MessageSquare className="w-12 h-12 text-rose-500 animate-pulse" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Type in your native tongue</p>
                      </div>
                    )}
                    {idx === 3 && (
                      <div className="flex flex-col items-center gap-3">
                        <Zap className="w-12 h-12 text-amber-500 animate-pulse" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Real-Time Neural Engine</p>
                      </div>
                    )}
                  </motion.div>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
