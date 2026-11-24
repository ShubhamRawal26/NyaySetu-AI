import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Clock,
  FileText,
  PhoneCall,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { BNS_STATUTORY_CATALOG } from '../shared/bnsCatalog';
import type {
  BailTransferPayload,
  StatutorySectionRecord,
} from '../types/legal';

interface StatutoryReferenceSectionProps {
  onAskAboutSection: (section: StatutorySectionRecord) => void;
  onCalculateSectionBail: (payload: BailTransferPayload) => void;
}

const KEY_RIGHTS = [
  {
    icon: FileText,
    statute: 'Sec. 47 BNSS',
    title: 'Written Reason for Arrest',
    summary: 'Police must give your family the Arrest Memo and reason in writing.',
    surfaceClass: 'bg-[#F0D7FF] text-[#1A1A1A] border-2 border-[#1A1A1A]',
    mutedClass: 'text-[#1A1A1A]/75',
  },
  {
    icon: ShieldCheck,
    statute: 'Sec. 478 BNSS',
    title: 'Station Bail Is a Right',
    summary: 'For bailable charges, the police station must release you on bond.',
    surfaceClass: 'bg-[#1A1A1A] text-[#FFFFEB]',
    mutedClass: 'text-[#FFFFEB]/75',
  },
  {
    icon: Clock,
    statute: 'Sec. 479 BNSS',
    title: 'Mandatory 1/3rd Bail',
    summary: 'First-time undertrials get bail after serving 1/3rd of max jail time.',
    surfaceClass: 'bg-[#0041CA] text-white',
    mutedClass: 'text-white/80',
  },
  {
    icon: PhoneCall,
    statute: 'Helpline 15100',
    title: 'Free Government Lawyer',
    summary: 'Anyone in custody gets a 100% free defense lawyer via NALSA.',
    surfaceClass: 'bg-[#FFA946] text-[#1A1A1A] border-2 border-[#1A1A1A]',
    mutedClass: 'text-[#1A1A1A]/80',
  },
];

export const StatutoryReferenceSection: React.FC<
  StatutoryReferenceSectionProps
> = ({ onAskAboutSection, onCalculateSectionBail }) => {
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? BNS_STATUTORY_CATALOG.filter(
          (item) =>
            item.bnsSection.toLowerCase().includes(q) ||
            item.ipcSection.toLowerCase().includes(q) ||
            item.title.toLowerCase().includes(q) ||
            item.keywords.some((k) => k.includes(q))
        )
      : BNS_STATUTORY_CATALOG;

    return q || showAll ? list : list.slice(0, 6);
  }, [search, showAll]);

  return (
    <section
      id="statutory-codes"
      className="no-print border-t border-[#E4E4D0] bg-[#FFFFEB] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12 space-y-16">
        {/* 4 Color-Blocked Rights Cards with Crisp SVG Icons */}
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1A]">
            Four rights every citizen{' '}
            <span className="font-editorial-italic">has.</span>
          </h2>

          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {KEY_RIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`${item.surfaceClass} rounded-[24px] p-6 flex flex-col justify-between gap-5 transition-transform duration-200 hover:-translate-y-1`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className={`text-xs font-mono ${item.mutedClass}`}>
                      {item.statute}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold leading-snug">
                      {item.title}
                    </h3>
                    <p className={`mt-1.5 text-sm leading-relaxed ${item.mutedClass}`}>
                      {item.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Simple Searchable Common Sections Table */}
        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1A]">
                Common police sections{' '}
                <span className="font-editorial-italic">(BNS &amp; IPC).</span>
              </h2>
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C8C80]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search 323, 379, 420, theft..."
                aria-label="Search police sections"
                className="w-full sm:w-64 rounded-xl border-2 border-[#1A1A1A] bg-[#F6F6E0] pl-10 pr-3.5 py-2 text-sm text-[#1A1A1A] placeholder:text-[#8C8C80] focus:outline-none focus:ring-2 focus:ring-[#0041CA]"
              />
            </div>
          </div>

          <div className="mt-5 ink-card overflow-hidden rounded-[24px] bg-[#F6F6E0]">
            {/* Desktop Column Header */}
            <div className="hidden md:grid md:grid-cols-12 md:items-center gap-4 border-b-2 border-[#1A1A1A] bg-[#FFFFEB] px-5 py-3.5 text-xs font-bold text-[#4A4A43]">
              <div className="col-span-2">New BNS</div>
              <div className="col-span-2">Old IPC</div>
              <div className="col-span-4">Offence</div>
              <div className="col-span-2">Bail</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            <div className="divide-y divide-[#E4E4D0]">
              {filteredSections.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-[#4A4A43]">
                  No sections matched “{search}”.
                </div>
              ) : (
                filteredSections.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 gap-2 px-5 py-4 hover:bg-[#FFFFEB] transition-colors md:grid-cols-12 md:items-center md:gap-4 text-xs sm:text-sm"
                  >
                    <div className="flex items-center justify-between md:contents">
                      <div className="md:col-span-2 font-mono font-bold text-[#0041CA] tabular-nums">
                        {item.bnsSection}
                      </div>
                      <div className="md:col-span-2 font-mono text-[#4A4A43] tabular-nums">
                        {item.ipcSection}
                      </div>
                    </div>

                    <div className="md:col-span-4 font-medium text-[#1A1A1A]">
                      {item.title}
                    </div>

                    <div className="flex items-center justify-between pt-1 md:pt-0 md:contents">
                      <div className="md:col-span-2 font-bold text-xs">
                        {item.isBailable ? (
                          <span className="text-[#034F46]">Bailable</span>
                        ) : (
                          <span className="text-[#B45309]">Court Bail</span>
                        )}
                      </div>

                      <div className="md:col-span-2 md:text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => onAskAboutSection(item)}
                            className="text-xs font-semibold text-[#4A4A43] hover:text-[#1A1A1A] cursor-pointer"
                          >
                            Explain
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onCalculateSectionBail({
                                sectionId: item.id,
                                bnsSection: item.bnsSection,
                                ipcSection: item.ipcSection,
                                offenceTitle: item.title,
                              })
                            }
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#0041CA] hover:underline cursor-pointer"
                          >
                            <span>Check Bail</span>
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {!search.trim() && BNS_STATUTORY_CATALOG.length > 6 && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="btn-cream px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {showAll
                  ? 'Show fewer sections'
                  : `Show all ${BNS_STATUTORY_CATALOG.length} sections`}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
