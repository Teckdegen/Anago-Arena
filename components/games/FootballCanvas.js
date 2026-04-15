/**
 * Dog Football — Captain Control System
 * You control ONE player (your captain). Tap to move, tap teammate to pass,
 * swipe toward goal to shoot. AI handles your other 4 players.
 * 5v5 top-down 2D. 10 minute match.
 */
import { useEffect, useRef } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────
const P_R        = 20      // player radius
const B_R        = 10      // ball radius
const FRICTION   = 0.96
const P_SPEED    = 3.8
const AI_SPEED   = 3.2
const GAME_SEC   = 600     // 10 minutes
const GOAL_W     = 18      // goal post depth
const OWN_RANGE  = 28      // distance to own the ball
const WIN_GOALS  = 99      // no goal limit — timer decides

// Formations: [xFrac, yFrac] — xFrac 0=own goal, 1=midfield
const FORMATIONS = {
  '1-2-1': [[0.05,0.50],[0.28,0.28],[0.28,0.72],[0.55,0.50],[0.80,0.50]],
  '1-1-2': [[0.05,0.50],[0.28,0.50],[0.55,0.50],[0.78,0.28],[0.78,0.72]],
  '1-3-0': [[0.05,0.50],[0.30,0.20],[0.30,0.50],[0.30,0.80],[0.60,0.50]],
  '2-2-0': [[0.05,0.50],[0.22,0.28],[0.22,0.72],[0.50,0.28],[0.50,0.72]],
}

const AMBER  = '#C17A2A'
const PURPLE = '#5B3FDB'
const AMBER_K  = '#7A4A10'
const PURPLE_K = '#2A1870'

// ── Helpers ───────────────────────────────────────────────────────────────────
const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const norm = (dx, dy) => { const d = Math.hypot(dx, dy) || 1; return [dx/d, dy/d] }

function buildTeam(formation, side, CW, CH) {
  const pts = FORMATIONS[formation] || FORMATIONS['1-2-1']
  const isL = side === 'left'
  return pts.map((pos, i) => {
    const wx = isL ? pos[0] * CW/2 : CW - pos[0] * CW/2
    const wy = pos[1] * CH
    return {
      id: i, x: wx, y: wy, vx: 0, vy: 0,
      homeX: wx, homeY: wy,
      isKeeper: i === 0,
      color: i === 0 ? (isL ? AMBER_K : PURPLE_K) : (isL ? AMBER : PURPLE),
      num: i === 0 ? 'GK' : String(i),
      side, selected: false,
    }
  })
}

// ── Draw Field ────────────────────────────────────────────────────────────────
function drawField(ctx, CW, CH) {
  ctx.fillStyle = '#2E7D32'; ctx.fillRect(0, 0, CW, CH)
  ctx.fillStyle = '#276B2B'
  for (let i = 0; i < 10; i += 2) ctx.fillRect(i * CW/10, 0, CW/10, CH)

  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2
  ctx.strokeRect(4, 4, CW-8, CH-8)
  ctx.beginPath(); ctx.moveTo(CW/2, 4); ctx.lineTo(CW/2, CH-4); ctx.stroke()
  ctx.beginPath(); ctx.arc(CW/2, CH/2, CH*0.12, 0, Math.PI*2); ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath(); ctx.arc(CW/2, CH/2, 4, 0, Math.PI*2); ctx.fill()

  // Penalty areas
  const pw = CW*0.18, ph = CH*0.50, py = (CH-ph)/2
  ctx.strokeRect(4, py, pw, ph)
  ctx.strokeRect(CW-4-pw, py, pw, ph)

  // Goal areas
  const gw = CW*0.07, gh = CH*0.28, gy = (CH-gh)/2
  ctx.strokeRect(4, gy, gw, gh)
  ctx.strokeRect(CW-4-gw, gy, gw, gh)

  // Penalty spots
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath(); ctx.arc(CW*0.14, CH/2, 3, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(CW*0.86, CH/2, 3, 0, Math.PI*2); ctx.fill()

  // Corner arcs
  const cr = 14
  for (const [cx,cy,sa,ea] of [[4,4,0,Math.PI/2],[CW-4,4,Math.PI/2,Math.PI],[CW-4,CH-4,Math.PI,Math.PI*1.5],[4,CH-4,Math.PI*1.5,Math.PI*2]]) {
    ctx.beginPath(); ctx.arc(cx, cy, cr, sa, ea); ctx.stroke()
  }
}

function drawGoals(ctx, CW, CH, GH) {
  const gy = (CH-GH)/2
  for (const [gx, col] of [[0, 'rgba(193,122,42,0.3)'], [CW-GOAL_W, 'rgba(91,63,219,0.3)']]) {
    ctx.fillStyle = col; ctx.fillRect(gx, gy, GOAL_W, GH)
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 3
    ctx.strokeRect(gx, gy, GOAL_W, GH)
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(gx, gy+GH*i/4); ctx.lineTo(gx+GOAL_W, gy+GH*i/4); ctx.stroke()
    }
  }
}

