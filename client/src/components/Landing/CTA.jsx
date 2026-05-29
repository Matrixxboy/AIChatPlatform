import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function CTA({ handleStartChatting, navigate }) {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Soft atmospheric gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-brand-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
        <h2 className="text-4xl sm:text-5xl font-display font-black tracking-tight text-slate-900 leading-tight">
          The World Speaks Different Languages.<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand to-indigo-600">
            Your Conversations Don't Have To.
          </span>
        </h2>

        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
          Break communication barriers and connect with anyone, anywhere, in the language you understand best.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button 
            onClick={handleStartChatting} 
            className="bg-brand text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-brand/20 hover:bg-brand-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group text-base cursor-pointer"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => navigate('/login')} 
            className="bg-slate-50 text-slate-700 font-bold px-8 py-4 rounded-2xl hover:bg-slate-100 transition-all border border-slate-200 cursor-pointer"
          >
            Schedule Demo
          </button>
        </div>
      </div>
    </section>
  );
}
