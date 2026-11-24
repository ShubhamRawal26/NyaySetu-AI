import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Loader2,
  Printer,
  Scale,
} from 'lucide-react';
import {
  BNS_STATUTORY_CATALOG,
  calculateSection479,
  findCatalogSection,
} from '../shared/bnsCatalog';
import type { BailTransferPayload } from '../types/legal';

interface BailEnginePanelProps {
  transferPayload?: BailTransferPayload | null;
  onTransferConsumed?: () => void;
}

const WAVE_BARS = [
  24, 38, 52, 30, 66, 44, 78, 56, 36, 70, 48, 84, 62, 40, 74, 52, 88, 60, 42,
  68, 54, 76, 38, 64, 46, 82, 58, 34, 72, 50,
];

export const BailEnginePanel: React.FC<BailEnginePanelProps> = ({
  transferPayload,
  onTransferConsumed,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('bns-303-2');
  const [isFirstTimeOffender, setIsFirstTimeOffender] = useState<boolean>(true);
  const [custodyMonths, setCustodyMonths] = useState<number>(14);
  const [showCourtFields, setShowCourtFields] = useState<boolean>(false);

  const [accusedName, setAccusedName] = useState<string>('Ramesh Kumar');
  const [firNumber, setFirNumber] = useState<string>('0142/2026');
  const [policeStation, setPoliceStation] = useState<string>('Kotwali Nagar');
  const [district, setDistrict] = useState<string>('Lucknow');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dossierText, setDossierText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!transferPayload) return;

    if (transferPayload.accusedName && transferPayload.accusedName !== 'Unknown') {
      setAccusedName(transferPayload.accusedName);
    }
    if (transferPayload.firNumber) {
      setFirNumber(transferPayload.firNumber);
    }
    if (transferPayload.policeStation) {
      setPoliceStation(transferPayload.policeStation);
    }
    if (transferPayload.sectionId) {
      setSelectedSectionId(transferPayload.sectionId);
    } else if (transferPayload.bnsSection || transferPayload.ipcSection) {
      const hit =
        (transferPayload.bnsSection &&
          findCatalogSection(transferPayload.bnsSection)) ||
        (transferPayload.ipcSection &&
          findCatalogSection(transferPayload.ipcSection));
      if (hit) {
        setSelectedSectionId(hit.id);
      }
    }

    onTransferConsumed?.();
  }, [transferPayload, onTransferConsumed]);

  const selectedRecord = useMemo(
    () =>
      BNS_STATUTORY_CATALOG.find((r) => r.id === selectedSectionId) ??
      BNS_STATUTORY_CATALOG[3],
    [selectedSectionId]
  );

  const undergoneDays = Math.max(0, Math.round(custodyMonths * 30.4375));

  const calculation = useMemo(
    () =>
      calculateSection479({
        maxPunishmentMonths: selectedRecord.maxPunishmentMonths,
        undergoneDays,
        isFirstTimeOffender,
        excludedForDeathOrLife: selectedRecord.excludedFromSec479,
      }),
    [selectedRecord, undergoneDays, isFirstTimeOffender]
  );

  const handleGenerateDossier = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bail-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accusedName: accusedName.trim() || 'Applicant',
          firNumber: firNumber.trim() || 'As per FIR',
          policeStation: policeStation.trim() || 'Concerned Police Station',
          district: district.trim() || 'Concerned District',
          courtName: 'Court of the Learned Chief Judicial Magistrate',
          jailName: `District Jail, ${district.trim() || 'Concerned District'}`,
          bnsSection: selectedRecord.bnsSection,
          ipcSection: selectedRecord.ipcSection,
          offenceTitle: selectedRecord.title,
          maxPunishmentLabel: selectedRecord.maxPunishmentLabel,
          maxPunishmentMonths: selectedRecord.maxPunishmentMonths,
          undergoneDays,
          isFirstTimeOffender,
        }),
      });

      const data = (await res.json()) as {
        dossier_text?: string;
        error?: string;
      };

      if (!res.ok || !data.dossier_text) {
        throw new Error(data.error || 'Could not draft bail letter.');
      }

      setDossierText(data.dossier_text);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not draft bail letter.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!dossierText) return;
    try {
      await navigator.clipboard.writeText(dossierText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy text.');
    }
  };

  const litBarCount = Math.round(
    (calculation.percentOfThreshold / 100) * WAVE_BARS.length
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left Simple 3-Step Calculator */}
      <div className="no-print lg:col-span-5 space-y-5">
        <div className="ink-card rounded-[24px] bg-[#F6F6E0] p-6 space-y-5">
          <div>
            <h3 className="font-display text-lg font-bold text-[#1A1A1A]">
              Check Bail Eligibility
            </h3>
            <p className="mt-1 text-xs text-[#4A4A43]">
              Under Section 479 BNSS, first-time undertrials get mandatory bail
              after serving 1/3rd of the maximum jail term.
            </p>
          </div>

          {/* 1. Charge */}
          <div>
            <label
              htmlFor="bail-offence-select"
              className="block text-xs font-semibold text-[#1A1A1A]"
            >
              1. Police Section / Charge
            </label>
            <select
              id="bail-offence-select"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] px-3.5 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0041CA]"
            >
              {BNS_STATUTORY_CATALOG.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.bnsSection} ({item.ipcSection}) — {item.title}
                </option>
              ))}
            </select>
          </div>

          {/* 2. First Offence */}
          <div>
            <span className="block text-xs font-semibold text-[#1A1A1A]">
              2. Is this their first offence?
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] p-1">
              <button
                type="button"
                onClick={() => setIsFirstTimeOffender(true)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isFirstTimeOffender
                    ? 'bg-[#1A1A1A] text-[#FFFFEB]'
                    : 'text-[#4A4A43] hover:text-[#1A1A1A]'
                }`}
              >
                Yes (1/3rd rule)
              </button>
              <button
                type="button"
                onClick={() => setIsFirstTimeOffender(false)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  !isFirstTimeOffender
                    ? 'bg-[#1A1A1A] text-[#FFFFEB]'
                    : 'text-[#4A4A43] hover:text-[#1A1A1A]'
                }`}
              >
                No (1/2 rule)
              </button>
            </div>
          </div>

          {/* 3. Months in Jail */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#1A1A1A]">
              <label htmlFor="custody-months">3. Months already in jail</label>
              <span className="font-mono text-sm font-bold text-[#034F46] tabular-nums">
                {custodyMonths} months
              </span>
            </div>
            <input
              id="custody-months"
              type="range"
              min={0}
              max={selectedRecord.maxPunishmentMonths}
              value={Math.min(custodyMonths, selectedRecord.maxPunishmentMonths)}
              onChange={(e) => setCustodyMonths(Number(e.target.value))}
              className="mt-2.5 w-full accent-[#034F46] cursor-pointer"
            />
          </div>

          {/* Collapsible Optional Court Details */}
          <div className="border-t border-[#E4E4D0] pt-4">
            <button
              type="button"
              onClick={() => setShowCourtFields((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold text-[#4A4A43] hover:text-[#1A1A1A] cursor-pointer"
            >
              <span>Edit name &amp; FIR details for court letter (optional)</span>
              {showCourtFields ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {showCourtFields && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={accusedName}
                  onChange={(e) => setAccusedName(e.target.value)}
                  placeholder="Accused name"
                  aria-label="Accused name"
                  className="rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] px-3 py-2 text-xs text-[#1A1A1A]"
                />
                <input
                  type="text"
                  value={firNumber}
                  onChange={(e) => setFirNumber(e.target.value)}
                  placeholder="FIR number"
                  aria-label="FIR number"
                  className="rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] px-3 py-2 font-mono text-xs text-[#1A1A1A]"
                />
                <input
                  type="text"
                  value={policeStation}
                  onChange={(e) => setPoliceStation(e.target.value)}
                  placeholder="Police station"
                  aria-label="Police station"
                  className="rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] px-3 py-2 text-xs text-[#1A1A1A]"
                />
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="District"
                  aria-label="District"
                  className="rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] px-3 py-2 text-xs text-[#1A1A1A]"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateDossier}
            disabled={loading}
            className="btn-cobalt w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Writing Bail Letter...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>Draft Court Bail Letter</span>
              </>
            )}
          </button>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border-2 border-[#1A1A1A] bg-[#FFBCF2]/50 p-3 text-xs font-medium text-[#1A1A1A]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Forest-Green Live Eligibility Card + Printable Bail Letter */}
      <div className="lg:col-span-7 space-y-6">
        <div className="no-print rounded-[26px] bg-[#034F46] text-[#FFFFEB] p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#FFFFEB]/15 pb-4">
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold">
              {calculation.excludedForDeathOrLife ? (
                <>
                  <AlertTriangle
                    className="h-5 w-5 text-[#FFBCF2] shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-[#FFBCF2]">
                    Regular Court Bail Needed (Not Covered by Sec. 479)
                  </span>
                </>
              ) : calculation.isEligible ? (
                <>
                  <CheckCircle2
                    className="h-5 w-5 text-[#F0D7FF] shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-[#F0D7FF]">
                    Eligible for Mandatory Bail Now
                  </span>
                </>
              ) : (
                <>
                  <Scale
                    className="h-5 w-5 text-[#FFA946] shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-[#FFA946]">
                    {Math.abs(calculation.daysDifference)} Days Left for Mandatory Bail
                  </span>
                </>
              )}
            </div>
            <span className="font-mono text-xs text-[#F0D7FF] tabular-nums">
              {selectedRecord.bnsSection}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[#FFFFEB]/10 p-4">
              <div className="text-xs text-[#FFFFEB]/70">Max Jail</div>
              <div className="mt-1 font-display text-2xl font-bold text-[#FFFFEB] tabular-nums">
                {calculation.maxPunishmentMonths} mo
              </div>
            </div>
            <div className="rounded-2xl bg-[#FFFFEB]/10 p-4">
              <div className="text-xs text-[#FFFFEB]/70">Bail After</div>
              <div className="mt-1 font-display text-2xl font-bold text-[#F0D7FF] tabular-nums">
                {calculation.thresholdMonthsRounded} mo
              </div>
            </div>
            <div className="rounded-2xl bg-[#FFFFEB]/10 p-4">
              <div className="text-xs text-[#FFFFEB]/70">Served</div>
              <div className="mt-1 font-display text-2xl font-bold text-[#FFA946] tabular-nums">
                {calculation.undergoneMonthsRounded} mo
              </div>
            </div>
          </div>

          {/* Waveform Progress Visual */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#FFFFEB]/80">
              <span>Bail Threshold Progress</span>
              <span className="font-mono font-bold text-[#F0D7FF] tabular-nums">
                {calculation.percentOfThreshold}%
              </span>
            </div>

            <div
              className="relative flex h-14 items-center justify-between gap-1 px-1"
              aria-hidden="true"
            >
              {WAVE_BARS.map((height, i) => {
                const isLit = i < litBarCount;
                return (
                  <span
                    key={i}
                    className={`w-1.5 rounded-full transition-colors duration-200 ${
                      isLit
                        ? calculation.excludedForDeathOrLife
                          ? 'bg-[#FFBCF2]'
                          : 'bg-[#F0D7FF]'
                        : 'bg-[#FFFFEB]/25'
                    }`}
                    style={{ height: `${Math.round((height / 100) * 48)}px` }}
                  />
                );
              })}
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-[#FFA946] transition-all duration-200"
                style={{
                  left: `clamp(0%, ${calculation.percentOfThreshold}%, 99%)`,
                }}
              >
                <span className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 rounded-full bg-[#FFA946]" />
              </div>
            </div>
          </div>
        </div>

        {/* Printable Court Bail Letter */}
        {dossierText && (
          <div className="print-only-dossier ink-card rounded-[26px] bg-[#FFFFEB] p-6 sm:p-7">
            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E4D0] pb-4">
              <h4 className="font-display text-base font-bold text-[#1A1A1A]">
                Ready-to-Print Court Bail Letter
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-cream inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-cobalt inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            <pre className="mt-4 whitespace-pre-wrap break-words font-mono text-xs sm:text-[13px] leading-relaxed text-[#1A1A1A] bg-[#F6F6E0] p-5 rounded-2xl border-2 border-[#1A1A1A] print:bg-white print:text-black print:border-0 print:p-0">
              {dossierText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
