/**
 * Basketball — 2D side-view, two hoops, one ball, button controls
 * Left hoop = P2 scores, Right hoop = P1 scores
 * Controls: left/right move, up jump, A shoot, B steal
 * First to 7 wins. PVP via Supabase Realtime.
 */
import { useEffect, useRef } from "react"

const GRAVITY = 0.52
const JUMP_V  = -17
const MOVE_SPD = 4.5
const BALL_R   = 14
const DOG_R    = 26
const WIN      = 7
const HOOP_R   = 28
const HOOP_H   = 8

export default function BasketballCanvas({ config }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const CW = canvas.width, CH = canvas.height
    const FLOOR = CH - 90
    const isPVP = config?.mode === "pvp"

    // Hoops: left wall (p2 attacks), right wall (p1 attacks)
    const hoopL = { x: 52, y: CH * 0.38 }
    const hoopR = { x: CW - 52, y: CH * 0.38 }

    const p1 = { x: CW*0.25, y: FLOOR-DOG_R, vx:0, vy:0, onGround:true, color:"#C17A2A", name:"YOU",  side:"left",  hasBall:true,  shooting:false, shootTimer:0, stealCooldown:0 }
    const p2 = { x: CW*0.75, y: FLOOR-DOG_R, vx:0, vy:0, onGround:true, color:"#5B3FDB", name: isPVP?(config?.opponent||"P2"):"AI", side:"right", hasBall:false, shooting:false, shootTimer:0, stealCooldown:0 }

    const ball = { x: p1.x, y: p1.y-DOG_R-BALL_R, vx:0, vy:0, owner:p1, flying:false, spin:0 }

    let scores = [0,0], gameOver=false, lastTime=performance.now()
    let scoreFlash=0, scoreFlashSide=0
    const keys = { left:false, right:false, up:false, a:false, t:false }
    const BTN = {}
    const activeTouches = {}
    // Dunk state
    let dunkAnim = 0, dunkPlayer = null

    function getPos(e) {
      const r = canvas.getBoundingClientRect()
      const s = e.touches ? e.touches[0] : e
      return { x:(s.clientX-r.left)*(CW/r.width), y:(s.clientY-r.top)*(CH/r.height) }
    }
    function inBtn(pos,k) { const b=BTN[k]; if(!b) return false; return pos.x>=b.x&&pos.x<=b.x+b.w&&pos.y>=b.y&&pos.y<=b.y+b.h }

    function onTouchStart(e) {
      e.preventDefault()
      for (const t of e.changedTouches) {
        const r=canvas.getBoundingClientRect()
        const pos={x:(t.clientX-r.left)*(CW/r.width),y:(t.clientY-r.top)*(CH/r.height)}
        for (const k of ["left","right","up","a","t"]) { if(inBtn(pos,k)){keys[k]=true;activeTouches[t.identifier]=k} }
      }
    }
    function onTouchEnd(e) { e.preventDefault(); for(const t of e.changedTouches){const k=activeTouches[t.identifier];if(k){keys[k]=false;delete activeTouches[t.identifier]}} }
    function onKeyDown(e) { if(e.key==="ArrowLeft")keys.left=true;if(e.key==="ArrowRight")keys.right=true;if(e.key==="ArrowUp")keys.up=true;if(e.key==="a"||e.key==="A")keys.a=true;if(e.key==="t"||e.key==="T")keys.t=true }
    function onKeyUp(e)   { if(e.key==="ArrowLeft")keys.left=false;if(e.key==="ArrowRight")keys.right=false;if(e.key==="ArrowUp")keys.up=false;if(e.key==="a"||e.key==="A")keys.a=false;if(e.key==="t"||e.key==="T")keys.t=false }

    canvas.addEventListener("touchstart",onTouchStart,{passive:false})
    canvas.addEventListener("touchend",onTouchEnd,{passive:false})
    window.addEventListener("keydown",onKeyDown)
    window.addEventListener("keyup",onKeyUp)

    function layoutButtons() {
      const bw=68,bh=68,gap=8,by=CH-bh-12
      BTN.left ={x:12,y:by,w:bw,h:bh}
      BTN.right={x:12+bw+gap,y:by,w:bw,h:bh}
      BTN.up   ={x:CW-bw-12,y:by,w:bw,h:bh}
      BTN.a    ={x:CW-bw*2-gap-12,y:by,w:bw,h:bh}
      BTN.t    ={x:CW-bw*3-gap*2-12,y:by,w:bw,h:bh}
    }
    layoutButtons()

    let aiTimer=0
    function updateAI(delta) {
      if(isPVP) return
      aiTimer+=delta; if(aiTimer<0.15) return; aiTimer=0
      if(p2.hasBall) {
        const dx=hoopL.x-p2.x
        p2.vx=Math.sign(dx)*MOVE_SPD*0.9
        if(Math.abs(dx)<120&&p2.onGround) { p2.vy=JUMP_V; p2.onGround=false }
        if(Math.abs(dx)<200) { shootBall(p2,hoopL) }
      } else {
        const dx=ball.x-p2.x
        p2.vx=Math.sign(dx)*MOVE_SPD*0.85
        if(Math.abs(dx)<60&&p2.onGround&&ball.y<p2.y) { p2.vy=JUMP_V; p2.onGround=false }
        // AI tackle when close to p1 who has ball
        if(p1.hasBall&&p2.stealCooldown<=0) {
          const d=Math.hypot(p1.x-p2.x,p1.y-p2.y)
          if(d<DOG_R*2.8) {
            p1.hasBall=false; ball.flying=true
            ball.vx=(Math.random()-0.5)*8; ball.vy=-5
            p2.stealCooldown=1.8
            p1.vx=(p1.x-p2.x>0?1:-1)*5; p1.vy=-4
          }
        }
      }
      if(p2.stealCooldown>0)p2.stealCooldown-=delta
    }

    function shootBall(player, hoop) {
      if(!player.hasBall) return
      const distToHoop = Math.hypot(player.x - hoop.x, player.y - hoop.y)
      const isDunk = distToHoop < HOOP_R * 2.5 && !player.onGround && player.vy < 0
      player.hasBall=false; player.shooting=true; player.shootTimer=isDunk?0.5:0.3
      ball.flying=true; ball.owner=null
      if(isDunk) {
        // Dunk: slam ball straight down into hoop
        dunkAnim=0.6; dunkPlayer=player
        ball.x=hoop.x; ball.y=hoop.y-BALL_R*2
        ball.vx=0; ball.vy=8
        scoreFlash=2; scoreFlashSide=player===p1?0:1
        scores[player===p1?0:1]++
        window.ANAGO_UI?.updateScore(scores[0],scores[1])
        if(scores[player===p1?0:1]>=WIN){gameOver=true;window.ANAGO_UI?.showResult(player===p1?0:1,[...scores]);return}
        resetBall(); return
      }
      const t=0.7+Math.random()*0.3
      const gravity=0.52*60
      ball.vx=(hoop.x-ball.x)/(t*60)
      ball.vy=(hoop.y-ball.y)/(t*60)-0.5*gravity*(t/60)
    }

    function updatePlayer(p,delta) {
      p.vy+=GRAVITY; p.x+=p.vx; p.y+=p.vy; p.vx*=0.82
      if(p.y+DOG_R>=FLOOR){p.y=FLOOR-DOG_R;p.vy=0;p.onGround=true}
      if(p.y-DOG_R<=55){p.y=55+DOG_R;p.vy*=-0.4}
      p.x=Math.max(DOG_R+4,Math.min(CW-DOG_R-4,p.x))
      if(p.shooting){p.shootTimer-=delta;if(p.shootTimer<=0)p.shooting=false}
      if(p.stealCooldown>0)p.stealCooldown-=delta
    }

    function updateBall(delta) {
      if(!ball.flying) {
        if(ball.owner) { ball.x=ball.owner.x+(ball.owner.side==="left"?DOG_R+BALL_R+2:-(DOG_R+BALL_R+2)); ball.y=ball.owner.y-DOG_R*0.3 }
        return
      }
      ball.vy+=GRAVITY*0.9; ball.x+=ball.vx; ball.y+=ball.vy; ball.vx*=0.995; ball.spin+=ball.vx*0.05
      // Floor bounce
      if(ball.y+BALL_R>=FLOOR){ball.y=FLOOR-BALL_R;ball.vy*=-0.55;ball.vx*=0.8;if(Math.abs(ball.vy)<2)ball.vy=-2}
      if(ball.y-BALL_R<=55){ball.y=55+BALL_R;ball.vy*=-0.5}
      if(ball.x-BALL_R<=4){ball.x=4+BALL_R;ball.vx*=-0.6}
      if(ball.x+BALL_R>=CW-4){ball.x=CW-4-BALL_R;ball.vx*=-0.6}

      // Hoop scoring
      for(const [hoop,scorerIdx] of [[hoopL,1],[hoopR,0]]) {
        const dx=ball.x-hoop.x, dy=ball.y-hoop.y
        if(Math.abs(dx)<HOOP_R*0.7&&Math.abs(dy)<HOOP_H*2&&ball.vy>0) {
          scores[scorerIdx]++
          scoreFlash=2; scoreFlashSide=scorerIdx
          window.ANAGO_UI?.updateScore(scores[0],scores[1])
          if(scores[scorerIdx]>=WIN){gameOver=true;window.ANAGO_UI?.showResult(scorerIdx,[...scores]);return}
          resetBall()
          return
        }
      }

      // Rim bounce
      for(const hoop of [hoopL,hoopR]) {
        const dx=ball.x-hoop.x, dy=ball.y-hoop.y
        const d=Math.hypot(dx,dy)
        if(d<HOOP_R+BALL_R&&d>0) { const nx=dx/d,ny=dy/d; ball.vx=nx*5;ball.vy=ny*5-2 }
      }

      // Ball pickup
      for(const p of [p1,p2]) {
        if(!p.hasBall&&Math.hypot(ball.x-p.x,ball.y-p.y)<DOG_R+BALL_R+8) {
          ball.flying=false; ball.owner=p; p.hasBall=true; ball.vx=0; ball.vy=0
          break
        }
      }
    }

    function resetBall() {
      ball.flying=false; ball.vx=0; ball.vy=0
      // Give to player who conceded
      const receiver=scoreFlashSide===0?p2:p1
      ball.owner=receiver; receiver.hasBall=true
      if(p1.hasBall&&receiver!==p1)p1.hasBall=false
      if(p2.hasBall&&receiver!==p2)p2.hasBall=false
    }

    function drawBackground() {
      const grad=ctx.createLinearGradient(0,0,0,CH)
      grad.addColorStop(0,"#87CEEB"); grad.addColorStop(0.6,"#B8E4FF"); grad.addColorStop(1,"#B8E4FF")
      ctx.fillStyle=grad; ctx.fillRect(0,0,CW,CH)
      // City skyline silhouette
      ctx.fillStyle="rgba(100,80,150,0.3)"
      for(let i=0;i<12;i++){const bx=i*CW/12,bw=CW/14,bh=40+Math.sin(i*1.7)*30;ctx.fillRect(bx,FLOOR-bh-20,bw,bh+20)}
      // Court floor
      ctx.fillStyle="#C17A2A"; ctx.fillRect(0,FLOOR,CW,CH-FLOOR)
      ctx.fillStyle="#A85F18"; ctx.fillRect(0,FLOOR,CW,6)
      // Court markings
      ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=2
      ctx.beginPath(); ctx.moveTo(CW/2,FLOOR); ctx.lineTo(CW/2,CH); ctx.stroke()
      ctx.beginPath(); ctx.arc(CW/2,FLOOR,60,Math.PI,0); ctx.stroke()
      // 3-point arcs
      ctx.beginPath(); ctx.arc(hoopL.x+20,FLOOR,CW*0.28,Math.PI*1.5,Math.PI*0.5); ctx.stroke()
      ctx.beginPath(); ctx.arc(hoopR.x-20,FLOOR,CW*0.28,Math.PI*0.5,Math.PI*1.5); ctx.stroke()
    }

    function drawHoop(hoop,color) {
      // Backboard
      ctx.fillStyle="#F4F4F4"; ctx.strokeStyle="#2D2D2D"; ctx.lineWidth=3
      const bbX=hoop.x<CW/2?hoop.x-8:hoop.x+8-6
      ctx.fillRect(bbX,hoop.y-50,6,80); ctx.strokeRect(bbX,hoop.y-50,6,80)
      // Red square on backboard
      ctx.strokeStyle="#E8251A"; ctx.lineWidth=2
      ctx.strokeRect(bbX,hoop.y-20,6,30)
      // Rim
      ctx.strokeStyle="#E8251A"; ctx.lineWidth=5
      ctx.beginPath()
      if(hoop.x<CW/2) ctx.moveTo(hoop.x,hoop.y)
      else ctx.moveTo(hoop.x,hoop.y)
      ctx.arc(hoop.x+(hoop.x<CW/2?HOOP_R:-HOOP_R)/2,hoop.y,HOOP_R,0,Math.PI*2)
      // Simple rim line
      ctx.strokeStyle="#E8251A"; ctx.lineWidth=6
      ctx.beginPath()
      const rimX=hoop.x<CW/2?hoop.x+4:hoop.x-4
      ctx.moveTo(rimX,hoop.y); ctx.lineTo(rimX+(hoop.x<CW/2?HOOP_R*2:-HOOP_R*2),hoop.y)
      ctx.stroke()
      // Net
      ctx.strokeStyle="rgba(255,255,255,0.7)"; ctx.lineWidth=1.5
      const nx=rimX+(hoop.x<CW/2?HOOP_R:-HOOP_R)
      for(let i=0;i<=6;i++){
        const t=i/6,sx=rimX+(hoop.x<CW/2?t*HOOP_R*2:-t*HOOP_R*2)
        ctx.beginPath(); ctx.moveTo(sx,hoop.y); ctx.lineTo(nx+(sx-nx)*0.5,hoop.y+30); ctx.stroke()
      }
      ctx.beginPath(); ctx.moveTo(rimX,hoop.y+15); ctx.lineTo(rimX+(hoop.x<CW/2?HOOP_R*2:-HOOP_R*2),hoop.y+15); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(nx,hoop.y+30); ctx.lineTo(nx+(hoop.x<CW/2?-HOOP_R:-HOOP_R)*0.5,hoop.y+30); ctx.stroke()
    }

    function drawDog(p) {
      ctx.save(); ctx.translate(p.x,p.y)
      // Shadow
      ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(0,DOG_R+3,DOG_R*0.8,6,0,0,Math.PI*2); ctx.fill()
      // Shoot animation tilt
      if(p.shooting) ctx.rotate(p.side==="left"?-0.4:0.4)
      // Body
      ctx.fillStyle=p.color; ctx.strokeStyle="#1A1A1A"; ctx.lineWidth=2.5
      ctx.beginPath(); ctx.arc(0,0,DOG_R,0,Math.PI*2); ctx.fill(); ctx.stroke()
      // Tan marking
      ctx.fillStyle="#C4956A"; ctx.beginPath(); ctx.ellipse(5,3,DOG_R*0.42,DOG_R*0.34,0.3,0,Math.PI*2); ctx.fill()
      // Ears
      ctx.fillStyle=p.color; ctx.strokeStyle="#1A1A1A"; ctx.lineWidth=2
      ctx.beginPath(); ctx.ellipse(-DOG_R*0.7,-DOG_R*0.7,5,10,-0.4,0,Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.ellipse( DOG_R*0.7,-DOG_R*0.7,5,10, 0.4,0,Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle="#F4A0A0"
      ctx.beginPath(); ctx.ellipse(-DOG_R*0.68,-DOG_R*0.68,3,6,-0.4,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse( DOG_R*0.68,-DOG_R*0.68,3,6, 0.4,0,Math.PI*2); ctx.fill()
      // Eyes
      ctx.fillStyle="#1A1A1A"; ctx.beginPath(); ctx.arc(-8,-6,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(8,-6,4,0,Math.PI*2); ctx.fill()
      ctx.fillStyle="#FFF"; ctx.beginPath(); ctx.arc(-6,-8,1.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(10,-8,1.5,0,Math.PI*2); ctx.fill()
      // Snout
      ctx.fillStyle="#C4956A"; ctx.strokeStyle="#1A1A1A"; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.ellipse(1,3,9,6,0,0,Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.fillStyle="#1A1A1A"; ctx.beginPath(); ctx.arc(1,1,3,0,Math.PI*2); ctx.fill()
      // Collar
      ctx.strokeStyle=p.side==="left"?"#5B3FDB":"#C17A2A"; ctx.lineWidth=4
      ctx.beginPath(); ctx.arc(0,DOG_R*0.28,DOG_R*0.65,-2.3,-0.8); ctx.stroke()
      // Ball in hand
      if(p.hasBall) {
        const bx=p.side==="left"?DOG_R+BALL_R+2:-(DOG_R+BALL_R+2)
        ctx.fillStyle="#C17A2A"; ctx.strokeStyle="#1A1A1A"; ctx.lineWidth=2
        ctx.beginPath(); ctx.arc(bx,-DOG_R*0.3,BALL_R,0,Math.PI*2); ctx.fill(); ctx.stroke()
        ctx.strokeStyle="#1A1A1A"; ctx.lineWidth=1
        ctx.beginPath(); ctx.moveTo(bx-BALL_R,bx<0?-DOG_R*0.3:-DOG_R*0.3); ctx.lineTo(bx+BALL_R,-DOG_R*0.3); ctx.stroke()
      }
      // Name
      ctx.fillStyle="rgba(10,5,30,0.85)"; ctx.strokeStyle="#2D2D2D"; ctx.lineWidth=2
      ctx.beginPath(); ctx.roundRect(-24,DOG_R+6,48,16,4); ctx.fill(); ctx.stroke()
      ctx.fillStyle=p.color; ctx.font="bold 7px 'Press Start 2P',monospace"; ctx.textAlign="center"; ctx.textBaseline="middle"
      ctx.fillText(p.name.slice(0,6),0,DOG_R+14)
      ctx.restore()
    }

    function drawBallFree() {
      if(!ball.flying) return
      ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(ball.x+2,ball.y+BALL_R+2,BALL_R*0.8,5,0,0,Math.PI*2); ctx.fill()
      ctx.save(); ctx.translate(ball.x,ball.y); ctx.rotate(ball.spin)
      ctx.fillStyle="#C17A2A"; ctx.strokeStyle="#1A1A1A"; ctx.lineWidth=2
      ctx.beginPath(); ctx.arc(0,0,BALL_R,0,Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.strokeStyle="#1A1A1A"; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.moveTo(-BALL_R,0); ctx.lineTo(BALL_R,0); ctx.stroke()
      ctx.beginPath(); ctx.arc(0,0,BALL_R*0.6,0.4,Math.PI-0.4); ctx.stroke()
      ctx.beginPath(); ctx.arc(0,0,BALL_R*0.6,Math.PI+0.4,-0.4); ctx.stroke()
      ctx.restore()
    }

    function drawHUD() {
      ctx.fillStyle="rgba(10,5,30,0.88)"; ctx.strokeStyle="#2D2D2D"; ctx.lineWidth=3
      ctx.beginPath(); ctx.roundRect(CW/2-100,6,200,50,10); ctx.fill(); ctx.stroke()
      ctx.fillStyle="#F5EFE0"; ctx.font="bold 22px 'Press Start 2P',monospace"; ctx.textAlign="center"; ctx.textBaseline="middle"
      ctx.fillText(`${scores[0]}  –  ${scores[1]}`,CW/2,26)
      ctx.font="7px 'Press Start 2P',monospace"; ctx.fillStyle="#A0C4FF"
      ctx.fillText(`FIRST TO ${WIN}`,CW/2,46)
      ctx.font="7px 'Press Start 2P',monospace"; ctx.fillStyle="#C17A2A"; ctx.textAlign="left"; ctx.fillText(p1.name.slice(0,6),CW/2-94,22)
      ctx.fillStyle="#8B7FDB"; ctx.textAlign="right"; ctx.fillText(p2.name.slice(0,6),CW/2+94,22)
      if(scoreFlash>0){
        ctx.save(); ctx.globalAlpha=Math.min(1,scoreFlash*0.5)
        ctx.fillStyle=scoreFlashSide===0?"rgba(193,122,42,0.3)":"rgba(91,63,219,0.3)"; ctx.fillRect(0,0,CW,CH)
        ctx.globalAlpha=Math.min(1,scoreFlash); ctx.fillStyle="#F0B429"
        ctx.font="bold 26px 'Press Start 2P',monospace"; ctx.textAlign="center"; ctx.textBaseline="middle"
        ctx.shadowColor="#000"; ctx.shadowBlur=10
        const msg = dunkAnim>0?"🔥 DUNK!":"🏀 BASKET!"
        ctx.fillText(msg,CW/2,CH/2); ctx.shadowBlur=0; ctx.restore()
      }
    }

    function drawButtons() {
      for(const [k,label,color] of [["left","←","#C17A2A"],["right","→","#C17A2A"],["up","↑","#5B3FDB"],["a","SHOOT","#E8A020"],["t","TACKLE","#E05050"]]) {
        const b=BTN[k]; if(!b) continue
        ctx.save()
        ctx.fillStyle=keys[k]?color:"rgba(30,20,70,0.85)"; ctx.strokeStyle=keys[k]?"#FFD700":"#2D2D2D"; ctx.lineWidth=3
        ctx.beginPath(); ctx.roundRect(b.x,b.y,b.w,b.h,12); ctx.fill(); ctx.stroke()
        ctx.fillStyle=keys[k]?"#FFD700":"#F5EFE0"
        ctx.font=`bold ${label.length>2?9:20}px 'Press Start 2P',monospace`; ctx.textAlign="center"; ctx.textBaseline="middle"
        ctx.fillText(label,b.x+b.w/2,b.y+b.h/2); ctx.restore()
      }
    }

    let animId
    function loop(now) {
      animId=requestAnimationFrame(loop)
      if(gameOver){draw();return}
      const delta=Math.min((now-lastTime)/1000,0.05); lastTime=now
      scoreFlash=Math.max(0,scoreFlash-delta*1.2)

      // P1 input
      if(keys.left)  p1.vx=-MOVE_SPD
      if(keys.right) p1.vx= MOVE_SPD
      if(!keys.left&&!keys.right) p1.vx*=0.7
      if(keys.up&&p1.onGround){p1.vy=JUMP_V;p1.onGround=false}
      if(keys.a&&p1.hasBall) { shootBall(p1,hoopR) }
      // T = TACKLE — only works when close to opponent (within 2 body widths)
      if(keys.t&&p1.stealCooldown<=0) {
        const d=Math.hypot(p2.x-p1.x,p2.y-p1.y)
        if(d<DOG_R*2.8&&p2.hasBall){
          p2.hasBall=false; ball.flying=true
          ball.vx=(Math.random()-0.5)*8; ball.vy=-5
          p1.stealCooldown=1.8
          // Tackle knockback
          p2.vx=(p2.x-p1.x>0?1:-1)*5; p2.vy=-4
        }
      }
      if(p1.stealCooldown>0)p1.stealCooldown-=delta
      if(dunkAnim>0)dunkAnim-=delta

      updateAI(delta)
      updatePlayer(p1,delta); updatePlayer(p2,delta)
      updateBall(delta)
      draw()
    }

    function draw() {
      ctx.clearRect(0,0,CW,CH)
      drawBackground()
      drawHoop(hoopL,"#C17A2A"); drawHoop(hoopR,"#5B3FDB")
      drawDog(p1); drawDog(p2)
      drawBallFree()
      drawHUD(); drawButtons()
    }

    animId=requestAnimationFrame(loop)
    const onResize=()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;layoutButtons()}
    window.addEventListener("resize",onResize)
    return ()=>{
      cancelAnimationFrame(animId)
      canvas.removeEventListener("touchstart",onTouchStart)
      canvas.removeEventListener("touchend",onTouchEnd)
      window.removeEventListener("keydown",onKeyDown)
      window.removeEventListener("keyup",onKeyUp)
      window.removeEventListener("resize",onResize)
    }
  },[config])
  return <canvas ref={ref} style={{display:"block",width:"100vw",height:"100vh",touchAction:"none"}} />
}
