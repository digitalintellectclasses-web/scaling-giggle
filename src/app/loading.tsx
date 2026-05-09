'use client';

import { motion } from 'framer-motion';
import { Cpu, Zap, Activity } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#09090b]">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-gradient-to-t from-cyan-500/5 via-transparent to-blue-500/5"
      />

      {/* Main Content Container */}
      <div className="relative flex flex-col items-center">
        {/* The Core Spinner */}
        <div className="relative w-32 h-32 mb-12">
          {/* Ambient Glows */}
          <div className="absolute inset-0 blur-[60px] animate-pulse rounded-full" style={{ background: 'rgba(0,180,216,0.2)' }} />
          <div className="absolute inset-0 blur-[40px] animate-pulse delay-700 rounded-full" style={{ background: 'rgba(0,119,182,0.1)' }} />
          
          {/* Outer Ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-[1px] border-zinc-800" style={{ borderTopColor: '#00b4d8', borderBottomColor: '#0077b6' }}
          />
          
          {/* Middle Hexagon / Circuitry */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-4 rounded-full border-[1px] border-dashed border-zinc-700 opacity-50"
          />

          {/* Center Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                filter: ['drop-shadow(0 0 0px #00b4d8)', 'drop-shadow(0 0 15px #00b4d8)', 'drop-shadow(0 0 0px #00b4d8)']
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Activity className="w-10 h-10" style={{ color: '#00b4d8' }} />
            </motion.div>
          </div>
        </div>

        {/* Text Section */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-black tracking-[0.2em] text-white uppercase italic flex items-center gap-3">
              <Zap className="w-5 h-5 fill-current" style={{ color: '#00b4d8' }} />
              Ivory Tech
            </h2>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-8"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Modules</span>
              <span className="text-xs font-mono text-zinc-400 italic font-black">SYNCING...</span>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Network</span>
              <span className="text-xs font-mono italic font-black" style={{ color: '#00b4d8' }}>ENCRYPTED</span>
            </div>
          </motion.div>
        </div>

        {/* Progress Bar Container */}
        <div className="mt-12 w-64 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50 p-[1px]">
          <motion.div
            className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #00b4d8, #0077b6, #00b4d8)', width: '100%' }}
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
      
      {/* Corner Tech Decor */}
      <div className="absolute top-8 left-8 flex items-center gap-3 opacity-20">
        <Cpu className="w-4 h-4 text-zinc-500" />
        <span className="text-[10px] font-mono text-zinc-500">SYSTEM_AUTH_ACTIVE</span>
      </div>
    </div>
  );
}
