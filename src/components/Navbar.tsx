import React, { useEffect, useState } from 'react';
import { PhoneCall } from 'lucide-react';

interface NavbarProps {
  onNavigateTab: (tab: 'first-aid' | 'fir-ocr' | 'bail-engine') => void;
  onOpenNalsa: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigateTab,
  onOpenNalsa,
}) => {
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolledPastHero(window.scrollY > 440);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToSection = (
    sectionId: string,
    tab?: 'first-aid' | 'fir-ocr' | 'bail-engine'
  ) => {
    if (tab) {
      onNavigateTab(tab);
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header
      className={`no-print fixed inset-x-0 top-0 z-40 transition-colors duration-200 backdrop-blur-md ${
        scrolledPastHero
          ? 'bg-[#FFFFEB]/92 text-[#1A1A1A] border-b border-[#E4E4D0]'
          : 'bg-[#121211]/70 text-[#FFFFEB] border-b border-[#FFFFEB]/10'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-8 px-5 sm:px-8 lg:px-12">
        {/* Zone 1: Clean single-element wordmark */}
        <a
          href="#top"
          className="font-display text-xl font-bold tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0041CA] rounded"
        >
          NyayaSetu
        </a>

        {/* Zone 2: 4 simple single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className={`hidden md:flex items-center gap-7 text-sm font-medium ${
            scrolledPastHero ? 'text-[#4A4A43]' : 'text-[#FFFFEB]/75'
          }`}
        >
          <button
            type="button"
            onClick={() => scrollToSection('workspace', 'first-aid')}
            className={`transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer hover:underline underline-offset-4 ${
              scrolledPastHero ? 'hover:text-[#1A1A1A]' : 'hover:text-[#FFFFEB]'
            }`}
          >
            Ask Help
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('workspace', 'fir-ocr')}
            className={`transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer hover:underline underline-offset-4 ${
              scrolledPastHero ? 'hover:text-[#1A1A1A]' : 'hover:text-[#FFFFEB]'
            }`}
          >
            Scan FIR
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('workspace', 'bail-engine')}
            className={`transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer hover:underline underline-offset-4 ${
              scrolledPastHero ? 'hover:text-[#1A1A1A]' : 'hover:text-[#FFFFEB]'
            }`}
          >
            Bail Check
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('statutory-codes')}
            className={`transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer hover:underline underline-offset-4 ${
              scrolledPastHero ? 'hover:text-[#1A1A1A]' : 'hover:text-[#FFFFEB]'
            }`}
          >
            Your Rights
          </button>
        </nav>

        {/* Zone 3: 1 Primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenNalsa}
            className="btn-cobalt inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Free Lawyer 15100</span>
          </button>
        </div>
      </div>
    </header>
  );
};
