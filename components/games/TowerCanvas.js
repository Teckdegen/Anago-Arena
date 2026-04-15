/**
 * Bark Tower — tap to drop the swinging block onto the stack.
 * Perfect drop = bonus. Miss = game over. Most blocks wins.
 * PVP: split screen, each builds their own tower.
 */
import { useEffect, useRef } from 'react'

export default function TowerCanvas({ config }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const CW = canvas.width, CH = canvas.height
    const isPVP = config?.mode === 'pvp'

    // Each player has their own tower state
    function makeTower(cx) {
      const BLOCK_H = 30
      // Base is 85% of lane width — very wide so you can stack many blocks
      const laneW   = isPVP ? CW * 0.46 : CW * 0.82
      const BASE_W  = Math.floor(laneW * 0.85)
      return {
        cx,
        blocks: [{ x: cx - BASE_W / 2, w: BASE_W, y: CH - 70 }],
        swinger: { x: cx - BASE_W * 0.35, w: BASE_W, dir: 1, speed: 100 },
        score: 0,
        dead: false,
        BLOCK_H,
        BASE_W,
        laneW,
      }
    }

    const t1 = makeTower(isPVP ? CW * 0.27 : CW / 2)
    const t2 = isPVP ? makeTower(CW * 0.73) : null

    let gameOver = false
    let lastTime = performance.now()

    function dropBlock(tower) {
      if (tower.dead || gameOver) return
      const top   = tower.blocks[tower.blocks.length - 1]
      const sw    = tower.swinger
      const topY  = top.y - tower.BLOCK_H

      // Overlap with block below
      const left  = Math.max(sw.x, top.x)
      const right = Math.min(sw.x + sw.w, top.x + top.w)
      const overlap = right - left

      if (overlap <= 0) {
        // Missed — game over for this tower
        tower.dead = true
        checkEnd()
        return
      }

      // Perfect bonus
      const perfect = Math.abs(overlap - top.w) < 6
      const newW = perfect ? top.w : overlap
      const newX = perfect ? top.x : left

      tower.blocks.push({ x: newX, w: newW, y: topY })
      tower.swinger.x = newX - newW * 0.3
      tower.swinger.w = newW
      tower.score++
      window.ANAGO_UI?.updateScore(t1.score, t2?.score || 0)

      // Scroll tower up
      if (tower.blocks.length > 10) {
        const shift = tower.BLOCK_H
        tower.blocks.forEach(b => b.y += shift)
      }
    }

    function checkEnd() {
      if (gameOver) return
      if (isPVP) {
        if (t1.dead && t2?.dead) {
          gameOver = true
          const winner = t1.score >= (t2?.score || 0) ? 0 : 1
          window.ANAGO_UI?.showResult(winner, [t1.score, t2?.score || 0])
        } else if (t1.dead) {
          gameOver = true; window.ANAGO_UI?.showResult(1, [t1.score, t2?.score || 0])
        } else if (t2?.dead) {
          gameOver = true; window.ANAGO_UI?.showResult(0, [t1.score, t2?.score || 0])
        }
      } else {
        gameOver = true
        window.ANAGO_UI?.showResult(t1.score > (t2?.score || 0) ? 0 : 1, [t1.score, t2?.score || 0])
      }
    }

    // AI drops at semi-random good timing
    let aiTimer = 0
    function updateAI(delta) {
      if (isPVP || !t2 || t2.dead) return
      aiTimer += delta
      const interval = 0.9 + Math.random() * 0.4
      if (aiTimer > interval) {
        aiTimer = 0
        dropBlock(t2)
      }
    }

    // Input
    function onTap(e) {
      e.preventDefault()
      const tx = (e.touches?.[0] || e).clientX
      if (!isPVP) {
        dropBlock(t1)
      } else {
        if (tx < CW / 2) dropBlock(t1)
        else if (t2) dropBlock(t2)
      }
    }
    canvas.addEventListener('touchstart', onTap, { passive: false })
    canvas.addEventListener('mousedown',  onTap)

    const COLORS = ['#C17A2A','#5B3FDB','#E8A020','#27AE60','#E05050','#F4A0A0','#76D7C4','#F0B429']

    function updateTower(tower, delta) {
      if (tower.dead) return
      tower.swinger.x += tower.swinger.dir * tower.swinger.speed * delta
      const halfLane = tower.laneW * 0.5
      if (tower.swinger.x + tower.swinger.w > tower.cx + halfLane - 4) tower.swinger.dir = -1
      if (tower.swinger.x < tower.cx - halfLane + 4) tower.swinger.dir = 1
    }

    function drawTower(tower, label) {
      const laneW = isPVP ? CW / 2 : CW
      const laneX = isPVP ? (label === 'YOU' ? 0 : CW / 2) : 0

      // Lane bg
      ctx.fillStyle = 'rgba(42,30,110,0.3)'
      ctx.fillRect(laneX, 0, laneW, CH)

      // Blocks
      tower.blocks.forEach((b, i) => {
        const col = COLORS[i % COLORS.length]
        ctx.fillStyle = tower.dead ? '#555' : col
        ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, tower.BLOCK_H, 4)
        ctx.fill(); ctx.stroke()
        // Paw print on block
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.beginPath(); ctx.arc(b.x + b.w/2, b.y + tower.BLOCK_H/2, 5, 0, Math.PI*2); ctx.fill()
      })

      // Swinger
      if (!tower.dead) {
        const sw = tower.swinger
        const topY = tower.blocks[tower.blocks.length - 1].y - tower.BLOCK_H
        ctx.fillStyle = '#F0B429'
        ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.roundRect(sw.x, topY - tower.BLOCK_H - 8, sw.w, tower.BLOCK_H, 4)
        ctx.fill(); ctx.stroke()
        // Arrow indicator
        ctx.fillStyle = '#2D2D2D'; ctx.font = "10px sans-serif"; ctx.textAlign = 'center'
        ctx.fillText('▼', sw.x + sw.w/2, topY - tower.BLOCK_H + 2)
      }

      // Score + label
      ctx.fillStyle = '#F5EFE0'; ctx.font = "bold 11px 'Press Start 2P', monospace"; ctx.textAlign = 'center'
      ctx.fillText(`${label}: ${tower.score}`, tower.cx, 50)

      if (tower.dead) {
        ctx.fillStyle = 'rgba(224,80,80,0.6)'; ctx.fillRect(laneX, 0, laneW, CH)
        ctx.fillStyle = '#F5EFE0'; ctx.font = "bold 16px 'Press Start 2P', monospace"; ctx.textAlign = 'center'
        ctx.fillText('FELL!', tower.cx, CH / 2)
      }
    }

    let animId
    function loop(now) {
      animId = requestAnimationFrame(loop)
      if (gameOver) return
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      updateTower(t1, delta)
      if (t2) updateTower(t2, delta)
      updateAI(delta)

      // Sky
      const grad = ctx.createLinearGradient(0, 0, 0, CH)
      grad.addColorStop(0, '#1E1540'); grad.addColorStop(1, '#2A1E6E')
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CW, CH)

      if (isPVP) {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2; ctx.setLineDash([8,6])
        ctx.beginPath(); ctx.moveTo(CW/2, 0); ctx.lineTo(CW/2, CH); ctx.stroke()
        ctx.setLineDash([])
      }

      drawTower(t1, 'YOU')
      if (t2) drawTower(t2, isPVP ? (config?.opponent || 'P2') : 'AI')
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
