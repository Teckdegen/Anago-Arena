/*
  Cartoon-style icons — filled shapes with thick outlines.
  Palette pulled from the French Bulldog mascot:
    Charcoal  #2D2D2D  (outlines)
    Amber     #C17A2A  (primary fills)
    Purple    #5B3FDB  (accent fills)
    Cream     #F5EFE0  (light fills)
    Pink      #F4A0A0  (ear / highlight)
    Gold      #F0B429  (trophy / score)
*/

// ── Basketball ────────────────────────────────────────────────────────────
export function BasketballIcon({ size = 24, color = '#C17A2A', style = {}, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style} className={className}>
      <circle cx="16" cy="16" r="14" fill={color} stroke="#2D2D2D" strokeWidth="2.5" />
      <path d="M6 8 C9 11 10 13.5 10 16 S9 21 6 24" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M26 8 C23 11 22 13.5 22 16 S23 21 26 24" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />
      <line x1="2" y1="16" x2="30" y2="16" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="30" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Paw ───────────────────────────────────────────────────────────────────
export function PawIcon({ size = 24, color = '#C17A2A', style = {}, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style} className={className}>
      <circle cx="14" cy="5"  r="3.5" fill={color} stroke="#2D2D2D" strokeWidth="2" />
      <circle cx="23" cy="9"  r="3"   fill={color} stroke="#2D2D2D" strokeWidth="2" />
      <circle cx="5"  cy="9"  r="3"   fill={color} stroke="#2D2D2D" strokeWidth="2" />
      <circle cx="6"  cy="18" r="2.5" fill={color} stroke="#2D2D2D" strokeWidth="2" />
      <path
        d="M12 16 C12 13 13.5 12 16 12 C18.5 12 20 13 20 16 L21 22 C21.5 24 20 26 18 26.5 C16.7 27 15.3 27 14 26.5 C12 26 10.5 24 11 22 Z"
        fill={color} stroke="#2D2D2D" strokeWidth="2"
      />
    </svg>
  )
}

// ── Trophy ────────────────────────────────────────────────────────────────
export function TrophyIcon({ size = 24, color = '#F0B429', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <path d="M8 4 H24 V16 C24 21 20 25 16 25 C12 25 8 21 8 16 Z" fill={color} stroke="#2D2D2D" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M8 8 H4 C4 8 3 16 8 16" fill={color} stroke="#2D2D2D" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 8 H28 C28 8 29 16 24 16" fill={color} stroke="#2D2D2D" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="12" y="25" width="8" height="3" rx="1" fill={color} stroke="#2D2D2D" strokeWidth="2" />
      <rect x="9"  y="28" width="14" height="2.5" rx="1.2" fill={color} stroke="#2D2D2D" strokeWidth="2" />
      {/* Star on cup */}
      <polygon points="16,9 17.2,12.5 21,12.5 18,14.5 19.2,18 16,16 12.8,18 14,14.5 11,12.5 14.8,12.5"
        fill="#2D2D2D" opacity="0.25" />
    </svg>
  )
}

// ── Wallet ────────────────────────────────────────────────────────────────
export function WalletIcon({ size = 24, color = '#F5EFE0', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="3" y="9" width="26" height="18" rx="3" fill="#5B3FDB" stroke="#2D2D2D" strokeWidth="2.5" />
      <path d="M7 9 V7 C7 5.3 8.3 4 10 4 H24 C25.7 4 27 5.3 27 7 V9" fill="#5B3FDB" stroke="#2D2D2D" strokeWidth="2.5" />
      <rect x="20" y="15" width="9" height="6" rx="2" fill={color} stroke="#2D2D2D" strokeWidth="2" />
      <circle cx="24.5" cy="18" r="1.2" fill="#5B3FDB" />
    </svg>
  )
}

