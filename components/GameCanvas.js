import { useEffect, useRef } from 'react'

export default function GameCanvas({ mode, level, user, room }) {
  const mountRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current) return
    let animId         = null
    let renderer       = null
    let inputSystem    = null
    let pvpSync        = null
    let onResizeHandler = null

    async function init() {
      const THREE  = await import('three')
      const CANNON = await import('cannon-es')

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
      container.appendChild(renderer.domElement)

      // ── Scene + Camera ───────────────────────────────
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100)
      camera.position.set(0, 3.5, 14)
      camera.lookAt(0, 3.5, 0)

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
      gameScene.setup(levelConfig)

      // ── Court ─────────────────────────────────────────
      const court = new Court(scene, world, THREE, CANNON)
      court.rebuild(levelConfig)

      // ── Hoop ──────────────────────────────────────────
      const hoopY  = (levelConfig.wallHeight || 3) + 0.8
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
      const cameraSystem = new CameraSystem(camera, [ball1, ball2], THREE)
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
          // Broadcast game end so the other client also sees result screen
          if (isPVP && pvpSync) {
            const winnerSide = winnerIdx === 0 ? 'left' : 'right'
            pvpSync.broadcastGameEnd(winnerSide, finalScores[0], finalScores[1])
          }
        }
      )

      const ballSystem = new BallSystem(world, [ball1, ball2], hoop, scoreSystem, THREE, CANNON)
      ballSystem.setLevelConfig(levelConfig)

      // ── PVP Sync ──────────────────────────────────────
      if (isPVP && room) {
        const { PVPSync } = await import('../lib/game/systems/PVPSync')
        pvpSync = new PVPSync(room, localSide)

        // Show HUD connection state while waiting for opponent
        pvpSync.on('onConnected', () => {
          window.BB_GAME_UI?.updateScore(0, 0)
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
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResizeHandler)

      // ── Game Loop ─────────────────────────────────────
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
    <div
      ref={mountRef}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', touchAction: 'none' }}
    />
  )
}
