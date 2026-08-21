import React from "react";

interface ForenlyticsLogoProps {
  size?: number | string;
  className?: string;
  glow?: boolean;
}

export function ForenlyticsLogo({ size = 36, className = "", glow = true }: ForenlyticsLogoProps) {
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      style={{ width: dimension, height: dimension }}
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
    >
      <svg
        viewBox="0 0 512 512"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full transition-transform duration-300 ${glow ? "drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]" : ""}`}
      >
        <defs>
          <radialGradient id="logoBgGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="65%" stopColor="#090E17" />
            <stop offset="100%" stopColor="#030712" />
          </radialGradient>

          <linearGradient id="logoNeonRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="35%" stopColor="#38BDF8" />
            <stop offset="70%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#00F0FF" />
          </linearGradient>

          <linearGradient id="logoWaveGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="50%" stopColor="#00F0FF" />
            <stop offset="100%" stopColor="#A5F3FC" />
          </linearGradient>

          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Subtle Neon Halo */}
        <circle cx="256" cy="256" r="240" stroke="url(#logoNeonRim)" strokeWidth="3" opacity="0.4" />

        {/* Main Dark Circular Body */}
        <circle cx="256" cy="256" r="236" fill="url(#logoBgGrad)" />

        {/* Primary Neon Circular Ring */}
        <circle cx="256" cy="256" r="236" stroke="url(#logoNeonRim)" strokeWidth="7" />
        <circle cx="256" cy="256" r="226" stroke="#00F0FF" strokeWidth="1.5" opacity="0.35" />

        {/* Concentric Forensic / Radar Target Rings */}
        <circle cx="256" cy="256" r="175" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.3" />
        <circle cx="256" cy="256" r="115" stroke="#6366F1" strokeWidth="1.5" opacity="0.35" />

        {/* Precision Compass Ticks */}
        <line x1="256" y1="24" x2="256" y2="38" stroke="#00F0FF" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <line x1="256" y1="474" x2="256" y2="488" stroke="#00F0FF" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <line x1="24" y1="256" x2="38" y2="256" stroke="#00F0FF" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
        <line x1="474" y1="256" x2="488" y2="256" stroke="#00F0FF" strokeWidth="3" strokeLinecap="round" opacity="0.85" />

        {/* Symmetric Audio Waveform Biometric Spectrum */}
        <g filter="url(#logoGlow)">
          <line x1="256" y1="110" x2="256" y2="402" stroke="url(#logoWaveGrad)" strokeWidth="11" strokeLinecap="round" />
          
          <line x1="228" y1="135" x2="228" y2="377" stroke="url(#logoWaveGrad)" strokeWidth="9" strokeLinecap="round" />
          <line x1="200" y1="165" x2="200" y2="347" stroke="url(#logoWaveGrad)" strokeWidth="9" strokeLinecap="round" />
          <line x1="172" y1="140" x2="172" y2="372" stroke="url(#logoWaveGrad)" strokeWidth="8" strokeLinecap="round" />
          <line x1="144" y1="195" x2="144" y2="317" stroke="url(#logoWaveGrad)" strokeWidth="8" strokeLinecap="round" />
          <line x1="116" y1="220" x2="116" y2="292" stroke="url(#logoWaveGrad)" strokeWidth="7" strokeLinecap="round" />
          <line x1="88"  y1="238" x2="88"  y2="274" stroke="url(#logoWaveGrad)" strokeWidth="6" strokeLinecap="round" />

          <line x1="284" y1="135" x2="284" y2="377" stroke="url(#logoWaveGrad)" strokeWidth="9" strokeLinecap="round" />
          <line x1="312" y1="165" x2="312" y2="347" stroke="url(#logoWaveGrad)" strokeWidth="9" strokeLinecap="round" />
          <line x1="340" y1="140" x2="340" y2="372" stroke="url(#logoWaveGrad)" strokeWidth="8" strokeLinecap="round" />
          <line x1="368" y1="195" x2="368" y2="317" stroke="url(#logoWaveGrad)" strokeWidth="8" strokeLinecap="round" />
          <line x1="396" y1="220" x2="396" y2="292" stroke="url(#logoWaveGrad)" strokeWidth="7" strokeLinecap="round" />
          <line x1="424" y1="238" x2="424" y2="274" stroke="url(#logoWaveGrad)" strokeWidth="6" strokeLinecap="round" />
        </g>

        {/* Central Acoustic Core */}
        <circle cx="256" cy="256" r="28" fill="#030712" stroke="#00F0FF" strokeWidth="4" />
        <circle cx="256" cy="256" r="14" fill="#00F0FF" />
        <circle cx="256" cy="256" r="6" fill="#FFFFFF" />
      </svg>
    </div>
  );
}
