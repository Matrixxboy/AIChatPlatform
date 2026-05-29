import React from 'react';
import { Globe, Shield, MessageSquare, Heart } from 'lucide-react';

export default function Footer() {
  const footerLinks = [
    {
      title: 'Product',
      links: [
        { label: 'Translation Engine', href: '#features' },
        { label: 'Media Sharing', href: '#features' },
        { label: 'Security Protocols', href: '#' },
        { label: 'Enterprise Setup', href: '#' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'Language Matrix', href: '#languages' },
        { label: 'API Reference', href: '#' },
        { label: 'Platform Status', href: '#' }
      ]
    },
    {
      title: 'Solutions',
      links: [
        { label: 'Global Teams', href: '#use-cases' },
        { label: 'Customer Support', href: '#use-cases' },
        { label: 'Remote Offices', href: '#use-cases' },
        { label: 'Case Studies', href: '#' }
      ]
    }
  ];

  return (
    <footer className="border-t border-slate-200/80 bg-slate-50 py-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 border-b border-slate-200 pb-12">
        
        {/* Brand Description Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center p-0.5 shadow-sm">
              <img src="/ai-chat-platform/LOGO.jpg" alt="Logo" className="w-full h-full object-cover rounded-lg" />
            </div>
            <span className="text-xl font-display font-extrabold tracking-tight text-slate-900">
              Biz-<span className="text-brand">AiChat</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Biz-AiChat is a premium multilingual communication workspace connecting global operations in real-time, eliminating language friction instantly.
          </p>
          <div className="flex items-center gap-3 text-slate-400 text-xs font-bold uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-xl inline-flex shadow-sm">
            <Shield className="w-4 h-4 text-emerald-500" /> End-to-End Encrypted
          </div>
        </div>

        {/* Dynamic Multi-column Links */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
          {footerLinks.map((column) => (
            <div key={column.title} className="space-y-4">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                {column.title}
              </h4>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm font-semibold text-slate-600 hover:text-brand transition-colors duration-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

      </div>

      {/* Copyright Bottom Bar */}
      <div className="max-w-7xl mx-auto px-6 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 font-semibold">
        <p>© {new Date().getFullYear()} Biz-AiChat Platform. Powered by BizInsights Enterprise. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Contact Support</a>
        </div>
      </div>
    </footer>
  );
}
