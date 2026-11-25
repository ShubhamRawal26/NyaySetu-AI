/**
 * @fileoverview Global React Error Boundary ensuring resilient user recovery
 * and accessible error presentation in the warm institutional editorial theme.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, PhoneCall, RotateCcw } from 'lucide-react';
import { NALSA_HELPLINE_NUMBER } from '../shared/constants';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Catches unexpected rendering errors in descendant components and presents
 * an accessible recovery card with direct access to NALSA Helpline 15100.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected UI error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[NyayaSetu] UI ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-screen bg-[#FFFFEB] text-[#1A1A1A] flex items-center justify-center p-6"
      >
        <div className="ink-card max-w-lg w-full rounded-[24px] bg-[#F6F6E0] p-7 space-y-5">
          <div className="flex items-center gap-3 text-[#1A1A1A]">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#1A1A1A] bg-[#FFA946]">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-xl font-bold">
                Something interrupted this view
              </h1>
              <p className="text-xs text-[#4A4A43]">
                Your data is safe. You can reload the legal tool right away.
              </p>
            </div>
          </div>

          <p className="rounded-xl border border-[#E4E4D0] bg-[#FFFFEB] p-3.5 text-xs text-[#4A4A43] leading-relaxed">
            {this.state.errorMessage}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <a
              href={`tel:${NALSA_HELPLINE_NUMBER}`}
              className="inline-flex min-h-[42px] items-center gap-2 text-xs sm:text-sm font-semibold text-[#0041CA] hover:underline"
            >
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              <span>Free Legal Aid: {NALSA_HELPLINE_NUMBER}</span>
            </a>

            <button
              type="button"
              onClick={this.handleReset}
              className="btn-cobalt inline-flex min-h-[42px] items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Restore Workspace</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
