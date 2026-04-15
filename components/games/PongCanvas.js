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

      // Centre line
      ctx.setLineDash([12, 8])
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(CW/2, 0); ctx.lineTo(CW/2, CH); ctx.stroke()
      ctx.setLineDash([])

      // Paddles (dog-shaped)
      for (const [p, col] of [[p1, '#C17A2A'], [p2, '#5B3FDB']]) {
        ctx.fillStyle = col
        ctx.strokeStyle = '#2D2D2D'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(p.x, p.y, PAD_W, PAD_H, 8)
        ctx.fill(); ctx.stroke()
        // Paw print
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.beginPath(); ctx.arc(p.x + PAD_W/2, p.y + PAD_H/2, 5, 0, Math.PI*2); ctx.fill()
      }

      // Ball
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI*2)
      ctx.fillStyle = '#F0B429'
      ctx.fill()
      ctx.strokeStyle = '#2D2D2D'
      ctx.lineWidth = 2.5
      ctx.stroke()

      // Lives
      ctx.font = "12px 'Press Start 2P', monospace"
      ctx.fillStyle = '#F5EFE0'
      ctx.textAlign = 'left'
      ctx.fillText('❤️'.repeat(lives[0]), 20, 30)
      ctx.textAlign = 'right'
      ctx.fillText('❤️'.repeat(lives[1]), CW - 20, 30)
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
