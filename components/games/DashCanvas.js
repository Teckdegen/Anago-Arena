/**
 * Dog Dash — side-scrolling race. Both dogs run automatically.
 * Tap to jump over obstacles. First to finish line wins.
 * PVP: both on same screen, top/bottom lanes.
 */
import { useEffect, useRef } from 'react'

export default function DashCanvas({ config }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const CW = canvas.width, CH = canvas.height
    const isPVP = config?.mode === 'pvp'

    const FINISH   = 5000   // distance to finish
    const GRAVITY  = 0.7
    const JUMP_V   = -14
    const SPEED    = 220    // px/s
    const FLOOR_P1 = isPVP ? CH * 0.42 : CH * 0.72
    const FLOOR_P2 = isPVP ? CH * 0.82 : CH * 0.72

    let gameOver = false
    let lastTime = performance.now()

    const p1 = { dist: 0, y: FLOOR_P1, vy: 0, onGround: true, color: '#C17A2A', name: 'YOU',   dead: false }
    const p2 = { dist: 0, y: FLOOR_P2, vy: 0, onGround: true, color: '#5B3FDB', name: isPVP ? (config?.opponent || 'P2') : 'AI', dead: false }

    // Obstacles per lane (generated ahead)
    const obs1 = [], obs2 = []
    function genObs(arr, startDist) {
      let d = startDist
      while (d < FINISH - 200) {
        d += 300 + Math.random() * 400
        arr.push({ dist: d, w: 28 + Math.random() * 20, h: 32 + Math.random() * 24 })
      }
    }
    genObs(obs1, 400)
    genObs(obs2, 500)

    // Input — tap to jump p1
    function onTap(e) {
      e.preventDefault()
      if (p1.onGround && !p1.dead) { p1.vy = JUMP_V; p1.onGround = false }
    }
    canvas.addEventListener('touchstart', onTap, { passive: false })
    canvas.addEventListener('mousedown',  onTap)

    // AI jump
    let aiJumpCooldown = 0
    function updateAI(delta) {
      if (isPVP) return
      aiJumpCooldown -= delta
      // Look ahead for obstacles
      const nextObs = obs2.find(o => o.dist > p2.dist && o.dist - p2.dist < 180)
      if (nextObs && p2.onGround && aiJumpCooldown <= 0) {
        p2.vy = JUMP_V * 0.95
        p2.onGround = false
        aiJumpCooldown = 0.5
      }
    }

    function updatePlayer(p, floor, obs, delta) {
      if (p.dead) return
      p.dist += SPEED * delta
      p.vy   += GRAVITY
      p.y    += p.vy

      if (p.y >= floor) { p.y = floor; p.vy = 0; p.onGround = true }

      // Obstacle collision
      for (const o of obs) {
        const screenX = CW * 0.2 + (o.dist - p.dist)
        if (screenX > -o.w && screenX < 60 && p.y > floor - o.h - 10) {
          p.dead = true
          break
        }
      }

      // Finish
      if (p.dist >= FINISH && !gameOver) {
        gameOver = true
        const winner = p === p1 ? 0 : 1
        window.ANAGO_UI?.showResult(winner, [Math.round(p1.dist), Math.round(p2.dist)])
      }
    }

    function draw() {
      // Sky
      const grad = ctx.createLinearGradient(0, 0, 0, CH)
      grad.addColorStop(0, '#5BB8F5'); grad.addColorStop(1, '#B8E4FF')
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CW, CH)

      // Ground lines
      for (const [floor, col] of [[FLOOR_P1, '#27AE60'], [FLOOR_P2, '#1A6B3A']]) {
        ctx.fillStyle = col
        ctx.fillRect(0, floor, CW, CH - floor)
      }

      // Progress bar
      const prog1 = Math.min(1, p1.dist / FINISH)
      const prog2 = Math.min(1, p2.dist / FINISH)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(20, 10, CW - 40, 8)
      ctx.fillStyle = '#C17A2A'; ctx.fillRect(20, 10, (CW - 40) * prog1, 8)
      ctx.fillStyle = '#5B3FDB'; ctx.fillRect(20, 18, (CW - 40) * prog2, 8)

      // Finish line
      const finX1 = CW * 0.2 + (FINISH - p1.dist)
      const finX2 = CW * 0.2 + (FINISH - p2.dist)
      for (const [fx, floor] of [[finX1, FLOOR_P1], [finX2, FLOOR_P2]]) {
        if (fx > 0 && fx < CW) {
          ctx.strokeStyle = '#F0B429'; ctx.lineWidth = 4; ctx.setLineDash([8, 4])
          ctx.beginPath(); ctx.moveTo(fx, floor - 60); ctx.lineTo(fx, floor); ctx.stroke()
          ctx.setLineDash([])
        }
      }

      // Obstacles
      drawObs(ctx, obs1, p1.dist, FLOOR_P1, '#E05050')
      drawObs(ctx, obs2, p2.dist, FLOOR_P2, '#9A2020')

      // Dogs
      drawRunDog(ctx, CW * 0.2, p1.y, p1.color, p1.name, p1.dead)
      drawRunDog(ctx, CW * 0.2, p2.y, p2.color, p2.name, p2.dead)
    }

    function drawObs(ctx, obs, dist, floor, color) {
      for (const o of obs) {
        const sx = CW * 0.2 + (o.dist - dist)
        if (sx < -o.w || sx > CW + 20) continue
        ctx.fillStyle = color
        ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.roundRect(sx - o.w/2, floor - o.h, o.w, o.h, 4)
        ctx.fill(); ctx.stroke()
        // Fire hydrant style
        ctx.fillStyle = '#F5EFE0'
        ctx.beginPath(); ctx.roundRect(sx - o.w/2 + 4, floor - o.h - 8, o.w - 8, 8, 2)
        ctx.fill(); ctx.stroke()
      }
    }

    function drawRunDog(ctx, x, y, color, name, dead) {
      ctx.save()
      ctx.translate(x, y)
      if (dead) ctx.globalAlpha = 0.4
      ctx.fillStyle = color; ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.ellipse(0, -16, 18, 14, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      // Head
      ctx.beginPath(); ctx.arc(18, -22, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      // Eye
      ctx.fillStyle = '#2D2D2D'; ctx.beginPath(); ctx.arc(22, -24, 3, 0, Math.PI*2); ctx.fill()
      // Ear
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(14, -32, 5, 8, -0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      // Legs (running animation)
      const t = Date.now() / 120
      ctx.strokeStyle = color; ctx.lineWidth = 5
      ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-18 + Math.sin(t)*8, 10); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(  0, -4); ctx.lineTo(  8 + Math.sin(t+1)*8, 10); ctx.stroke()
      // Name
      ctx.fillStyle = '#F5EFE0'; ctx.font = "7px 'Press Start 2P', monospace"; ctx.textAlign = 'center'
      ctx.fillText(name.slice(0,6), 0, 10)
      ctx.restore()
    }

    let animId
    function loop(now) {
      animId = requestAnimationFrame(loop)
      if (gameOver) return
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      updateAI(delta)
      updatePlayer(p1, FLOOR_P1, obs1, delta)
      updatePlayer(p2, FLOOR_P2, obs2, delta)
      window.ANAGO_UI?.updateScore(Math.round(p1.dist), Math.round(p2.dist))
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
