/**
 * Bone Catch — bones fall from sky, tap left/right to move dog and catch them.
 * Golden bone = 3x points. Rotten bone = -5 pts. 60 seconds. Most points wins.
 * PVP: both dogs on same screen, split halves.
 */
import { useEffect, useRef } from 'react'

export default function CatchCanvas({ config }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const CW = canvas.width, CH = canvas.height

    const GAME_TIME = 60
    const DOG_W = 52, DOG_H = 52
    const BONE_W = 28, BONE_H = 14
    const FLOOR  = CH - 80
    const isPVP  = config?.mode === 'pvp'

    let timeLeft = GAME_TIME
    let scores   = [0, 0]
    let gameOver = false
    let lastTime = performance.now()
    let spawnTimer = 0

    // Players
    const p1 = { x: isPVP ? CW * 0.25 : CW / 2, y: FLOOR, color: '#C17A2A', name: 'YOU',  score: 0 }
    const p2 = isPVP ? { x: CW * 0.75, y: FLOOR, color: '#5B3FDB', name: config?.opponent || 'P2', score: 0 } : null

    // Bones array
    const bones = []

    function spawnBone() {
      const roll = Math.random()
      const type = roll < 0.12 ? 'golden' : roll < 0.22 ? 'rotten' : 'normal'
      const x = isPVP
        ? (Math.random() < 0.5 ? CW * 0.1 + Math.random() * CW * 0.35 : CW * 0.55 + Math.random() * CW * 0.35)
        : 40 + Math.random() * (CW - 80)
      bones.push({ x, y: -20, vy: 2.5 + Math.random() * 2, type, owner: x < CW / 2 ? 0 : 1 })
    }

    // Input — tap left/right of screen to move
    function onTap(e) {
      e.preventDefault()
      const tx = (e.touches?.[0] || e).clientX
      if (!isPVP) {
        p1.x += tx < CW / 2 ? -60 : 60
        p1.x = Math.max(DOG_W / 2, Math.min(CW - DOG_W / 2, p1.x))
      } else {
        // Left half = p1, right half = p2 (local only — PVP simplified)
        if (tx < CW / 2) {
          p1.x += tx < CW * 0.25 ? -60 : 60
          p1.x = Math.max(DOG_W / 2, Math.min(CW / 2 - DOG_W / 2, p1.x))
        }
      }
    }
    canvas.addEventListener('touchstart', onTap, { passive: false })
    canvas.addEventListener('mousedown',  onTap)

    // AI for p2 in AI mode
    function updateAI() {
      if (isPVP) return
      // Find nearest bone
      let nearest = null, minDist = Infinity
      for (const b of bones) {
        const d = Math.abs(b.x - p2?.x || 0)
        if (d < minDist) { minDist = d; nearest = b }
      }
      if (nearest && p2) {
        p2.x += (nearest.x - p2.x) * 0.06
        p2.x = Math.max(DOG_W / 2, Math.min(CW - DOG_W / 2, p2.x))
      }
    }

    function update(delta) {
      timeLeft -= delta
      if (timeLeft <= 0) {
        timeLeft = 0
        gameOver = true
        const winner = scores[0] >= scores[1] ? 0 : 1
        window.ANAGO_UI?.showResult(winner, [...scores])
        return
      }

      spawnTimer += delta
      if (spawnTimer > 0.8) { spawnBone(); spawnTimer = 0 }

      updateAI()

      for (let i = bones.length - 1; i >= 0; i--) {
        const b = bones[i]
        b.y += b.vy

        // Check catch
        const players = [p1, ...(p2 ? [p2] : [])]
        let caught = false
        for (let pi = 0; pi < players.length; pi++) {
          const p = players[pi]
          if (Math.abs(b.x - p.x) < DOG_W * 0.7 && Math.abs(b.y - p.y) < DOG_H * 0.7) {
            const pts = b.type === 'golden' ? 15 : b.type === 'rotten' ? -5 : 5
            scores[pi] = Math.max(0, scores[pi] + pts)
            window.ANAGO_UI?.updateScore(scores[0], scores[1])
            bones.splice(i, 1)
            caught = true
            break
          }
        }
        if (!caught && b.y > CH + 20) bones.splice(i, 1)
      }
    }

    function draw() {
      // Sky
      const grad = ctx.createLinearGradient(0, 0, 0, CH)
      grad.addColorStop(0, '#5BB8F5')
      grad.addColorStop(0.7, '#B8E4FF')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CW, CH)

      // Ground
      ctx.fillStyle = '#27AE60'
      ctx.fillRect(0, FLOOR + DOG_H / 2, CW, CH)

      // PVP divider
      if (isPVP) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'
        ctx.setLineDash([10, 6])
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(CW / 2, 0); ctx.lineTo(CW / 2, CH); ctx.stroke()
        ctx.setLineDash([])
      }

      // Bones
      for (const b of bones) {
        ctx.save()
        ctx.translate(b.x, b.y)
        if (b.type === 'golden') ctx.fillStyle = '#F0B429'
        else if (b.type === 'rotten') ctx.fillStyle = '#5D4037'
        else ctx.fillStyle = '#F5EFE0'
        ctx.strokeStyle = '#2D2D2D'
        ctx.lineWidth = 2
        // Bone shape
        ctx.beginPath(); ctx.roundRect(-BONE_W/2, -BONE_H/2, BONE_W, BONE_H, 4); ctx.fill(); ctx.stroke()
        ctx.beginPath(); ctx.arc(-BONE_W/2, -BONE_H/2, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke()
        ctx.beginPath(); ctx.arc(-BONE_W/2,  BONE_H/2, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke()
        ctx.beginPath(); ctx.arc( BONE_W/2, -BONE_H/2, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke()
        ctx.beginPath(); ctx.arc( BONE_W/2,  BONE_H/2, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke()
        if (b.type === 'golden') {
          ctx.fillStyle = '#2D2D2D'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
          ctx.fillText('3x', 0, 4)
        }
        ctx.restore()
      }

      // Dogs
      drawDog(ctx, p1, scores[0])
      if (p2) drawDog(ctx, p2, scores[1])

      // Timer
      ctx.fillStyle = '#2D2D2D'
      ctx.font = "bold 13px 'Press Start 2P', monospace"
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.ceil(timeLeft)}s`, CW / 2, 44)
    }

    function drawDog(ctx, p, score) {
      const R = DOG_W / 2
      ctx.save()
      ctx.translate(p.x, p.y - R)  // anchor at feet

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath(); ctx.ellipse(0, R * 2 + 4, R * 0.8, 5, 0, 0, Math.PI*2); ctx.fill()

      // Body
      ctx.fillStyle = p.color
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.ellipse(0, R * 0.9, R * 0.65, R * 0.75, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()

      // Belly
      ctx.fillStyle = '#F5EFE0'
      ctx.beginPath(); ctx.ellipse(0, R * 1.0, R * 0.35, R * 0.45, 0, 0, Math.PI*2); ctx.fill()

      // Head
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(0, -R * 0.1, R * 0.72, 0, Math.PI*2); ctx.fill(); ctx.stroke()

      // Tan face marking
      ctx.fillStyle = '#C4956A'
      ctx.beginPath(); ctx.ellipse(R * 0.22, -R * 0.05, R * 0.28, R * 0.22, 0.3, 0, Math.PI*2); ctx.fill()

      // Ears
      ctx.fillStyle = p.color
      ctx.beginPath(); ctx.ellipse(-R * 0.55, -R * 0.55, R * 0.22, R * 0.38, -0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.ellipse( R * 0.55, -R * 0.55, R * 0.22, R * 0.38,  0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#F4A0A0'
      ctx.beginPath(); ctx.ellipse(-R * 0.53, -R * 0.55, R * 0.12, R * 0.22, -0.3, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse( R * 0.53, -R * 0.55, R * 0.12, R * 0.22,  0.3, 0, Math.PI*2); ctx.fill()

      // Eyes — closed happy
      ctx.fillStyle = '#2D2D2D'
      ctx.beginPath(); ctx.arc(-R * 0.28, -R * 0.18, R * 0.14, Math.PI, 0); ctx.fill()
      ctx.beginPath(); ctx.arc( R * 0.28, -R * 0.18, R * 0.14, Math.PI, 0); ctx.fill()

      // Snout
      ctx.fillStyle = '#C4956A'
      ctx.beginPath(); ctx.ellipse(0, R * 0.08, R * 0.3, R * 0.2, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#2D2D2D'
      ctx.beginPath(); ctx.arc(0, R * 0.02, R * 0.12, 0, Math.PI*2); ctx.fill()

      // Collar
      ctx.strokeStyle = p.color === '#C17A2A' ? '#5B3FDB' : '#C17A2A'
      ctx.lineWidth = 3.5
      ctx.beginPath(); ctx.arc(0, R * 0.38, R * 0.6, -2.3, -0.8); ctx.stroke()

      // Arms holding out (catching pose)
      ctx.strokeStyle = p.color; ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(-R * 0.55, R * 0.7); ctx.lineTo(-R * 1.1, R * 0.4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo( R * 0.55, R * 0.7); ctx.lineTo( R * 1.1, R * 0.4); ctx.stroke()
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(-R * 0.55, R * 0.7); ctx.lineTo(-R * 1.1, R * 0.4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo( R * 0.55, R * 0.7); ctx.lineTo( R * 1.1, R * 0.4); ctx.stroke()

      // Name + score label
      ctx.fillStyle = 'rgba(30,21,64,0.8)'
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.roundRect(-R * 1.1, R * 2.1, R * 2.2, R * 0.7, 4); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#F5EFE0'
      ctx.font = `bold ${Math.max(7, R * 0.28)}px 'Press Start 2P', monospace`
      ctx.textAlign = 'center'
      ctx.fillText(`${p.name.slice(0,6)}: ${score}`, 0, R * 2.6)

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
