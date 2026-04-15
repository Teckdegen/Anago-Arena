/**
 * FootballCanvas — 5v5 Top-Down 2D Football Game
 * config: { mode, roomId, side, opponent, formation }
 */
import { useEffect, useRef } from 'react'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TEAM_AMBER   = '#C17A2A'
const TEAM_PURPLE  = '#5B3FDB'
const KEEPER_AMBER  = '#8B5010'
const KEEPER_PURPLE = '#3A2490'

const PLAYER_R     = 18
const BALL_R       = 10
const FRICTION     = 0.97
const PLAYER_SPEED = 3.2
const AI_SPEED     = 2.9
const GAME_SEC     = 600
const GOAL_POST_W  = 16
const BALL_OWN_R   = 22   // radius for ball ownership
const KEEPER_PASS_LIMIT = 6  // seconds keeper can hold ball
const THROW_IN_GRACE    = 2  // seconds ball can't go out after throw-in
const DRIBBLE_SPEED_MUL = 1.8
const DRIBBLE_DURATION  = 1.5
const DRIBBLE_COOLDOWN  = 3.0
const INTERCEPT_WIDTH   = 30  // px either side of pass line

// ─── FORMATIONS (5 players: GK + 4) ──────────────────────────────────────────
// [xFrac, yFrac]: xFrac 0=own goal, 1=midfield; yFrac 0=top, 1=bottom
const FORMATIONS = {
  '1-2-1': [
    [0.04, 0.50],               // GK
    [0.25, 0.30],[0.25, 0.70],  // DEF
    [0.50, 0.50],               // MID
    [0.75, 0.50],               // FWD
  ],
  '1-1-2': [
    [0.04, 0.50],
    [0.25, 0.50],
    [0.50, 0.50],
    [0.75, 0.30],[0.75, 0.70],
  ],
  '1-3-0': [
    [0.04, 0.50],
    [0.30, 0.20],[0.30, 0.50],[0.30, 0.80],
    [0.55, 0.50],
  ],
}

// Which indices are "forwards" (allowed in opponent pen area)
const FORWARD_INDICES = {
  '1-2-1': [4],
  '1-1-2': [3, 4],
  '1-3-0': [],
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lenSq, 0, 1)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function buildTeam(formation, side, CW, CH) {
  const fmKey = FORMATIONS[formation] ? formation : '1-2-1'
  const positions = FORMATIONS[fmKey]
  const halfW = CW / 2
  const isLeft = side === 'left'
  const color  = isLeft ? TEAM_AMBER   : TEAM_PURPLE
  const kColor = isLeft ? KEEPER_AMBER : KEEPER_PURPLE

  return positions.map((pos, i) => {
    const [xf, yf] = pos
    const localX = xf * halfW
    const worldX = isLeft ? localX : CW - localX
    const worldY = yf * CH

    return {
      id: i,
      x: worldX, y: worldY,
      vx: 0, vy: 0,
      homeX: worldX, homeY: worldY,
      isKeeper: i === 0,
      color: i === 0 ? kColor : color,
      number: i === 0 ? 'GK' : String(i),
      side,
      selected: false,
      hasBall: false,
      offside: false,
      keeperHoldTimer: 0,
      keeperHasBall: false,
    }
  })
}

// ─── FIELD DRAWING ────────────────────────────────────────────────────────────
function drawField(ctx, CW, CH) {
  ctx.fillStyle = '#2E7D32'
  ctx.fillRect(0, 0, CW, CH)
  ctx.fillStyle = '#276B2B'
  const sw = CW / 10
  for (let i = 0; i < 10; i += 2) ctx.fillRect(i * sw, 0, sw, CH)

  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.lineWidth = 2
  ctx.strokeRect(4, 4, CW - 8, CH - 8)

  // Halfway
  ctx.beginPath(); ctx.moveTo(CW / 2, 4); ctx.lineTo(CW / 2, CH - 4); ctx.stroke()

  // Centre circle
  ctx.beginPath(); ctx.arc(CW / 2, CH / 2, CH * 0.12, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath(); ctx.arc(CW / 2, CH / 2, 4, 0, Math.PI * 2); ctx.fill()

  // Penalty areas: x from goal line to CW*0.18, height CH*0.5 centered
  const penW = CW * 0.18
  const penH = CH * 0.50
  const penY = (CH - penH) / 2
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'
  ctx.strokeRect(4, penY, penW, penH)
  ctx.strokeRect(CW - 4 - penW, penY, penW, penH)

  // Goal areas
  const gaW = CW * 0.07
  const gaH = CH * 0.28
  const gaY = (CH - gaH) / 2
  ctx.strokeRect(4, gaY, gaW, gaH)
  ctx.strokeRect(CW - 4 - gaW, gaY, gaW, gaH)

  // Penalty spots
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath(); ctx.arc(CW * 0.14, CH / 2, 3, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(CW * 0.86, CH / 2, 3, 0, Math.PI * 2); ctx.fill()

  // Corner arcs
  const cr = 14
  const corners = [[4,4,0,Math.PI/2],[CW-4,4,Math.PI/2,Math.PI],[CW-4,CH-4,Math.PI,Math.PI*1.5],[4,CH-4,Math.PI*1.5,Math.PI*2]]
  for (const [cx, cy, sa, ea] of corners) {
    ctx.beginPath(); ctx.arc(cx, cy, cr, sa, ea); ctx.stroke()
  }
}

function drawGoals(ctx, CW, CH, GOAL_H) {
  const goalY = (CH - GOAL_H) / 2
  // Left
  ctx.fillStyle = 'rgba(193,122,42,0.25)'
  ctx.fillRect(0, goalY, GOAL_POST_W, GOAL_H)
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3
  ctx.strokeRect(0, goalY, GOAL_POST_W, GOAL_H)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, goalY + GOAL_H * i / 4); ctx.lineTo(GOAL_POST_W, goalY + GOAL_H * i / 4); ctx.stroke()
  }
  // Right
  ctx.fillStyle = 'rgba(91,63,219,0.25)'
  ctx.fillRect(CW - GOAL_POST_W, goalY, GOAL_POST_W, GOAL_H)
  ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3
  ctx.strokeRect(CW - GOAL_POST_W, goalY, GOAL_POST_W, GOAL_H)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(CW - GOAL_POST_W, goalY + GOAL_H * i / 4); ctx.lineTo(CW, goalY + GOAL_H * i / 4); ctx.stroke()
  }
}

