import React, { useEffect } from 'react';
import { CheckCircle2, PhoneCall, ShieldCheck, X } from 'lucide-react';

interface NalsaHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NalsaHelpModal: React.FC<NalsaHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nalsa-modal-title"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/75 p-4 sm:p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="ink-card w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[24px] bg-[#FFFFEB] p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E4E4D0] pb-4">
          <div>
            <p className="text-xs font-semibold text-[#0041CA]">
              Government Free Legal Aid
            </p>
            <h2
              id="nalsa-modal-title"
              className="mt-1 font-display text-2xl font-bold leading-tight text-[#1A1A1A]"
            >
              Get a Free Lawyer Now
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#1A1A1A] bg-[#F6F6E0] text-[#1A1A1A] hover:bg-[#F0D7FF] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A] text-[#FFFFEB] p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F0D7FF]">
              <PhoneCall className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Toll-Free Helpline</span>
            </div>
            <div className="mt-3 font-display text-4xl font-bold leading-none tabular-nums">
              15100
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-[#FFFFEB]/80">
              Call NALSA anytime to ask for a free district court lawyer.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border-2 border-[#1A1A1A] bg-[#F0D7FF] text-[#1A1A1A] p-5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#034F46]">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>100% Free by Law</span>
            </div>
            <p className="mt-3 font-display text-base font-bold leading-snug">
              Anyone in Custody Qualifies
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#1A1A1A]/80">
              No lawyer fees. Ask for the DLSA Legal Aid Desk at your local
              district court.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-[#E4E4D0] pt-5">
          <h3 className="font-display text-sm font-bold text-[#1A1A1A]">
            3 Things to Ask at the Police Station
          </h3>
          <ul className="space-y-2.5 text-sm leading-relaxed text-[#4A4A43]">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-[#034F46] shrink-0 mt-0.5" aria-hidden="true" />
              <span>Ask for the written Arrest Memo and reason for arrest.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-[#034F46] shrink-0 mt-0.5" aria-hidden="true" />
              <span>Ask for a free copy of the FIR to check if bail is available.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-[#034F46] shrink-0 mt-0.5" aria-hidden="true" />
              <span>Police must take the person to a Magistrate within 24 hours.</span>
            </li>
          </ul>
        </div>

        <div className="mt-6 flex justify-end border-t border-[#E4E4D0] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-cobalt min-h-[42px] px-5 py-2.5 text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap shrink-0"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
