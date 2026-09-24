"use client";

import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showTagline?: boolean;
  href?: string;
  className?: string;
}

export function BrandLogo({
  size = "md",
  showText = true,
  showTagline = false,
  href = "/dashboard",
  className = "",
}: BrandLogoProps) {
  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const titleSizes = {
    sm: "text-[11px]",
    md: "text-xs sm:text-[13px]",
    lg: "text-sm sm:text-base",
  };

  const subSizes = {
    sm: "text-[9px]",
    md: "text-[10px] sm:text-[11px]",
    lg: "text-xs sm:text-sm",
  };

  const content = (
    <div className={`flex items-center gap-3 group shrink-0 ${className}`}>
      {/* Shield Emblem with Telemetry Waveform */}
      <div className={`relative ${iconSizes[size]} shrink-0 transition-transform duration-200 group-hover:scale-105`}>
        <svg
          viewBox="0 0 68 72"
          className="w-full h-full drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Shield Frame (Dark Navy) */}
          <path
            d="M34 3 L62 13 C62 47 43 64 34 70 C25 64 6 47 6 13 Z"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Inner Shield Red Fill */}
          <path
            d="M34 7 L58 16 C58 44 41 59 34 65 C27 59 10 44 10 16 Z"
            fill="#dc2626"
          />

          {/* Top Telemetry Matrix Data Dashes */}
          <g opacity="0.9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
            <line x1="20" y1="23" x2="25" y2="23" />
            <line x1="28" y1="23" x2="40" y2="23" />
            <line x1="43" y1="23" x2="48" y2="23" />

            <line x1="22" y1="28" x2="30" y2="28" />
            <line x1="34" y1="28" x2="46" y2="28" />
          </g>

          {/* White Waveform / Telemetry Pulse Line */}
          <path
            d="M10 38 L22 38 L26 46 L32 24 L38 51 L42 35 L46 38 L58 38"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Typography */}
      {showText && (
        <div className="min-w-0">
          <div className="flex flex-col leading-none">
            <span
              className={`font-heading font-extrabold text-slate-900 ${titleSizes[size]} tracking-tight group-hover:text-red-700 transition-colors block truncate`}
            >
              Automatic Backend
            </span>
            <span
              className={`font-heading font-black text-[#dc2626] ${subSizes[size]} tracking-wider uppercase block truncate mt-0.5`}
            >
              DETECTION
            </span>
          </div>

          {showTagline && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading block mt-0.5">
              Autonomous Observability &amp; Diagnostics
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {content}
      </Link>
    );
  }

  return content;
}

export function BrandShieldIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 68 72"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M34 3 L62 13 C62 47 43 64 34 70 C25 64 6 47 6 13 Z"
        fill="#0f172a"
        stroke="#1e293b"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M34 7 L58 16 C58 44 41 59 34 65 C27 59 10 44 10 16 Z"
        fill="#dc2626"
      />
      <g opacity="0.9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
        <line x1="20" y1="23" x2="25" y2="23" />
        <line x1="28" y1="23" x2="40" y2="23" />
        <line x1="43" y1="23" x2="48" y2="23" />
        <line x1="22" y1="28" x2="30" y2="28" />
        <line x1="34" y1="28" x2="46" y2="28" />
      </g>
      <path
        d="M10 38 L22 38 L26 46 L32 24 L38 51 L42 35 L46 38 L58 38"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default BrandLogo;
