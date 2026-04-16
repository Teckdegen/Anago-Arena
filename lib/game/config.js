export const GAME_CONFIG = {
  COURT_HALF_WIDTH: 12,
  FLOOR_Y: 0,
  WALL_X: 0,
  WALL_THICKNESS: 0.3,
  P1_DEFAULT_X: -6,
  P2_DEFAULT_X: 6,
  WIN_SCORE: 100,
  STUN_DURATION: 2.0,
  BALL_RADIUS: 0.30,        // smaller ball
  ARC_DURATION: 1.1,       // longer = slower float down
  BALL_RETURN_SPEED: 9,
  DRAG_MAX_POWER: 14,
  DRAG_MIN_POWER: 3,
  CAMERA_Z: 14,
  CAMERA_TARGET_Y: 7,
  BALL_TIMEOUT: 4.5,
}

/*
  Each theme has:
    floor / wall / bg / line — 3D scene colours
    sky     — sky gradient top (cartoon, NOT copied from screenshot)
    skyBot  — sky gradient bottom
    clouds  — cloud tint
    season  — label for UI badge

  The UI chrome (pages, buttons, cards) always uses the DOG PALETTE:
    Deep purple bg: #1E1540 / #2A1E6E
    Amber accent:   #C17A2A
    Charcoal:       #2D2D2D
    Cream text:     #F5EFE0
    Pink:           #F4A0A0
    Purple:         #5B3FDB

  The game VIEWPORT uses cartoon sky colours per season.
*/
export const COURT_THEMES = [
  // ── SUMMER ──────────────────────────────────────────────────────────────
  {
    name: 'summer_day', season: 'summer',
    floor: 0xE8A020, wall: 0xC17A2A, bg: 0x5BB8F5, line: 0xFFFFFF,
    sky: 0x5BB8F5, skyBot: 0xB8E4FF, clouds: 0xFFFFFF,
  },
  {
    name: 'summer_beach', season: 'summer',
    floor: 0xF4D03F, wall: 0xE67E22, bg: 0x5DADE2, line: 0xFFFFFF,
    sky: 0x4AA8E0, skyBot: 0xAED6F1, clouds: 0xFEFEFE,
  },
  // ── AUTUMN ──────────────────────────────────────────────────────────────
  {
    name: 'autumn_park', season: 'autumn',
    floor: 0xC17A2A, wall: 0x7D3C0A, bg: 0xE8A020, line: 0xF0B429,
    sky: 0xE59866, skyBot: 0xFAD7A0, clouds: 0xF0B27A,
  },
  {
    name: 'autumn_dusk', season: 'autumn',
    floor: 0xA04000, wall: 0x6E2F0A, bg: 0xC0392B, line: 0xF0B429,
    sky: 0xCB4335, skyBot: 0xF1948A, clouds: 0xF5CBA7,
  },
  // ── WINTER ──────────────────────────────────────────────────────────────
  {
    name: 'winter_snow', season: 'winter',
    floor: 0xD6EAF8, wall: 0x5D6D7E, bg: 0xAED6F1, line: 0xFFFFFF,
    sky: 0x85C1E9, skyBot: 0xD6EAF8, clouds: 0xF8F9FA,
  },
  {
    name: 'winter_night', season: 'winter',
    floor: 0x1A2A4A, wall: 0x2C3E50, bg: 0x0D1B2A, line: 0x85C1E9,
    sky: 0x1B2631, skyBot: 0x2E4057, clouds: 0x4A6FA5,
  },
  // ── SPRING ──────────────────────────────────────────────────────────────
  {
    name: 'spring_bloom', season: 'spring',
    floor: 0x27AE60, wall: 0x1E8449, bg: 0x82E0AA, line: 0xF9E79F,
    sky: 0x58D68D, skyBot: 0xA9DFBF, clouds: 0xFDFEFE,
  },
  {
    name: 'spring_cherry', season: 'spring',
    floor: 0x2ECC71, wall: 0x1ABC9C, bg: 0xA8E6CF, line: 0xFFD3B6,
    sky: 0x76D7C4, skyBot: 0xD1F2EB, clouds: 0xFFF0F5,
  },
  // ── NIGHT / SPECIAL ─────────────────────────────────────────────────────
  {
    name: 'neon_night', season: 'night',
    floor: 0x1A0F3E, wall: 0x00695C, bg: 0x0D0A20, line: 0x00E5FF,
    sky: 0x0D0A20, skyBot: 0x1A0F3E, clouds: 0x00695C,
  },
  {
    name: 'galaxy', season: 'night',
    floor: 0x4A148C, wall: 0x2D1F14, bg: 0x0D0D2B, line: 0xCE93D8,
    sky: 0x0D0D2B, skyBot: 0x1A0A3E, clouds: 0x4A148C,
  },
]

function seededRng(seed) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

export function getLevelConfig(level) {
  const n = Math.max(1, level)
  const r1 = seededRng(n * 7)
  const r2 = seededRng(n * 13)
  const r3 = seededRng(n * 17)

  return {
    level: n,
    // Hoop shrinks every 10 levels — only change
    hoopRadius:      Math.max(0.18, 0.55 - Math.floor(n / 10) * 0.03),
    // Physics changes with level
    gravity:         15 + n * 0.09,
    ballRestitution: 0.48 + r1 * 0.32,
    ballFriction:    0.1 + r2 * 0.15,
    // Court layout randomised per level
    wallHeight:      2.4 + r2 * 1.6,
    hoopOffsetX:     (r3 - 0.5) * 0.8,
    courtTheme:      COURT_THEMES[n % COURT_THEMES.length],
    // AI scales with level
    aiAggression:    Math.min(0.95, 0.15 + n * 0.009),
    aiReactionTime:  Math.max(0.25, 1.3 - n * 0.01),
    aiAccuracy:      Math.min(0.92, 0.3 + n * 0.007),
    // Score multiplier every 20 levels
    scoreMultiplier: 1 + Math.floor(n / 20) * 0.5,
  }
}
