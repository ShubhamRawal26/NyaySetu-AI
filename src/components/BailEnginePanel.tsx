/**
 * @fileoverview Section 479 BNSS Statutory Bail Calculator and Court Bail Letter Generator.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react';
import { BNS_STATUTORY_CATALOG, calculateSection479, findCatalogSection } from '../shared/bnsCatalog';
import { DAYS_PER_MONTH } from '../shared/constants';
import type { BailTransferPayload } from '../types/legal';
import { postJsonWithRetry } from '../utils/apiClient';
import { BailPetitionPreview } from './BailPetitionPreview';

interface BailEnginePanelProps {
  transferPayload?: BailTransferPayload | null;
  onTransferConsumed?: () => void;
}

/**
 * Interactive 3-step Section 479 BNSS bail calculator and printable petition drafter.
 */
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
    if (transferPayload.firNumber) setFirNumber(transferPayload.firNumber);
    if (transferPayload.policeStation) setPoliceStation(transferPayload.policeStation);
    if (transferPayload.sectionId) {
      setSelectedSectionId(transferPayload.sectionId);
    } else if (transferPayload.bnsSection || transferPayload.ipcSection) {
      const hit =
        (transferPayload.bnsSection && findCatalogSection(transferPayload.bnsSection)) ||
        (transferPayload.ipcSection && findCatalogSection(transferPayload.ipcSection));
      if (hit) setSelectedSectionId(hit.id);
    }
    onTransferConsumed?.();
  }, [transferPayload, onTransferConsumed]);

  const selectedRecord = useMemo(
    () => BNS_STATUTORY_CATALOG.find((r) => r.id === selectedSectionId) ?? BNS_STATUTORY_CATALOG[3],
    [selectedSectionId]
  );

  useEffect(() => {
    setCustodyMonths((prev) => Math.min(prev, selectedRecord.maxPunishmentMonths));
  }, [selectedRecord.maxPunishmentMonths]);

  const effectiveCustodyMonths = Math.min(custodyMonths, selectedRecord.maxPunishmentMonths);
  const undergoneDays = Math.max(0, Math.round(effectiveCustodyMonths * DAYS_PER_MONTH));

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
      const data = await postJsonWithRetry<{ dossier_text?: string; error?: string }>(
        '/api/bail-dossier',
        {
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
        },
        'Could not draft bail letter.'
      );
      if (!data.dossier_text) throw new Error(data.error || 'Could not draft bail letter.');
      setDossierText(data.dossier_text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft bail letter.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!dossierText) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(dossierText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy text. Please select and copy the letter manually.');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
      <div className="no-print lg:col-span-5 space-y-5">
        <div className="ink-card rounded-[24px] bg-[#F6F6E0] p-6 sm:p-7 space-y-5">
          <div>
            <h3 className="font-display text-lg font-bold leading-snug text-[#1A1A1A]">Check Bail Eligibility</h3>
            <p id="bail-section479-helper" className="mt-1 text-xs sm:text-[13px] leading-relaxed text-[#4A4A43]">
              Under Section 479 BNSS, first-time undertrials get mandatory bail after serving 1/3rd of the maximum jail term.
            </p>
          </div>

          <div>
            <label htmlFor="bail-offence-select" className="block text-xs font-semibold text-[#1A1A1A]">
              1. Police Section / Charge
            </label>
            <select
              id="bail-offence-select"
              aria-describedby="bail-section479-helper"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] px-3.5 py-2.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0041CA]"
            >
              {BNS_STATUTORY_CATALOG.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.bnsSection} ({item.ipcSection}) — {item.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#1A1A1A]">2. Is this their first offence?</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] p-1">
              {[
                { label: 'Yes (1/3rd rule)', val: true },
                { label: 'No (1/2 rule)', val: false },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setIsFirstTimeOffender(opt.val)}
                  className={`min-h-[38px] px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isFirstTimeOffender === opt.val ? 'bg-[#1A1A1A] text-[#FFFFEB]' : 'text-[#4A4A43] hover:text-[#1A1A1A]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-[#1A1A1A]">
              <label htmlFor="custody-months">3. Months already in jail</label>
              <span className="font-mono text-sm font-bold text-[#034F46] tabular-nums">{effectiveCustodyMonths} months</span>
            </div>
            <input
              id="custody-months"
              aria-describedby="custody-months-range-helper"
              type="range"
              min={0}
              max={selectedRecord.maxPunishmentMonths}
              value={effectiveCustodyMonths}
              onChange={(e) => setCustodyMonths(Number(e.target.value))}
              className="mt-2.5 w-full accent-[#034F46] cursor-pointer"
            />
            <div id="custody-months-range-helper" className="mt-1 flex items-center justify-between font-mono text-[11px] text-[#4A4A43] tabular-nums">
              <span>0 mo</span>
              <span>{selectedRecord.maxPunishmentMonths} mo max</span>
            </div>
          </div>

          <div className="border-t border-[#E4E4D0] pt-4">
            <button
              type="button"
              onClick={() => setShowCourtFields((v) => !v)}
              className="flex min-h-[36px] w-full items-center justify-between gap-2 text-xs font-semibold text-[#4A4A43] hover:text-[#1A1A1A] transition-colors cursor-pointer"
            >
              <span>Edit name &amp; FIR details for court letter (optional)</span>
              {showCourtFields ? <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />}
            </button>
            {showCourtFields && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="text" value={accusedName} onChange={(e) => setAccusedName(e.target.value)} placeholder="Accused name" aria-label="Accused name" className="min-h-[40px] rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] px-3 py-2 text-xs text-[#1A1A1A]" />
                <input type="text" value={firNumber} onChange={(e) => setFirNumber(e.target.value)} placeholder="FIR number" aria-label="FIR number" className="min-h-[40px] rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] px-3 py-2 font-mono text-xs text-[#1A1A1A]" />
                <input type="text" value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} placeholder="Police station" aria-label="Police station" className="min-h-[40px] rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] px-3 py-2 text-xs text-[#1A1A1A]" />
                <input type="text" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="District" aria-label="District" className="min-h-[40px] rounded-xl border-2 border-[#1A1A1A] bg-[#FFFFEB] px-3 py-2 text-xs text-[#1A1A1A]" />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateDossier}
            disabled={loading}
            className="btn-cobalt w-full min-h-[46px] inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl disabled:opacity-50 whitespace-nowrap cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
            <span>{loading ? 'Writing Bail Letter...' : 'Draft Court Bail Letter'}</span>
          </button>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border-2 border-[#1A1A1A] bg-[#FFBCF2]/50 p-3.5 text-xs leading-relaxed font-medium text-[#1A1A1A]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <BailPetitionPreview
        bnsSection={selectedRecord.bnsSection}
        calculation={calculation}
        dossierText={dossierText}
        copied={copied}
        onCopy={handleCopy}
      />
    </div>
  );
};
