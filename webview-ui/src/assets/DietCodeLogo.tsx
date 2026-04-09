import type { SVGProps } from "react";

const DietCodeLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    width="128"
    height="128"
    viewBox="0 0 128 128"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title id="dietcode-logo-title">DietCode Logo</title>
    <defs>
      <linearGradient id="canGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#2a2a2a", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#0a0a0a", stopOpacity: 1 }} />
      </linearGradient>
      <linearGradient id="glowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#00f2ff", stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: "#0066ff", stopOpacity: 1 }} />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <clipPath id="canClip">
        <rect x="44" y="30" width="40" height="70" rx="8" />
      </clipPath>
    </defs>

    {/* Background Hexagon */}
    <path
      d="M64 12 L108 36 L108 92 L64 116 L20 92 L20 36 Z"
      fill="#0c0c0c"
      stroke="#333"
      strokeWidth="2"
    />
    <path
      d="M64 18 L102 39 L102 89 L64 110 L26 89 L26 39 Z"
      fill="none"
      stroke="#00f2ff"
      strokeWidth="1"
      opacity="0.2"
    />

    {/* Soda Can Body */}
    <rect
      x="44"
      y="30"
      width="40"
      height="70"
      rx="8"
      fill="url(#canGradient)"
      stroke="#444"
      strokeWidth="1"
    />

    {/* Content inside can */}
    <g clipPath="url(#canClip)">
      <rect x="44" y="60" width="40" height="25" fill="#cf2e2e" opacity="0.8" />
      <text
        x="64"
        y="74"
        fontFamily="sans-serif"
        fontSize="6"
        fontWeight="900"
        fill="white"
        textAnchor="middle"
        letterSpacing="0.5"
      >
        DIET
      </text>
      <text
        x="64"
        y="82"
        fontFamily="sans-serif"
        fontSize="6"
        fontWeight="900"
        fill="white"
        textAnchor="middle"
        letterSpacing="0.5"
      >
        CODE
      </text>
    </g>

    {/* Interactive Zap Symbol */}
    <path
      d="M68 45 L52 65 L64 65 L60 85 L76 65 L64 65 Z"
      fill="url(#glowGradient)"
      filter="url(#glow)"
    />

    {/* Bottom Accent */}
    <rect x="54" y="104" width="20" height="2" rx="1" fill="#00f2ff" opacity="0.6" />
  </svg>
);

export default DietCodeLogo;
