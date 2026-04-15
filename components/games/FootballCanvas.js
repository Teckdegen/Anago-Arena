/**
 * Dog Head Ball — like Head Ball 2.
 * Ball stays in the air (high gravity, bouncy).
 * Dogs jump to head the ball into the opponent's goal.
 * Dividing line in the middle — can't cross it.
 * First to 5 goals wins. 90s timer.
 */
import { useEffect, useRef } from 'react'

export default function FootballCanvas({ config }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const CW = canvas.width, CH = canvas.height

    const FLOOR    = CH - 70
    const CEILING  = 60
    const MID_X    = CW / 2          // dividing line — can't cross
    const GOAL_H   = CH * 0.32
    const GOAL_W   = 18
    const BALL_R   = 20
    const DOG_W    = 44
    const DOG_H    = 44
    const GRAVITY  = 0.55
    const JUMP_V   = -15
    const WIN      = 5
    const GAME_SEC = 90

    let scores   = [0, 0]
    let timeLeft = GAME_SEC
    let gameOver = false
    let lastTime = performance.now()
    let goalFlash = 0   // flash timer after goal

    // Ball — starts in air
    const ball = {
      x: CW / 2, y: CH * 0.35,
      vx: (Math.random() > 0.5 ? 1 : -1) * 4,
      vy: -2,
      r: BALL_R,
      spin: 0,
    }

    // Players
    const p1 = {
      x: CW * 0.22, y: FLOOR - DOG_H,
      vx: 0, vy: 0,
      onGround: true,
      color: '#C17A2A', name: 'YOU',
      maxX: MID_X - DOG_W / 2 - 4,   // can't cross mid
      minX: DOG_W / 2 + GOAL_W,
    }
    const p2 = {
      x: CW * 0.78, y: FLOOR - DOG_H,
      vx: 0, vy: 0,
      onGround: true,
      color: '#5B3FDB', name: config?.mode === 'pvp' ? (config.opponent || 'P2') : 'AI',
      maxX: CW - DOG_W / 2 - GOAL_W,
      minX: MID_X + DOG_W / 2 + 4,   // can't cross mid
    }

    // Goals — on left wall (p2 scores) and right wall (p1 scores)
    const goalL = { x: 0,           y: FLOOR - GOAL_H, w: GOAL_W, h: GOAL_H }
    const goalR = { x: CW - GOAL_W, y: FLOOR - GOAL_H, w: GOAL_W, h: GOAL_H }

    // ── Input ─────────────────────────────────────────
    // Tap left half = p1 jumps, tap right half = p2 jumps (local PVP)
    // In AI mode: tap anywhere = p1 jumps + moves toward tap X
    let lastTapX = null

    function onTap(e) {
      e.preventDefault()
      const tx = (e.touches?.[0] || e).clientX
      lastTapX = tx

      if (config?.mode !== 'pvp') {
        // AI mode — p1 only
        if (p1.onGround) { p1.vy = JUMP_V; p1.onGround = false }
        // Move toward tap (clamped to left half)
        const targetX = Math.max(p1.minX, Math.min(p1.maxX, tx))
        p1.vx = (targetX - p1.x) * 0.18
      } else {
        // PVP — left half controls p1, right half controls p2
        if (tx < MID_X) {
          if (p1.onGround) { p1.vy = JUMP_V; p1.onGround = false }
          p1.vx = (tx - p1.x) * 0.18
        } else {
          if (p2.onGround) { p2.vy = JUMP_V; p2.onGround = false }
          p2.vx = (tx - p2.x) * 0.18
        }
      }
    }

    canvas.addEventListener('touchstart', onTap, { passive: false })
    canvas.addEventListener('mousedown',  onTap)

    // ── AI ────────────────────────────────────────────
    let aiJumpCooldown = 0
    function updateAI(delta) {
      if (config?.mode !== 'ai') return
      aiJumpCooldown -= delta

      // Chase ball horizontally
      const dx = ball.x - p2.x
      p2.vx = dx * 0.08
      p2.x  = Math.max(p2.minX, Math.min(p2.maxX, p2.x + p2.vx))

      // Jump when ball is above and nearby
      if (ball.y < p2.y && Math.abs(ball.x - p2.x) < 120 && p2.onGround && aiJumpCooldown <= 0) {
        p2.vy = JUMP_V
        p2.onGround = false
        aiJumpCooldown = 0.6
      }
    }

    // ── Physics ───────────────────────────────────────
    function updatePlayer(p, delta) {
      p.vy += GRAVITY
      p.x  += p.vx
      p.y  += p.vy
      p.vx *= 0.82   // friction

      // Floor
      if (p.y + DOG_H >= FLOOR) {
        p.y = FLOOR - DOG_H
        p.vy = 0
        p.onGround = true
      }
      // Clamp X to their half
      p.x = Math.max(p.minX, Math.min(p.maxX, p.x))
    }

    function updateBall() {
      ball.vy += GRAVITY * 0.9
      ball.x  += ball.vx
      ball.y  += ball.vy
      ball.vx *= 0.995
      ball.spin += ball.vx * 0.05

      // Floor bounce — bouncy
      if (ball.y + ball.r >= FLOOR) {
        ball.y  = FLOOR - ball.r
        ball.vy *= -0.72
        ball.vx *= 0.88
        if (Math.abs(ball.vy) < 1) ball.vy = -1
      }
      // Ceiling
      if (ball.y - ball.r <= CEILING) {
        ball.y  = CEILING + ball.r
        ball.vy *= -0.6
      }

      // Left wall / goal
      if (ball.x - ball.r <= GOAL_W) {
        if (ball.y + ball.r > goalL.y) {
          // GOAL for p1
          doGoal(0); return
        }
        ball.x  = GOAL_W + ball.r
        ball.vx *= -0.7
      }
      // Right wall / goal
      if (ball.x + ball.r >= CW - GOAL_W) {
        if (ball.y + ball.r > goalR.y) {
          // GOAL for p2
          doGoal(1); return
        }
        ball.x  = CW - GOAL_W - ball.r
        ball.vx *= -0.7
      }

      // Mid-line — ball can cross freely (only players can't)

      // Player-ball head collision
      for (const p of [p1, p2]) {
        const cx = p.x + DOG_W / 2
        const cy = p.y + DOG_H * 0.25   // head is top quarter
        const dx = ball.x - cx
        const dy = ball.y - cy
        const dist = Math.hypot(dx, dy)
        const minDist = ball.r + DOG_W * 0.5

        if (dist < minDist && dist > 0) {
          const nx = dx / dist
          const ny = dy / dist
          const relV = (ball.vx - p.vx) * nx + (ball.vy - p.vy) * ny
          if (relV < 0) {
            const impulse = -relV * 1.6
            ball.vx += nx * impulse
            ball.vy += ny * impulse - 2
            // Separate
            const overlap = minDist - dist
            ball.x += nx * overlap
            ball.y += ny * overlap
          }
        }
      }
    }

    function doGoal(scorerIdx) {
      scores[scorerIdx]++
      goalFlash = 1.2
      window.ANAGO_UI?.updateScore(scores[0], scores[1])
      if (scores[scorerIdx] >= WIN) {
        gameOver = true
        window.ANAGO_UI?.showResult(scorerIdx === 0 ? 0 : 1, [...scores])
        return
      }
      resetBall(scorerIdx)
    }

    function resetBall(lastScorer) {
      // Serve toward the team that conceded
      const dir = lastScorer === 0 ? 1 : -1
      ball.x  = CW / 2
      ball.y  = CH * 0.3
      ball.vx = dir * 3
      ball.vy = -4
      ball.spin = 0
    }

    // ── Draw ──────────────────────────────────────────
    function draw() {
      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, CH)
      grad.addColorStop(0, '#5BB8F5')
      grad.addColorStop(0.65, '#B8E4FF')
      grad.addColorStop(1, '#B8E4FF')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CW, CH)

      // Ground
      ctx.fillStyle = '#27AE60'
      ctx.fillRect(0, FLOOR, CW, CH - FLOOR)
      // Ground line
      ctx.fillStyle = '#1E8449'
      ctx.fillRect(0, FLOOR, CW, 4)

      // ── DIVIDING LINE ──────────────────────────────
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 3
      ctx.setLineDash([14, 8])
      ctx.beginPath()
      ctx.moveTo(MID_X, CEILING)
      ctx.lineTo(MID_X, FLOOR)
      ctx.stroke()
      ctx.setLineDash([])
      // Centre circle
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(MID_X, FLOOR, 55, Math.PI, 0)
      ctx.stroke()
      ctx.restore()

      // Goals
      drawGoal(ctx, goalL, '#C17A2A', 'right')
      drawGoal(ctx, goalR, '#5B3FDB', 'left')

      // Goal flash
      if (goalFlash > 0) {
        ctx.fillStyle = `rgba(240,180,41,${goalFlash * 0.25})`
        ctx.fillRect(0, 0, CW, CH)
        ctx.fillStyle = '#F0B429'
        ctx.font = "bold 28px 'Press Start 2P', monospace"
        ctx.textAlign = 'center'
        ctx.fillText('GOAL! 🎉', CW / 2, CH / 2)
      }

      // Ball
      ctx.save()
      ctx.translate(ball.x, ball.y)
      ctx.rotate(ball.spin)
      ctx.beginPath()
      ctx.arc(0, 0, ball.r, 0, Math.PI * 2)
      ctx.fillStyle = '#F5EFE0'
      ctx.fill()
      ctx.strokeStyle = '#2D2D2D'
      ctx.lineWidth = 2.5
      ctx.stroke()
      // Black pentagon patches
      ctx.fillStyle = '#2D2D2D'
      ctx.beginPath(); ctx.arc(0, 0, ball.r * 0.32, 0, Math.PI * 2); ctx.fill()
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        ctx.beginPath(); ctx.arc(Math.cos(a) * ball.r * 0.62, Math.sin(a) * ball.r * 0.62, ball.r * 0.18, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()

      // Dogs
      drawDog(ctx, p1)
      drawDog(ctx, p2)

      // HUD — score + timer
      ctx.fillStyle = 'rgba(30,21,64,0.75)'
      ctx.strokeStyle = '#2D2D2D'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.roundRect(CW/2 - 80, 8, 160, 44, 10); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#F5EFE0'
      ctx.font = "bold 18px 'Press Start 2P', monospace"
      ctx.textAlign = 'center'
      ctx.fillText(`${scores[0]}  –  ${scores[1]}`, CW / 2, 30)
      ctx.font = "9px 'Press Start 2P', monospace"
      ctx.fillStyle = '#F4A0A0'
      ctx.fillText(`${Math.ceil(timeLeft)}s`, CW / 2, 46)

      // Player labels
      ctx.font = "7px 'Press Start 2P', monospace"
      ctx.fillStyle = '#C17A2A'; ctx.textAlign = 'left'
      ctx.fillText(p1.name.slice(0,8), 24, 30)
      ctx.fillStyle = '#5B3FDB'; ctx.textAlign = 'right'
      ctx.fillText(p2.name.slice(0,8), CW - 24, 30)
    }

    function drawGoal(ctx, g, color, netSide) {
      // Post
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#2D2D2D'
      ctx.lineWidth = 3
      ctx.fillRect(g.x, g.y, g.w, g.h)
      ctx.strokeRect(g.x, g.y, g.w, g.h)
      // Net lines
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'
      ctx.lineWidth = 1
      for (let i = 1; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(g.x, g.y + g.h * i / 5)
        ctx.lineTo(g.x + g.w, g.y + g.h * i / 5)
        ctx.stroke()
      }
      // Colour accent
      ctx.fillStyle = color
      ctx.globalAlpha = 0.25
      ctx.fillRect(g.x, g.y, g.w, g.h)
      ctx.globalAlpha = 1
    }

    function drawDog(ctx, p) {
      const cx = p.x + DOG_W / 2
      const cy = p.y + DOG_H / 2
      ctx.save()
      ctx.translate(cx, cy)

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.beginPath(); ctx.ellipse(0, DOG_H/2 + 4, DOG_W * 0.5, 6, 0, 0, Math.PI*2); ctx.fill()

      // Body
      ctx.fillStyle = p.color
      ctx.strokeStyle = '#2D2D2D'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.ellipse(0, 6, DOG_W * 0.38, DOG_H * 0.32, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()

      // Head
      ctx.beginPath(); ctx.arc(0, -DOG_H * 0.18, DOG_W * 0.38, 0, Math.PI*2); ctx.fill(); ctx.stroke()

      // Ears
      ctx.beginPath(); ctx.ellipse(-DOG_W*0.28, -DOG_H*0.42, 7, 11, -0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.ellipse( DOG_W*0.28, -DOG_H*0.42, 7, 11,  0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke()

      // Eyes
      ctx.fillStyle = '#2D2D2D'
      ctx.beginPath(); ctx.arc(-8, -DOG_H*0.22, 4, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc( 8, -DOG_H*0.22, 4, 0, Math.PI*2); ctx.fill()
      // Shine
      ctx.fillStyle = '#FFF'
      ctx.beginPath(); ctx.arc(-6, -DOG_H*0.25, 1.5, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(10, -DOG_H*0.25, 1.5, 0, Math.PI*2); ctx.fill()

      // Snout
      ctx.fillStyle = '#C4956A'
      ctx.beginPath(); ctx.ellipse(0, -DOG_H*0.08, 9, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#2D2D2D'
      ctx.beginPath(); ctx.arc(0, -DOG_H*0.12, 3, 0, Math.PI*2); ctx.fill()

      // Collar
      ctx.strokeStyle = p.color === '#C17A2A' ? '#5B3FDB' : '#C17A2A'
      ctx.lineWidth = 4
      ctx.beginPath(); ctx.arc(0, DOG_H*0.02, DOG_W*0.3, -2.4, -0.7); ctx.stroke()

      // Name
      ctx.fillStyle = '#F5EFE0'
      ctx.font = "7px 'Press Start 2P', monospace"
      ctx.textAlign = 'center'
      ctx.fillText(p.name.slice(0,6), 0, DOG_H * 0.52)

      ctx.restore()
    }

    // ── Loop ──────────────────────────────────────────
    let animId
    function loop(now) {
      animId = requestAnimationFrame(loop)
      if (gameOver) return
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      timeLeft -= delta
      goalFlash = Math.max(0, goalFlash - delta * 1.5)

      if (timeLeft <= 0) {
        timeLeft = 0; gameOver = true
        const winner = scores[0] >= scores[1] ? 0 : 1
        window.ANAGO_UI?.showResult(winner, [...scores])
        return
      }

      updateAI(delta)
      updatePlayer(p1, delta)
      updatePlayer(p2, delta)
      updateBall()
      draw()
    }
    animId = requestAnimationFrame(loop)

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('touchstart', onTap)
      canvas.removeEventListener('mousedown', onTap)
      window.removeEventListener('resize', onResize)
    }
  }, [config])

  return <canvas ref={ref} style={{ display: 'block', width: '100vw', height: '100vh', touchAction: 'none' }} />
}