// ── Draw Player ───────────────────────────────────────────────────────────────
function drawPlayer(ctx, p, isCaptain, hasBall) {
  ctx.save(); ctx.translate(p.x, p.y)

  // Ball ownership glow
  if (hasBall) {
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 16
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(0, 0, P_R+7, 0, Math.PI*2); ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Captain ring (white pulsing)
  if (isCaptain) {
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(0, 0, P_R+5, 0, Math.PI*2); ctx.stroke()
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath(); ctx.ellipse(0, P_R+2, P_R*0.8, 5, 0, 0, Math.PI*2); ctx.fill()

  // Body
  ctx.fillStyle = p.color; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(0, 0, P_R, 0, Math.PI*2); ctx.fill(); ctx.stroke()

  // Ears
  ctx.fillStyle = p.color
  ctx.beginPath(); ctx.ellipse(-P_R*0.68, -P_R*0.68, 5, 9, -0.5, 0, Math.PI*2); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.ellipse( P_R*0.68, -P_R*0.68, 5, 9,  0.5, 0, Math.PI*2); ctx.fill(); ctx.stroke()

  // Eyes
  ctx.fillStyle = '#1A1A1A'
  ctx.beginPath(); ctx.arc(-7, -5, 3.5, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc( 7, -5, 3.5, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = '#FFF'
  ctx.beginPath(); ctx.arc(-5.5, -6.5, 1.5, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc( 8.5, -6.5, 1.5, 0, Math.PI*2); ctx.fill()

  // Snout
  ctx.fillStyle = '#C4956A'; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.ellipse(0, 3, 8, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#1A1A1A'
  ctx.beginPath(); ctx.arc(0, 1, 3, 0, Math.PI*2); ctx.fill()

  // Number
  ctx.fillStyle = '#FFF'; ctx.font = 'bold 9px sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(p.num, 0, 10)

  ctx.restore()
}

// ── Draw Ball ─────────────────────────────────────────────────────────────────
function drawBall(ctx, ball) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath(); ctx.ellipse(ball.x+3, ball.y+B_R+2, B_R*0.9, 5, 0, 0, Math.PI*2); ctx.fill()
  ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.spin)
  ctx.fillStyle = '#F5EFE0'; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(0, 0, B_R, 0, Math.PI*2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#1A1A1A'
  ctx.beginPath(); ctx.arc(0, 0, B_R*0.28, 0, Math.PI*2); ctx.fill()
  for (let i = 0; i < 5; i++) {
    const a = (i/5)*Math.PI*2 - Math.PI/2
    ctx.beginPath(); ctx.arc(Math.cos(a)*B_R*0.6, Math.sin(a)*B_R*0.6, B_R*0.16, 0, Math.PI*2); ctx.fill()
  }
  ctx.restore()
}

// ── Draw Pass Preview ─────────────────────────────────────────────────────────
function drawPassLine(ctx, from, to) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 2; ctx.setLineDash([8, 6])
  ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke()
  ctx.setLineDash([])
  // Arrow tip
  const [nx, ny] = norm(to.x-from.x, to.y-from.y)
  const ax = to.x - nx*16, ay = to.y - ny*16
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(ax + ny*8, ay - nx*8)
  ctx.lineTo(ax - ny*8, ay + nx*8)
  ctx.closePath(); ctx.fill()
  ctx.restore()
}

// ── Draw Shoot Arrow ──────────────────────────────────────────────────────────
function drawShootArrow(ctx, from, to) {
  ctx.save()
  const [nx, ny] = norm(to.x-from.x, to.y-from.y)
  const len = Math.min(d2(from, to), 200)
  const ex = from.x + nx*len, ey = from.y + ny*len

  ctx.strokeStyle = '#FF6B35'; ctx.lineWidth = 3; ctx.setLineDash([6,4])
  ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(ex, ey); ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = '#FF6B35'
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex - nx*18 + ny*10, ey - ny*18 - nx*10)
  ctx.lineTo(ex - nx*18 - ny*10, ey - ny*18 + nx*10)
  ctx.closePath(); ctx.fill()
  ctx.restore()
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function drawHUD(ctx, CW, CH, scores, timeLeft, formation, flash) {
  // Score box
  ctx.fillStyle = 'rgba(15,8,40,0.85)'
  ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.roundRect(CW/2-95, 8, 190, 52, 10); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#F5EFE0'; ctx.font = "bold 22px 'Press Start 2P', monospace"
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(`${scores[0]}  –  ${scores[1]}`, CW/2, 28)
  const m = Math.floor(timeLeft/60), s = Math.ceil(timeLeft%60)
  ctx.font = "8px 'Press Start 2P', monospace"
  ctx.fillStyle = timeLeft <= 60 ? '#FF6B6B' : '#A0C4FF'
  ctx.fillText(`${m}:${String(s).padStart(2,'0')}`, CW/2, 50)

  // Formation
  ctx.font = "7px 'Press Start 2P', monospace"
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.textAlign = 'left'
  ctx.fillText(formation, 10, 22)

  // Controls hint
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.textAlign = 'center'
  ctx.fillText('TAP=MOVE  TAP TEAMMATE=PASS  SWIPE=SHOOT', CW/2, CH-12)

  // Flash
  if (flash.alpha > 0) {
    ctx.save(); ctx.globalAlpha = Math.min(1, flash.alpha)
    const isGoal = flash.msg.includes('GOAL')
    ctx.fillStyle = isGoal ? 'rgba(240,180,41,0.3)' : 'rgba(0,0,0,0.2)'
    ctx.fillRect(0, 0, CW, CH)
    ctx.fillStyle = isGoal ? '#F0B429' : flash.msg.includes('OFFSIDE') ? '#FF4444' : '#FFF'
    ctx.font = "bold 28px 'Press Start 2P', monospace"
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.shadowColor = '#000'; ctx.shadowBlur = 10
    ctx.fillText(flash.msg, CW/2, CH/2)
    ctx.shadowBlur = 0; ctx.restore()
  }
}

// ── AI System ─────────────────────────────────────────────────────────────────
function updateAI(team, opponents, ball, side, CW, CH, GH) {
  const isL = side === 'left'
  const oppGoalX = isL ? CW : 0
  const ownGoalX = isL ? 0 : CW

  // Find nearest outfield player to ball
  let nearIdx = 1, nearDist = Infinity
  for (let i = 1; i < team.length; i++) {
    const dd = d2(team[i], ball)
    if (dd < nearDist) { nearDist = dd; nearIdx = i }
  }

  team.forEach((p, i) => {
    if (p.isKeeper) {
      // Keeper: stay near goal line, track ball Y
      const kx = isL ? CW*0.06 : CW*0.94
      const gy = (CH-GH)/2
      const ty = clamp(ball.y, gy+P_R, gy+GH-P_R)
      const ballClose = d2(p, ball) < 80
      const tx = ballClose ? clamp(ball.x, isL ? P_R : CW*0.82, isL ? CW*0.18 : CW-P_R) : kx
      const [nx, ny] = norm(tx-p.x, ty-p.y)
      const spd = ballClose ? AI_SPEED*1.4 : AI_SPEED*0.8
      p.vx = nx * Math.min(spd, d2(p, {x:tx,y:ty}))
      p.vy = ny * Math.min(spd, d2(p, {x:tx,y:ty}))
      return
    }

    let tx, ty
    if (i === nearIdx) {
      tx = ball.x; ty = ball.y
      // If near ball: decide shoot or pass
      if (d2(p, ball) < OWN_RANGE + 8) {
        const goalDist = Math.abs(p.x - oppGoalX)
        if (goalDist < CW * 0.38) {
          // Shoot
          const [nx, ny] = norm(oppGoalX - ball.x, CH/2 - ball.y)
          ball.vx = nx*9 + (Math.random()-0.5)*2
          ball.vy = ny*9 + (Math.random()-0.5)*3
        } else {
          // Pass to most forward open teammate
          let best = null, bestX = isL ? -Infinity : Infinity
          for (let j = 1; j < team.length; j++) {
            if (j === i) continue
            const adv = isL ? team[j].x : CW - team[j].x
            if (adv > (isL ? bestX : CW - bestX)) { bestX = isL ? team[j].x : CW - team[j].x; best = team[j] }
          }
          if (best) {
            const [nx, ny] = norm(best.x - ball.x, best.y - ball.y)
            const pwr = Math.min(8, d2(ball, best) / 35)
            ball.vx = nx*pwr; ball.vy = ny*pwr
          }
        }
      }
    } else {
      // Hold formation with pressure toward ball
      tx = p.homeX + (ball.x - p.homeX) * 0.22
      ty = p.homeY + (ball.y - p.homeY) * 0.22
    }

    const [nx, ny] = norm(tx-p.x, ty-p.y)
    const spd = AI_SPEED * (i === nearIdx ? 1.0 : 0.6)
    p.vx = nx * Math.min(spd, d2(p, {x:tx,y:ty}))
    p.vy = ny * Math.min(spd, d2(p, {x:tx,y:ty}))
  })
}

// ── Ball Physics ──────────────────────────────────────────────────────────────
function updateBall(ball, CW, CH, GH) {
  ball.x += ball.vx; ball.y += ball.vy
  ball.vx *= FRICTION; ball.vy *= FRICTION
  ball.spin += ball.vx * 0.04

  const gt = (CH-GH)/2, gb = (CH+GH)/2

  if (ball.y - B_R < 0)  { ball.y = B_R;    ball.vy *= -0.65 }
  if (ball.y + B_R > CH) { ball.y = CH-B_R; ball.vy *= -0.65 }

  if (ball.x - B_R < GOAL_W) {
    if (ball.y < gt || ball.y > gb) { ball.x = GOAL_W+B_R; ball.vx *= -0.65 }
  }
  if (ball.x + B_R > CW - GOAL_W) {
    if (ball.y < gt || ball.y > gb) { ball.x = CW-GOAL_W-B_R; ball.vx *= -0.65 }
  }
}

function checkGoal(ball, CW, CH, GH) {
  const gt = (CH-GH)/2, gb = (CH+GH)/2
  if (ball.x - B_R < 0   && ball.y > gt && ball.y < gb) return 1  // right scores
  if (ball.x + B_R > CW  && ball.y > gt && ball.y < gb) return 0  // left scores
  return -1
}

function resetBall(ball, CW, CH) {
  ball.x = CW/2; ball.y = CH/2
  ball.vx = (Math.random()>0.5?1:-1)*1.5
  ball.vy = (Math.random()-0.5)*2
  ball.spin = 0
}

function resolveCollisions(players, ball) {
  for (const p of players) {
    const dx = ball.x-p.x, dy = ball.y-p.y
    const dd = Math.hypot(dx, dy)
    const minD = P_R + B_R
    if (dd < minD && dd > 0) {
      const nx = dx/dd, ny = dy/dd
      const rv = (ball.vx-p.vx)*nx + (ball.vy-p.vy)*ny
      if (rv < 0) { ball.vx += nx*(-rv*1.5); ball.vy += ny*(-rv*1.5) }
      const ov = minD - dd
      ball.x += nx*ov*0.8; ball.y += ny*ov*0.8
    }
  }
}

function moveAll(players, CW, CH) {
  for (const p of players) {
    p.x = clamp(p.x+p.vx, P_R, CW-P_R)
    p.y = clamp(p.y+p.vy, P_R, CH-P_R)
    p.vx *= 0.8; p.vy *= 0.8
  }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FootballCanvas({ config }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const CW = canvas.width, CH = canvas.height
    const GH = CH * 0.36   // goal height

    const formation = config?.formation || '1-2-1'
    const mode      = config?.mode || 'ai'
    const localSide = config?.side || 'left'

    // Teams
    const leftTeam  = buildTeam(formation, 'left',  CW, CH)
    const rightTeam = buildTeam(formation, 'right', CW, CH)

    // Human team captain starts as player 1
    const ht = () => localSide === 'right' ? rightTeam : leftTeam
    const at = () => localSide === 'right' ? leftTeam  : rightTeam
    let captainIdx = 1
    ht()[captainIdx].selected = true

    const ball = { x: CW/2, y: CH/2, vx: 1.5, vy: 0.5, spin: 0 }

    let scores   = [0, 0]
    let timeLeft = GAME_SEC
    let gameOver = false
    let lastTime = performance.now()
    const flash  = { msg: '', alpha: 0 }

    function showFlash(msg, dur = 2.0) { flash.msg = msg; flash.alpha = dur }

    // PVP
    let sync = null
    let remoteInput = null

    async function initSync() {
      if (mode !== 'pvp' || !config?.roomId) return
      const { FootballSync } = await import('../../lib/football/FootballSync')
      sync = new FootballSync(config.roomId, localSide)
      sync
        .on('onRemoteInput', p => { remoteInput = p })
        .on('onGoal', p => {
          scores[0] = p.s0; scores[1] = p.s1
          showFlash('⚽ GOAL! ⚽')
          window.ANAGO_UI?.updateScore(scores[0], scores[1])
          resetBall(ball, CW, CH)
        })
        .on('onGameEnd', p => {
          gameOver = true
          window.ANAGO_UI?.showResult(p.winnerSide === 'left' ? 0 : 1, [p.s0, p.s1])
        })
        .connect()
    }
    initSync()

    // ── Input ─────────────────────────────────────────────────────────────────
    // Drag state for shoot detection
    let dragStart = null, dragStartTime = 0
    let passTarget = null   // teammate being hovered for pass preview
    let shootTarget = null  // direction of swipe shoot

    function getPos(e) {
      const r = canvas.getBoundingClientRect()
      const s = e.touches ? e.touches[0] : e
      return { x: (s.clientX-r.left)*(CW/r.width), y: (s.clientY-r.top)*(CH/r.height) }
    }

    function autoSelectCaptain() {
      // Auto-switch captain to nearest player to ball
      const team = ht()
      let best = captainIdx, bestD = Infinity
      for (let i = 0; i < team.length; i++) {
        const dd = d2(team[i], ball)
        if (dd < bestD) { bestD = dd; best = i }
      }
      // Don't auto-select keeper unless ball in own half
      if (best === 0 && ball.x > CW*0.2 && ball.x < CW*0.8) best = 1
      if (best !== captainIdx) {
        team[captainIdx].selected = false
        captainIdx = best
        team[captainIdx].selected = true
      }
    }

    function onDown(e) {
      e.preventDefault()
      const pos = getPos(e)
      dragStart = pos; dragStartTime = performance.now()
      passTarget = null; shootTarget = null

      // Check if tapping on a teammate → show pass preview
      const team = ht()
      for (let i = 0; i < team.length; i++) {
        if (i === captainIdx) continue
        if (d2(team[i], pos) < P_R * 2.5) {
          passTarget = i
          return
        }
      }
    }

    function onMove(e) {
      e.preventDefault()
      if (!dragStart) return
      const pos = getPos(e)
      const dd = d2(pos, dragStart)

      // If dragging far = shoot preview
      if (dd > 40) {
        passTarget = null
        shootTarget = pos
      }
    }

    function onUp(e) {
      e.preventDefault()
      if (!dragStart) return
      const pos = getPos(e)
      const dd = d2(pos, dragStart)
      const dt = performance.now() - dragStartTime
      const team = ht()
      const captain = team[captainIdx]

      if (passTarget !== null) {
        // PASS to teammate
        const mate = team[passTarget]
        const [nx, ny] = norm(mate.x - ball.x, mate.y - ball.y)
        const pwr = Math.min(9, d2(ball, mate) / 30)
        ball.vx = nx * pwr; ball.vy = ny * pwr
        // Switch captain to that player
        team[captainIdx].selected = false
        captainIdx = passTarget
        team[captainIdx].selected = true
        passTarget = null

      } else if (dd > 50 && dt < 600) {
        // SHOOT — swipe direction
        const [nx, ny] = norm(pos.x - dragStart.x, pos.y - dragStart.y)
        const power = Math.min(12, dd / 18)
        ball.vx = nx * power; ball.vy = ny * power
        shootTarget = null

      } else if (dd < 20 && dt < 350) {
        // TAP — move captain toward tap position
        const [nx, ny] = norm(pos.x - captain.x, pos.y - captain.y)
        const dist2 = d2(captain, pos)
        captain.vx = nx * Math.min(P_SPEED * 3, dist2 * 0.25)
        captain.vy = ny * Math.min(P_SPEED * 3, dist2 * 0.25)
      }

      dragStart = null; shootTarget = null
    }

    canvas.addEventListener('touchstart', onDown, { passive: false })
    canvas.addEventListener('touchmove',  onMove, { passive: false })
    canvas.addEventListener('touchend',   onUp,   { passive: false })
    canvas.addEventListener('mousedown',  onDown)
    canvas.addEventListener('mousemove',  onMove)
    canvas.addEventListener('mouseup',    onUp)

    // ── Game Loop ──────────────────────────────────────────────────────────────
    let animId

    function loop(now) {
      animId = requestAnimationFrame(loop)
      if (gameOver) { draw(); return }

      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      timeLeft -= delta
      flash.alpha = Math.max(0, flash.alpha - delta * 1.2)

      // Auto-select captain
      autoSelectCaptain()

      // AI for opponent team (and own non-captain players)
      const aiTeam = at()
      updateAI(aiTeam, ht(), ball, aiTeam[0].side, CW, CH, GH)

      // Own non-captain players: hold formation with pressure
      const team = ht()
      for (let i = 0; i < team.length; i++) {
        if (i === captainIdx) continue
        const p = team[i]
        if (p.isKeeper) {
          // Keeper AI
          const isL = localSide === 'left'
          const kx = isL ? CW*0.06 : CW*0.94
          const gy = (CH-GH)/2
          const ty = clamp(ball.y, gy+P_R, gy+GH-P_R)
          const ballClose = d2(p, ball) < 80
          const tx = ballClose ? clamp(ball.x, isL ? P_R : CW*0.82, isL ? CW*0.18 : CW-P_R) : kx
          const [nx, ny] = norm(tx-p.x, ty-p.y)
          p.vx = nx * Math.min(AI_SPEED, d2(p, {x:tx,y:ty}))
          p.vy = ny * Math.min(AI_SPEED, d2(p, {x:tx,y:ty}))
        } else {
          const tx = p.homeX + (ball.x - p.homeX) * 0.18
          const ty = p.homeY + (ball.y - p.homeY) * 0.18
          const [nx, ny] = norm(tx-p.x, ty-p.y)
          p.vx = nx * Math.min(AI_SPEED*0.6, d2(p, {x:tx,y:ty}))
          p.vy = ny * Math.min(AI_SPEED*0.6, d2(p, {x:tx,y:ty}))
        }
      }

      // PVP remote
      if (mode === 'pvp' && remoteInput) {
        const rt = at()
        const rp = rt[remoteInput.captainIdx] || rt[1]
        if (rp && remoteInput.vx !== undefined) {
          rp.vx = remoteInput.vx; rp.vy = remoteInput.vy
        }
        if (remoteInput.ballVx !== undefined) {
          ball.vx = remoteInput.ballVx; ball.vy = remoteInput.ballVy
        }
        remoteInput = null
      }

      // Broadcast captain state
      if (mode === 'pvp' && sync) {
        const cap = ht()[captainIdx]
        sync.broadcastInput({ captainIdx, vx: cap.vx, vy: cap.vy })
      }

      // Move all
      moveAll([...leftTeam, ...rightTeam], CW, CH)
      updateBall(ball, CW, CH, GH)
      resolveCollisions([...leftTeam, ...rightTeam], ball)

      // Goal check
      const scorer = checkGoal(ball, CW, CH, GH)
      if (scorer >= 0) {
        scores[scorer]++
        showFlash('⚽ GOAL! ⚽')
        window.ANAGO_UI?.updateScore(scores[0], scores[1])
        if (mode === 'pvp' && sync) sync.broadcastGoal(scorer===0?'left':'right', scores[0], scores[1])
        resetBall(ball, CW, CH)
      }

      // Timer
      if (timeLeft <= 0) {
        timeLeft = 0; gameOver = true
        const winner = scores[0] >= scores[1] ? 0 : 1
        if (mode === 'pvp' && sync) sync.broadcastGameEnd(winner===0?'left':'right', scores[0], scores[1])
        window.ANAGO_UI?.showResult(winner, [...scores])
      }

      draw()
    }

    function draw() {
      ctx.clearRect(0, 0, CW, CH)
      drawField(ctx, CW, CH)
      drawGoals(ctx, CW, CH, GH)

      // Ball shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath(); ctx.ellipse(ball.x+3, ball.y+B_R+2, B_R*0.9, 5, 0, 0, Math.PI*2); ctx.fill()

      // Pass preview line
      if (passTarget !== null) {
        const team = ht()
        drawPassLine(ctx, team[captainIdx], team[passTarget])
      }

      // Shoot preview
      if (shootTarget && dragStart) {
        drawShootArrow(ctx, dragStart, shootTarget)
      }

      // Players
      const allPlayers = [...leftTeam, ...rightTeam]
      for (const p of allPlayers) {
        const isCap = p.side === localSide && p.id === captainIdx
        const hasBall = d2(p, ball) < OWN_RANGE
        drawPlayer(ctx, p, isCap, hasBall)
      }

      drawBall(ctx, ball)
      drawHUD(ctx, CW, CH, scores, timeLeft, formation, flash)
    }

    animId = requestAnimationFrame(loop)

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('touchstart', onDown)
      canvas.removeEventListener('touchmove',  onMove)
      canvas.removeEventListener('touchend',   onUp)
      canvas.removeEventListener('mousedown',  onDown)
      canvas.removeEventListener('mousemove',  onMove)
      canvas.removeEventListener('mouseup',    onUp)
      window.removeEventListener('resize', onResize)
      sync?.disconnect()
    }
  }, [config])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh', touchAction: 'none' }} />
}
