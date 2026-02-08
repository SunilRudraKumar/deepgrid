// app/page.tsx
// DeepGrid Landing Page with radar animation

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e13] text-white overflow-hidden relative flex flex-col items-center justify-center">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,30,48,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(20,30,48,0.5)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_70%)]" />

      {/* Radar container */}
      <div className="relative w-[500px] h-[500px] flex items-center justify-center">
        {/* Radar rings */}
        {[1, 2, 3, 4, 5].map((ring) => (
          <div
            key={ring}
            className="absolute rounded-full border border-cyan-500/20"
            style={{
              width: `${ring * 100}px`,
              height: `${ring * 100}px`,
            }}
          />
        ))}

        {/* Animated radar sweep */}
        <div
          className={`absolute w-full h-full ${mounted ? 'animate-spin' : ''}`}
          style={{
            animationDuration: '4s',
            animationTimingFunction: 'linear',
          }}
        >
          <div
            className="absolute top-1/2 left-1/2 w-1/2 h-1 origin-left"
            style={{
              background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.8), rgba(6, 182, 212, 0))',
              transform: 'translateY(-50%)',
            }}
          />
          {/* Radar sweep glow */}
          <div
            className="absolute top-1/2 left-1/2 w-1/2 h-[200px] origin-left"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(6, 182, 212, 0.1), transparent 60deg)',
              transform: 'translateY(-50%)',
            }}
          />
        </div>

        {/* Pulsing dots (simulating liquidity nodes) */}
        {[
          { x: 80, y: 60, delay: 0 },
          { x: -100, y: 40, delay: 0.5 },
          { x: 50, y: -90, delay: 1 },
          { x: -60, y: -70, delay: 1.5 },
          { x: 120, y: -30, delay: 2 },
          { x: -150, y: 80, delay: 2.5 },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 bg-cyan-400 rounded-full animate-pulse"
            style={{
              left: `calc(50% + ${dot.x}px)`,
              top: `calc(50% + ${dot.y}px)`,
              animationDelay: `${dot.delay}s`,
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)',
            }}
          />
        ))}

        {/* Center logo */}
        <div className="absolute flex flex-col items-center justify-center z-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <span className="text-3xl font-bold">DG</span>
          </div>
        </div>
      </div>

      {/* Text content */}
      <div className="mt-12 text-center z-10">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
          DEEPGRID
        </h1>
        <p className="mt-4 text-xl text-cyan-300/80 tracking-widest uppercase">
          Liquidity Automated
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          On-chain grid trading powered by DeepBook V3
        </p>
      </div>

      {/* CTA Button */}
      <Link
        href="/spot"
        className="mt-10 px-8 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-lg hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 z-10"
      >
        Launch Terminal
      </Link>

      {/* Footer links */}
      <div className="absolute bottom-8 flex gap-8 text-sm text-zinc-500">
        <a href="https://docs.sui.io/standards/deepbookv3" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
          DeepBook Docs
        </a>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">
          GitHub
        </a>
      </div>

      {/* Ambient glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
