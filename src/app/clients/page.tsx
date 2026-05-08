'use client';

import { Lock } from 'lucide-react';

export default function ClientManager() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="bg-zinc-900/60 border border-zinc-700/40 p-10 rounded-3xl text-center max-w-sm shadow-2xl relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/20 to-transparent pointer-events-none rounded-3xl" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-zinc-800/80 border border-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
            <Lock className="w-8 h-8 text-zinc-500" />
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">Section Locked</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            The <span className="text-zinc-300 font-semibold">Client Manager</span> is currently disabled.<br />
            It will be available in a future update.
          </p>
          
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-xl text-xs text-zinc-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}
