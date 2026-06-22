import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";

export default function Navbar({
  user,
  navigate,
  handleStartChatting,
  mobileMenuOpen,
  setMobileMenuOpen,
  activeSection,
}) {
  const navItems = [
    { label: "How It Works", id: "how-it-works" },
    { label: "Features", id: "features" },
    { label: "Languages", id: "languages" },
    { label: "Solutions", id: "use-cases" },
    { label: "Contact", id: "contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-all duration-300 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <div className="w-10 h-10 overflow-hidden flex items-center justify-center p-0.5">
            <img
              src="/ai-chat-platform/biz-insightslogo1.png"
              alt="Logo"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <span className="text-xl font-display font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-brand-600">
            Biz-<span className="text-brand">Translate</span>
          </span>
        </div>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-8 h-full">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`text-sm font-semibold relative py-2 transition-colors duration-300 ${
                activeSection === item.id
                  ? "text-brand"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {item.label}
              {activeSection === item.id && (
                <motion.div
                  layoutId="navbar-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                {user.name} ({user.preferredLanguage})
              </span>
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand-600 shadow-md shadow-brand/10 transition-all flex items-center gap-2 group cursor-pointer"
              >
                Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </>
          ) : (
            <>
              {/* <button
                onClick={() => navigate("/login")}
                className="text-sm font-bold text-slate-600 hover:text-slate-950 px-4 py-2 transition-colors cursor-pointer"
              >
                Sign In
              </button> */}
              <button
                onClick={handleStartChatting}
                className="bg-blue-600 text-white text-sm font-extrabold px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center gap-2 group cursor-pointer"
              >
                Sign In
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-white" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-slate-600 hover:text-slate-950 rounded-lg transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl px-6 py-6 space-y-6 shadow-xl"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-base font-semibold transition-colors ${
                    activeSection === item.id
                      ? "text-brand"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
            <hr className="border-slate-100" />
            <div className="flex flex-col gap-4">
              {user ? (
                <>
                  <div className="text-sm font-semibold text-slate-600">
                    Logged in as: {user.name}
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/dashboard");
                    }}
                    className="w-full bg-brand text-white font-bold py-3 rounded-xl hover:bg-brand-600 transition-all text-center"
                  >
                    Enter Dashboard
                  </button>
                </>
              ) : (
                <>
                  {/* <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate("/login");
                    }}
                    className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    Sign In
                  </button> */}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleStartChatting();
                    }}
                    className="w-full bg-blue-600 text-white font-extrabold py-3 rounded-xl hover:bg-slate-800 transition-all"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
