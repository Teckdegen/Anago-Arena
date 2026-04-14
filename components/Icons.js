// Shared icon components — all SVG, no emojis

export function BasketballIcon({ size = 24, color = 'currentColor', style = {}, className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M4.9 4.9C6.8 7 8 9.4 8 12s-1.2 5-3.1 7.1" />
      <path d="M19.1 4.9C17.2 7 16 9.4 16 12s1.2 5 3.1 7.1" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
    </svg>
  )
}

export function PawIcon({ size = 24, color = 'currentColor', style = {}, className = '' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className}
    >
      <circle cx="11" cy="4" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="4"  cy="8" r="2" />
      <circle cx="5"  cy="14" r="2" />
      <path d="M9 12c.5-1.5 1.2-2 2.5-2h1c1.3 0 2 .5 2.5 2l1 5c.3 1-.2 2-1.5 2.5a6 6 0 0 1-6 0C7.2 19 6.7 18 7 17z" />
    </svg>
  )
}

export function TrophyIcon({ size = 24, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  )
}

export function WalletIcon({ size = 24, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  )
}

export function BotIcon({ size = 24, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  )
}

export function UsersIcon({ size = 24, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function ArrowLeftIcon({ size = 24, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

export function ArrowRightIcon({ size = 24, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  )
}

export function CheckIcon({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function XIcon({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6"  y1="6" x2="18" y2="18" />
    </svg>
  )
}

export function MenuIcon({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="3" y1="6"  x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

export function PlusIcon({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5"  y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function AlertIcon({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9"  x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function StarIcon({ size = 20, color = 'currentColor', fill = 'none', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function SkullIcon({ size = 24, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M12 2C6.5 2 2 6.5 2 12c0 3.7 2 6.9 5 8.6V22h10v-1.4c3-1.7 5-4.9 5-8.6C22 6.5 17.5 2 12 2z" />
      <line x1="9"  y1="17" x2="9"  y2="22" />
      <line x1="15" y1="17" x2="15" y2="22" />
      <circle cx="9"  cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
    </svg>
  )
}

export function ZapIcon({ size = 24, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

export function TargetIcon({ size = 24, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

export function MousePointerIcon({ size = 24, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
    </svg>
  )
}

export function SendIcon({ size = 24, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

export function LoaderIcon({ size = 20, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', ...style }}>
      <line x1="12" y1="2"  x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93"   x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2"  y1="12" x2="6"  y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07"  x2="7.76"  y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  )
}

export function DogIcon({ size = 48, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {/* Body */}
      <ellipse cx="24" cy="30" rx="12" ry="10" fill="#3D2914" stroke="#2D1F14" />
      {/* Belly */}
      <ellipse cx="24" cy="33" rx="6" ry="5" fill="#F5EFE0" stroke="none" />
      {/* Head */}
      <circle cx="24" cy="16" r="11" fill="#3D2914" stroke="#2D1F14" />
      {/* Snout */}
      <ellipse cx="24" cy="20" rx="5" ry="3.5" fill="#C4956A" stroke="none" />
      {/* Nose */}
      <ellipse cx="24" cy="18.5" rx="2.5" ry="1.8" fill="#1A1008" stroke="none" />
      {/* Left ear */}
      <path d="M13 10 L10 2 L18 8z" fill="#3D2914" stroke="#2D1F14" />
      {/* Right ear */}
      <path d="M35 10 L38 2 L30 8z" fill="#3D2914" stroke="#2D1F14" />
      {/* Left inner ear */}
      <path d="M13.5 9 L11.5 4 L17 7.5z" fill="#F4A0A0" stroke="none" />
      {/* Right inner ear */}
      <path d="M34.5 9 L36.5 4 L31 7.5z" fill="#F4A0A0" stroke="none" />
      {/* Eyes closed */}
      <path d="M19 15 Q21 13.5 23 15" stroke="#1A1008" strokeWidth="1.5" fill="none" />
      <path d="M25 15 Q27 13.5 29 15" stroke="#1A1008" strokeWidth="1.5" fill="none" />
      {/* Collar */}
      <path d="M14 23 Q24 26 34 23" stroke="#C17A2A" strokeWidth="2.5" fill="none" />
      {/* Tag */}
      <rect x="22" y="24" width="4" height="4" rx="0.5" fill="#5C3FA0" transform="rotate(45 24 26)" />
    </svg>
  )
}

export function MedalGoldIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="14" r="8" fill="#F0B429" stroke="#b07800" />
      <text x="12" y="18" textAnchor="middle" fill="#7a5200" fontSize="9" fontWeight="bold" fontFamily="sans-serif">1</text>
      <path d="M8 3h8l-1 6H9z" fill="#F0B429" stroke="#b07800" />
    </svg>
  )
}

export function MedalSilverIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <circle cx="12" cy="14" r="8" fill="#C0C0C0" stroke="#888" />
      <text x="12" y="18" textAnchor="middle" fill="#555" fontSize="9" fontWeight="bold" fontFamily="sans-serif">2</text>
      <path d="M8 3h8l-1 6H9z" fill="#C0C0C0" stroke="#888" />
    </svg>
  )
}

export function MedalBronzeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
      <circle cx="12" cy="14" r="8" fill="#CD7F32" stroke="#8B4513" />
      <text x="12" y="18" textAnchor="middle" fill="#5c2a00" fontSize="9" fontWeight="bold" fontFamily="sans-serif">3</text>
      <path d="M8 3h8l-1 6H9z" fill="#CD7F32" stroke="#8B4513" />
    </svg>
  )
}
