/**
 * FootballCanvas — Full 11v11 Football Game Engine
 * Top-down view, HTML5 Canvas, React component.
 * config: { mode, roomId, side, opponent, formation }
 */
import { useEffect, useRef } from 'react'

// ─── FORMATIONS ──────────────────────────────────────────────────────────────
// Positions as [xFrac, yFrac] relative to own half (0=goal line, 1=mid line)
// 11 entries: index 0 = keeper, 1-10 = outfield
const FORMATIONS = {
  '4-4-2': [
    [0.04, 0.50],                                           // GK
    [0.20, 0.18],[0.20, 0.40],[0.20, 0.60],[0.20, 0.82],   // DEF
    [0.50, 0.18],[0.50, 0.38],[0.50, 0.62],[0.50, 0.82],   // MID
    [0.78, 0.38],[0.78, 0.62],                              // FWD
  ],
  '4-3-3': [
    [0.04, 0.50],
    [0.20, 0.18],[0.20, 0.40],[0.20, 0.60],[0.20, 0.82],
    [0.48, 0.25],[0.48, 0.50],[0.48, 0.75],
    [0.78, 0.18],[0.78, 0.50],[0.78, 0.82],
  ],
  '3-5-2': [
    [0.04, 0.50],
    [0.20, 0.25],[0.20, 0.50],[0.20, 0.75],
    [0.48, 0.12],[0.48, 0.32],[0.48, 0.50],[0.48, 0.68],[0.48, 0.88],
    [0.78, 0.38],[0.78, 0.62],
  ],
  '5-3-2': [
    [0.04, 0.50],
    [0.18, 0.12],[0.18, 0.32],[0.18, 0.50],[0.18, 0.68],[0.18, 0.88],
    [0.48, 0.25],[0.48, 0.50],[0.48, 0.75],
    [0.78, 0.38],[0.78, 0.62],
  ],
}

const TEAM_AMBER  = '#C17A2A'
const TEAM_PURPLE = '#5B3FDB'
const KEEPER_AMBER  = '#8B5010'
const KEEPER_PURPLE = '#3A2490'

const PLAYER_R   = 18        // player circle radius
const BALL_R     = 10
const FRICTION   = 0.97
const SHOOT_DIST = 160       // max dist from goal to attempt shot
const PASS_DIST  = 200       // max dist for auto-pass
const GOAL_W     = 14        // goal post depth
const WIN_GOALS  = 3
const GAME_SEC   = 90
const AI_SPEED   = 2.8
const PLAYER_SPEED = 3.2

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
function norm(dx, dy) { const d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d] }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function buildTeam(formation, side, CW, CH, GOAL_H) {
  const fmKey = FORMATIONS[formation] ? formation : '4-4-2'
  const positions = FORMATIONS[fmKey]
  const halfW = CW / 2
  const isLeft = side === 'left'
  const color  = isLeft ? TEAM_AMBER  : TEAM_PURPLE
  const kColor = isLeft ? KEEPER_AMBER : KEEPER_PURPLE

  return positions.map((pos, i) => {
    const [xf, yf] = pos
    // xf: 0=own goal line, 1=midfield; yf: 0=top, 1=bottom
    const localX = xf * halfW
    const worldX = isLeft ? localX : CW - localX
    const worldY = (CH - GOAL_H * 2) * yf + GOAL_H  // keep within field vertically

    return {
      id: i,
      x: worldX,
      y: worldY,
      vx: 0,
      vy: 0,
      homeX: worldX,
      homeY: worldY,
      isKeeper: i === 0,
      color: i === 0 ? kColor : color,
      number: i === 0 ? 'GK' : String(i),
      side,
      selected: false,
      hasBall: false,
    }
  })
}

