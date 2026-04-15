/**
 * Dog Football — 2D canvas game
 * Tap/drag to kick ball toward opponent's goal.
 * First to 5 goals wins. 90 second timer.
 */
import { useEffect, useRef } from 'react'

const W = () => window.innerWidth
const H = () => window.innerHeight

export default function FootballCanvas({ config }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    canvas.width  = W()
    canvas.height = H()

    // ── Game state ────────────────────────────────────
    const GOAL_W   = 12
    const GOAL_H   = canvas.height * 0.28
    const FLOOR_Y  = canvas.height - 80
    const BALL_R   = 18
    const DOG_R    = 26
    const WIN_GOALS = 5
    const GAME_TIME = 90

    let scores    = [0, 0]
    let timeLeft  = GAME_TIME
    let gameOver  = false
    let lastTime  = performance.now()

    // Ball
    const ball = {
      x: canvas.width / 2, y: FLOOR_Y - BALL_R,
      vx: 0, vy: 0,
      r: BALL_R,
    }

    // Players
    const p1 = { x: canvas.width * 0.2, y: FLOOR_Y - DOG_R, vx: 0, r: DOG_R, color: '#C17A2A', name: 'YOU',  side: 0 }
    const p2 = { x: canvas.width * 0.8, y: FLOOR_Y - DOG_R, vx: 0, r: DOG_R, color: '#5B3FDB', name: config?.mode === 'pvp' ? (config.opponent || 'P2') : 'AI', side: 1 }

    // Goals (left = p2 scores, right = p1 scores)
    const goalL = { x: 0,              y: FLOOR_Y - GOAL_H, w: GOAL_W, h: GOAL_H }
    const goalR = { x: canvas.width - GOAL_W, y: FLOOR_Y - GOAL_H, w: GOAL_W, h: GOAL_H }

    // Input
    let touchX = null
    let touchActive = false

    function onTouchStart(e) {
      e.preventDefault()
      const t = e.touches?.[0] || e
      touchX = t.clientX
      touchActive = true
    }
    function onTouchEnd(e) {
      e.preventDefault()
      if (!touchActive || touchX === null) return
      touchActive = false
      // Kick toward touch position
      const tx = touchX
      const dx = tx - p1.x
      const dist = Math.abs(dx)
      const power = Math.min(18, 6 + dist * 0.04)
      // If near ball, kick it
      const ballDist = Math.hypot(ball.x - p1.x, ball.y - p1.y)
      if (ballDist < DOG_R + BALL_R + 40) {
        const angle = Math.atan2(ball.y - p1.y, ball.x - p1.x)
        ball.vx = Math.cos(angle) * power * 1.4
        ball.vy = Math.sin(angle) * power - 4
      }
      // Move player toward tap
      p1.vx = dx > 0 ? 5 : -5
      setTimeout(() => { p1.vx = 0 }, 300)
      touchX = null
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false })
    canvas.addEventListener('mousedown',  onTouchStart)
    canvas.addEventListener('mouseup',    onTouchEnd)

    // ── AI ────────────────────────────────────────────
    let aiTimer = 0
    function updateAI(delta) {
      if (config?.mode !== 'ai') return
      aiTimer += delta
      if (aiTimer < 0.4) return
      aiTimer = 0

      const ballDist = Math.hypot(ball.x - p2.x, ball.y - p2.y)
      if (ballDist < DOG_R + BALL_R + 50) {
        // Kick toward p1's goal (left)
        const angle = Math.atan2(ball.y - p2.y, ball.x - p2.x)
        ball.vx = Math.cos(angle) * 12
        ball.vy = Math.sin(angle) * 12 - 3
      }
      // Chase ball
      const dx = ball.x - p2.x
      p2.x += Math.sign(dx) * Math.min(Math.abs(dx), 4)
      p2.x = Math.max(canvas.width * 0.5, Math.min(canvas.width - DOG_R, p2.x))
    }

    // ── Physics ───────────────────────────────────────
    const GRAVITY = 0.5
    const FRICTION = 0.92

    function updatePhysics(delta) {
      // Ball
      ball.vy += GRAVITY
      ball.x  += ball.vx
      ball.y  += ball.vy
      ball.vx *= FRICTION

      // Floor bounce
      if (ball.y + ball.r >= FLOOR_Y) {
        ball.y  = FLOOR_Y - ball.r
        ball.vy *= -0.55
        ball.vx *= 0.85
      }
      // Ceiling
      if (ball.y - ball.r <= 60) { ball.y = 60 + ball.r; ball.vy *= -0.5 }
      // Walls
      if (ball.x - ball.r <= GOAL_W) {
        // Check goal
        if (ball.y > goalL.y) {
          score(1); return
        }
        ball.x = GOAL_W + ball.r; ball.vx *= -0.6
      }
      if (ball.x + ball.r >= canvas.width - GOAL_W) {
        if (ball.y > goalR.y) {
          score(0); return
        }
        ball.x = canvas.width - GOAL_W - ball.r; ball.vx *= -0.6
      }

      // Player-ball collision
      for (const p of [p1, p2]) {
        const dx = ball.x - p.x
        const dy = ball.y - p.y
        const dist = Math.hypot(dx, dy)
        if (dist < DOG_R + BALL_R) {
          const nx = dx / dist
          const ny = dy / dist
          ball.vx = nx * 8
          ball.vy = ny * 8 - 2
        }
      }

      // Players
      for (const p of [p1, p2]) {
        p.x += p.vx
        p.x = Math.max(p.r, Math.min(canvas.width - p.r, p.x))
      }
    }

    function score(playerIdx) {
      scores[playerIdx]++
      window.ANAGO_UI?.updateScore(scores[0], scores[1])
      resetBall()
      if (scores[playerIdx] >= WIN_GOALS) {
        gameOver = true
        window.ANAGO_UI?.showResult(playerIdx === 0 ? 0 : 1, [...scores])
      }
    }

    function resetBall() {
      ball.x = canvas.width / 2
      ball.y = FLOOR_Y - BALL_R
      ball.vx = (Math.random() - 0.5) * 4
      ball.vy = -3
    }

    // ── Draw ──────────────────────────────────────────
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
      grad.addColorStop(0, '#5BB8F5')
      grad.addColorStop(1, '#B8E4FF')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Grass
      ctx.fillStyle = '#27AE60'
      ctx.fillRect(0, FLOOR_Y, canvas.width, canvas.height - FLOOR_Y)

      // Field lines
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(canvas.width / 2, FLOOR_Y)
      ctx.lineTo(canvas.width / 2, canvas.height)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(canvas.width / 2, FLOOR_Y, 50, Math.PI, 0)
      ctx.stroke()

      // Goals
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#2D2D2D'
      ctx.lineWidth = 3
      ctx.fillRect(goalL.x, goalL.y, goalL.w, goalL.h)
      ctx.strokeRect(goalL.x, goalL.y, goalL.w, goalL.h)
      ctx.fillRect(goalR.x, goalR.y, goalR.w, goalR.h)
      ctx.strokeRect(goalR.x, goalR.y, goalR.w, goalR.h)

      // Ball (football)
      ctx.save()
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
      ctx.fillStyle = '#F5EFE0'
      ctx.fill()
      ctx.strokeStyle = '#2D2D2D'
      ctx.lineWidth = 2.5
      ctx.stroke()
      // Pentagon pattern
      ctx.fillStyle = '#2D2D2D'
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.r * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Dogs
      drawDog(ctx, p1)
      drawDog(ctx, p2)

      // Timer
      ctx.fillStyle = '#2D2D2D'
      ctx.font = "bold 14px 'Press Start 2P', monospace"
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.ceil(timeLeft)}s`, canvas.width / 2, 50)
    }

    function drawDog(ctx, p) {
      ctx.save()
      // Body
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
      ctx.strokeStyle = '#2D2D2D'
      ctx.lineWidth = 3
      ctx.stroke()
      // Eyes
      ctx.fillStyle = '#2D2D2D'
      ctx.beginPath(); ctx.arc(p.x - 8, p.y - 6, 4, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(p.x + 8, p.y - 6, 4, 0, Math.PI * 2); ctx.fill()
      // Smile
      ctx.beginPath()
      ctx.arc(p.x, p.y + 2, 10, 0.2, Math.PI - 0.2)
      ctx.strokeStyle = '#2D2D2D'
      ctx.lineWidth = 2
      ctx.stroke()
      // Name
      ctx.fillStyle = '#F5EFE0'
      ctx.font = "7px 'Press Start 2P', monospace"
      ctx.textAlign = 'center'
      ctx.fillText(p.name.slice(0, 6), p.x, p.y + p.r + 14)
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
      if (timeLeft <= 0) {
        timeLeft = 0
        gameOver = true
        const winner = scores[0] >= scores[1] ? 0 : 1
        window.ANAGO_UI?.showResult(winner, [...scores])
        return
      }

      updateAI(delta)
      updatePhysics(delta)
      draw()
    }
    animId = requestAnimationFrame(loop)

    const onResize = () => {
      canvas.width  = W()
      canvas.height = H()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend',   onTouchEnd)
      canvas.removeEventListener('mousedown',  onTouchStart)
      canvas.removeEventListener('mouseup',    onTouchEnd)
      window.removeEventListener('resize', onResize)
    }
  }, [config])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh', touchAction: 'none' }} />
}
