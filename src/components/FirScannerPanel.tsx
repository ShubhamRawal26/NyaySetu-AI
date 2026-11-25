/**
 * @fileoverview Handwritten FIR Vision OCR Scanner panel ("Scan FIR").
 */

import React, { useRef, useState } from 'react';
import { AlertTriangle, FileImage, FileScan, Loader2, Upload } from 'lucide-react';
import { ALLOWED_FIR_MIME_TYPES, MAX_UPLOAD_BYTES } from '../shared/constants';
import type { BailTransferPayload, FIROCRExtractionResponse } from '../types/legal';
import { postJsonWithRetry } from '../utils/apiClient';
import { optimizeImageForOcr } from '../utils/imageOptimizer';
import { FirAnalysisResultCard } from './FirAnalysisResultCard';

interface FirScannerPanelProps {
  onTransferToBail: (payload: BailTransferPayload) => void;
}

const SAMPLE_FIR_PATH = '/src/assets/images/sample_fir_document_1795503597410.jpg';
const ALLOWED_MIMES_SET = new Set<string>(ALLOWED_FIR_MIME_TYPES);

/**
 * Interactive FIR document upload, sample loader, and OCR scanning workspace panel.
 */
export const FirScannerPanel: React.FC<FirScannerPanelProps> = ({ onTransferToBail }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string>('image/jpeg');
  const [fileName, setFileName] = useState<string>('');
  const [previewError, setPreviewError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FIROCRExtractionResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runOcrScan = async (base64Data: string, mime: string) => {
    setLoading(true);
    setError(null);
    try {
      const prepared = await optimizeImageForOcr(base64Data, mime);
      const data = await postJsonWithRetry<{ extraction?: FIROCRExtractionResponse; error?: string }>(
        '/api/fir-ocr',
        { imageBase64: prepared.dataUrl, mimeType: prepared.mimeType },
        'Could not read this FIR photo.'
      );
      if (!data.extraction) throw new Error(data.error || 'Could not read this FIR photo.');
      setResult(data.extraction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_MIMES_SET.has(file.type)) {
      setPreviewUrl(null);
      setFileBase64(null);
      setFileName('');
      setResult(null);
      setError('Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setPreviewUrl(null);
      setFileBase64(null);
      setFileName('');
      setResult(null);
      setError('File is too large (max 8 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      setPreviewError(false);
      setFileBase64(dataUrl);
      setFileMime(file.type);
      setFileName(file.name);
      setResult(null);
      setError(null);
    };
    reader.onerror = () => setError('Could not read the selected file. Please try another photo or PDF.');
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-8">
      <div className="lg:col-span-5 flex flex-col">
        <div className="ink-card flex flex-1 flex-col justify-between rounded-[24px] bg-[#F6F6E0] p-6 sm:p-7">
          <div>
            <h3 className="font-display text-lg font-bold leading-snug text-[#1A1A1A]">Upload an FIR Photo</h3>
            <p id="fir-upload-helper" className="mt-1 text-xs sm:text-[13px] leading-relaxed text-[#4A4A43]">
              Takes any phone photo or PDF of an FIR or Arrest Memo.
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileChange(e.dataTransfer.files?.[0]);
              }}
              className={`mt-4 rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                isDragging ? 'border-[#0041CA] bg-[#F0D7FF]/35' : 'border-[#1A1A1A]/40 bg-[#FFFFEB] hover:border-[#0041CA]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                aria-label="Upload FIR document"
                aria-describedby="fir-upload-helper"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => {
                  handleFileChange(e.target.files?.[0]);
                  e.target.value = '';
                }}
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
                <div className="min-h-[204px] py-6 flex flex-col items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#1A1A1A] bg-[#F0D7FF]">
                    <Upload className="h-5 w-5 text-[#1A1A1A]" aria-hidden="true" />
                  </div>
                  <p className="mt-3.5 text-sm font-bold text-[#1A1A1A]">{fileName || 'Drop photo here or select a file'}</p>
                  <p className="mt-1 text-xs text-[#4A4A43]">JPG, PNG, or PDF</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-cream mt-4 inline-flex min-h-[40px] items-center px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Choose Photo
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleLoadSampleFir}
                disabled={loading}
                className="btn-cream inline-flex min-h-[42px] items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                <FileImage className="h-4 w-4 text-[#0041CA]" aria-hidden="true" />
                <span>Try Sample FIR</span>
              </button>

              <button
                type="button"
                onClick={() => fileBase64 && runOcrScan(fileBase64, fileMime)}
                disabled={loading || !fileBase64}
                className="btn-cobalt inline-flex min-h-[42px] items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileScan className="h-4 w-4" aria-hidden="true" />}
                <span>{loading ? 'Reading...' : 'Scan Photo'}</span>
              </button>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border-2 border-[#1A1A1A] bg-[#FFBCF2]/50 p-3.5 text-xs leading-relaxed font-medium text-[#1A1A1A]">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 flex flex-col">
        <FirAnalysisResultCard loading={loading} result={result} onTransferToBail={onTransferToBail} />
      </div>
    </div>
  );
};