// ─── PLAYER DRAWING ───────────────────────────────────────────────────────────
function drawPlayer(ctx, p, hasBall) {
  ctx.save()
  ctx.translate(p.x, p.y)

  // Offside tint
  if (p.offside) {
    ctx.globalAlpha = 0.85
  }

  // Ball glow
  if (hasBall) {
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 14
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(0, 0, PLAYER_R + 6, 0, Math.PI * 2); ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Selection ring
  if (p.selected) {
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(0, 0, PLAYER_R + 5, 0, Math.PI * 2); ctx.stroke()
  }

  // Offside red ring
  if (p.offside) {
    ctx.strokeStyle = '#FF3333'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(0, 0, PLAYER_R + 8, 0, Math.PI * 2); ctx.stroke()
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath(); ctx.ellipse(0, PLAYER_R + 2, PLAYER_R * 0.8, 5, 0, 0, Math.PI * 2); ctx.fill()

  // Body
  ctx.fillStyle = p.color
  ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2
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
  ctx.fillStyle = '#C4956A'; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.ellipse(0, 2, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#1A1A1A'
  ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill()

  // Number
  ctx.fillStyle = '#FFFFFF'
  ctx.font = p.isKeeper ? 'bold 7px sans-serif' : 'bold 8px sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(p.number, 0, 9)

  ctx.restore()
}

function drawBall(ctx, ball) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath(); ctx.ellipse(ball.x + 3, ball.y + BALL_R + 2, BALL_R * 0.9, 5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.save()
  ctx.translate(ball.x, ball.y)
  ctx.rotate(ball.spin)
  ctx.fillStyle = '#F5EFE0'; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(0, 0, BALL_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#1A1A1A'
  ctx.beginPath(); ctx.arc(0, 0, BALL_R * 0.28, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    ctx.beginPath(); ctx.arc(Math.cos(a) * BALL_R * 0.6, Math.sin(a) * BALL_R * 0.6, BALL_R * 0.16, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawHUD(ctx, CW, CH, scores, timeLeft, formation, flashMsg, flashAlpha, dribble) {
  // Score box
  ctx.fillStyle = 'rgba(15,8,40,0.82)'
  ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.roundRect(CW / 2 - 90, 8, 180, 50, 10); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#F5EFE0'
  ctx.font = "bold 20px 'Press Start 2P', monospace"
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(`${scores[0]}  –  ${scores[1]}`, CW / 2, 28)
  const mins = Math.floor(timeLeft / 60)
  const secs = Math.ceil(timeLeft % 60)
  ctx.font = "8px 'Press Start 2P', monospace"
  ctx.fillStyle = timeLeft <= 60 ? '#FF6B6B' : '#A0C4FF'
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, CW / 2, 48)

  // Formation label
  ctx.font = "7px 'Press Start 2P', monospace"
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.textAlign = 'left'
  ctx.fillText(formation || '1-2-1', 10, 20)

  // Flash message (GOAL!, OFFSIDE!, THROW-IN)
  if (flashMsg && flashAlpha > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, flashAlpha)
    const isGoal = flashMsg.includes('GOAL')
    ctx.fillStyle = isGoal ? 'rgba(240,180,41,0.28)' : 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, 0, CW, CH)
    ctx.fillStyle = isGoal ? '#F0B429' : flashMsg.includes('OFFSIDE') ? '#FF4444' : '#FFFFFF'
    ctx.font = "bold 26px 'Press Start 2P', monospace"
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.shadowColor = '#000'; ctx.shadowBlur = 8
    ctx.fillText(flashMsg, CW / 2, CH / 2)
    ctx.shadowBlur = 0
    ctx.restore()
  }

  // Dribble button
  drawDribbleButton(ctx, CW, CH, dribble)
}

function drawDribbleButton(ctx, CW, CH, dribble) {
  const bx = CW / 2
  const by = CH - 44
  const bw = 110, bh = 36, br = 10

  const isActive = dribble.active
  const onCooldown = dribble.cooldown > 0

  ctx.save()
  // Glow when active
  if (isActive) {
    ctx.shadowColor = '#C17A2A'
    ctx.shadowBlur = 18
  }

  ctx.fillStyle = isActive ? '#C17A2A' : onCooldown ? '#555' : '#8B5010'
  ctx.strokeStyle = isActive ? '#FFD700' : '#2D2D2D'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, br)
  ctx.fill(); ctx.stroke()
  ctx.shadowBlur = 0

  ctx.fillStyle = isActive ? '#FFD700' : onCooldown ? '#999' : '#F5EFE0'
  ctx.font = "bold 9px 'Press Start 2P', monospace"
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('DRIBBLE', bx, by)

  // Cooldown bar
  if (onCooldown && !isActive) {
    const pct = 1 - dribble.cooldown / DRIBBLE_COOLDOWN
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath(); ctx.roundRect(bx - bw / 2 + 4, by + 10, bw - 8, 6, 3); ctx.fill()
    ctx.fillStyle = '#C17A2A'
    ctx.beginPath(); ctx.roundRect(bx - bw / 2 + 4, by + 10, (bw - 8) * pct, 6, 3); ctx.fill()
  }

  // Active timer bar
  if (isActive) {
    const pct = dribble.timer / DRIBBLE_DURATION
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.beginPath(); ctx.roundRect(bx - bw / 2 + 4, by + 10, bw - 8, 6, 3); ctx.fill()
    ctx.fillStyle = '#FFD700'
    ctx.beginPath(); ctx.roundRect(bx - bw / 2 + 4, by + 10, (bw - 8) * pct, 6, 3); ctx.fill()
  }

  ctx.restore()
}

function drawKeeperTimer(ctx, keeper, timer) {
  if (timer <= 0) return
  ctx.save()
  ctx.fillStyle = timer < 2 ? '#FF4444' : '#FFD700'
  ctx.font = "bold 10px 'Press Start 2P', monospace"
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
  ctx.fillText(Math.ceil(timer) + 's', keeper.x, keeper.y - PLAYER_R - 6)
  ctx.restore()
}

function drawThrowInIndicator(ctx, player) {
  if (!player) return
  ctx.save()
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 4])
  ctx.beginPath(); ctx.arc(player.x, player.y, PLAYER_R + 10, 0, Math.PI * 2); ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

// ─── PENALTY AREA HELPERS ─────────────────────────────────────────────────────
function getPenaltyArea(side, CW, CH) {
  const penW = CW * 0.18
  const penH = CH * 0.50
  const penY = (CH - penH) / 2
  if (side === 'left') return { x1: 0, x2: penW, y1: penY, y2: penY + penH }
  return { x1: CW - penW, x2: CW, y1: penY, y2: penY + penH }
}

function inPenaltyArea(px, py, side, CW, CH) {
  const a = getPenaltyArea(side, CW, CH)
  return px >= a.x1 && px <= a.x2 && py >= a.y1 && py <= a.y2
}

// ─── OFFSIDE CHECK ────────────────────────────────────────────────────────────
// Returns list of player ids that are offside for the attacking team
function getOffsidePlayers(attackers, defenders, ball, attackSide, CW) {
  // Only applies in opponent's half
  const midX = CW / 2
  const offside = []

  // Second-to-last defender (last = keeper usually)
  const defXs = defenders.map(d => d.x).sort((a, b) =>
    attackSide === 'left' ? b - a : a - b  // sort by proximity to attacker's goal
  )
  // second-to-last defender line
  const secondLastX = defXs[1] ?? defXs[0]

  for (const p of attackers) {
    if (p.isKeeper) continue
    const inOpponentHalf = attackSide === 'left' ? p.x > midX : p.x < midX
    if (!inOpponentHalf) continue
    // Closer to opponent goal than second-to-last defender?
    const isOffside = attackSide === 'left'
      ? p.x > secondLastX
      : p.x < secondLastX
    if (isOffside) offside.push(p.id)
  }
  return offside
}

// ─── PASS INTERCEPTION ───────────────────────────────────────────────────────
// Returns the first opponent in the path of a kick, or null
function findInterceptor(fromX, fromY, toX, toY, opponents) {
  for (const opp of opponents) {
    const d = pointToSegmentDist(opp.x, opp.y, fromX, fromY, toX, toY)
    if (d < INTERCEPT_WIDTH) return opp
  }
  return null
}

// ─── AI SYSTEM ────────────────────────────────────────────────────────────────
function updateAI(team, opponents, ball, side, CW, CH, GOAL_H, formation) {
  const isLeft = side === 'left'
  const ownGoalX  = isLeft ? 0 : CW
  const oppGoalX  = isLeft ? CW : 0
  const penArea   = getPenaltyArea(side, CW, CH)
  const oppPenArea = getPenaltyArea(isLeft ? 'right' : 'left', CW, CH)

  // Find nearest outfield player to ball
  let nearestIdx = 1, nearestDist = Infinity
  for (let i = 1; i < team.length; i++) {
    const d = dist(team[i], ball)
    if (d < nearestDist) { nearestDist = d; nearestIdx = i }
  }

  // Offside trap: don't push forwards past second-to-last opponent
  const oppXs = opponents.filter(o => !o.isKeeper).map(o => o.x).sort((a, b) => isLeft ? b - a : a - b)
  const offsideLine = oppXs[1] ?? (isLeft ? CW * 0.85 : CW * 0.15)

  team.forEach((p, i) => {
    if (p.isKeeper) {
      // Keeper: stay in own penalty area, track ball Y
      const keeperX = isLeft ? CW * 0.05 : CW * 0.95
      const ballInOwnPen = inPenaltyArea(ball.x, ball.y, side, CW, CH)
      const targetY = clamp(ball.y, penArea.y1 + PLAYER_R, penArea.y2 - PLAYER_R)
      let targetX = keeperX
      if (ballInOwnPen) {
        targetX = clamp(ball.x, penArea.x1 + PLAYER_R, penArea.x2 - PLAYER_R)
      }
      const dx = targetX - p.x, dy = targetY - p.y
      const d = Math.hypot(dx, dy) || 1
      const spd = ballInOwnPen ? AI_SPEED * 1.5 : AI_SPEED
      p.vx = (dx / d) * Math.min(spd, d)
      p.vy = (dy / d) * Math.min(spd, d)

      // Keeper has ball: pass to nearest teammate
      if (p.keeperHasBall) {
        let bestMate = null, bestD = Infinity
        for (let j = 1; j < team.length; j++) {
          const d2 = dist(team[j], p)
          if (d2 < bestD) { bestD = d2; bestMate = team[j] }
        }
        if (bestMate) {
          const dx2 = bestMate.x - ball.x, dy2 = bestMate.y - ball.y
          const d2 = Math.hypot(dx2, dy2) || 1
          ball.vx = (dx2 / d2) * 6
          ball.vy = (dy2 / d2) * 6
          p.keeperHasBall = false
        }
      }
      return
    }

    let targetX, targetY

    if (i === nearestIdx) {
      // Chase ball
      targetX = ball.x; targetY = ball.y
      // If near ball and near opponent goal: shoot
      const ballDist = dist(p, ball)
      if (ballDist < BALL_OWN_R + 5) {
        const goalDist = Math.abs(p.x - oppGoalX)
        if (goalDist < CW * 0.35) {
          const dx2 = oppGoalX - ball.x, dy2 = CH / 2 - ball.y
          const d2 = Math.hypot(dx2, dy2) || 1
          ball.vx = (dx2 / d2) * 9 + (Math.random() - 0.5) * 2
          ball.vy = (dy2 / d2) * 9 + (Math.random() - 0.5) * 3
        } else {
          // Pass to nearest teammate not blocked
          let bestMate = null, bestD = Infinity
          for (let j = 1; j < team.length; j++) {
            if (j === i) continue
            const interceptor = findInterceptor(ball.x, ball.y, team[j].x, team[j].y, opponents)
            if (interceptor) continue
            const d2 = dist(team[j], ball)
            if (d2 < bestD) { bestD = d2; bestMate = team[j] }
          }
          if (bestMate) {
            const dx2 = bestMate.x - ball.x, dy2 = bestMate.y - ball.y
            const d2 = Math.hypot(dx2, dy2) || 1
            const power = Math.min(8, bestD / 30)
            ball.vx = (dx2 / d2) * power
            ball.vy = (dy2 / d2) * power
          }
        }
      }
    } else {
      // Hold formation with slight pressure
      const pressure = 0.2
      targetX = p.homeX + (ball.x - p.homeX) * pressure + (Math.random() - 0.5) * 30
      targetY = p.homeY + (ball.y - p.homeY) * pressure + (Math.random() - 0.5) * 30
    }

    // Offside trap: clamp forward positions
    if (isLeft) targetX = Math.min(targetX, offsideLine - 5)
    else         targetX = Math.max(targetX, offsideLine + 5)

    // Don't enter opponent penalty area unless forward
    const fwdIdxs = FORWARD_INDICES[formation] || []
    if (!fwdIdxs.includes(i)) {
      if (isLeft) targetX = Math.min(targetX, oppPenArea.x1 - 5)
      else         targetX = Math.max(targetX, oppPenArea.x2 + 5)
    }

    const dx = targetX - p.x, dy = targetY - p.y
    const d = Math.hypot(dx, dy) || 1
    const spd = AI_SPEED * (i === nearestIdx ? 1.0 : 0.65)
    p.vx = (dx / d) * Math.min(spd, d)
    p.vy = (dy / d) * Math.min(spd, d)
  })
}

// ─── BALL PHYSICS ─────────────────────────────────────────────────────────────
function updateBallPhysics(ball, CW, CH, GOAL_H, state) {
  if (state.throwIn) return  // ball frozen during throw-in

  ball.x += ball.vx
  ball.y += ball.vy
  ball.vx *= FRICTION
  ball.vy *= FRICTION
  ball.spin += ball.vx * 0.04

  const goalTop    = (CH - GOAL_H) / 2
  const goalBottom = (CH + GOAL_H) / 2

  // Top/bottom: throw-in
  if (ball.y - BALL_R < 0) {
    if (state.throwInGrace <= 0) {
      state.throwIn = true
      state.throwInSide = state.lastTouchSide === 'left' ? 'right' : 'left'
      state.throwInPos = { x: clamp(ball.x, 20, CW - 20), y: 0 }
      ball.y = BALL_R
    } else {
      ball.y = BALL_R; ball.vy *= -0.7
    }
  }
  if (ball.y + BALL_R > CH) {
    if (state.throwInGrace <= 0) {
      state.throwIn = true
      state.throwInSide = state.lastTouchSide === 'left' ? 'right' : 'left'
      state.throwInPos = { x: clamp(ball.x, 20, CW - 20), y: CH }
      ball.y = CH - BALL_R
    } else {
      ball.y = CH - BALL_R; ball.vy *= -0.7
    }
  }

  // Left/right walls (outside goal)
  if (ball.x - BALL_R < GOAL_POST_W) {
    if (ball.y < goalTop || ball.y > goalBottom) {
      ball.x = GOAL_POST_W + BALL_R; ball.vx *= -0.7
    }
  }
  if (ball.x + BALL_R > CW - GOAL_POST_W) {
    if (ball.y < goalTop || ball.y > goalBottom) {
      ball.x = CW - GOAL_POST_W - BALL_R; ball.vx *= -0.7
    }
  }
}

function checkGoal(ball, CW, CH, GOAL_H) {
  const goalTop    = (CH - GOAL_H) / 2
  const goalBottom = (CH + GOAL_H) / 2
  if (ball.x - BALL_R < 0 && ball.y > goalTop && ball.y < goalBottom) return 1   // right scores
  if (ball.x + BALL_R > CW && ball.y > goalTop && ball.y < goalBottom) return 0  // left scores
  return -1
}

function resetBall(ball, CW, CH) {
  ball.x = CW / 2; ball.y = CH / 2
  ball.vx = (Math.random() > 0.5 ? 1 : -1) * 1.5
  ball.vy = (Math.random() - 0.5) * 2
  ball.spin = 0
}

// ─── PLAYER-BALL COLLISION ────────────────────────────────────────────────────
function resolvePlayerBallCollisions(players, ball, state) {
  for (const p of players) {
    const dx = ball.x - p.x, dy = ball.y - p.y
    const d  = Math.hypot(dx, dy)
    const minD = PLAYER_R + BALL_R
    if (d < minD && d > 0) {
      const nx = dx / d, ny = dy / d
      const relV = (ball.vx - p.vx) * nx + (ball.vy - p.vy) * ny
      if (relV < 0) {
        const imp = -relV * 1.5
        ball.vx += nx * imp; ball.vy += ny * imp
      }
      const overlap = minD - d
      ball.x += nx * overlap * 0.8; ball.y += ny * overlap * 0.8
      state.lastTouchSide = p.side
    }
  }
}

function applyPlayerMovement(players, CW, CH) {
  for (const p of players) {
    p.x = clamp(p.x + p.vx, PLAYER_R, CW - PLAYER_R)
    p.y = clamp(p.y + p.vy, PLAYER_R, CH - PLAYER_R)
  }
}

// ─── KEEPER RESTRICTION ───────────────────────────────────────────────────────
function enforceKeeperBounds(keeper, side, CW, CH) {
  const a = getPenaltyArea(side, CW, CH)
  keeper.x = clamp(keeper.x, a.x1 + PLAYER_R, a.x2 - PLAYER_R)
  keeper.y = clamp(keeper.y, a.y1 + PLAYER_R, a.y2 - PLAYER_R)
  keeper.vx = 0; keeper.vy = 0
}

// ─── KEEPER AUTO-PICKUP ───────────────────────────────────────────────────────
function updateKeeperPickup(team, ball, side, CW, CH, state) {
  const keeper = team[0]
  const ballInOwnPen = inPenaltyArea(ball.x, ball.y, side, CW, CH)
  if (!ballInOwnPen) {
    keeper.keeperHasBall = false
    return
  }
  // Check if keeper is nearest to ball among all players
  let nearestDist = dist(keeper, ball)
  for (const p of team) {
    if (p.isKeeper) continue
    if (dist(p, ball) < nearestDist) return  // outfield player is closer
  }
  // Keeper picks up ball
  if (dist(keeper, ball) < BALL_OWN_R + 10) {
    keeper.keeperHasBall = true
    ball.vx = 0; ball.vy = 0
    ball.x = keeper.x + (side === 'left' ? PLAYER_R + BALL_R + 2 : -(PLAYER_R + BALL_R + 2))
    ball.y = keeper.y
  }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
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
    const GOAL_H = CH * 0.35

    const formation = config?.formation || '1-2-1'
    const mode      = config?.mode || 'ai'
    const localSide = config?.side || 'left'

    // ── Teams ────────────────────────────────────────────────────────────────
    const leftTeam  = buildTeam(formation, 'left',  CW, CH)
    const rightTeam = buildTeam(formation, 'right', CW, CH)
    leftTeam[1].selected = true

    const ball = { x: CW / 2, y: CH / 2, vx: 1.5, vy: 0.5, spin: 0 }

    // ── Game state ───────────────────────────────────────────────────────────
    let scores    = [0, 0]
    let timeLeft  = GAME_SEC
    let gameOver  = false
    let lastTime  = performance.now()

    // Flash message
    let flashMsg   = ''
    let flashAlpha = 0

    function showFlash(msg, duration = 2.0) {
      flashMsg = msg; flashAlpha = duration
    }

    // Shared mutable state passed to physics
    const state = {
      lastTouchSide: 'left',
      throwIn: false,
      throwInSide: 'left',
      throwInPos: null,
      throwInGrace: 0,
      throwInPlayer: null,   // player who will throw
      offsideActive: false,
      offsideFreeKickPos: null,
    }

    // Dribble state (human team)
    const dribble = { active: false, timer: 0, cooldown: 0 }

    // Keeper hold timer
    let keeperHoldTimer = 0

    // ── PVP Sync ─────────────────────────────────────────────────────────────
    let sync = null
    let remoteInput = null

    async function initSync() {
      if (mode !== 'pvp' || !config.roomId) return
      const { FootballSync } = await import('../../lib/football/FootballSync')
      sync = new FootballSync(config.roomId, localSide)
      sync
        .on('onRemoteInput', (payload) => { remoteInput = payload })
        .on('onGoal', (payload) => {
          scores[0] = payload.s0; scores[1] = payload.s1
          showFlash('⚽ GOAL! ⚽')
          window.ANAGO_UI?.updateScore(scores[0], scores[1])
          resetBall(ball, CW, CH)
        })
        .on('onGameEnd', (payload) => {
          gameOver = true
          const winner = payload.winnerSide === 'left' ? 0 : 1
          window.ANAGO_UI?.showResult(winner, [payload.s0, payload.s1])
        })
        .connect()
    }
    initSync()

    // ── Input ────────────────────────────────────────────────────────────────
    let selectedIdx = 1
    let tapTarget   = null
    let lastTapTime = 0
    let lastTapPos  = null

    function getCanvasPos(e) {
      const rect = canvas.getBoundingClientRect()
      const src  = e.touches ? e.touches[0] : e
      return {
        x: (src.clientX - rect.left) * (CW / rect.width),
        y: (src.clientY - rect.top)  * (CH / rect.height),
      }
    }

    function humanTeam() {
      return mode === 'pvp' && localSide === 'right' ? rightTeam : leftTeam
    }

    function autoSelectNearest() {
      const ht = humanTeam()
      let best = 1, bestD = Infinity
      for (let i = 0; i < ht.length; i++) {
        const d = dist(ht[i], ball)
        if (d < bestD) { bestD = d; best = i }
      }
      // Don't auto-select keeper unless ball in own pen area
      if (best === 0) {
        const side = localSide
        if (!inPenaltyArea(ball.x, ball.y, side, CW, CH)) best = 1
      }
      ht.forEach((p, i) => { p.selected = i === best })
      selectedIdx = best
    }

    // Dribble button hit test
    function isDribbleButton(pos) {
      const bx = CW / 2, by = CH - 44
      return Math.abs(pos.x - bx) < 60 && Math.abs(pos.y - by) < 22
    }

    function onPointerDown(e) {
      e.preventDefault()
      const pos = getCanvasPos(e)
      const now = performance.now()
      const dt  = now - lastTapTime
      lastTapTime = now

      // Dribble button
      if (isDribbleButton(pos)) {
        if (!dribble.active && dribble.cooldown <= 0) {
          dribble.active = true
          dribble.timer  = DRIBBLE_DURATION
          dribble.cooldown = 0
        }
        return
      }

      // Throw-in: tap anywhere to throw
      if (state.throwIn && state.throwInSide === (mode === 'pvp' ? localSide : 'left')) {
        const ht = humanTeam()
        const thrower = state.throwInPlayer || ht[1]
        const dx = pos.x - ball.x, dy = pos.y - ball.y
        const d  = Math.hypot(dx, dy) || 1
        const power = Math.min(7, d / 40)
        ball.vx = (dx / d) * power
        ball.vy = (dy / d) * power
        state.throwIn = false
        state.throwInGrace = THROW_IN_GRACE
        state.throwInPlayer = null
        return
      }

      const ht = humanTeam()
      const sel = ht[selectedIdx]

      // Tap on teammate → pass
      for (let i = 0; i < ht.length; i++) {
        if (i === selectedIdx) continue
        if (dist(ht[i], pos) < PLAYER_R * 2.5) {
          const ballDist = dist(sel, ball)
          if (ballDist < BALL_OWN_R + 20) {
            // Check interception
            const opponents = mode === 'pvp' && localSide === 'right' ? leftTeam : rightTeam
            const interceptor = findInterceptor(ball.x, ball.y, ht[i].x, ht[i].y, opponents)
            if (interceptor) {
              // Ball intercepted
              const idx2 = interceptor.x - ball.x, idy2 = interceptor.y - ball.y
              const id2 = Math.hypot(idx2, idy2) || 1
              ball.vx = (idx2 / id2) * 5; ball.vy = (idy2 / id2) * 5
              state.lastTouchSide = interceptor.side
            } else {
              // Check offside
              const attackSide = localSide
              const defenders  = mode === 'pvp' && localSide === 'right' ? leftTeam : rightTeam
              const offsideIds = getOffsidePlayers(ht, defenders, ball, attackSide, CW)
              if (offsideIds.includes(ht[i].id)) {
                showFlash('OFFSIDE!')
                state.offsideActive = true
                state.offsideFreeKickPos = { x: ht[i].x, y: ht[i].y }
                // Give ball to defenders
                const nearestDef = defenders.reduce((a, b) => dist(a, ball) < dist(b, ball) ? a : b)
                ball.vx = (nearestDef.x - ball.x) / 60
                ball.vy = (nearestDef.y - ball.y) / 60
                return
              }
              const dx2 = ht[i].x - ball.x, dy2 = ht[i].y - ball.y
              const d2  = Math.hypot(dx2, dy2) || 1
              const power = Math.min(8, d2 / 30)
              ball.vx = (dx2 / d2) * power; ball.vy = (dy2 / d2) * power
              state.lastTouchSide = localSide
            }
            ht.forEach((p, j) => { p.selected = j === i })
            selectedIdx = i
          }
          return
        }
      }

      // Keeper has ball: tap teammate to pass (no shooting)
      if (sel && sel.isKeeper && sel.keeperHasBall) {
        // Already handled above (tap teammate)
        return
      }

      const ballDist = dist(pos, ball)
      const isDoubleTap = dt < 350 && lastTapPos && dist(pos, lastTapPos) < 60
      lastTapPos = pos

      const opponents = mode === 'pvp' && localSide === 'right' ? leftTeam : rightTeam
      const oppGoalX  = localSide === 'left' ? CW : 0

      if (isDoubleTap && ballDist < 80) {
        // Shoot
        const dx = oppGoalX - ball.x, dy = CH / 2 - ball.y
        const d  = Math.hypot(dx, dy) || 1
        ball.vx = (dx / d) * 10; ball.vy = (dy / d) * 10 + (Math.random() - 0.5) * 3
        state.lastTouchSide = localSide
      } else if (ballDist < 60 && sel && dist(sel, ball) < BALL_OWN_R + 30) {
        // Kick toward goal
        const dx = oppGoalX - ball.x, dy = CH / 2 - ball.y
        const d  = Math.hypot(dx, dy) || 1
        ball.vx = (dx / d) * 7; ball.vy = (dy / d) * 7 + (Math.random() - 0.5) * 2
        state.lastTouchSide = localSide
      } else {
        tapTarget = { x: pos.x, y: pos.y }
      }
    }

    canvas.addEventListener('touchstart', onPointerDown, { passive: false })
    canvas.addEventListener('mousedown',  onPointerDown)

    // ── Game loop ─────────────────────────────────────────────────────────────
    let animId

    function loop(now) {
      animId = requestAnimationFrame(loop)
      if (gameOver) { draw(); return }

      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      timeLeft -= delta
      flashAlpha = Math.max(0, flashAlpha - delta * 0.8)
      state.throwInGrace = Math.max(0, state.throwInGrace - delta)

      // Dribble timer
      if (dribble.active) {
        dribble.timer -= delta
        if (dribble.timer <= 0) {
          dribble.active = false
          dribble.cooldown = DRIBBLE_COOLDOWN
        }
      } else if (dribble.cooldown > 0) {
        dribble.cooldown = Math.max(0, dribble.cooldown - delta)
      }

      // Auto-select nearest human player
      autoSelectNearest()

      const ht = humanTeam()
      const sel = ht[selectedIdx]

      // Move selected human player
      if (tapTarget && sel) {
        const dx = tapTarget.x - sel.x, dy = tapTarget.y - sel.y
        const d  = Math.hypot(dx, dy)
        if (d < 4) {
          tapTarget = null; sel.vx = 0; sel.vy = 0
        } else {
          const spd = dribble.active ? PLAYER_SPEED * DRIBBLE_SPEED_MUL : PLAYER_SPEED
          sel.vx = (dx / d) * Math.min(spd, d)
          sel.vy = (dy / d) * Math.min(spd, d)
        }
      }

      // Dribble: ball sticks to selected player
      if (dribble.active && sel && dist(sel, ball) < BALL_OWN_R + 10) {
        const side = localSide === 'left' ? 1 : -1
        ball.x = sel.x + side * (PLAYER_R + BALL_R + 2)
        ball.y = sel.y
        ball.vx = sel.vx * 0.9; ball.vy = sel.vy * 0.9
      }

      // Keeper restriction: clamp to penalty area
      enforceKeeperBounds(leftTeam[0],  'left',  CW, CH)
      enforceKeeperBounds(rightTeam[0], 'right', CW, CH)

      // Keeper auto-pickup
      updateKeeperPickup(leftTeam,  ball, 'left',  CW, CH, state)
      updateKeeperPickup(rightTeam, ball, 'right', CW, CH, state)

      // Keeper hold timer
      const humanKeeper = ht[0]
      if (humanKeeper.keeperHasBall) {
        keeperHoldTimer += delta
        if (keeperHoldTimer >= KEEPER_PASS_LIMIT) {
          // Give ball to nearest opponent
          const opponents = mode === 'pvp' && localSide === 'right' ? leftTeam : rightTeam
          const nearest = opponents.reduce((a, b) => dist(a, ball) < dist(b, ball) ? a : b)
          ball.vx = (nearest.x - ball.x) / 40
          ball.vy = (nearest.y - ball.y) / 40
          humanKeeper.keeperHasBall = false
          keeperHoldTimer = 0
          showFlash('INDIRECT FREE KICK', 1.5)
        }
      } else {
        keeperHoldTimer = 0
      }

      // AI for right team (or left if pvp right side)
      if (mode !== 'pvp') {
        updateAI(rightTeam, leftTeam, ball, 'right', CW, CH, GOAL_H, formation)
      }

      // PVP remote input
      if (mode === 'pvp' && remoteInput) {
        const remoteTeam = localSide === 'left' ? rightTeam : leftTeam
        if (remoteInput.targetX !== undefined) {
          const rp = remoteTeam[remoteInput.selectedId] || remoteTeam[1]
          if (rp) {
            const dx = remoteInput.targetX - rp.x, dy = remoteInput.targetY - rp.y
            const d  = Math.hypot(dx, dy) || 1
            rp.vx = (dx / d) * PLAYER_SPEED; rp.vy = (dy / d) * PLAYER_SPEED
          }
        }
        if (remoteInput.ballVx !== undefined) {
          ball.vx = remoteInput.ballVx; ball.vy = remoteInput.ballVy
        }
        remoteInput = null
      }

      // Broadcast PVP input
      if (mode === 'pvp' && sync) {
        sync.broadcastInput({
          side: localSide,
          selectedId: selectedIdx,
          targetX: tapTarget ? tapTarget.x : sel?.x,
          targetY: tapTarget ? tapTarget.y : sel?.y,
          action: dribble.active ? 'dribble' : null,
        })
      }

      // Throw-in: position nearest player to throw-in spot
      if (state.throwIn) {
        const throwTeam = state.throwInSide === 'left' ? leftTeam : rightTeam
        let nearestP = throwTeam[1], nearestD = Infinity
        for (let i = 1; i < throwTeam.length; i++) {
          const d = dist(throwTeam[i], state.throwInPos)
          if (d < nearestD) { nearestD = d; nearestP = throwTeam[i] }
        }
        state.throwInPlayer = nearestP
        // Move thrower toward throw-in spot
        const dx = state.throwInPos.x - nearestP.x
        const dy = (state.throwInPos.y < CH / 2 ? 30 : CH - 30) - nearestP.y
        const d  = Math.hypot(dx, dy) || 1
        nearestP.vx = (dx / d) * PLAYER_SPEED
        nearestP.vy = (dy / d) * PLAYER_SPEED
        // Freeze ball at boundary
        ball.x = state.throwInPos.x
        ball.y = clamp(state.throwInPos.y, BALL_R, CH - BALL_R)
        ball.vx = 0; ball.vy = 0
        showFlash('THROW-IN', 0.05)
      }

      // Apply movement
      applyPlayerMovement(leftTeam,  CW, CH)
      applyPlayerMovement(rightTeam, CW, CH)

      // Friction on non-selected players
      for (const p of [...leftTeam, ...rightTeam]) {
        if (!p.selected || tapTarget === null) {
          p.vx *= 0.75; p.vy *= 0.75
        }
      }

      // Ball physics
      updateBallPhysics(ball, CW, CH, GOAL_H, state)
      resolvePlayerBallCollisions([...leftTeam, ...rightTeam], ball, state)

      // Offside check: clear after a moment
      if (state.offsideActive) {
        state.offsideActive = false
        // Mark offside players briefly
        setTimeout(() => {
          for (const p of [...leftTeam, ...rightTeam]) p.offside = false
        }, 1500)
      }

      // Goal check
      const scorer = checkGoal(ball, CW, CH, GOAL_H)
      if (scorer >= 0) {
        scores[scorer]++
        showFlash('⚽ GOAL! ⚽')
        window.ANAGO_UI?.updateScore(scores[0], scores[1])
        if (mode === 'pvp' && sync) sync.broadcastGoal(scorer === 0 ? 'left' : 'right', scores[0], scores[1])
        resetBall(ball, CW, CH)
      }

      // Timer end
      if (timeLeft <= 0) {
        timeLeft = 0; gameOver = true
        const winner = scores[0] >= scores[1] ? 0 : 1
        if (mode === 'pvp' && sync) sync.broadcastGameEnd(winner === 0 ? 'left' : 'right', scores[0], scores[1])
        window.ANAGO_UI?.showResult(winner, [...scores])
      }

      draw()
    }

    // ── Draw ──────────────────────────────────────────────────────────────────
    function draw() {
      ctx.clearRect(0, 0, CW, CH)
      drawField(ctx, CW, CH)
      drawGoals(ctx, CW, CH, GOAL_H)

      // Penalty area highlight during throw-in
      if (state.throwIn) {
        const a = getPenaltyArea(state.throwInSide, CW, CH)
        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        ctx.fillRect(a.x1, a.y1, a.x2 - a.x1, a.y2 - a.y1)
      }

      // Players
      const allPlayers = [...leftTeam, ...rightTeam]
      for (const p of allPlayers) {
        const hasBall = dist(p, ball) < BALL_OWN_R
        drawPlayer(ctx, p, hasBall)
      }

      // Throw-in indicator
      if (state.throwIn) drawThrowInIndicator(ctx, state.throwInPlayer)

      // Keeper hold timer
      const ht = humanTeam()
      if (ht[0].keeperHasBall && keeperHoldTimer > 0) {
        drawKeeperTimer(ctx, ht[0], KEEPER_PASS_LIMIT - keeperHoldTimer)
      }

      drawBall(ctx, ball)
      drawHUD(ctx, CW, CH, scores, timeLeft, formation, flashMsg, flashAlpha, dribble)
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
