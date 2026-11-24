import { useState } from 'react';
import { FileScan, Mic, Scale } from 'lucide-react';
import { BailEnginePanel } from './components/BailEnginePanel';
import { FirScannerPanel } from './components/FirScannerPanel';
import { HeroSection } from './components/HeroSection';
import { LegalFirstAidPanel } from './components/LegalFirstAidPanel';
import { NalsaHelpModal } from './components/NalsaHelpModal';
import { Navbar } from './components/Navbar';
import { StatutoryReferenceSection } from './components/StatutoryReferenceSection';
import type {
  BailTransferPayload,
  StatutorySectionRecord,
} from './types/legal';

type WorkspaceTab = 'first-aid' | 'fir-ocr' | 'bail-engine';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('first-aid');
  const [nalsaModalOpen, setNalsaModalOpen] = useState(false);
  const [prefillFirstAidQuery, setPrefillFirstAidQuery] = useState<string | null>(
    null
  );
  const [bailTransfer, setBailTransfer] = useState<BailTransferPayload | null>(
    null
  );

  const jumpToWorkspace = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    const el = document.getElementById('workspace');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleTransferToBail = (payload: BailTransferPayload) => {
    setBailTransfer(payload);
    jumpToWorkspace('bail-engine');
  };

  const handleAskAboutSection = (section: StatutorySectionRecord) => {
    setPrefillFirstAidQuery(
      `Explain my bail rights for ${section.bnsSection} (${section.ipcSection} - ${section.title}) in simple words.`
    );
    jumpToWorkspace('first-aid');
  };

  return (
    <div className="min-h-screen bg-[#FFFFEB] text-[#1A1A1A] flex flex-col">
      <Navbar
        activeTab={activeTab}
        onNavigateTab={setActiveTab}
        onOpenNalsa={() => setNalsaModalOpen(true)}
      />

      <main className="flex-1">
        <HeroSection
          onLaunchFirstAid={() => jumpToWorkspace('first-aid')}
          onLaunchScanner={() => jumpToWorkspace('fir-ocr')}
        />

        {/* Core 3-Tool Workspace */}
        <section
          id="workspace"
          className="scroll-mt-20 mx-auto max-w-[1280px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20"
        >
          <div className="no-print space-y-6 border-b border-[#E4E4D0] pb-8">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1A]">
                How can we help{' '}
                <span className="font-editorial-italic">today?</span>
              </h2>
              <p className="text-xs sm:text-sm font-medium text-[#4A4A43]">
                Select a tool below
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Legal help tools"
              className="grid grid-cols-1 gap-3.5 sm:grid-cols-3"
            >
              <button
                type="button"
                role="tab"
                id="tab-first-aid"
                aria-selected={activeTab === 'first-aid'}
                aria-controls="workspace-tabpanel"
                onClick={() => setActiveTab('first-aid')}
                className={`group flex h-full items-center gap-3.5 rounded-2xl border-2 border-[#1A1A1A] px-4 py-3.5 sm:p-4 text-left transition-all duration-150 cursor-pointer ${
                  activeTab === 'first-aid'
                    ? 'bg-[#1A1A1A] text-[#FFFFEB] shadow-[4px_4px_0_#0041CA] -translate-x-0.5 -translate-y-0.5'
                    : 'bg-[#F6F6E0] text-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] hover:bg-[#FFFFEB] hover:-translate-y-0.5'
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#1A1A1A] transition-colors ${
                    activeTab === 'first-aid'
                      ? 'bg-[#F0D7FF] text-[#1A1A1A]'
                      : 'bg-[#FFFFEB] text-[#0041CA]'
                  }`}
                >
                  <Mic className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm sm:text-base font-bold leading-snug truncate">
                    Ask Help
                  </span>
                  <span
                    className={`mt-0.5 block text-xs leading-snug truncate ${
                      activeTab === 'first-aid'
                        ? 'text-[#FFFFEB]/75'
                        : 'text-[#4A4A43]'
                    }`}
                  >
                    Speak or type your question
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-fir-ocr"
                aria-selected={activeTab === 'fir-ocr'}
                aria-controls="workspace-tabpanel"
                onClick={() => setActiveTab('fir-ocr')}
                className={`group flex h-full items-center gap-3.5 rounded-2xl border-2 border-[#1A1A1A] px-4 py-3.5 sm:p-4 text-left transition-all duration-150 cursor-pointer ${
                  activeTab === 'fir-ocr'
                    ? 'bg-[#1A1A1A] text-[#FFFFEB] shadow-[4px_4px_0_#0041CA] -translate-x-0.5 -translate-y-0.5'
                    : 'bg-[#F6F6E0] text-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] hover:bg-[#FFFFEB] hover:-translate-y-0.5'
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#1A1A1A] transition-colors ${
                    activeTab === 'fir-ocr'
                      ? 'bg-[#F0D7FF] text-[#1A1A1A]'
                      : 'bg-[#FFFFEB] text-[#0041CA]'
                  }`}
                >
                  <FileScan className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm sm:text-base font-bold leading-snug truncate">
                    Scan FIR
                  </span>
                  <span
                    className={`mt-0.5 block text-xs leading-snug truncate ${
                      activeTab === 'fir-ocr'
                        ? 'text-[#FFFFEB]/75'
                        : 'text-[#4A4A43]'
                    }`}
                  >
                    Read any FIR phone photo
                  </span>
                </span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-bail-engine"
                aria-selected={activeTab === 'bail-engine'}
                aria-controls="workspace-tabpanel"
                onClick={() => setActiveTab('bail-engine')}
                className={`group flex h-full items-center gap-3.5 rounded-2xl border-2 border-[#1A1A1A] px-4 py-3.5 sm:p-4 text-left transition-all duration-150 cursor-pointer ${
                  activeTab === 'bail-engine'
                    ? 'bg-[#1A1A1A] text-[#FFFFEB] shadow-[4px_4px_0_#0041CA] -translate-x-0.5 -translate-y-0.5'
                    : 'bg-[#F6F6E0] text-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] hover:bg-[#FFFFEB] hover:-translate-y-0.5'
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#1A1A1A] transition-colors ${
                    activeTab === 'bail-engine'
                      ? 'bg-[#F0D7FF] text-[#1A1A1A]'
                      : 'bg-[#FFFFEB] text-[#0041CA]'
                  }`}
                >
                  <Scale className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm sm:text-base font-bold leading-snug truncate">
                    Bail Check
                  </span>
                  <span
                    className={`mt-0.5 block text-xs leading-snug truncate ${
                      activeTab === 'bail-engine'
                        ? 'text-[#FFFFEB]/75'
                        : 'text-[#4A4A43]'
                    }`}
                  >
                    Check Sec. 479 eligibility
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div
            id="workspace-tabpanel"
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="mt-8"
          >
            {activeTab === 'first-aid' && (
              <LegalFirstAidPanel
                onTransferToBail={handleTransferToBail}
                onOpenNalsa={() => setNalsaModalOpen(true)}
                prefillQuery={prefillFirstAidQuery}
                onPrefillConsumed={() => setPrefillFirstAidQuery(null)}
              />
            )}

            {activeTab === 'fir-ocr' && (
              <FirScannerPanel onTransferToBail={handleTransferToBail} />
            )}

            {activeTab === 'bail-engine' && (
              <BailEnginePanel
                transferPayload={bailTransfer}
                onTransferConsumed={() => setBailTransfer(null)}
              />
            )}
          </div>
        </section>

        <StatutoryReferenceSection
          onAskAboutSection={handleAskAboutSection}
          onCalculateSectionBail={handleTransferToBail}
        />
      </main>

      {/* Clean Minimal Footer */}
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
            onClick={() => setNalsaModalOpen(true)}
            className="inline-flex min-h-[40px] items-center text-xs sm:text-sm font-semibold text-[#F0D7FF] hover:text-[#FFFFEB] underline underline-offset-4 transition-colors cursor-pointer self-start sm:self-center whitespace-nowrap shrink-0"
          >
            Free Government Legal Aid · Call 15100
          </button>
        </div>
      </footer>

      <NalsaHelpModal
        isOpen={nalsaModalOpen}
        onClose={() => setNalsaModalOpen(false)}
      />
    </div>
  );
}
