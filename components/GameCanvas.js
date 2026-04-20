import { useEffect, useRef, useState } from 'react'

export default function GameCanvas({ mode, level, user, room }) {
  const mountRef  = useRef(null)
  const [loading, setLoading] = useState(true)
  const [loadMsg, setLoadMsg] = useState('LOADING...')

  useEffect(() => {
    if (!mountRef.current) return
    let animId         = null
    let renderer       = null
    let inputSystem    = null
    let pvpSync        = null
    let onResizeHandler = null

    async function init() {
      setLoadMsg('LOADING ENGINE...')
      const THREE  = await import('three')
      const CANNON = await import('cannon-es')

      setLoadMsg('BUILDING COURT...')
      const { GameScene }    = await import('../lib/game/GameScene')
      const { InputSystem }  = await import('../lib/game/systems/InputSystem')
      const { PlayerSystem } = await import('../lib/game/systems/PlayerSystem')
      const { BallSystem }   = await import('../lib/game/systems/BallSystem')
      const { CameraSystem } = await import('../lib/game/systems/CameraSystem')
      const { TurnManager }  = await import('../lib/game/systems/TurnManager')
      const { AISystem }     = await import('../lib/game/systems/AISystem')
      const { ScoreSystem }  = await import('../lib/game/systems/ScoreSystem')
      const { Player }       = await import('../lib/game/entities/Player')
      const { Ball }         = await import('../lib/game/entities/Ball')
      const { Court }        = await import('../lib/game/entities/Court')
      const { Hoop }         = await import('../lib/game/entities/Hoop')
      const { DragArrow }    = await import('../lib/game/ui/DragArrow')
      const { getLevelConfig } = await import('../lib/game/config')

      const container = mountRef.current
      const W = container.clientWidth
      const H = container.clientHeight

      // ── Renderer ─────────────────────────────────────
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      // Set clear color to match court bg — no grey bars on any screen size
      renderer.setClearColor(0x5BB8F5)
      container.appendChild(renderer.domElement)

      // ── Scene + Camera — court fills 100% of screen, no bars ever ────
      // Strategy: fix court WIDTH at 24 units, derive height from screen aspect.
      // Camera maps exactly: left=-12, right=12, bottom=0, top=COURT_H.
      // Background planes are 200×200 so they always cover everything.
      const scene = new THREE.Scene()

      const COURT_W  = 24                        // fixed width (-12 to +12)
      const COURT_H  = COURT_W * (H / W)         // height derived from screen — always fills exactly
      const COURT_CX = 0
      const COURT_CY = COURT_H / 2

      // Simple ortho camera — court world coords map 1:1 to screen
      const camera = new THREE.OrthographicCamera(
        -COURT_W / 2,   // left  = -12
         COURT_W / 2,   // right = +12
         COURT_H,       // top   = full height
         0,             // bottom = 0
        0.1, 200
      )
      camera.position.set(COURT_CX, COURT_CY, 50)
      camera.lookAt(COURT_CX, COURT_CY, 0)

      // ── Physics World ─────────────────────────────────
      const lvl = parseInt(level) || 1
      const levelConfig = getLevelConfig(lvl)

      const world = new CANNON.World()
      world.gravity.set(0, -levelConfig.gravity, 0)
      world.broadphase = new CANNON.NaiveBroadphase()
      world.solver.iterations = 10

      const groundMat = new CANNON.Material({ restitution: levelConfig.ballRestitution, friction: 0.4 })
      const ballMat   = new CANNON.Material({ restitution: levelConfig.ballRestitution, friction: levelConfig.ballFriction })
      const contact   = new CANNON.ContactMaterial(groundMat, ballMat, {
        restitution: levelConfig.ballRestitution,
        friction:    levelConfig.ballFriction,
      })
      world.addContactMaterial(contact)

      // ── Game Scene ────────────────────────────────────
      const gameScene = new GameScene(scene, renderer, THREE)
      gameScene.setup(levelConfig, COURT_H)

      // ── Court ─────────────────────────────────────────
      const court = new Court(scene, world, THREE, CANNON)
      court.rebuild(levelConfig, COURT_H)

      // ── Court boundary outline ────────────────────────
      const { GAME_CONFIG: GC } = await import('../lib/game/config')
      const hw = GC.COURT_HALF_WIDTH  // 12
      const wallMat = new THREE.LineBasicMaterial({ color: 0xFFFF00, linewidth: 3 })
      const wallGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-hw, 0, 0),
        new THREE.Vector3( hw, 0, 0),
        new THREE.Vector3( hw, COURT_H, 0),
        new THREE.Vector3(-hw, COURT_H, 0),
        new THREE.Vector3(-hw, 0, 0),
      ])
      const wallOutline = new THREE.Line(wallGeo, wallMat)
      scene.add(wallOutline)

      // ── Hoop — placed at 60% of court height ──────────
      const hoopY  = COURT_H * 0.60
      const hoopX  = levelConfig.hoopOffsetX || 0
      const hoop   = new Hoop(scene, world, THREE, CANNON, { x: hoopX, y: hoopY, z: 0 }, levelConfig.hoopRadius)

      // ── Players ───────────────────────────────────────
      const isPVP      = mode === 'pvp'
      const localSide  = isPVP ? (localStorage.getItem('bb_room_side') || 'left') : 'left'
      const remoteSide = localSide === 'left' ? 'right' : 'left'

      const p1Name = localSide === 'left'
        ? (user?.username || 'YOU')
        : (localStorage.getItem('bb_pvp_opponent') || 'Opponent')
      const p2Name = localSide === 'right'
        ? (user?.username || 'YOU')
        : (isPVP ? (localStorage.getItem('bb_pvp_opponent') || 'Opponent') : 'AI')

      const player1 = new Player(scene, THREE, 'left',  0x4FC3F7, p1Name)
      const player2 = new Player(scene, THREE, 'right', 0xFF8A65, p2Name)

      // ── Balls ─────────────────────────────────────────
      const ball1 = new Ball(scene, world, THREE, CANNON, player1, 0xFF6B35)
      const ball2 = new Ball(scene, world, THREE, CANNON, player2, 0xAB47BC)
      ball1.attachTo(player1)
      ball2.attachTo(player2)

      // ── Systems ───────────────────────────────────────
      const dragArrow    = new DragArrow(scene, THREE)
      inputSystem        = new InputSystem(renderer.domElement, camera, THREE)
      const playerSystem = new PlayerSystem([player1, player2])
      const cameraSystem = { update: () => {}, shake: () => {} }  // camera is fixed
      const aiSystem     = new AISystem(player2, ball2, player1, hoop, levelConfig)

      const scoreSystem = new ScoreSystem(
        (idx, pts, s0, s1) => {
          window.BB_GAME_UI?.showScore(idx, pts, s0, s1)
          cameraSystem.shake(0.2, 0.35)
          gameScene.addScoreParticles(hoop.position.clone(), 0xFFD700)
          // In PVP, broadcast score snapshot to keep clients in sync
          if (isPVP && pvpSync) pvpSync.broadcastScore(s0, s1)
        },
        (winnerIdx, finalScores) => {
          window.BB_GAME_UI?.showResult(winnerIdx, finalScores)
          if (isPVP && pvpSync) {
            const winnerSide = winnerIdx === 0 ? 'left' : 'right'
            pvpSync.broadcastGameEnd(winnerSide, finalScores[0], finalScores[1])
            // Delete room so it never shows in lobby again
            if (room) {
              fetch(`/api/rooms?id=${room}`, { method: 'DELETE' }).catch(() => {})
            }
          }
        }
      )

      const ballSystem = new BallSystem(world, [ball1, ball2], hoop, scoreSystem, THREE, CANNON)
      ballSystem.setLevelConfig(levelConfig)
      ballSystem.setCourt(court)

      // ── PVP Sync ──────────────────────────────────────
      if (isPVP && room) {
        setLoadMsg('CONNECTING TO OPPONENT...')
        const { PVPSync } = await import('../lib/game/systems/PVPSync')
        pvpSync = new PVPSync(room, localSide)

        pvpSync
          .on('onConnected', () => {
            window.BB_GAME_UI?.updateScore(0, 0)
          })
          .on('onOpponentReady', () => {
            // Opponent is live — safe to start
            window.BB_GAME_UI?.updateScore(0, 0)
          })
          .on('onOpponentDisconnect', () => {
            // Opponent dropped — end the game, local player wins
            window.BB_GAME_UI?.showResult(localSide === 'left' ? 0 : 1, scoreSystem.scores)
          })

        pvpSync.connect()
      }

      // Stun broadcast: when a player hits the opponent, tell remote
      ballSystem.onStun((player) => {
        const side = player.side
        window.BB_GAME_UI?.showStun(side)
        cameraSystem.shake(0.4, 0.5)
        if (isPVP && pvpSync) pvpSync.broadcastStun(side)
      })

      // ── Turn Manager ──────────────────────────────────
      const turnManager = new TurnManager({
        player1, player2, ball1, ball2, hoop,
        inputSystem, playerSystem, ballSystem, aiSystem,
        dragArrow, scoreSystem, levelConfig,
        onStun: (side) => window.BB_GAME_UI?.showStun(side),
        THREE, CANNON,
        // PVP extras
        pvpSync:   isPVP ? pvpSync : null,
        localSide: isPVP ? localSide : 'left',
      })
      turnManager.start()

      // ── Resize ────────────────────────────────────────
      onResizeHandler = () => {
        if (!container) return
        const w = container.clientWidth
        const h = container.clientHeight
        const newCourtH = COURT_W * (h / w)
        camera.top    = newCourtH
        camera.bottom = 0
        camera.left   = -COURT_W / 2
        camera.right  =  COURT_W / 2
        camera.position.set(COURT_CX, newCourtH / 2, 50)
        camera.lookAt(COURT_CX, newCourtH / 2, 0)
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResizeHandler)

      // ── Game Loop ─────────────────────────────────────
      setLoadMsg('READY!')
      // Small delay so "READY!" flashes before hiding
      await new Promise(r => setTimeout(r, 350))
      setLoading(false)

      let lastTime = performance.now()

      function loop() {
        animId = requestAnimationFrame(loop)
        const now   = performance.now()
        const delta = Math.min((now - lastTime) / 1000, 0.05)
        lastTime = now

        if (scoreSystem.isGameOver()) return

        world.step(1 / 60, delta, 3)

        turnManager.update(delta)
        playerSystem.update(delta)
        ballSystem.update(delta)
        cameraSystem.update(delta)
        gameScene.update(delta)
        hoop.update(delta)

        renderer.render(scene, camera)
      }

      loop()
    }

    init().catch(console.error)

    return () => {
      cancelAnimationFrame(animId)
      if (onResizeHandler) window.removeEventListener('resize', onResizeHandler)
      if (inputSystem) inputSystem.dispose()
      if (pvpSync)     pvpSync.disconnect()
      if (renderer) {
        renderer.dispose()
        if (renderer.domElement.parentNode === mountRef.current) {
          mountRef.current?.removeChild(renderer.domElement)
        }
      }
    }
  }, [])

  return (
    <>
      {/* Canvas fills only the playable area between HUD and quit button */}
      <div
        ref={mountRef}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          overflow: 'hidden',
          touchAction: 'none',
        }}
      />

      {/* ── Cartoon loading screen ── */}
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'linear-gradient(160deg, #1E1540 0%, #2A1E6E 50%, #3A2490 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 32,
        }}>
          {/* Bouncing basketball */}
          <div style={{ animation: 'loadBounce 0.6s ease-in-out infinite alternate' }}>
            <svg width={80} height={80} viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="#C17A2A" stroke="#2D2D2D" strokeWidth="2.5" />
              <path d="M6 8 C9 11 10 13.5 10 16 S9 21 6 24" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M26 8 C23 11 22 13.5 22 16 S23 21 26 24" stroke="#2D2D2D" strokeWidth="2" fill="none" strokeLinecap="round" />
              <line x1="2" y1="16" x2="30" y2="16" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="2" x2="16" y2="30" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* LOADING text */}
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 'clamp(18px, 5vw, 32px)',
              color: '#F5EFE0',
              textShadow: '4px 4px 0 #2D2D2D, -2px -2px 0 #2D2D2D, 2px -2px 0 #2D2D2D, -2px 2px 0 #2D2D2D',
              letterSpacing: 3,
              animation: 'loadPulse 1s ease-in-out infinite',
            }}>
              {loadMsg}
            </p>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 12, height: 12,
                borderRadius: '50%',
                background: '#C17A2A',
                border: '2px solid #2D2D2D',
                animation: `loadDot 1s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>

          <style>{`
            @keyframes loadBounce {
              from { transform: translateY(0px) scale(1); }
              to   { transform: translateY(-24px) scale(0.92); }
            }
            @keyframes loadPulse {
              0%, 100% { opacity: 1; }
              50%       { opacity: 0.6; }
            }
            @keyframes loadDot {
              0%, 100% { transform: scale(1);   opacity: 0.4; }
              50%       { transform: scale(1.5); opacity: 1;   }
            }
          `}</style>
        </div>
      )}
    </>
  )
}
