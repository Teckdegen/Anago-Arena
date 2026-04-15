/**
 * Dog Tennis — perspective top-down court like Roland Garros mobile
 * ← → move, ↑ lob, A = swing/smash
 * Tennis scoring: 0-15-30-40-Game, first to 6 games wins set, best of 3 sets
 */
import { useEffect, useRef } from 'react'

const GRAVITY   = 0.38
const MOVE_SPD  = 4.2
const AI_SPEED  = 3.8
const BALL_R    = 10
const DOG_R     = 24
const NET_Y_PCT = 0.52   // net position as fraction of canvas height

export default function TennisCanvas({ config }) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const CW = canvas.width, CH = canvas.height

    const NET_Y    = CH * NET_Y_PCT
    const FLOOR_P1 = CH - 90    // player 1 baseline (bottom)
    const FLOOR_P2 = 80         // player 2 baseline (top)
    const LEFT_W   = CW * 0.08  // court left margin
    const RIGHT_W  = CW * 0.08  // court right margin
    const COURT_L  = LEFT_W
    const COURT_R  = CW - RIGHT_W

    const isPVP = config?.mode === 'pvp'

    // ── Tennis scoring ────────────────────────────────────────────────────────
    const PTS = ['0', '15', '30', '40']
    let pts = [0, 0]   // 0-3 = 0,15,30,40
    let games = [0, 0]
    let sets  = [0, 0]
    let serving = 0    // 0 = p1 serves, 1 = p2 serves
    let rallyActive = false
    let gameOver = false

    function awardPoint(winner) {
      pts[winner]++
      // Deuce / advantage
      if (pts[0] >= 3 && pts[1] >= 3) {
        if (pts[winner] - pts[1 - winner] >= 2) {
          // Game won
          awardGame(winner)
        }
        // else deuce/advantage continues
      } else if (pts[winner] >= 4) {
        awardGame(winner)
      }
      window.ANAGO_UI?.updateScore(sets[0], sets[1])
      showFlash(winner === 0 ? 'POINT!' : 'POINT!', 1.2)
      resetRally()
    }

    function awardGame(winner) {
      games[winner]++
      pts = [0, 0]
      serving = 1 - serving
      showFlash('GAME!', 2.0)
      if (games[winner] >= 6 && games[winner] - games[1-winner] >= 2) {
        sets[winner]++
        games = [0, 0]
        showFlash('SET!', 2.5)
        if (sets[winner] >= 2) {
          gameOver = true
          window.ANAGO_UI?.showResult(winner, [...sets])
        }
      }
    }

    // ── Players ───────────────────────────────────────────────────────────────
    const p1 = {
      x: CW/2, y: FLOOR_P1 - DOG_R,
      vx: 0, color: '#C17A2A', name: 'YOU',
      swinging: false, swingTimer: 0, lob: false,
    }
    const p2 = {
      x: CW/2, y: FLOOR_P2 + DOG_R,
      vx: 0, color: '#5B3FDB', name: isPVP ? (config?.opponent || 'P2') : 'AI',
      swinging: false, swingTimer: 0, lob: false,
    }

    // ── Ball (3D-ish: x, y=screen, z=height, vz=vertical vel) ─────────────────
    const ball = {
      x: CW/2, y: NET_Y - 40,
      vx: 0, vy: 0,
      z: 0,    // height above court
      vz: 0,   // vertical velocity
      inPlay: false,
      lastHitBy: -1,
      bounces: 0,
    }

    let lastTime = performance.now()
    let flash = { msg: '', alpha: 0 }
    function showFlash(msg, dur) { flash.msg = msg; flash.alpha = dur }

    // ── Input ─────────────────────────────────────────────────────────────────
    const keys = { left: false, right: false, up: false, a: false }
    const BTN = {}
    const activeTouches = {}

    function getPos(e) {
      const r = canvas.getBoundingClientRect()
      const s = e.touches ? e.touches[0] : e
      return { x: (s.clientX-r.left)*(CW/r.width), y: (s.clientY-r.top)*(CH/r.height) }
    }
    function inBtn(pos, k) {
      const b = BTN[k]; if (!b) return false
      return pos.x >= b.x && pos.x <= b.x+b.w && pos.y >= b.y && pos.y <= b.y+b.h
    }

    function onTouchStart(e) {
      e.preventDefault()
      for (const t of e.changedTouches) {
        const r = canvas.getBoundingClientRect()
        const pos = { x: (t.clientX-r.left)*(CW/r.width), y: (t.clientY-r.top)*(CH/r.height) }
        for (const k of ['left','right','up','a']) {
          if (inBtn(pos, k)) { keys[k] = true; activeTouches[t.identifier] = k }
        }
      }
    }
    function onTouchEnd(e) {
      e.preventDefault()
      for (const t of e.changedTouches) {
        const k = activeTouches[t.identifier]
        if (k) { keys[k] = false; delete activeTouches[t.identifier] }
      }
    }
    function onKeyDown(e) {
      if (e.key==='ArrowLeft')  keys.left=true
      if (e.key==='ArrowRight') keys.right=true
      if (e.key==='ArrowUp')    keys.up=true
      if (e.key==='a'||e.key==='A') keys.a=true
    }
    function onKeyUp(e) {
      if (e.key==='ArrowLeft')  keys.left=false
      if (e.key==='ArrowRight') keys.right=false
      if (e.key==='ArrowUp')    keys.up=false
      if (e.key==='a'||e.key==='A') keys.a=false
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    // ── Serve ─────────────────────────────────────────────────────────────────
    function serve() {
      rallyActive = true
      ball.x = serving === 0 ? p1.x : p2.x
      ball.y = serving === 0 ? p1.y - DOG_R - 5 : p2.y + DOG_R + 5
      ball.z = 0
      ball.vx = (Math.random()-0.5) * 3
      ball.vy = serving === 0 ? -5 : 5
      ball.vz = 8
      ball.lastHitBy = serving
      ball.bounces = 0
      ball.inPlay = true
    }

    // ── AI ────────────────────────────────────────────────────────────────────
    let aiTimer = 0
    function updateAI(delta) {
      if (isPVP) return
      aiTimer += delta
      if (aiTimer < 0.1) return; aiTimer = 0

      // Move toward ball X
      const dx = ball.x - p2.x
      if (Math.abs(dx) > 6) p2.vx = Math.sign(dx) * AI_SPEED
      else p2.vx = 0

      // Swing when ball is near
      const ballNear = Math.abs(ball.x - p2.x) < 60 && Math.abs(ball.y - p2.y) < 60 && ball.z < 40
      if (ballNear && ball.vy > 0 && !p2.swinging) {
        p2.swinging = true; p2.swingTimer = 0.2
        hitBall(p2, false)
      }
    }

    // ── Hit ball ──────────────────────────────────────────────────────────────
    function hitBall(player, isLob) {
      const isP1 = player === p1
      const targetX = isP1 ? p2.x + (Math.random()-0.5)*80 : p1.x + (Math.random()-0.5)*80
      const dx = targetX - ball.x
      const dist = Math.abs(ball.y - (isP1 ? FLOOR_P2 : FLOOR_P1))
      const speed = isLob ? 4 : 7
      const [nx] = [dx / (Math.abs(dx)||1)]
      ball.vx = nx * speed * 0.8 + (Math.random()-0.5)*1.5
      ball.vy = isP1 ? -speed : speed
      ball.vz = isLob ? 14 : 6
      ball.lastHitBy = isP1 ? 0 : 1
      ball.bounces = 0
    }

    // ── Physics ───────────────────────────────────────────────────────────────
    function updateBall(delta) {
      if (!ball.inPlay) return

      ball.x  += ball.vx
      ball.y  += ball.vy
      ball.z  += ball.vz
      ball.vz -= GRAVITY * 60 * delta
      ball.vx *= 0.995
      ball.vy *= 0.995

      // Bounce on court
      if (ball.z <= 0) {
        ball.z = 0
        ball.vz = Math.abs(ball.vz) * 0.65
        ball.vx *= 0.88; ball.vy *= 0.88
        ball.bounces++

        // Out of bounds check
        if (ball.x < COURT_L || ball.x > COURT_R) {
          awardPoint(ball.lastHitBy === 0 ? 1 : 0)
          return
        }

        // Two bounces = point for other player
        if (ball.bounces >= 2) {
          awardPoint(ball.lastHitBy === 0 ? 1 : 0)
          return
        }

        // Net check: ball bounced on wrong side
        const p1Side = ball.y > NET_Y
        const lastWasP1 = ball.lastHitBy === 0
        if (lastWasP1 && !p1Side) {
          // p1 hit, bounced on p1's side = fault
          awardPoint(1); return
        }
        if (!lastWasP1 && p1Side) {
          awardPoint(0); return
        }
      }

      // Net collision
      if (ball.y > NET_Y - 8 && ball.y < NET_Y + 8 && ball.z < 20) {
        ball.vy *= -0.5; ball.vz = Math.abs(ball.vz) * 0.3
        awardPoint(ball.lastHitBy === 0 ? 1 : 0)
        return
      }

      // Ball goes out top/bottom
      if (ball.y < 0 || ball.y > CH) {
        awardPoint(ball.lastHitBy === 0 ? 1 : 0)
      }
      if (ball.x < 0 || ball.x > CW) {
        awardPoint(ball.lastHitBy === 0 ? 1 : 0)
      }
    }

    function resetRally() {
      ball.inPlay = false
      ball.z = 0; ball.vx = 0; ball.vy = 0; ball.vz = 0
      setTimeout(() => { if (!gameOver) serve() }, 1500)
    }

    // ── Draw court (perspective) ───────────────────────────────────────────────
    function drawCourt() {
      // Clay court background
      const grad = ctx.createLinearGradient(0, 0, 0, CH)
      grad.addColorStop(0, '#8B4513')
      grad.addColorStop(0.5, '#A0522D')
      grad.addColorStop(1, '#8B4513')
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CW, CH)

      // Court surface (perspective trapezoid)
      ctx.fillStyle = '#C1440E'
      ctx.beginPath()
      ctx.moveTo(COURT_L * 0.3, 0)
      ctx.lineTo(CW - COURT_L * 0.3, 0)
      ctx.lineTo(COURT_R, CH)
      ctx.lineTo(COURT_L, CH)
      ctx.closePath(); ctx.fill()

      // Court lines
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2

      // Baselines
      ctx.beginPath(); ctx.moveTo(COURT_L, FLOOR_P1 + 10); ctx.lineTo(COURT_R, FLOOR_P1 + 10); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(COURT_L * 1.5, FLOOR_P2 - 10); ctx.lineTo(CW - COURT_L * 1.5, FLOOR_P2 - 10); ctx.stroke()

      // Sidelines (perspective)
      ctx.beginPath(); ctx.moveTo(COURT_L, FLOOR_P1 + 10); ctx.lineTo(COURT_L * 1.5, FLOOR_P2 - 10); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(COURT_R, FLOOR_P1 + 10); ctx.lineTo(CW - COURT_L * 1.5, FLOOR_P2 - 10); ctx.stroke()

      // Service boxes
      const midY = NET_Y
      ctx.beginPath(); ctx.moveTo(CW/2, FLOOR_P1 + 10); ctx.lineTo(CW/2, midY); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(CW/2, midY); ctx.lineTo(CW/2, FLOOR_P2 - 10); ctx.stroke()

      // Service lines
      const svcY1 = NET_Y + (FLOOR_P1 - NET_Y) * 0.45
      const svcY2 = NET_Y - (NET_Y - FLOOR_P2) * 0.45
      ctx.beginPath(); ctx.moveTo(COURT_L + 10, svcY1); ctx.lineTo(COURT_R - 10, svcY1); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(COURT_L * 1.3, svcY2); ctx.lineTo(CW - COURT_L * 1.3, svcY2); ctx.stroke()

      // Net
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(COURT_L, NET_Y - 3, COURT_R - COURT_L, 6)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(COURT_L, NET_Y); ctx.lineTo(COURT_R, NET_Y); ctx.stroke()
      // Net posts
      ctx.fillStyle = '#888'
      ctx.fillRect(COURT_L - 4, NET_Y - 20, 8, 24)
      ctx.fillRect(COURT_R - 4, NET_Y - 20, 8, 24)
      // Net mesh
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1
      for (let i = 0; i < 12; i++) {
        const nx = COURT_L + (COURT_R - COURT_L) * i / 12
        ctx.beginPath(); ctx.moveTo(nx, NET_Y - 18); ctx.lineTo(nx, NET_Y); ctx.stroke()
      }
    }

    function drawDog(p, isBottom) {
      ctx.save(); ctx.translate(p.x, p.y)

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath(); ctx.ellipse(0, DOG_R + 3, DOG_R*0.8, 6, 0, 0, Math.PI*2); ctx.fill()

      // Swing animation
      if (p.swinging) {
        ctx.save()
        ctx.rotate(isBottom ? -0.5 : 0.5)
        // Racket
        ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(isBottom ? 20 : -20, 0); ctx.lineTo(isBottom ? 40 : -40, isBottom ? -20 : 20); ctx.stroke()
        ctx.strokeStyle = '#27AE60'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(isBottom ? 40 : -40, isBottom ? -20 : 20, 12, 0, Math.PI*2); ctx.stroke()
        ctx.restore()
      }

      // Body
      ctx.fillStyle = p.color; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.arc(0, 0, DOG_R, 0, Math.PI*2); ctx.fill(); ctx.stroke()

      // Tan marking
      ctx.fillStyle = '#C4956A'
      ctx.beginPath(); ctx.ellipse(5, 3, DOG_R*0.4, DOG_R*0.32, 0.3, 0, Math.PI*2); ctx.fill()

      // Ears
      ctx.fillStyle = p.color; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.ellipse(-DOG_R*0.68, -DOG_R*0.68, 5, 10, -0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.ellipse( DOG_R*0.68, -DOG_R*0.68, 5, 10,  0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#F4A0A0'
      ctx.beginPath(); ctx.ellipse(-DOG_R*0.66, -DOG_R*0.66, 3, 6, -0.4, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse( DOG_R*0.66, -DOG_R*0.66, 3, 6,  0.4, 0, Math.PI*2); ctx.fill()

      // Eyes
      ctx.fillStyle = '#1A1A1A'
      ctx.beginPath(); ctx.arc(-8, -6, 4, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc( 8, -6, 4, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#FFF'
      ctx.beginPath(); ctx.arc(-6, -8, 1.5, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(10, -8, 1.5, 0, Math.PI*2); ctx.fill()

      // Snout
      ctx.fillStyle = '#C4956A'; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.ellipse(1, 3, 9, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#1A1A1A'
      ctx.beginPath(); ctx.arc(1, 1, 3, 0, Math.PI*2); ctx.fill()

      // Name
      ctx.fillStyle = 'rgba(10,5,30,0.85)'; ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.roundRect(-24, isBottom ? DOG_R+6 : -DOG_R-22, 48, 16, 4); ctx.fill(); ctx.stroke()
      ctx.fillStyle = p.color === '#C17A2A' ? '#C17A2A' : '#8B7FDB'
      ctx.font = "bold 7px 'Press Start 2P', monospace"
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(p.name.slice(0,6), 0, isBottom ? DOG_R+14 : -DOG_R-14)

      ctx.restore()
    }

    function drawBallOnCourt() {
      if (!ball.inPlay) return
      // Shadow on court
      const shadowScale = Math.max(0.3, 1 - ball.z / 200)
      ctx.fillStyle = `rgba(0,0,0,${0.3 * shadowScale})`
      ctx.beginPath(); ctx.ellipse(ball.x, ball.y, BALL_R * shadowScale, BALL_R * 0.4 * shadowScale, 0, 0, Math.PI*2); ctx.fill()

      // Ball (raised by z)
      const screenY = ball.y - ball.z * 0.5
      ctx.fillStyle = '#C8E820'; ctx.strokeStyle = '#1A1A1A'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(ball.x, screenY, BALL_R, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      // Seam
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.arc(ball.x, screenY, BALL_R * 0.6, 0.3, Math.PI - 0.3); ctx.stroke()
      ctx.beginPath(); ctx.arc(ball.x, screenY, BALL_R * 0.6, Math.PI + 0.3, -0.3); ctx.stroke()
    }

    function drawHUD() {
      // Score panel
      ctx.fillStyle = 'rgba(10,5,30,0.88)'
      ctx.strokeStyle = '#2D2D2D'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.roundRect(CW/2 - 120, 6, 240, 56, 10); ctx.fill(); ctx.stroke()

      // Sets
      ctx.fillStyle = '#F5EFE0'; ctx.font = "bold 20px 'Press Start 2P', monospace"
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(`${sets[0]}  –  ${sets[1]}`, CW/2, 24)

      // Current game score
      const p1pts = pts[0] >= 3 && pts[1] >= 3 ? (pts[0] > pts[1] ? 'AD' : '40') : PTS[pts[0]] || '0'
      const p2pts = pts[0] >= 3 && pts[1] >= 3 ? (pts[1] > pts[0] ? 'AD' : '40') : PTS[pts[1]] || '0'
      ctx.font = "9px 'Press Start 2P', monospace"
      ctx.fillStyle = '#A0C4FF'
      ctx.fillText(`${p1pts} – ${p2pts}  |  G: ${games[0]}-${games[1]}`, CW/2, 46)

      // Flash
      if (flash.alpha > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, flash.alpha)
        ctx.fillStyle = '#F0B429'; ctx.font = "bold 24px 'Press Start 2P', monospace"
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.shadowColor = '#000'; ctx.shadowBlur = 8
        ctx.fillText(flash.msg, CW/2, CH/2)
        ctx.shadowBlur = 0; ctx.restore()
      }

      // Serve indicator
      if (!ball.inPlay) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = "8px 'Press Start 2P', monospace"
        ctx.textAlign = 'center'
        ctx.fillText(serving === 0 ? '▼ YOUR SERVE' : '▲ OPPONENT SERVES', CW/2, CH/2 + 30)
      }
    }

    function layoutButtons() {
      const bw = 68, bh = 68, gap = 8, by = CH - bh - 12
      BTN.left  = { x: 12,           y: by, w: bw, h: bh }
      BTN.right = { x: 12+bw+gap,    y: by, w: bw, h: bh }
      BTN.a     = { x: CW-bw-12,     y: by, w: bw, h: bh }
      BTN.up    = { x: CW-bw*2-gap-12, y: by, w: bw, h: bh }
    }

    function drawButtons() {
      for (const [k, label, color] of [
        ['left','←','#C17A2A'],['right','→','#C17A2A'],
        ['up','LOB','#5B3FDB'],['a','HIT','#E8A020'],
      ]) {
        const b = BTN[k]; if (!b) continue
        ctx.save()
        ctx.fillStyle = keys[k] ? color : 'rgba(30,20,70,0.85)'
        ctx.strokeStyle = keys[k] ? '#FFD700' : '#2D2D2D'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fill(); ctx.stroke()
        ctx.fillStyle = keys[k] ? '#FFD700' : '#F5EFE0'
        ctx.font = `bold ${label.length > 2 ? 10 : 20}px 'Press Start 2P', monospace`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(label, b.x+b.w/2, b.y+b.h/2)
        ctx.restore()
      }
    }

    layoutButtons()
    setTimeout(() => serve(), 1000)

    // ── Game loop ─────────────────────────────────────────────────────────────
    let animId
    function loop(now) {
      animId = requestAnimationFrame(loop)
      if (gameOver) { draw(); return }

      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      flash.alpha = Math.max(0, flash.alpha - delta * 1.0)

      // P1 movement
      if (keys.left)  p1.vx = -MOVE_SPD
      if (keys.right) p1.vx =  MOVE_SPD
      if (!keys.left && !keys.right) p1.vx *= 0.7
      p1.x = Math.max(COURT_L + DOG_R, Math.min(COURT_R - DOG_R, p1.x + p1.vx))

      // P1 swing
      if (keys.a && !p1.swinging) {
        p1.swinging = true; p1.swingTimer = 0.25
        const ballNear = Math.abs(ball.x - p1.x) < 70 && Math.abs(ball.y - p1.y) < 70 && ball.z < 50
        if (ballNear && ball.inPlay) hitBall(p1, false)
      }
      if (keys.up && !p1.swinging) {
        p1.swinging = true; p1.swingTimer = 0.25
        const ballNear = Math.abs(ball.x - p1.x) < 70 && Math.abs(ball.y - p1.y) < 70 && ball.z < 50
        if (ballNear && ball.inPlay) hitBall(p1, true)
      }

      // Swing timers
      for (const p of [p1, p2]) {
        if (p.swinging) {
          p.swingTimer -= delta
          if (p.swingTimer <= 0) p.swinging = false
        }
      }

      updateAI(delta)
      p2.x = Math.max(COURT_L * 1.5 + DOG_R, Math.min(CW - COURT_L * 1.5 - DOG_R, p2.x + p2.vx))
      updateBall(delta)

      draw()
    }

    function draw() {
      ctx.clearRect(0, 0, CW, CH)
      drawCourt()
      drawBallOnCourt()
      drawDog(p2, false)
      drawDog(p1, true)
      drawHUD()
      drawButtons()
    }

    animId = requestAnimationFrame(loop)

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; layoutButtons() }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchend',   onTouchEnd)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      window.removeEventListener('resize',  onResize)
    }
  }, [config])

  return <canvas ref={ref} style={{ display: 'block', width: '100vw', height: '100vh', touchAction: 'none' }} />
}