// ── Bot (AI) ──────────────────────────────────────────────────────────────
export function BotIcon({ size = 24, color = '#F5EFE0', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="5" y="12" width="22" height="16" rx="4" fill="#5B3FDB" stroke="#2D2D2D" strokeWidth="2.5" />
      <circle cx="16" cy="6" r="3" fill="#5B3FDB" stroke="#2D2D2D" strokeWidth="2.5" />
      <line x1="16" y1="9" x2="16" y2="12" stroke="#2D2D2D" strokeWidth="2.5" strokeLinecap="round" />
      {/* Eyes */}
      <circle cx="11" cy="19" r="2.5" fill={color} stroke="#2D2D2D" strokeWidth="1.5" />
      <circle cx="21" cy="19" r="2.5" fill={color} stroke="#2D2D2D" strokeWidth="1.5" />
      <circle cx="11" cy="19" r="1" fill="#2D2D2D" />
      <circle cx="21" cy="19" r="1" fill="#2D2D2D" />
      {/* Mouth */}
      <path d="M11 24 Q16 27 21 24" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Antenna */}
      <circle cx="16" cy="6" r="1.5" fill="#F0B429" stroke="#2D2D2D" strokeWidth="1.5" />
    </svg>
  )
}

// ── Users (PVP) ───────────────────────────────────────────────────────────
export function UsersIcon({ size = 24, color = '#F5EFE0', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      {/* Left dog */}
      <circle cx="10" cy="10" r="5" fill="#C17A2A" stroke="#2D2D2D" strokeWidth="2" />
      <path d="M3 28 C3 22 6 19 10 19 C14 19 17 22 17 28" fill="#C17A2A" stroke="#2D2D2D" strokeWidth="2" strokeLinejoin="round" />
      {/* Right dog */}
      <circle cx="22" cy="10" r="5" fill="#5B3FDB" stroke="#2D2D2D" strokeWidth="2" />
      <path d="M15 28 C15 22 18 19 22 19 C26 19 29 22 29 28" fill="#5B3FDB" stroke="#2D2D2D" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

// ── Arrow Left ────────────────────────────────────────────────────────────
export function ArrowLeftIcon({ size = 24, color = '#C17A2A', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <circle cx="16" cy="16" r="14" fill={color} stroke="#2D2D2D" strokeWidth="2.5" />
      <path d="M19 9 L11 16 L19 23" stroke="#2D2D2D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ── Arrow Right ───────────────────────────────────────────────────────────
export function ArrowRightIcon({ size = 24, color = '#C17A2A', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <circle cx="16" cy="16" r="14" fill={color} stroke="#2D2D2D" strokeWidth="2.5" />
      <path d="M13 9 L21 16 L13 23" stroke="#2D2D2D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ── Check ─────────────────────────────────────────────────────────────────
export function CheckIcon({ size = 20, color = '#27AE60', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <circle cx="16" cy="16" r="14" fill={color} stroke="#2D2D2D" strokeWidth="2.5" />
      <path d="M8 16 L13 22 L24 10" stroke="#F5EFE0" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ── X (close) ─────────────────────────────────────────────────────────────
export function XIcon({ size = 20, color = '#E05050', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <circle cx="16" cy="16" r="14" fill={color} stroke="#2D2D2D" strokeWidth="2.5" />
      <line x1="10" y1="10" x2="22" y2="22" stroke="#F5EFE0" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="22" y1="10" x2="10" y2="22" stroke="#F5EFE0" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Menu (hamburger) ──────────────────────────────────────────────────────
export function MenuIcon({ size = 20, color = '#F5EFE0', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="2" y="2" width="28" height="28" rx="6" fill="#5B3FDB" stroke="#2D2D2D" strokeWidth="2.5" />
      <line x1="7" y1="10" x2="25" y2="10" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="7" y1="16" x2="25" y2="16" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="7" y1="22" x2="25" y2="22" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// ── Plus ──────────────────────────────────────────────────────────────────
export function PlusIcon({ size = 20, color = '#F5EFE0', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <circle cx="16" cy="16" r="14" fill="#27AE60" stroke="#2D2D2D" strokeWidth="2.5" />
      <line x1="16" y1="8"  x2="16" y2="24" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="8"  y1="16" x2="24" y2="16" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────
export function AlertIcon({ size = 20, color = '#E05050', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <path d="M16 3 L30 28 H2 Z" fill={color} stroke="#2D2D2D" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="16" y1="13" x2="16" y2="20" stroke="#F5EFE0" strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="24" r="1.5" fill="#F5EFE0" />
    </svg>
  )
}

// ── Star ──────────────────────────────────────────────────────────────────
export function StarIcon({ size = 20, color = '#F0B429', fill = '#F0B429', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <polygon
        points="16,3 19.5,12 29,12 22,18 24.5,28 16,22 7.5,28 10,18 3,12 12.5,12"
        fill={fill} stroke="#2D2D2D" strokeWidth="2" strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Skull ─────────────────────────────────────────────────────────────────
export function SkullIcon({ size = 24, color = '#E05050', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <path d="M16 3 C8 3 4 9 4 15 C4 20 7 23 10 24 V28 H22 V24 C25 23 28 20 28 15 C28 9 24 3 16 3 Z"
        fill={color} stroke="#2D2D2D" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Eyes */}
      <circle cx="11" cy="15" r="3" fill="#2D2D2D" />
      <circle cx="21" cy="15" r="3" fill="#2D2D2D" />
      {/* Teeth */}
      <line x1="13" y1="28" x2="13" y2="24" stroke="#2D2D2D" strokeWidth="2" />
      <line x1="19" y1="28" x2="19" y2="24" stroke="#2D2D2D" strokeWidth="2" />
    </svg>
  )
}

// ── Zap ───────────────────────────────────────────────────────────────────
export function ZapIcon({ size = 24, color = '#F0B429', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <polygon points="18,3 6,18 15,18 14,29 26,14 17,14" fill={color} stroke="#2D2D2D" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

// ── Target ────────────────────────────────────────────────────────────────
export function TargetIcon({ size = 24, color = '#E05050', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <circle cx="16" cy="16" r="14" fill={color} stroke="#2D2D2D" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="9"  fill="#F5EFE0" stroke="#2D2D2D" strokeWidth="2" />
      <circle cx="16" cy="16" r="4"  fill={color} stroke="#2D2D2D" strokeWidth="2" />
    </svg>
  )
}

// ── Mouse Pointer ─────────────────────────────────────────────────────────
export function MousePointerIcon({ size = 24, color = '#F5EFE0', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <path d="M5 5 L10 27 L14 19 L22 27 L26 23 L18 15 L27 11 Z"
        fill={color} stroke="#2D2D2D" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

// ── Send ──────────────────────────────────────────────────────────────────
export function SendIcon({ size = 24, color = '#5B3FDB', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <polygon points="3,3 29,16 3,29 8,16" fill={color} stroke="#2D2D2D" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="8" y1="16" x2="29" y2="16" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// ── Loader ────────────────────────────────────────────────────────────────
export function LoaderIcon({ size = 20, color = '#F5EFE0', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
      style={{ animation: 'spin 0.8s linear infinite', ...style }}>
      <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" />
      <path d="M16 4 A12 12 0 0 1 28 16" stroke={color} strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// ── Dog mascot ────────────────────────────────────────────────────────────
export function DogIcon({ size = 48, color = '#C17A2A', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={style}>
      {/* Body */}
      <ellipse cx="32" cy="44" rx="16" ry="13" fill="#2D2D2D" stroke="#1A1008" strokeWidth="2.5" />
      {/* Belly */}
      <ellipse cx="32" cy="48" rx="8" ry="7" fill="#F5EFE0" />
      {/* Head */}
      <circle cx="32" cy="24" r="16" fill="#2D2D2D" stroke="#1A1008" strokeWidth="2.5" />
      {/* Tan markings */}
      <ellipse cx="36" cy="26" rx="6" ry="5" fill={color} opacity="0.8" />
      <ellipse cx="26" cy="28" rx="4" ry="3.5" fill={color} opacity="0.6" />
      {/* Snout */}
      <ellipse cx="32" cy="30" rx="7" ry="5" fill={color} stroke="#1A1008" strokeWidth="1.5" />
      {/* Nose */}
      <ellipse cx="32" cy="27" rx="4" ry="3" fill="#1A1008" />
      {/* Nostrils */}
      <circle cx="30" cy="28" r="1" fill="#2D2D2D" />
      <circle cx="34" cy="28" r="1" fill="#2D2D2D" />
      {/* Left ear */}
      <path d="M16 14 L10 2 L22 10 Z" fill="#2D2D2D" stroke="#1A1008" strokeWidth="2" strokeLinejoin="round" />
      {/* Right ear */}
      <path d="M48 14 L54 2 L42 10 Z" fill="#2D2D2D" stroke="#1A1008" strokeWidth="2" strokeLinejoin="round" />
      {/* Inner ears */}
      <path d="M17 13 L13 5 L21 10 Z" fill="#F4A0A0" />
      <path d="M47 13 L51 5 L43 10 Z" fill="#F4A0A0" />
      {/* Eyes closed — happy arcs */}
      <path d="M24 22 Q27 19 30 22" stroke="#1A1008" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M34 22 Q37 19 40 22" stroke="#1A1008" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Collar */}
      <path d="M17 36 Q32 41 47 36" stroke="#C17A2A" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Collar tag — purple diamond */}
      <rect x="29" y="38" width="6" height="6" rx="1" fill="#5B3FDB" stroke="#1A1008" strokeWidth="1.5" transform="rotate(45 32 41)" />
      <rect x="30.5" y="39.5" width="3" height="3" rx="0.5" fill="#F5EFE0" transform="rotate(45 32 41)" />
    </svg>
  )
}

// ── Medal Gold ────────────────────────────────────────────────────────────
export function MedalGoldIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M10 4 H22 L20 12 H12 Z" fill="#F0B429" stroke="#2D2D2D" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="16" cy="22" r="9" fill="#F0B429" stroke="#2D2D2D" strokeWidth="2.5" />
      <circle cx="16" cy="22" r="6" fill="#FFD060" />
      <text x="16" y="26" textAnchor="middle" fill="#7a5200" fontSize="8" fontWeight="bold" fontFamily="'Press Start 2P', monospace">1</text>
    </svg>
  )
}

// ── Medal Silver ──────────────────────────────────────────────────────────
export function MedalSilverIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M10 4 H22 L20 12 H12 Z" fill="#C0C0C0" stroke="#2D2D2D" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="16" cy="22" r="9" fill="#C0C0C0" stroke="#2D2D2D" strokeWidth="2.5" />
      <circle cx="16" cy="22" r="6" fill="#E0E0E0" />
      <text x="16" y="26" textAnchor="middle" fill="#555" fontSize="8" fontWeight="bold" fontFamily="'Press Start 2P', monospace">2</text>
    </svg>
  )
}

// ── Medal Bronze ──────────────────────────────────────────────────────────
export function MedalBronzeIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M10 4 H22 L20 12 H12 Z" fill="#CD7F32" stroke="#2D2D2D" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="16" cy="22" r="9" fill="#CD7F32" stroke="#2D2D2D" strokeWidth="2.5" />
      <circle cx="16" cy="22" r="6" fill="#E8A060" />
      <text x="16" y="26" textAnchor="middle" fill="#5c2a00" fontSize="8" fontWeight="bold" fontFamily="'Press Start 2P', monospace">3</text>
    </svg>
  )
}

// ── Copy ──────────────────────────────────────────────────────────────────
export function CopyIcon({ size = 18, color = '#C17A2A', style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
      <rect x="10" y="10" width="18" height="18" rx="3" fill={color} stroke="#2D2D2D" strokeWidth="2.5" />
      <rect x="4"  y="4"  width="18" height="18" rx="3" fill="#F5EFE0" stroke="#2D2D2D" strokeWidth="2.5" />
    </svg>
  )
}
