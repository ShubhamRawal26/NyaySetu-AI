/**
 * @fileoverview Minimal editorial footer with direct trigger for NALSA Free Legal Aid Helpline 15100.
 */

import React from 'react';

interface FooterProps {
  onOpenNalsa: () => void;
}

/**
 * Renders the application footer bar.
 */
export const Footer: React.FC<FooterProps> = ({ onOpenNalsa }) => {
  return (
    <footer className="no-print border-t border-[#FFFFEB]/10 bg-[#1A1A1A] text-[#FFFFEB]">
      <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8 sm:py-12 lg:px-12 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="font-display text-lg font-bold tracking-tight text-[#FFFFEB]">
            NyayaSetu
          </div>
          <p className="text-xs sm:text-[13px] leading-relaxed text-[#FFFFEB]/70 max-w-lg">
            Simple legal information under BNS &amp; BNSS 2023. Always confirm
            court filings with a lawyer or free NALSA legal aid counsel.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNalsa}
          className="inline-flex min-h-[40px] items-center text-xs sm:text-sm font-semibold text-[#F0D7FF] hover:text-[#FFFFEB] underline underline-offset-4 transition-colors cursor-pointer self-start sm:self-center whitespace-nowrap shrink-0"
        >
          Free Government Legal Aid · Call 15100
        </button>
      </div>
    </footer>
  );
};
