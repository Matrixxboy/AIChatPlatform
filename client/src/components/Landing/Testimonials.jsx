import React from "react";
import { motion } from "framer-motion";
import { Star, CheckCircle, Sparkles } from "lucide-react";

export default function Testimonials() {
  const reviews = [
    {
      name: "Sarah Jenkins",
      role: "VP of Global Operations",
      company: "Stripe",
      rating: 5,
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      quote:
        "Biz-OmniLang has revolutionized our offshore support operations. Our US team connects seamlessly with Latin American contractors, translating complex technical specs instantly.",
    },
    {
      name: "Rohan Sharma",
      role: "Lead Project Coordinator",
      company: "Accenture",
      rating: 5,
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      quote:
        "Incredibly fast! We no longer have to copy-paste slang into secondary translator tabs. The Gujarati-to-Hindi and Hindi-to-English translation pipelines deliver within milliseconds.",
    },
    {
      name: "Elena Rostova",
      role: "Director of Customer Experience",
      company: "Shopify",
      rating: 5,
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      quote:
        "The interface is beautiful and extremely easy to learn. Connecting with global support executives by searching their @username has streamlined our team setup by 3x.",
    },
  ];

  return (
    <section
      id="testimonials"
      className="py-24 bg-slate-50 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Title Block */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/5 text-brand rounded-full border border-brand-100 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />{" "}
            Customer Success Stories
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">
            Trusted by Modern Teams Globally
          </h2>
          <p className="text-slate-500 font-medium text-base">
            See how international operations teams use Biz-OmniLang to maintain
            rapid velocity.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, idx) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-lg flex flex-col justify-between space-y-6 hover:shadow-xl hover:border-brand-200 transition-all duration-300"
            >
              <div className="space-y-4">
                {/* 5-Star Ratings */}
                <div className="flex gap-1 text-amber-400">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-655 text-slate-600 text-sm leading-relaxed font-semibold italic">
                  "{review.quote}"
                </p>
              </div>

              {/* User details */}
              <div className="flex gap-4 items-center pt-4 border-t border-slate-100">
                <div className="w-11 h-11 rounded-full border border-slate-200 shadow-sm shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {review.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    {review.name}
                    <CheckCircle className="w-3.5 h-3.5 text-brand shrink-0" />
                  </h4>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    {review.role} •{" "}
                    <span className="text-slate-655 text-slate-500 font-black">
                      {review.company}
                    </span>
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
