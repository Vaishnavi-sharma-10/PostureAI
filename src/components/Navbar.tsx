import React, { useState } from 'react';
import { Activity, Shield, Camera, BarChart3, HelpCircle, Menu, X, Cpu, Gauge } from 'lucide-react';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  isEngineActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  isEngineActive = true
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Overview', icon: Activity },
    { id: 'how-it-works', label: 'How It Works', icon: HelpCircle },
    { id: 'live-analysis', label: 'Live Assessment', icon: Camera },
    { id: 'progress', label: 'Progress & Trends', icon: BarChart3 },
    { id: 'technology', label: 'Technology', icon: Cpu },
    { id: 'evaluation', label: 'Evaluation', icon: Gauge }
  ];

  const handleNav = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#252a39] bg-[#0e1321]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <button
          id="nav-logo-btn"
          onClick={() => handleNav('home')}
          className="flex items-center gap-3 group text-left cursor-pointer focus:outline-none"
        >
          <div className="w-9 h-9 rounded-lg bg-[#1a1f2e] border border-[#00e5ff]/40 flex items-center justify-center glow-cyan-sm transition-all group-hover:border-[#00e5ff]">
            <svg
              className="w-5 h-5 text-[#00e5ff]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="5" r="2.5" />
              <path d="M12 7.5v8" />
              <path d="M7 11h10" />
              <path d="M9 21l3-5.5 3 5.5" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-telemetry text-lg font-bold tracking-wider text-white">
                POSTURE<span className="text-[#00e5ff]">AI</span>
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-telemetry uppercase tracking-widest bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30">
                v2.4
              </span>
            </div>
            <p className="text-[10px] text-[#949eb5] tracking-tight hidden sm:block">
              Biomechanical Telemetry
            </p>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-[#1a1f2e]/60 p-1 rounded-xl border border-[#252a39]">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}-btn`}
                onClick={() => handleNav(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/40 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                    : 'text-[#949eb5] hover:text-white hover:bg-[#252a39]/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right CTA and Telemetry Status */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1f2e] border border-[#252a39] text-[11px] font-telemetry text-[#949eb5]">
            <span className={`w-2 h-2 rounded-full ${isEngineActive ? 'bg-[#4edea3] animate-pulse' : 'bg-[#ffb95f]'}`} />
            <span>{isEngineActive ? 'VISION ENGINE READY' : 'CALIBRATING'}</span>
          </div>

          <button
            id="nav-quick-start-btn"
            onClick={() => handleNav('live-analysis')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00e5ff] text-[#0e1321] text-xs font-bold tracking-wide transition-all hover:bg-[#c3f5ff] hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>START ASSESSMENT</span>
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <button
            id="nav-mobile-start-btn"
            onClick={() => handleNav('live-analysis')}
            className="px-3 py-1.5 rounded-lg bg-[#00e5ff] text-[#0e1321] text-xs font-bold"
          >
            Assess
          </button>
          <button
            id="nav-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-[#1a1f2e] border border-[#252a39] text-[#dee2f6]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#252a39] bg-[#161b2a] px-4 pt-2 pb-5 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                id={`nav-mobile-${item.id}-btn`}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40'
                    : 'text-[#949eb5] hover:bg-[#1a1f2e]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
