/**
 * Fetch Wars — ball spawns at random spot. Both dogs race to it.
 * Whoever touches it first gets to throw it at opponent's goal.
 * First to 5 goals wins.
 */
import { useEffect, useRef } from 'react'

export default function FetchCanvas({ config }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const CW = canvas.width, CH = canvas.height
    const isPVP = config?.mode === 'pvp'

    const FLOOR   = CH - 80
    const DOG_R   = 24
    const BALL_R  = 14
    const GOAL_W  = 14
    const GOAL_H  = CH * 0.25
    const WIN     = 5
    const SPEED   = 180

    let scores  = [0, 0]
    let gameOver = false
    let lastTime = performance.now()
    let holder  = null   // null | 'p1' | 'p2'
    let throwTimer = 0

    const p1 = { x: CW * 0.2, y: FLOOR, color: '#C17A2A', name: 'YOU' }
    const p2 = { x: CW * 0.8, y: FLOOR, color: '#5B3FDB', name: isPVP ? (config?.opponent || 'P2') : 'AI' }

    const ball = { x: CW / 2, y: FLOOR - BALL_R, vx: 0, vy: 0, flying: false }

    const goalL = { x: 0,              y: FLOOR - GOAL_H }
    const goalR = { x: CW - GOAL_W,    y: FLOOR - GOAL_H }

    function spawnBall() {
      ball.x = CW * 0.3 + Math.random() * CW * 0.4
      ball.y = FLOOR - BALL_R
      ball.vx = 0; ball.vy = 0; ball.flying = false
      holder = null
    }

    // Input — tap to move toward ball or throw
    function onTap(e) {
      e.preventDefault()
      const tx = (e.touches?.[0] || e).clientX
      if (holder === 'p1') {
        // Throw toward opponent's goal (right)
        const angle = Math.atan2(goalR.y + GOAL_H/2 - p1.y, goalR.x - p1.x)
        ball.vx = Math.cos(angle) * 14
        ball.vy = Math.sin(angle) * 14 - 5
        ball.flying = true
        holder = null
      } else if (!holder) {
        // Move toward ball
        p1.x += tx < p1.x ? -70 : 70
        p1.x = Math.max(DOG_R, Math.min(CW - DOG_R, p1.x))
      }
    }
    canvas.addEventListener('touchstart', onTap, { passive: false })
    canvas.addEventListener('mousedown',  onTap)

    // AI
    let aiTimer = 0
    function updateAI(delta) {
      if (isPVP) return
      aiTimer += delta
      if (aiTimer < 0.3) return
      aiTimer = 0

      if (holder === 'p2') {
        // Throw toward p1's goal (left)
        const angle = Math.atan2(goalL.y + GOAL_H/2 - p2.y, goalL.x - p2.x)
        ball.vx = Math.cos(angle) * 13
        ball.vy = Math.sin(angle) * 13 - 4
        ball.flying = true
        holder = null
      } else if (!holder) {
        // Chase ball
        const dx = ball.x - p2.x
        p2.x += Math.sign(dx) * Math.min(Math.abs(dx), 5)
        p2.x = Math.max(DOG_R, Math.min(CW - DOG_R, p2.x))
      }
    }

    function update(delta) {
      updateAI(delta)

      if (ball.flying) {
        ball.vy += 0.4
        ball.x  += ball.vx
        ball.y  += ball.vy
        ball.vx *= 0.99

        // Floor
        if (ball.y + BALL_R >= FLOOR) { ball.y = FLOOR - BALL_R; ball.vy *= -0.4; ball.vx *= 0.8 }
        if (Math.abs(ball.vy) < 0.5 && ball.y >= FLOOR - BALL_R - 2) { ball.flying = false }

        // Goal check
        if (ball.x - BALL_R <= GOAL_W && ball.y > goalL.y) {
          scores[1]++; window.ANAGO_UI?.updateScore(scores[0], scores[1])
          if (scores[1] >= WIN) { gameOver = true; window.ANAGO_UI?.showResult(1, [...scores]); return }
          spawnBall()
        }
        if (ball.x + BALL_R >= goalR.x && ball.y > goalR.y) {
          scores[0]++; window.ANAGO_UI?.updateScore(scores[0], scores[1])
          if (scores[0] >= WIN) { gameOver = true; window.ANAGO_UI?.showResult(0, [...scores]); return }
          spawnBall()
        }

        // Wall bounce
        if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx *= -0.6 }
        if (ball.x > CW - BALL_R) { ball.x = CW - BALL_R; ball.vx *= -0.6 }
      }

      // Pick up ball
      if (!holder && !ball.flying) {
        if (Math.hypot(ball.x - p1.x, ball.y - p1.y) < DOG_R + BALL_R) holder = 'p1'
        if (Math.hypot(ball.x - p2.x, ball.y - p2.y) < DOG_R + BALL_R) holder = 'p2'
      }

      // Ball follows holder
      if (holder === 'p1') { ball.x = p1.x + DOG_R; ball.y = p1.y - DOG_R }
      if (holder === 'p2') { ball.x = p2.x - DOG_R; ball.y = p2.y - DOG_R }
    }

    function draw() {
      const grad = ctx.createLinearGradient(0, 0, 0, CH)
      grad.addColorStop(0, '#5BB8F5'); grad.addColorStop(1, '#B8E4FF')
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CW, CH)

      ctx.fillStyle = '#27AE60'; ctx.fillRect(0, FLOOR, CW, CH - FLOOR)

      // Goals
      for (const [g, col] of [[goalL, '#C17A2A'], [goalR, '#5B3FDB']]) {
        ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 3
        ctx.fillRect(g.x, g.y, GOAL_W, GOAL_H); ctx.strokeRect(g.x, g.y, GOAL_W, GOAL_H)
        // Net lines
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1
        for (let i = 1; i < 4; i++) {
          ctx.beginPath(); ctx.moveTo(g.x, g.y + GOAL_H * i/4); ctx.lineTo(g.x + GOAL_W, g.y + GOAL_H * i/4); ctx.stroke()
        }
      }

      // Ball
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI*2)
      ctx.fillStyle = '#F0B429'; ctx.fill()
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2.5; ctx.stroke()
      // Tennis ball lines
      ctx.strokeStyle = '#C17A2A'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R * 0.6, 0.5, Math.PI - 0.5); ctx.stroke()
      ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R * 0.6, Math.PI + 0.5, -0.5); ctx.stroke()

      // Dogs
      drawDog(ctx, p1, holder === 'p1')
      drawDog(ctx, p2, holder === 'p2')

      // Score
      ctx.fillStyle = '#2D2D2D'; ctx.font = "bold 14px 'Press Start 2P', monospace"; ctx.textAlign = 'center'
      ctx.fillText(`${scores[0]} – ${scores[1]}`, CW/2, 44)
    }

    function drawDog(ctx, p, hasBall) {
      ctx.save(); ctx.translate(p.x, p.y)
      ctx.beginPath(); ctx.arc(0, -DOG_R, DOG_R, 0, Math.PI*2)
      ctx.fillStyle = hasBall ? '#F0B429' : p.color; ctx.fill()
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 3; ctx.stroke()
      ctx.fillStyle = '#2D2D2D'
      ctx.beginPath(); ctx.arc(-7, -DOG_R - 4, 3.5, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc( 7, -DOG_R - 4, 3.5, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#F5EFE0'; ctx.font = "7px 'Press Start 2P', monospace"; ctx.textAlign = 'center'
      ctx.fillText(p.name.slice(0,6), 0, 14)
      ctx.restore()
    }

    let animId
    function loop(now) {
      animId = requestAnimationFrame(loop)
      if (gameOver) return
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      update(delta)
      draw()
    }
    animId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('touchstart', onTap)
      canvas.removeEventListener('mousedown', onTap)
    }
  }, [config])

  return <canvas ref={ref} style={{ display: 'block', width: '100vw', height: '100vh', touchAction: 'none' }} />
}