// ─── FIELD DRAWING ───────────────────────────────────────────────────────────
function drawField(ctx, CW, CH, GOAL_H, GOAL_POST_W) {
  // Grass
  ctx.fillStyle = '#2E7D32'
  ctx.fillRect(0, 0, CW, CH)

  // Alternating stripes
  ctx.fillStyle = '#276B2B'
  const stripeW = CW / 10
  for (let i = 0; i < 10; i += 2) {
    ctx.fillRect(i * stripeW, 0, stripeW, CH)
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 2

  // Border
  ctx.strokeRect(4, 4, CW - 8, CH - 8)

  // Halfway line
  ctx.beginPath(); ctx.moveTo(CW / 2, 4); ctx.lineTo(CW / 2, CH - 4); ctx.stroke()

  // Centre circle
  ctx.beginPath(); ctx.arc(CW / 2, CH / 2, CH * 0.12, 0, Math.PI * 2); ctx.stroke()
  // Centre spot
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath(); ctx.arc(CW / 2, CH / 2, 4, 0, Math.PI * 2); ctx.fill()

  // Penalty areas
  const penW = CW * 0.14
  const penH = CH * 0.44
  const penY = (CH - penH) / 2
  ctx.strokeRect(4, penY, penW, penH)                    // left
  ctx.strokeRect(CW - 4 - penW, penY, penW, penH)        // right

  // Goal areas (6-yard box)
  const gaW = CW * 0.06
  const gaH = CH * 0.24
  const gaY = (CH - gaH) / 2
  ctx.strokeRect(4, gaY, gaW, gaH)
  ctx.strokeRect(CW - 4 - gaW, gaY, gaW, gaH)

  // Penalty spots
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath(); ctx.arc(CW * 0.12, CH / 2, 3, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(CW * 0.88, CH / 2, 3, 0, Math.PI * 2); ctx.fill()

  // Penalty arcs
  ctx.beginPath(); ctx.arc(CW * 0.12, CH / 2, CH * 0.10, -Math.PI * 0.55, Math.PI * 0.55); ctx.stroke()
  ctx.beginPath(); ctx.arc(CW * 0.88, CH / 2, CH * 0.10, Math.PI * 0.45, Math.PI * 1.55); ctx.stroke()

  // Corner arcs
  const cr = 14
  for (const [cx, cy, sa, ea] of [
    [4, 4, 0, Math.PI / 2],
    [CW - 4, 4, Math.PI / 2, Math.PI],
    [CW - 4, CH - 4, Math.PI, Math.PI * 1.5],
    [4, CH - 4, Math.PI * 1.5, Math.PI * 2],
  ]) {
    ctx.beginPath(); ctx.arc(cx, cy, cr, sa, ea); ctx.stroke()
  }
}

function drawGoals(ctx, CW, CH, GOAL_H, GOAL_POST_W) {
  const goalY = (CH - GOAL_H) / 2

  // Left goal (home, amber)
  ctx.fillStyle = 'rgba(193,122,42,0.25)'
  ctx.fillRect(0, goalY, GOAL_POST_W, GOAL_H)
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 3
  ctx.strokeRect(0, goalY, GOAL_POST_W, GOAL_H)
  // Net lines
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1
  for (let i = 1; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(0, goalY + GOAL_H * i / 5); ctx.lineTo(GOAL_POST_W, goalY + GOAL_H * i / 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(GOAL_POST_W * i / 4, goalY); ctx.lineTo(GOAL_POST_W * i / 4, goalY + GOAL_H); ctx.stroke()
  }

  // Right goal (away, purple)
  ctx.fillStyle = 'rgba(91,63,219,0.25)'
  ctx.fillRect(CW - GOAL_POST_W, goalY, GOAL_POST_W, GOAL_H)
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 3
  ctx.strokeRect(CW - GOAL_POST_W, goalY, GOAL_POST_W, GOAL_H)
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1
  for (let i = 1; i < 5; i++) {
    ctx.beginPath(); ctx.moveTo(CW - GOAL_POST_W, goalY + GOAL_H * i / 5); ctx.lineTo(CW, goalY + GOAL_H * i / 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(CW - GOAL_POST_W + GOAL_POST_W * i / 4, goalY); ctx.lineTo(CW - GOAL_POST_W + GOAL_POST_W * i / 4, goalY + GOAL_H); ctx.stroke()
  }
}

// ─── PLAYER DRAWING ──────────────────────────────────────────────────────────
function drawPlayer(ctx, p) {
  ctx.save()
  ctx.translate(p.x, p.y)

  // Selection ring
  if (p.selected) {
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(0, 0, PLAYER_R + 5, 0, Math.PI * 2); ctx.stroke()
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath(); ctx.ellipse(0, PLAYER_R + 2, PLAYER_R * 0.8, 5, 0, 0, Math.PI * 2); ctx.fill()

  // Body circle
  ctx.fillStyle = p.color
  ctx.strokeStyle = '#1A1A1A'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(0, 0, PLAYER_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

  // Ears
  ctx.fillStyle = p.color
  ctx.beginPath(); ctx.ellipse(-PLAYER_R * 0.7, -PLAYER_R * 0.7, 5, 8, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.ellipse( PLAYER_R * 0.7, -PLAYER_R * 0.7, 5, 8,  0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

  // Eyes
  ctx.fillStyle = '#1A1A1A'
  ctx.beginPath(); ctx.arc(-6, -4, 3, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc( 6, -4, 3, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#FFF'
  ctx.beginPath(); ctx.arc(-5, -5, 1.2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc( 7, -5, 1.2, 0, Math.PI * 2); ctx.fill()

  // Snout
  ctx.fillStyle = '#C4956A'
  ctx.strokeStyle = '#1A1A1A'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.ellipse(0, 2, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#1A1A1A'
  ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill()

  // Number / GK label
  ctx.fillStyle = '#FFFFFF'
  ctx.font = p.isKeeper ? 'bold 7px sans-serif' : 'bold 8px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(p.number, 0, 9)

  ctx.restore()
}

// ─── BALL DRAWING ────────────────────────────────────────────────────────────
function drawBall(ctx, ball) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath(); ctx.ellipse(ball.x + 3, ball.y + BALL_R + 2, BALL_R * 0.9, 5, 0, 0, Math.PI * 2); ctx.fill()

  ctx.save()
  ctx.translate(ball.x, ball.y)
  ctx.rotate(ball.spin)

  // White ball
  ctx.fillStyle = '#F5EFE0'
  ctx.strokeStyle = '#1A1A1A'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

  // Pentagon patches
  ctx.fillStyle = '#1A1A1A'
  ctx.beginPath(); ctx.arc(0, 0, BALL_R * 0.28, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    ctx.beginPath(); ctx.arc(Math.cos(a) * BALL_R * 0.6, Math.sin(a) * BALL_R * 0.6, BALL_R * 0.16, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function drawHUD(ctx, CW, CH, scores, timeLeft, formation, goalFlash) {
  // Score box
  ctx.fillStyle = 'rgba(15,8,40,0.82)'
  ctx.strokeStyle = '#2D2D2D'
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.roundRect(CW / 2 - 90, 8, 180, 50, 10); ctx.fill(); ctx.stroke()

  ctx.fillStyle = '#F5EFE0'
  ctx.font = "bold 20px 'Press Start 2P', monospace"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${scores[0]}  –  ${scores[1]}`, CW / 2, 28)

  ctx.font = "8px 'Press Start 2P', monospace"
  ctx.fillStyle = timeLeft <= 15 ? '#FF6B6B' : '#A0C4FF'
  ctx.fillText(`${Math.ceil(timeLeft)}s`, CW / 2, 48)

  // Formation label
  ctx.font = "7px 'Press Start 2P', monospace"
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.textAlign = 'left'
  ctx.fillText(formation || '4-4-2', 10, 20)

  // Team labels
  ctx.fillStyle = TEAM_AMBER
  ctx.textAlign = 'left'
  ctx.fillText('HOME', 10, 36)
  ctx.fillStyle = TEAM_PURPLE
  ctx.textAlign = 'right'
  ctx.fillText('AWAY', CW - 10, 36)

  // Goal flash overlay
  if (goalFlash > 0) {
    ctx.fillStyle = `rgba(240,180,41,${goalFlash * 0.3})`
    ctx.fillRect(0, 0, CW, CH)
    ctx.fillStyle = '#F0B429'
    ctx.font = "bold 28px 'Press Start 2P', monospace"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⚽ GOAL! ⚽', CW / 2, CH / 2)
  }
}

// ─── AI SYSTEM ───────────────────────────────────────────────────────────────
function updateAI(team, ball, opponentGoalX, ownGoalX, CW, CH, GOAL_H) {
  const goalY = CH / 2
  const penAreaX = opponentGoalX === 0
    ? CW * 0.14
    : CW - CW * 0.14

  // Find player nearest to ball
  let nearestIdx = 1
  let nearestDist = Infinity
  for (let i = 1; i < team.length; i++) {
    const d = dist(team[i], ball)
    if (d < nearestDist) { nearestDist = d; nearestIdx = i }
  }

  team.forEach((p, i) => {
    if (p.isKeeper) {
      // Keeper: stay on goal line, track ball Y, dive if ball enters penalty area
      const keeperX = opponentGoalX === 0 ? CW * 0.04 : CW * 0.96
      const ballInPen = opponentGoalX === 0
        ? ball.x < CW * 0.14
        : ball.x > CW * 0.86
      const targetY = clamp(ball.y, (CH - GOAL_H) / 2 + PLAYER_R, (CH + GOAL_H) / 2 - PLAYER_R)
      const targetX = ballInPen ? clamp(ball.x, GOAL_W + PLAYER_R, CW - GOAL_W - PLAYER_R) : keeperX

      const dx = targetX - p.x
      const dy = targetY - p.y
      const speed = ballInPen ? AI_SPEED * 1.4 : AI_SPEED * 0.9
      const d = Math.hypot(dx, dy) || 1
      p.vx = (dx / d) * Math.min(speed, Math.abs(dx))
      p.vy = (dy / d) * Math.min(speed, Math.abs(dy))
      return
    }

    let targetX, targetY

    if (i === nearestIdx) {
      // Chase ball
      targetX = ball.x
      targetY = ball.y
    } else {
      // Hold formation with slight pressure toward ball
      const pressure = 0.25
      targetX = p.homeX + (ball.x - p.homeX) * pressure
      targetY = p.homeY + (ball.y - p.homeY) * pressure
    }

    const dx = targetX - p.x
    const dy = targetY - p.y
    const d = Math.hypot(dx, dy) || 1
    const speed = AI_SPEED * (i === nearestIdx ? 1.0 : 0.7)
    p.vx = (dx / d) * Math.min(speed, d)
    p.vy = (dy / d) * Math.min(speed, d)
  })
}

// ─── BALL PHYSICS ────────────────────────────────────────────────────────────
function updateBallPhysics(ball, CW, CH, GOAL_H) {
  ball.x += ball.vx
  ball.y += ball.vy
  ball.vx *= FRICTION
  ball.vy *= FRICTION
  ball.spin += ball.vx * 0.04

  // Top/bottom walls
  if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy *= -0.7 }
  if (ball.y + BALL_R > CH) { ball.y = CH - BALL_R; ball.vy *= -0.7 }

  // Left/right walls (outside goal posts)
  const goalTop    = (CH - GOAL_H) / 2
  const goalBottom = (CH + GOAL_H) / 2

  if (ball.x - BALL_R < GOAL_W) {
    // Only bounce if NOT in goal opening
    if (ball.y < goalTop || ball.y > goalBottom) {
      ball.x = GOAL_W + BALL_R
      ball.vx *= -0.7
    }
  }
  if (ball.x + BALL_R > CW - GOAL_W) {
    if (ball.y < goalTop || ball.y > goalBottom) {
      ball.x = CW - GOAL_W - BALL_R
      ball.vx *= -0.7
    }
  }
}

function checkGoal(ball, CW, CH, GOAL_H) {
  const goalTop    = (CH - GOAL_H) / 2
  const goalBottom = (CH + GOAL_H) / 2
  if (ball.x - BALL_R < 0 && ball.y > goalTop && ball.y < goalBottom) return 1  // right team scores
  if (ball.x + BALL_R > CW && ball.y > goalTop && ball.y < goalBottom) return 0  // left team scores
  return -1
}

function resetBall(ball, CW, CH, lastScorer) {
  ball.x = CW / 2
  ball.y = CH / 2
  ball.vx = (lastScorer === 0 ? 1 : -1) * 2
  ball.vy = (Math.random() - 0.5) * 2
  ball.spin = 0
}

// ─── PLAYER-BALL COLLISION ───────────────────────────────────────────────────
function resolvePlayerBallCollisions(players, ball) {
  for (const p of players) {
    const dx = ball.x - p.x
    const dy = ball.y - p.y
    const d  = Math.hypot(dx, dy)
    const minD = PLAYER_R + BALL_R

    if (d < minD && d > 0) {
      const nx = dx / d
      const ny = dy / d
      const relVx = ball.vx - p.vx
      const relVy = ball.vy - p.vy
      const relV  = relVx * nx + relVy * ny
      if (relV < 0) {
        const impulse = -relV * 1.5
        ball.vx += nx * impulse
        ball.vy += ny * impulse
      }
      // Separate
      const overlap = minD - d
      ball.x += nx * overlap * 0.8
      ball.y += ny * overlap * 0.8
    }
  }
}

// ─── PLAYER MOVEMENT ─────────────────────────────────────────────────────────
function applyPlayerMovement(players, CW, CH) {
  for (const p of players) {
    p.x = clamp(p.x + p.vx, PLAYER_R, CW - PLAYER_R)
    p.y = clamp(p.y + p.vy, PLAYER_R, CH - PLAYER_R)
  }
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function FootballCanvas({ config }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const CW = canvas.width
    const CH = canvas.height

    const GOAL_H      = CH * 0.30
    const formation   = config?.formation || '4-4-2'
    const mode        = config?.mode || 'ai'

    // Build teams
    let leftTeam  = buildTeam(formation, 'left',  CW, CH, GOAL_H)
    let rightTeam = buildTeam(formation, 'right', CW, CH, GOAL_H)

    // Auto-select nearest player to ball for left (human) team
    leftTeam[1].selected = true

    const ball = { x: CW / 2, y: CH / 2, vx: 1.5, vy: 0.5, spin: 0 }

    let scores    = [0, 0]
    let timeLeft  = GAME_SEC
    let gameOver  = false
    let goalFlash = 0
    let lastTime  = performance.now()

    // PVP sync
    let sync = null
    let remoteInput = null  // { vx, vy, selectedId }

    async function initSync() {
      if (mode !== 'pvp' || !config.roomId) return
      const { FootballSync } = await import('../../lib/football/FootballSync')
      sync = new FootballSync(config.roomId, config.side)
      sync
        .on('onRemoteInput', (payload) => { remoteInput = payload })
        .on('onGoal', (payload) => {
          scores[0] = payload.s0
          scores[1] = payload.s1
          goalFlash = 1.5
          window.ANAGO_UI?.updateScore(scores[0], scores[1])
          resetBall(ball, CW, CH, payload.side === 'left' ? 0 : 1)
        })
        .on('onGameEnd', (payload) => {
          gameOver = true
          const winner = payload.winnerSide === 'left' ? 0 : 1
          window.ANAGO_UI?.showResult(winner, [payload.s0, payload.s1])
        })
        .connect()
    }
    initSync()

    // ── Input state ──────────────────────────────────────────────────────────
    // Touch/mouse: tap to move selected player or pass/shoot
    let selectedIdx = 1  // index in leftTeam (human team)
    let tapTarget   = null
    let lastTapTime = 0
    let lastTapPos  = null

    function getCanvasPos(e) {
      const rect = canvas.getBoundingClientRect()
      const src  = e.touches ? e.touches[0] : e
      return { x: src.clientX - rect.left, y: src.clientY - rect.top }
    }

    function autoSelectNearest() {
      const humanTeam = mode === 'pvp' && config.side === 'right' ? rightTeam : leftTeam
      let best = 1, bestD = Infinity
      for (let i = 0; i < humanTeam.length; i++) {
        const d = dist(humanTeam[i], ball)
        if (d < bestD) { bestD = d; best = i }
      }
      // Don't auto-select keeper unless ball is in penalty area
      if (best === 0) {
        const inPen = config.side === 'right'
          ? ball.x > CW * 0.86
          : ball.x < CW * 0.14
        if (!inPen) best = 1
      }
      humanTeam.forEach((p, i) => { p.selected = i === best })
      selectedIdx = best
    }

    function onPointerDown(e) {
      e.preventDefault()
      const pos  = getCanvasPos(e)
      const now  = performance.now()
      const dt   = now - lastTapTime
      lastTapTime = now

      const humanTeam = mode === 'pvp' && config.side === 'right' ? rightTeam : leftTeam
      const sel = humanTeam[selectedIdx]

      // Check if tapping on a teammate → pass
      for (let i = 0; i < humanTeam.length; i++) {
        if (i === selectedIdx) continue
        if (dist(humanTeam[i], pos) < PLAYER_R * 2.5) {
          // Pass: kick ball toward teammate
          const dx = humanTeam[i].x - ball.x
          const dy = humanTeam[i].y - ball.y
          const d  = Math.hypot(dx, dy) || 1
          const power = Math.min(8, d / 30)
          ball.vx = (dx / d) * power
          ball.vy = (dy / d) * power
          // Switch selection to that player
          humanTeam.forEach((p, j) => { p.selected = j === i })
          selectedIdx = i
          return
        }
      }

      const ballDist = dist(pos, ball)
      const isDoubleTap = dt < 350 && lastTapPos && dist(pos, lastTapPos) < 60
      lastTapPos = pos

      if (isDoubleTap && ballDist < 80) {
        // Shoot toward opponent goal
        const goalX = mode === 'pvp' && config.side === 'right' ? GOAL_W / 2 : CW - GOAL_W / 2
        const goalY = CH / 2
        const dx = goalX - ball.x
        const dy = goalY - ball.y
        const d  = Math.hypot(dx, dy) || 1
        ball.vx = (dx / d) * 10
        ball.vy = (dy / d) * 10 + (Math.random() - 0.5) * 3
      } else if (ballDist < 60) {
        // Near ball: kick toward goal
        const goalX = mode === 'pvp' && config.side === 'right' ? GOAL_W / 2 : CW - GOAL_W / 2
        const goalY = CH / 2
        const dx = goalX - ball.x
        const dy = goalY - ball.y
        const d  = Math.hypot(dx, dy) || 1
        ball.vx = (dx / d) * 7
        ball.vy = (dy / d) * 7 + (Math.random() - 0.5) * 2
      } else {
        // Move selected player toward tap
        tapTarget = { x: pos.x, y: pos.y, playerId: selectedIdx }
      }
    }

    canvas.addEventListener('touchstart', onPointerDown, { passive: false })
    canvas.addEventListener('mousedown',  onPointerDown)

    // ── Game loop ────────────────────────────────────────────────────────────
    let animId

    function loop(now) {
      animId = requestAnimationFrame(loop)
      if (gameOver) { draw(); return }

      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      timeLeft -= delta
      goalFlash = Math.max(0, goalFlash - delta * 1.2)

      // Auto-select nearest human player to ball
      autoSelectNearest()

      // Move human-controlled player toward tap target
      const humanTeam = mode === 'pvp' && config.side === 'right' ? rightTeam : leftTeam
      if (tapTarget !== null) {
        const p = humanTeam[tapTarget.playerId] || humanTeam[selectedIdx]
        if (p) {
          const dx = tapTarget.x - p.x
          const dy = tapTarget.y - p.y
          const d  = Math.hypot(dx, dy)
          if (d < 4) {
            tapTarget = null
            p.vx = 0; p.vy = 0
          } else {
            const speed = PLAYER_SPEED
            p.vx = (dx / d) * Math.min(speed, d)
            p.vy = (dy / d) * Math.min(speed, d)
          }
        }
      }

      // AI for right team (or left if pvp right side)
      const aiTeam = mode === 'pvp' ? null : rightTeam
      if (aiTeam) {
        updateAI(aiTeam, ball, 0, CW, CW, CH, GOAL_H)
      }

      // PVP remote input
      if (mode === 'pvp' && remoteInput) {
        const remoteTeam = config.side === 'left' ? rightTeam : leftTeam
        const rp = remoteTeam[remoteInput.selectedId] || remoteTeam[1]
        if (rp && remoteInput.targetX !== undefined) {
          const dx = remoteInput.targetX - rp.x
          const dy = remoteInput.targetY - rp.y
          const d  = Math.hypot(dx, dy) || 1
          rp.vx = (dx / d) * PLAYER_SPEED
          rp.vy = (dy / d) * PLAYER_SPEED
        }
        if (remoteInput.ballVx !== undefined) {
          ball.vx = remoteInput.ballVx
          ball.vy = remoteInput.ballVy
        }
        remoteInput = null
      }

      // Broadcast local input in PVP
      if (mode === 'pvp' && sync) {
        const sel = humanTeam[selectedIdx]
        sync.broadcastInput({
          selectedId: selectedIdx,
          targetX: tapTarget ? tapTarget.x : sel.x,
          targetY: tapTarget ? tapTarget.y : sel.y,
        })
      }

      // Apply movement
      applyPlayerMovement(leftTeam,  CW, CH)
      applyPlayerMovement(rightTeam, CW, CH)

      // Friction on idle players
      for (const p of [...leftTeam, ...rightTeam]) {
        if (!p.selected || tapTarget === null) {
          p.vx *= 0.75
          p.vy *= 0.75
        }
      }

      // Ball physics
      updateBallPhysics(ball, CW, CH, GOAL_H)
      resolvePlayerBallCollisions([...leftTeam, ...rightTeam], ball)

      // Goal check
      const scorer = checkGoal(ball, CW, CH, GOAL_H)
      if (scorer >= 0) {
        scores[scorer]++
        goalFlash = 1.5
        window.ANAGO_UI?.updateScore(scores[0], scores[1])

        if (mode === 'pvp' && sync) {
          sync.broadcastGoal(scorer === 0 ? 'left' : 'right', scores[0], scores[1])
        }

        if (scores[scorer] >= WIN_GOALS) {
          gameOver = true
          const winner = scorer
          if (mode === 'pvp' && sync) {
            sync.broadcastGameEnd(winner === 0 ? 'left' : 'right', scores[0], scores[1])
          }
          window.ANAGO_UI?.showResult(winner, [...scores])
        } else {
          resetBall(ball, CW, CH, scorer)
        }
      }

      // Timer end
      if (timeLeft <= 0) {
        timeLeft = 0
        gameOver = true
        const winner = scores[0] >= scores[1] ? 0 : 1
        if (mode === 'pvp' && sync) {
          sync.broadcastGameEnd(winner === 0 ? 'left' : 'right', scores[0], scores[1])
        }
        window.ANAGO_UI?.showResult(winner, [...scores])
      }

      draw()
    }

    function draw() {
      ctx.clearRect(0, 0, CW, CH)

      // 1. Field
      drawField(ctx, CW, CH, GOAL_H, GOAL_W)

      // 2. Goals
      drawGoals(ctx, CW, CH, GOAL_H, GOAL_W)

      // 3. Ball shadow (drawn before players)
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath(); ctx.ellipse(ball.x + 3, ball.y + BALL_R + 2, BALL_R * 0.9, 5, 0, 0, Math.PI * 2); ctx.fill()

      // 4. Players
      for (const p of [...leftTeam, ...rightTeam]) drawPlayer(ctx, p)

      // 5. Ball
      drawBall(ctx, ball)

      // 6. HUD
      drawHUD(ctx, CW, CH, scores, timeLeft, formation, goalFlash)
    }

    animId = requestAnimationFrame(loop)

    const onResize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('touchstart', onPointerDown)
      canvas.removeEventListener('mousedown',  onPointerDown)
      window.removeEventListener('resize', onResize)
      sync?.disconnect()
    }
  }, [config])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100vw', height: '100vh', touchAction: 'none' }}
    />
  )
}
