import { useCallback, useState, type KeyboardEvent } from 'react';
import { FileScan, Mic, Scale } from 'lucide-react';
import { BailEnginePanel } from './components/BailEnginePanel';
import { FirScannerPanel } from './components/FirScannerPanel';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { LegalFirstAidPanel } from './components/LegalFirstAidPanel';
import { NalsaHelpModal } from './components/NalsaHelpModal';
import { Navbar } from './components/Navbar';
import { StatutoryReferenceSection } from './components/StatutoryReferenceSection';
import type { BailTransferPayload, StatutorySectionRecord } from './types/legal';

type WorkspaceTab = 'first-aid' | 'fir-ocr' | 'bail-engine';
const TAB_ORDER: WorkspaceTab[] = ['first-aid', 'fir-ocr', 'bail-engine'];

const WORKSPACE_TABS: Array<{
  id: WorkspaceTab;
  title: string;
  subtitle: string;
  Icon: typeof Mic;
}> = [
  { id: 'first-aid', title: 'Ask Help', subtitle: 'Speak or type your question', Icon: Mic },
  { id: 'fir-ocr', title: 'Scan FIR', subtitle: 'Read any FIR phone photo', Icon: FileScan },
  { id: 'bail-engine', title: 'Bail Check', subtitle: 'Check Sec. 479 eligibility', Icon: Scale },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('first-aid');
  const [nalsaModalOpen, setNalsaModalOpen] = useState(false);
  const [prefillFirstAidQuery, setPrefillFirstAidQuery] = useState<string | null>(null);
  const [bailTransfer, setBailTransfer] = useState<BailTransferPayload | null>(null);

  const jumpToWorkspace = useCallback((tab: WorkspaceTab) => {
    setActiveTab(tab);
    document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleTransferToBail = useCallback(
    (payload: BailTransferPayload) => {
      setBailTransfer(payload);
      jumpToWorkspace('bail-engine');
    },
    [jumpToWorkspace]
  );

  const handleAskAboutSection = useCallback(
    (section: StatutorySectionRecord) => {
      setPrefillFirstAidQuery(
        `Explain my bail rights for ${section.bnsSection} (${section.ipcSection} - ${section.title}) in simple words.`
      );
      jumpToWorkspace('first-aid');
    },
    [jumpToWorkspace]
  );

  const handleTabKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const idx = TAB_ORDER.indexOf(activeTab);
      const nextIdx =
        e.key === 'ArrowRight'
          ? (idx + 1) % TAB_ORDER.length
          : (idx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
      const nextTab = TAB_ORDER[nextIdx];
      setActiveTab(nextTab);
      document.getElementById(`tab-${nextTab}`)?.focus();
    },
    [activeTab]
  );

  return (
    <div className="min-h-screen bg-[#FFFFEB] text-[#1A1A1A] flex flex-col">
      <a
        href="#workspace"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:border-2 focus:border-[#1A1A1A] focus:bg-[#F0D7FF] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#1A1A1A] focus:shadow-[3px_3px_0_#1A1A1A]"
      >
        Skip to main legal tools
      </a>
      <Navbar
        activeTab={activeTab}
        onNavigateTab={setActiveTab}
        onOpenNalsa={() => setNalsaModalOpen(true)}
      />

      <main id="main-content" className="flex-1">
        <HeroSection
          onLaunchFirstAid={() => jumpToWorkspace('first-aid')}
          onLaunchScanner={() => jumpToWorkspace('fir-ocr')}
        />

        <section
          id="workspace"
          aria-labelledby="workspace-heading"
          className="scroll-mt-20 mx-auto max-w-[1280px] px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20"
        >
          <div className="no-print space-y-6 border-b border-[#E4E4D0] pb-8">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
              <h2
                id="workspace-heading"
                className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1A]"
              >
                How can we help <span className="font-editorial-italic">today?</span>
              </h2>
              <p className="text-xs sm:text-sm font-medium text-[#4A4A43]">Select a tool below</p>
            </div>

            <div
              role="tablist"
              aria-label="Legal help tools"
              onKeyDown={handleTabKeyDown}
              className="grid grid-cols-1 gap-3.5 sm:grid-cols-3"
            >
              {WORKSPACE_TABS.map(({ id, title, subtitle, Icon }) => {
                const isSelected = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`tab-${id}`}
                    aria-selected={isSelected}
                    aria-controls="workspace-tabpanel"
                    onClick={() => setActiveTab(id)}
                    className={`group flex h-full items-center gap-3.5 rounded-2xl border-2 border-[#1A1A1A] px-4 py-3.5 sm:p-4 text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-[#1A1A1A] text-[#FFFFEB] shadow-[4px_4px_0_#0041CA] -translate-x-0.5 -translate-y-0.5'
                        : 'bg-[#F6F6E0] text-[#1A1A1A] shadow-[2px_2px_0_#1A1A1A] hover:bg-[#FFFFEB] hover:-translate-y-0.5'
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#1A1A1A] transition-colors ${
                        isSelected ? 'bg-[#F0D7FF] text-[#1A1A1A]' : 'bg-[#FFFFEB] text-[#0041CA]'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-sm sm:text-base font-bold leading-snug truncate">
                        {title}
                      </span>
                      <span
                        className={`mt-0.5 block text-xs leading-snug truncate ${
                          isSelected ? 'text-[#FFFFEB]/75' : 'text-[#4A4A43]'
                        }`}
                      >
                        {subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
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
            {activeTab === 'fir-ocr' && <FirScannerPanel onTransferToBail={handleTransferToBail} />}
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

      <Footer onOpenNalsa={() => setNalsaModalOpen(true)} />
      <NalsaHelpModal isOpen={nalsaModalOpen} onClose={() => setNalsaModalOpen(false)} />
    </div>
  );
}
