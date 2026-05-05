'use client';

import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-[28px] shadow-2xl"
      >
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-2 border-zinc-800 border-t-blue-500 flex items-center justify-center relative z-10"
          >
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Activity className="w-6 h-6 text-emerald-400" />
            </motion.div>
          </motion.div>
        </div>
        
        <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 mb-2">
          Processing...
        </h3>
        <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase">
          Loading Dashboard Data
        </p>

        {/* Pulse Bar */}
        <div className="w-32 h-1 bg-zinc-800 rounded-full mt-6 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
