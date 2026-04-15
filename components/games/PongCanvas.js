/**
 * Paw Pong — classic pong with dog paddles.
 * 3 lives each. Touch/drag to move paddle.
 */
import { useEffect, useRef } from 'react'

export default function PongCanvas({ config }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    const CW = canvas.width, CH = canvas.height
    const PAD_W = 18, PAD_H = CH * 0.18, PAD_SPEED = 7
    const BALL_R = 12

    let lives = [3, 3]
    let gameOver = false
    let lastTime = performance.now()

    const ball = { x: CW/2, y: CH/2, vx: 5 * (Math.random() > 0.5 ? 1 : -1), vy: 4 * (Math.random() > 0.5 ? 1 : -1) }
    const p1   = { x: 30,       y: CH/2 - PAD_H/2, vy: 0 }
    const p2   = { x: CW - 30 - PAD_W, y: CH/2 - PAD_H/2, vy: 0 }

    // Touch input for p1
    let touchY = null
    function onTouch(e) { e.preventDefault(); touchY = (e.touches?.[0] || e).clientY }
    canvas.addEventListener('touchmove',  onTouch, { passive: false })
    canvas.addEventListener('mousemove',  onTouch)

    function updateAI() {
      if (config?.mode !== 'ai') return
      const center = p2.y + PAD_H / 2
      if (center < ball.y - 10) p2.y += PAD_SPEED * 0.85
      else if (center > ball.y + 10) p2.y -= PAD_SPEED * 0.85
      p2.y = Math.max(0, Math.min(CH - PAD_H, p2.y))
    }

    function update() {
      // P1 follows touch
      if (touchY !== null) {
        const target = touchY - PAD_H / 2
        p1.y += (target - p1.y) * 0.2
        p1.y = Math.max(0, Math.min(CH - PAD_H, p1.y))
      }
      updateAI()

      ball.x += ball.vx
      ball.y += ball.vy

      // Top/bottom bounce
      if (ball.y - BALL_R <= 0)  { ball.y = BALL_R;       ball.vy *= -1 }
      if (ball.y + BALL_R >= CH) { ball.y = CH - BALL_R;  ball.vy *= -1 }

      // Paddle collisions
      if (ball.x - BALL_R <= p1.x + PAD_W && ball.y >= p1.y && ball.y <= p1.y + PAD_H && ball.vx < 0) {
        ball.vx = Math.abs(ball.vx) * 1.05
        ball.vy += (ball.y - (p1.y + PAD_H/2)) * 0.1
      }
      if (ball.x + BALL_R >= p2.x && ball.y >= p2.y && ball.y <= p2.y + PAD_H && ball.vx > 0) {
        ball.vx = -Math.abs(ball.vx) * 1.05
        ball.vy += (ball.y - (p2.y + PAD_H/2)) * 0.1
      }

      // Score
      if (ball.x < 0) {
        lives[1]--
        window.ANAGO_UI?.updateScore(lives[0], lives[1])
        resetBall(1)
        if (lives[1] <= 0) { gameOver = true; window.ANAGO_UI?.showResult(0, [...lives]) }
      }
      if (ball.x > CW) {
        lives[0]--
        window.ANAGO_UI?.updateScore(lives[0], lives[1])
        resetBall(-1)
        if (lives[0] <= 0) { gameOver = true; window.ANAGO_UI?.showResult(1, [...lives]) }
      }
    }

    function resetBall(dir) {
      ball.x = CW/2; ball.y = CH/2
      ball.vx = 5 * dir; ball.vy = 4 * (Math.random() > 0.5 ? 1 : -1)
    }

    function draw() {
      ctx.fillStyle = '#1E1540'
      ctx.fillRect(0, 0, CW, CH)

      // Stars background
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137 + 50) % CW
        const sy = (i * 97 + 30) % CH
        ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, Math.PI*2); ctx.fill()
      }

      // Centre line
      ctx.setLineDash([12, 8])
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(CW/2, 0); ctx.lineTo(CW/2, CH); ctx.stroke()
      ctx.setLineDash([])

      // Dog paddles — vertical dogs on each side
      drawPaddleDog(ctx, p1, '#C17A2A', PAD_W, PAD_H, 'left')
      drawPaddleDog(ctx, p2, '#5B3FDB', PAD_W, PAD_H, 'right')

      // Ball — basketball style
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI*2)
      ctx.fillStyle = '#C17A2A'
      ctx.fill()
      ctx.strokeStyle = '#2D2D2D'
      ctx.lineWidth = 2.5
      ctx.stroke()
      // Seam lines
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(ball.x - BALL_R, ball.y); ctx.lineTo(ball.x + BALL_R, ball.y); ctx.stroke()
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R * 0.6, 0.4, Math.PI - 0.4); ctx.stroke()
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R * 0.6, Math.PI + 0.4, -0.4); ctx.stroke()

      // Lives — heart icons
      ctx.font = "11px 'Press Start 2P', monospace"
      ctx.fillStyle = '#F5EFE0'
      ctx.textAlign = 'left'
      ctx.fillText('♥'.repeat(lives[0]), 60, 28)
      ctx.textAlign = 'right'
      ctx.fillText('♥'.repeat(lives[1]), CW - 60, 28)
    }

    // Draw a dog standing upright as a paddle
    function drawPaddleDog(ctx, p, color, pw, ph, side) {
      const cx = p.x + pw / 2
      const cy = p.y + ph / 2
      const scale = ph / 120   // scale dog to paddle height

      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(scale, scale)

      // Body
      ctx.fillStyle = color
      ctx.strokeStyle = '#2D2D2D'
      ctx.lineWidth = 3 / scale
      ctx.beginPath(); ctx.ellipse(0, 10, 22, 32, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()

      // Belly
      ctx.fillStyle = '#F5EFE0'
      ctx.beginPath(); ctx.ellipse(0, 14, 12, 18, 0, 0, Math.PI*2); ctx.fill()

      // Head
      ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(0, -28, 22, 0, Math.PI*2); ctx.fill(); ctx.stroke()

      // Tan markings on face
      ctx.fillStyle = '#C4956A'
      ctx.beginPath(); ctx.ellipse(6, -26, 8, 6, 0.3, 0, Math.PI*2); ctx.fill()

      // Ears
      ctx.fillStyle = color
      ctx.beginPath(); ctx.ellipse(-16, -44, 8, 13, -0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.ellipse( 16, -44, 8, 13,  0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      // Inner ear pink
      ctx.fillStyle = '#F4A0A0'
      ctx.beginPath(); ctx.ellipse(-15, -44, 4, 8, -0.3, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse( 15, -44, 4, 8,  0.3, 0, Math.PI*2); ctx.fill()

      // Eyes — closed happy arcs
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2.5 / scale; ctx.fillStyle = '#2D2D2D'
      ctx.beginPath(); ctx.arc(-9, -30, 5, Math.PI, 0); ctx.fill()
      ctx.beginPath(); ctx.arc( 9, -30, 5, Math.PI, 0); ctx.fill()

      // Snout
      ctx.fillStyle = '#C4956A'
      ctx.beginPath(); ctx.ellipse(0, -20, 10, 7, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#2D2D2D'
      ctx.beginPath(); ctx.arc(0, -23, 4, 0, Math.PI*2); ctx.fill()

      // Collar
      ctx.strokeStyle = side === 'left' ? '#5B3FDB' : '#C17A2A'
      ctx.lineWidth = 5 / scale
      ctx.beginPath(); ctx.arc(0, -6, 20, -2.2, -0.9); ctx.stroke()
      // Tag
      ctx.fillStyle = side === 'left' ? '#C17A2A' : '#5B3FDB'
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2 / scale
      ctx.beginPath(); ctx.arc(0, 6, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke()

      ctx.restore()
    }

    let animId
    function loop(now) {
      animId = requestAnimationFrame(loop)
      if (gameOver) return
      update()
      draw()
    }
    animId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('mousemove', onTouch)
    }
  }, [config])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh', touchAction: 'none' }} />
}
