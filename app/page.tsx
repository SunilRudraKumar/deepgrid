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

      {/* Radar container - Now Full Screen Background */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-0 pointer-events-none">
        {/* Radar rings - Scaled up */}
        {[1, 2, 3, 4, 5].map((ring) => (
          <div
            key={ring}
            className="absolute rounded-full border border-cyan-500/10" // Reduced opacity for background
            style={{
              width: `${ring * 25}vh`, // Use viewport units for massive scale
              height: `${ring * 25}vh`,
              maxWidth: `${ring * 25}vw`, // Ensure it fits width too
              maxHeight: `${ring * 25}vw`,
            }}
          />
        ))}

        {/* Animated radar sweep - Scaled to largest ring */}
        <div
          className={`absolute w-[125vh] h-[125vh] ${mounted ? 'animate-spin' : ''}`}
          style={{
            animationDuration: '10s', // Slower sweep for larger area
            animationTimingFunction: 'linear',
          }}
        >
          <div
            className="absolute top-1/2 left-1/2 w-1/2 h-2 origin-left"
            style={{
              background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.4), rgba(6, 182, 212, 0))', // Subtle gradient
              transform: 'translateY(-50%)',
            }}
          />
          {/* Radar sweep glow */}
          <div
            className="absolute top-1/2 left-1/2 w-1/2 h-[500px] origin-left"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(6, 182, 212, 0.05), transparent 45deg)',
              transform: 'translateY(-50%)',
            }}
          />
        </div>

        {/* Pulsing dots - Spread out */}
        {[
          { x: 250, y: 150, delay: 0 },
          { x: -300, y: 100, delay: 0.5 },
          { x: 150, y: -280, delay: 1 },
          { x: -200, y: -250, delay: 1.5 },
          { x: 350, y: -100, delay: 2 },
          { x: -450, y: 200, delay: 2.5 },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 bg-cyan-400/60 rounded-full animate-pulse blur-[1px]"
            style={{
              left: `calc(50% + ${dot.x}px)`,
              top: `calc(50% + ${dot.y}px)`,
              animationDelay: `${dot.delay}s`,
              boxShadow: '0 0 30px rgba(6, 182, 212, 0.8), 0 0 60px rgba(6, 182, 212, 0.4)',
            }}
          />
        ))}
      </div>

      {/* Main Content - Centered z-10 */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Text content */}
        <div className="text-center mt-20">
          <h1 className="text-6xl md:text-8xl font-black italic tracking-widest bg-gradient-to-b from-white via-gray-200 to-neutral-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)] mb-4">
            DEEPGRID
          </h1>
          <p className="text-xl text-cyan-300/80 tracking-[0.3em] uppercase mb-4 font-light">
            Liquidity Automated
          </p>
          <p className="text-zinc-500 text-lg max-w-lg mx-auto">
            On-chain grid trading powered by DeepBook V3
          </p>
        </div>

        {/* CTA Button */}
        <Link
          href="/spot"
          className="mt-12 px-10 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xl hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105"
        >
          Launch Terminal
        </Link>
      </div>

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
