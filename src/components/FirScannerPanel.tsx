import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileImage,
  FileScan,
  Loader2,
  Scale,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type {
  BailTransferPayload,
  FIROCRExtractionResponse,
} from '../types/legal';

interface FirScannerPanelProps {
  onTransferToBail: (payload: BailTransferPayload) => void;
}

const SAMPLE_FIR_PATH = '/src/assets/images/sample_fir_document_1795503597410.jpg';

export const FirScannerPanel: React.FC<FirScannerPanelProps> = ({
  onTransferToBail,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string>('image/jpeg');
  const [fileName, setFileName] = useState<string>('');
  const [previewError, setPreviewError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FIROCRExtractionResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runOcrScan = async (base64Data: string, mime: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/fir-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mime,
        }),
      });

      const data = (await res.json()) as {
        extraction?: FIROCRExtractionResponse;
        error?: string;
      };

      if (!res.ok || !data.extraction) {
        throw new Error(data.error || 'Could not read this FIR photo.');
      }

      setResult(data.extraction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large (max 10 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      setPreviewError(false);
      setFileBase64(dataUrl);
      setFileMime(file.type || 'image/jpeg');
      setFileName(file.name);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSampleFir = async () => {
    setError(null);
    setPreviewError(false);
    setFileName('Sample_FIR_0142.jpg');
    setPreviewUrl(SAMPLE_FIR_PATH);

    try {
      const response = await fetch(SAMPLE_FIR_PATH);
      if (!response.ok) throw new Error('Could not load sample FIR.');
      const blob = await response.blob();
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to load sample image.'));
        reader.readAsDataURL(blob);
      });

      setFileBase64(base64Data);
      setFileMime('image/jpeg');
      await runOcrScan(base64Data, 'image/jpeg');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sample.');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left Simple Upload Card */}
      <div className="lg:col-span-5">
        <div className="ink-card rounded-[24px] bg-[#F6F6E0] p-6">
          <h3 className="font-display text-lg font-bold text-[#1A1A1A]">
            Upload an FIR Photo
          </h3>
          <p className="mt-1 text-xs text-[#4A4A43]">
            Takes any phone photo or PDF of an FIR or Arrest Memo.
          </p>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileChange(e.dataTransfer.files?.[0]);
            }}
            className="mt-4 rounded-2xl border-2 border-dashed border-[#1A1A1A]/40 bg-[#FFFFEB] p-5 text-center transition-colors hover:border-[#0041CA]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
              className="hidden"
            />

            {previewUrl && fileMime !== 'application/pdf' && !previewError ? (
              <div className="space-y-3">
                <div className="relative mx-auto max-h-64 overflow-hidden rounded-xl border-2 border-[#1A1A1A] bg-[#F6F6E0]">
                  <img
                    src={previewUrl}
                    alt="FIR photo preview"
                    referrerPolicy="no-referrer"
                    onError={() => setPreviewError(true)}
                    className="mx-auto max-h-64 w-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#4A4A43]">
                  <span className="truncate font-medium">{fileName}</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[#0041CA] hover:underline font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#1A1A1A] bg-[#F0D7FF]">
                  <Upload className="h-5 w-5 text-[#1A1A1A]" aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm font-bold text-[#1A1A1A]">
                  {fileName || 'Drop photo here or select a file'}
                </p>
                <p className="mt-1 text-xs text-[#4A4A43]">JPG, PNG, or PDF</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-cream mt-4 px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Choose Photo
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLoadSampleFir}
              disabled={loading}
              className="btn-cream inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <FileImage className="h-4 w-4 text-[#0041CA]" aria-hidden="true" />
              <span>Try Sample FIR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (fileBase64) runOcrScan(fileBase64, fileMime);
              }}
              disabled={loading || !fileBase64}
              className="btn-cobalt inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Reading...</span>
                </>
              ) : (
                <>
                  <FileScan className="h-4 w-4" aria-hidden="true" />
                  <span>Scan Photo</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border-2 border-[#1A1A1A] bg-[#FFBCF2]/50 p-3 text-xs font-medium text-[#1A1A1A]"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Clean Extraction Result */}
      <div className="lg:col-span-7">
        {loading ? (
          <div className="rounded-[26px] border-2 border-[#1A1A1A] bg-[#F6F6E0] p-7 space-y-5">
            <div className="flex items-center gap-3 text-sm font-semibold text-[#1A1A1A]">
              <Loader2 className="h-5 w-5 animate-spin text-[#0041CA]" aria-hidden="true" />
              <span>Reading FIR photo and checking bail rules...</span>
            </div>
            <div className="grid grid-cols-2 gap-3 animate-pulse">
              <div className="h-14 rounded-xl bg-[#E4E4D0]" />
              <div className="h-14 rounded-xl bg-[#E4E4D0]" />
            </div>
            <div className="h-28 rounded-xl bg-[#E4E4D0] animate-pulse" />
          </div>
        ) : !result ? (
          <div className="flex h-full min-h-[340px] flex-col justify-center rounded-[26px] border-2 border-[#1A1A1A] bg-[#F6F6E0] p-7 sm:p-8">
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#1A1A1A]">
              Read any handwritten FIR in{' '}
              <span className="font-editorial-italic">one tap.</span>
            </h3>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#4A4A43]">
              Upload a phone photo of the FIR or tap{' '}
              <strong className="text-[#1A1A1A]">Try Sample FIR</strong>. We
              extract the sections, translate old IPC numbers to BNS 2023, and
              tell you if bail is available.
            </p>
          </div>
        ) : (
          <div className="ink-card rounded-[26px] bg-[#FFFFEB] overflow-hidden">
            {/* Simple Verdict Strip */}
            <div className="bg-[#1A1A1A] text-[#FFFFEB] px-6 py-4 sm:px-7">
              <div className="flex items-center gap-2 text-sm font-bold">
                {result.is_overall_bailable ? (
                  <>
                    <CheckCircle2
                      className="h-4 w-4 text-[#34D399] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-[#34D399]">
                      Bailable — Police Station Bail Applies
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle
                      className="h-4 w-4 text-[#FFA946] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-[#FFA946]">
                      Non-Bailable — Court Bail Required
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-7 space-y-5">
              {result.petty_theft_community_service_flag && (
                <div className="flex items-start gap-2.5 rounded-2xl border-2 border-[#1A1A1A] bg-[#F0D7FF] p-4 text-xs sm:text-sm text-[#1A1A1A]">
                  <ShieldCheck
                    className="h-5 w-5 text-[#034F46] shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <div>
                    <strong>Community Service Possible:</strong> First-time
                    theft under ₹5,000 can qualify for community service instead
                    of jail (Section 303(2) BNS).
                  </div>
                </div>
              )}

              {/* 4 Key FIR Facts */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A]">
                <div className="bg-[#F6F6E0] p-3.5">
                  <div className="text-xs text-[#4A4A43]">FIR Number</div>
                  <div className="mt-0.5 font-mono text-sm font-bold text-[#1A1A1A] tabular-nums">
                    {result.fir_number || 'Not clear'}
                  </div>
                </div>
                <div className="bg-[#F6F6E0] p-3.5">
                  <div className="text-xs text-[#4A4A43]">Police Station</div>
                  <div className="mt-0.5 text-sm font-bold text-[#1A1A1A]">
                    {result.police_station || 'Not clear'}
                  </div>
                </div>
                <div className="bg-[#F6F6E0] p-3.5">
                  <div className="text-xs text-[#4A4A43]">Accused</div>
                  <div className="mt-0.5 text-sm font-bold text-[#1A1A1A]">
                    {result.accused_name || 'Unknown'}
                  </div>
                </div>
                <div className="bg-[#F6F6E0] p-3.5">
                  <div className="text-xs text-[#4A4A43]">Date</div>
                  <div className="mt-0.5 text-sm font-bold text-[#1A1A1A]">
                    {result.date_of_incident || 'Not clear'}
                  </div>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-[#1A1A1A]">
                {result.brief_allegation}
              </p>

              {/* Sections List */}
              <div className="divide-y divide-[#E4E4D0] rounded-2xl border-2 border-[#1A1A1A] bg-[#FFFFEB] overflow-hidden">
                {result.extracted_sections.map((sec, idx) => (
                  <div
                    key={`${sec.bns_section}-${idx}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs sm:text-sm"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#0041CA] tabular-nums">
                        {sec.bns_section}
                      </span>
                      <span className="mx-2 text-[#8C8C80]">/</span>
                      <span className="font-mono text-[#4A4A43] tabular-nums">
                        {sec.ipc_section}
                      </span>
                      <span className="mx-2 text-[#8C8C80]">·</span>
                      <span className="font-medium text-[#1A1A1A]">
                        {sec.title}
                      </span>
                    </div>
                    <span
                      className={`font-bold whitespace-nowrap ${
                        sec.is_bailable ? 'text-[#034F46]' : 'text-[#B45309]'
                      }`}
                    >
                      {sec.is_bailable ? 'Bailable' : 'Non-Bailable'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Next Action */}
              <div className="rounded-2xl bg-[#F6F6E0] border border-[#E4E4D0] p-4 text-sm text-[#1A1A1A]">
                <span className="font-bold text-[#0041CA]">Next step: </span>
                {result.recommended_immediate_action}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const primary = result.extracted_sections[0];
                    onTransferToBail({
                      accusedName: result.accused_name,
                      firNumber: result.fir_number,
                      policeStation: result.police_station,
                      bnsSection: primary?.bns_section,
                      ipcSection: primary?.ipc_section,
                      offenceTitle: primary?.title,
                    });
                  }}
                  className="btn-cobalt inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Scale className="h-4 w-4" aria-hidden="true" />
                  <span>Check Bail Eligibility</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
