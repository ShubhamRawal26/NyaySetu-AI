import React, { useState } from 'react';
import { ArrowRight, FileScan, Mic, Scale } from 'lucide-react';

interface HeroSectionProps {
  onLaunchFirstAid: () => void;
  onLaunchScanner: () => void;
}

const HERO_IMAGE_PATH = '/assets/aistudio/worker_ace1c74d.png';

const QUICK_FACTS = [
  { value: '15100', label: 'Free Government Lawyer' },
  { value: '24 hrs', label: 'Max Hold Before Court' },
  { value: '1/3rd', label: 'First-Offence Bail Rule' },
  { value: 'BNS 2023', label: 'Updated Indian Law' },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onLaunchFirstAid,
  onLaunchScanner,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <section id="top" className="no-print bg-[#FFFFEB]">
      {/* Curved Night-Emerald Hero */}
      <div className="wf-night pt-26 pb-16 sm:pt-30 sm:pb-18 lg:pt-32 lg:pb-22">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            {/* Left Clear Plain-English Hero */}
            <div className="flex flex-col justify-center lg:col-span-7">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#FFFFEB]/70">
                <span>Free Legal Help for India</span>
                <span aria-hidden="true">·</span>
                <span>BNS &amp; BNSS 2023</span>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-[#FFFFEB] text-balance"
                style={{
                  fontSize: 'clamp(2.4rem, 4.6vw, 4.2rem)',
                  lineHeight: 1.04,
                }}
              >
                Arrested or need bail? Know your rights in{' '}
                <span className="font-editorial-italic text-[#F0D7FF]">
                  seconds.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-[#FFFFEB]/80">
                Ask in plain English or Hindi, scan an FIR photo, or check if
                someone in jail qualifies for mandatory bail today.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onLaunchFirstAid}
                  className="btn-cobalt inline-flex items-center gap-2.5 px-6 py-3.5 text-sm sm:text-base font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  <span>Ask for Legal Help</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={onLaunchScanner}
                  className="inline-flex items-center gap-2 px-5 py-3.5 text-sm sm:text-base font-semibold text-[#FFFFEB] hover:bg-[#FFFFEB] hover:text-[#1A1A1A] border-2 border-[#FFFFEB]/35 hover:border-[#FFFFEB] rounded-xl transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileScan className="h-4 w-4" aria-hidden="true" />
                  <span>Scan FIR Photo</span>
                </button>
              </div>
            </div>

            {/* Right Main Emblem Visual */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <div className="relative flex items-center justify-center w-full max-w-[360px] aspect-square overflow-hidden rounded-[32px] border-2 border-[#FFFFEB]/20 bg-[#0D1615]/70 p-6 sm:p-8 shadow-2xl">
                {!imgError ? (
                  <img
                    src={HERO_IMAGE_PATH}
                    alt="NyayaSetu emblem showing scales of justice and magnifying glass"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="h-full w-full object-contain drop-shadow-[0_14px_28px_rgba(0,0,0,0.45)]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-[#034F46]/40 p-8 text-center rounded-2xl">
                    <Scale
                      className="h-11 w-11 text-[#F0D7FF] mb-3"
                      aria-hidden="true"
                    />
                    <p className="font-display text-base font-semibold text-[#FFFFEB]">
                      NyayaSetu Legal Aid
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact 4-Column Key Rights Strip */}
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12 -mt-8 relative z-10">
        <div className="ink-card grid grid-cols-2 gap-px overflow-hidden rounded-[22px] bg-[#1A1A1A] lg:grid-cols-4">
          {QUICK_FACTS.map((fact) => (
            <div
              key={fact.label}
              className="bg-[#FFFFEB] px-5 py-4 sm:px-6 sm:py-5"
            >
              <div className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1A] tabular-nums">
                {fact.value}
              </div>
              <div className="mt-1 text-xs sm:text-sm font-medium text-[#4A4A43]">
                {fact.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
