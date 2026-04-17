'use client';

import React, { useState, useCallback } from 'react';
import { useFirebaseStatus } from '@/store/FirebaseStatusContext';
import { Wifi, WifiOff, Loader2, AlertTriangle, X, Copy, Check, Flame } from 'lucide-react';

interface FirebaseIndicatorProps {
  /** 'sidebar' shows label + more details; 'header' shows compact pill only */
  variant?: 'sidebar' | 'header';
}

export function FirebaseIndicator({ variant = 'header' }: FirebaseIndicatorProps) {
  const { status, error, clearError, lastChecked } = useFirebaseStatus();
  const [showError, setShowError] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!error) return;
    try {
      await navigator.clipboard.writeText(error.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = error.raw;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [error]);

  const statusConfig = {
    connected: {
      dot: 'bg-emerald-500 shadow-emerald-500/50',
      dotPulse: 'animate-pulse',
      label: 'Firebase Connected',
      shortLabel: 'Live',
      icon: <Wifi className="w-3 h-3" />,
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    },
    connecting: {
      dot: 'bg-amber-400 shadow-amber-400/50',
      dotPulse: 'animate-pulse',
      label: 'Firebase Connecting…',
      shortLabel: 'Sync…',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
    },
    error: {
      dot: 'bg-red-500 shadow-red-500/50',
      dotPulse: 'animate-pulse',
      label: 'Firebase Error',
      shortLabel: 'Error',
      icon: <AlertTriangle className="w-3 h-3" />,
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/10 border-red-500/20',
    },
    offline: {
      dot: 'bg-zinc-500 shadow-zinc-500/50',
      dotPulse: '',
      label: 'Firebase Offline',
      shortLabel: 'Offline',
      icon: <WifiOff className="w-3 h-3" />,
      textColor: 'text-zinc-400',
      bgColor: 'bg-zinc-800/50 border-zinc-700/30',
    },
  } as const;

  const cfg = statusConfig[status];
  const hasError = status === 'error' && error;

  if (variant === 'sidebar') {
    return (
      <div className="w-full">
        <button
          onClick={() => hasError && setShowError(prev => !prev)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${cfg.bgColor} ${hasError ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
          title={cfg.label}
        >
          {/* Pulsing dot */}
          <span className="relative flex-shrink-0">
            <span className={`block w-2 h-2 rounded-full shadow-md ${cfg.dot}`} />
            {status !== 'offline' && (
              <span className={`absolute inset-0 rounded-full ${cfg.dot} opacity-40 scale-150 ${cfg.dotPulse}`} />
            )}
          </span>
          <span className={`flex items-center gap-1.5 text-[11px] font-semibold flex-1 ${cfg.textColor}`}>
            <Flame className="w-3 h-3 opacity-80" />
            {cfg.label}
          </span>
          {hasError && (
            <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
          )}
        </button>

        {/* Error expansion panel */}
        {showError && hasError && (
          <ErrorPanel error={error} copied={copied} onCopy={handleCopy} onClose={() => { setShowError(false); clearError(); }} />
        )}
      </div>
    );
  }

  // header variant — compact pill
  return (
    <div className="relative">
      <button
        onClick={() => hasError && setShowError(prev => !prev)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-bold transition-all ${cfg.bgColor} ${cfg.textColor} ${hasError ? 'cursor-pointer animate-bounce-subtle' : 'cursor-default'}`}
        title={cfg.label}
      >
        <span className="relative flex-shrink-0">
          <span className={`block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        </span>
        {cfg.icon}
        <span className="hidden sm:inline">{cfg.shortLabel}</span>
      </button>

      {showError && hasError && (
        <div className="absolute top-8 right-0 z-[9999] w-80">
          <ErrorPanel error={error} copied={copied} onCopy={handleCopy} onClose={() => { setShowError(false); clearError(); }} />
        </div>
      )}
    </div>
  );
}

function ErrorPanel({
  error,
  copied,
  onCopy,
  onClose,
}: {
  error: NonNullable<ReturnType<typeof useFirebaseStatus>['error']>;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="mt-2 rounded-xl border border-red-500/30 bg-[#1a0f0f] shadow-2xl shadow-red-900/30 overflow-hidden animate-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 border-b border-red-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs font-bold text-red-300">Firebase Error</span>
        </div>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Error details */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Code</p>
          <p className="text-xs font-mono text-red-300">{error.code}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Message</p>
          <p className="text-xs text-zinc-300 leading-relaxed">{error.message}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Timestamp</p>
          <p className="text-xs font-mono text-zinc-400">{error.timestamp}</p>
        </div>

        {/* Raw error — copyable */}
        <div className="rounded-lg bg-black/40 border border-zinc-800 p-2">
          <p className="text-[9px] font-mono text-zinc-500 break-all leading-relaxed">{error.raw}</p>
        </div>

        {/* Copy button */}
        <button
          onClick={onCopy}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all border ${
            copied
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy Error to Clipboard
            </>
          )}
        </button>
      </div>
    </div>
  );
}
