/**
 * Head Ball — 1v1 side-view, big dog heads, physics ball
 * Controls: left/right move, up jump, A = power kick, T = tackle
 * PVP: Supabase Realtime via FootballSync
 * First to 5 goals OR most goals after 90s wins
 */
import { useEffect, useRef } from "react"

const GRAVITY  = 0.52
const JUMP_V   = -17
const SPD      = 4.8
const BALL_R   = 20
const DOG_R    = 34
const WIN      = 5
const GAME_SEC = 90

export default function FootballCanvas({ config }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const CW = canvas.width, CH = canvas.height
    const FLOOR = CH - 80
    const CEIL  = 50
    const GOAL_H = CH * 0.40
    const GOAL_W = 24
    const GOAL_Y = FLOOR - GOAL_H
    const MID_X  = CW / 2
    const isPVP  = config?.mode === "pvp"
    const localSide = config?.side || "left"

    const p1 = { x:CW*0.22, y:FLOOR-DOG_R, vx:0, vy:0, onGround:true, color:"#C17A2A", name:"YOU",  side:"left",  minX:GOAL_W+DOG_R, maxX:MID_X-DOG_R-4, power:false, powerTimer:0, tackleCd:0 }
    const p2 = { x:CW*0.78, y:FLOOR-DOG_R, vx:0, vy:0, onGround:true, color:"#5B3FDB", name:isPVP?(config?.opponent||"P2"):"AI", side:"right", minX:MID_X+DOG_R+4, maxX:CW-GOAL_W-DOG_R, power:false, powerTimer:0, tackleCd:0 }
    const ball = { x:MID_X, y:CH*0.28, vx:2, vy:-3, spin:0 }

    let scores=[0,0], timeLeft=GAME_SEC, gameOver=false, lastTime=performance.now()
    let goalFlash=0, goalSide=0

    // PVP sync
    let sync=null
    async function initSync() {
      if (!isPVP || !config?.roomId) return
      const { FootballSync } = await import("../../lib/football/FootballSync")
      sync = new FootballSync(config.roomId, localSide)
      sync
        .on("onRemoteInput", p => {
          const rp = localSide==="left" ? p2 : p1
          if (p.vx !== undefined) rp.vx = p.vx
          if (p.jump) { rp.vy = JUMP_V; rp.onGround = false }
          if (p.power) { rp.power = true; rp.powerTimer = 0.15 }
          if (p.tackle) {
            const opp = localSide==="left" ? p1 : p2
            const d = Math.hypot(rp.x-opp.x, rp.y-opp.y)
            if (d < DOG_R*2.8) { ball.vx=(ball.x-opp.x>0?1:-1)*7; ball.vy=-5; opp.vx=(opp.x-rp.x>0?1:-1)*6; opp.vy=-5 }
          }
        })
        .on("onGoal", p => {
          scores[0]=p.s0; scores[1]=p.s1
          goalFlash=1.8; goalSide=p.side==="left"?0:1
          window.ANAGO_UI?.updateScore(scores[0],scores[1])
          resetBall()
        })
        .on("onGameEnd", p => {
          gameOver=true
          window.ANAGO_UI?.showResult(p.winnerSide==="left"?0:1,[p.s0,p.s1])
        })
        .connect()
    }
    initSync()

    // Input
    const keys={left:false,right:false,up:false,a:false,t:false}
    const BTN={}, activeTouches={}
    let jumpPressed=false, kickPressed=false, tacklePressed=false

    function getPos(e) {
      const r=canvas.getBoundingClientRect()
      const s=e.touches?e.touches[0]:e
      return {x:(s.clientX-r.left)*(CW/r.width),y:(s.clientY-r.top)*(CH/r.height)}
    }
    function inBtn(pos,k){const b=BTN[k];if(!b)return false;return pos.x>=b.x&&pos.x<=b.x+b.w&&pos.y>=b.y&&pos.y<=b.y+b.h}

    function onTouchStart(e) {
      e.preventDefault()
      for(const t of e.changedTouches){
        const r=canvas.getBoundingClientRect()
        const pos={x:(t.clientX-r.left)*(CW/r.width),y:(t.clientY-r.top)*(CH/r.height)}
        for(const k of ["left","right","up","a","t"]){if(inBtn(pos,k)){keys[k]=true;activeTouches[t.identifier]=k}}
      }
    }
    function onTouchEnd(e){e.preventDefault();for(const t of e.changedTouches){const k=activeTouches[t.identifier];if(k){keys[k]=false;delete activeTouches[t.identifier]}}}
    function onKeyDown(e){if(e.key==="ArrowLeft")keys.left=true;if(e.key==="ArrowRight")keys.right=true;if(e.key==="ArrowUp")keys.up=true;if(e.key==="a"||e.key==="A")keys.a=true;if(e.key==="t"||e.key==="T")keys.t=true}
    function onKeyUp(e){if(e.key==="ArrowLeft")keys.left=false;if(e.key==="ArrowRight")keys.right=false;if(e.key==="ArrowUp")keys.up=false;if(e.key==="a"||e.key==="A")keys.a=false;if(e.key==="t"||e.key==="T")keys.t=false}

    canvas.addEventListener("touchstart",onTouchStart,{passive:false})
    canvas.addEventListener("touchend",onTouchEnd,{passive:false})
    window.addEventListener("keydown",onKeyDown)
    window.addEventListener("keyup",onKeyUp)

    function layoutButtons(){
      const bw=72,bh=72,gap=8,by=CH-bh-12
      BTN.left={x:12,y:by,w:bw,h:bh}
      BTN.right={x:12+bw+gap,y:by,w:bw,h:bh}
      BTN.up={x:CW-bw-12,y:by,w:bw,h:bh}
      BTN.a={x:CW-bw*2-gap-12,y:by,w:bw,h:bh}
      BTN.t={x:CW-bw*3-gap*2-12,y:by,w:bw,h:bh}
    }
    layoutButtons()

    // AI
    let aiTimer=0
    function updateAI(delta){
      if(isPVP)return
      aiTimer+=delta;if(aiTimer<0.1)return;aiTimer=0
      const dx=ball.x-p2.x
      if(Math.abs(dx)>8)p2.vx=Math.sign(dx)*SPD*0.88
      else p2.vx=0
      if(ball.y<p2.y-30&&p2.onGround&&Math.abs(dx)<160){p2.vy=JUMP_V;p2.onGround=false}
      if(Math.hypot(ball.x-p2.x,ball.y-p2.y)<DOG_R+BALL_R+12){p2.power=true;p2.powerTimer=0.15}
      if(p2.tackleCd<=0&&Math.hypot(p1.x-p2.x,p1.y-p2.y)<DOG_R*2.8&&Math.random()<0.06){
        ball.vx=(ball.x-p1.x>0?1:-1)*7;ball.vy=-5;p1.vx=(p1.x-p2.x>0?1:-1)*6;p1.vy=-5;p2.tackleCd=1.5
      }
      if(p2.tackleCd>0)p2.tackleCd-=delta
    }

    function updatePlayer(p,delta){
      p.vy+=GRAVITY;p.x+=p.vx;p.y+=p.vy;p.vx*=0.80
      if(p.y+DOG_R>=FLOOR){p.y=FLOOR-DOG_R;p.vy=0;p.onGround=true}
      if(p.y-DOG_R<=CEIL){p.y=CEIL+DOG_R;p.vy*=-0.4}
      p.x=Math.max(p.minX,Math.min(p.maxX,p.x))
      if(p.powerTimer>0){p.powerTimer-=delta;if(p.powerTimer<=0)p.power=false}
      if(p.tackleCd>0)p.tackleCd-=delta
    }

    function updateBall(){
      ball.vy+=GRAVITY*0.86;ball.x+=ball.vx;ball.y+=ball.vy;ball.vx*=0.993;ball.spin+=ball.vx*0.05
      if(ball.y+BALL_R>=FLOOR){ball.y=FLOOR-BALL_R;ball.vy*=-0.70;ball.vx*=0.86;if(Math.abs(ball.vy)<1.8)ball.vy=-1.8}
      if(ball.y-BALL_R<=CEIL){ball.y=CEIL+BALL_R;ball.vy*=-0.55}
      if(ball.x-BALL_R<=GOAL_W){if(ball.y>GOAL_Y){doGoal(1);return}ball.x=GOAL_W+BALL_R;ball.vx*=-0.65}
      if(ball.x+BALL_R>=CW-GOAL_W){if(ball.y>GOAL_Y){doGoal(0);return}ball.x=CW-GOAL_W-BALL_R;ball.vx*=-0.65}
      for(const p of [p1,p2]){
        const dx=ball.x-p.x,dy=ball.y-p.y,dd=Math.hypot(dx,dy),minD=DOG_R+BALL_R
        if(dd<minD&&dd>0){
          const nx=dx/dd,ny=dy/dd,rv=(ball.vx-p.vx)*nx+(ball.vy-p.vy)*ny
          if(rv<0){const imp=-rv*(p.power?2.4:1.7);ball.vx+=nx*imp;ball.vy+=ny*imp-(p.power?4:1.5)}
          const ov=minD-dd;ball.x+=nx*ov;ball.y+=ny*ov
        }
      }
    }

    function doGoal(scorerIdx){
      scores[scorerIdx]++;goalFlash=2;goalSide=scorerIdx
      window.ANAGO_UI?.updateScore(scores[0],scores[1])
      if(isPVP&&sync)sync.broadcastGoal(scorerIdx===0?"left":"right",scores[0],scores[1])
      if(scores[scorerIdx]>=WIN){
        gameOver=true
        if(isPVP&&sync)sync.broadcastGameEnd(scorerIdx===0?"left":"right",scores[0],scores[1])
        window.ANAGO_UI?.showResult(scorerIdx,[...scores]);return
      }
      resetBall()
    }

    function resetBall(){ball.x=MID_X;ball.y=CH*0.28;ball.vx=(Math.random()>0.5?1:-1)*2.5;ball.vy=-4;ball.spin=0}

    // Draw
    function drawBg(){
      const g=ctx.createLinearGradient(0,0,0,CH)
      g.addColorStop(0,"#1a1a2e");g.addColorStop(0.5,"#16213e");g.addColorStop(1,"#0f3460")
      ctx.fillStyle=g;ctx.fillRect(0,0,CW,CH)
      ctx.fillStyle="rgba(255,255,255,0.05)"
      for(let i=0;i<50;i++){const cx=(i/50)*CW,cy=18+Math.sin(i*1.4)*10;ctx.beginPath();ctx.arc(cx,cy,6+Math.sin(i)*2,0,Math.PI*2);ctx.fill()}
      ctx.fillStyle="#2d8a2d";ctx.fillRect(0,CEIL,CW,FLOOR-CEIL)
      ctx.fillStyle="rgba(0,0,0,0.07)"
      for(let i=0;i<8;i+=2)ctx.fillRect(i*CW/8,CEIL,CW/8,FLOOR-CEIL)
      ctx.fillStyle="#1a6b1a";ctx.fillRect(0,FLOOR,CW,CH-FLOOR)
      ctx.strokeStyle="rgba(255,255,255,0.65)";ctx.lineWidth=2
      ctx.beginPath();ctx.moveTo(MID_X,CEIL);ctx.lineTo(MID_X,FLOOR);ctx.stroke()
      ctx.beginPath();ctx.arc(MID_X,FLOOR,60,Math.PI,0);ctx.stroke()
      ctx.fillStyle="rgba(255,255,255,0.65)";ctx.beginPath();ctx.arc(MID_X,FLOOR,5,0,Math.PI*2);ctx.fill()
    }

    function drawGoals(){
      for(const [gx,col] of [[0,"rgba(193,122,42,0.35)"],[CW-GOAL_W,"rgba(91,63,219,0.35)"]]){
        ctx.fillStyle=col;ctx.fillRect(gx,GOAL_Y,GOAL_W,GOAL_H)
        ctx.strokeStyle="#FFF";ctx.lineWidth=3;ctx.strokeRect(gx,GOAL_Y,GOAL_W,GOAL_H)
        ctx.strokeStyle="rgba(255,255,255,0.2)";ctx.lineWidth=1
        for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(gx,GOAL_Y+GOAL_H*i/5);ctx.lineTo(gx+GOAL_W,GOAL_Y+GOAL_H*i/5);ctx.stroke()}
        for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(gx+GOAL_W*i/3,GOAL_Y);ctx.lineTo(gx+GOAL_W*i/3,FLOOR);ctx.stroke()}
      }
    }

    function drawDog(p){
      ctx.save();ctx.translate(p.x,p.y)
      ctx.fillStyle="rgba(0,0,0,0.22)";ctx.beginPath();ctx.ellipse(0,DOG_R+4,DOG_R*0.8,7,0,0,Math.PI*2);ctx.fill()
      if(p.power){ctx.shadowColor="#FFD700";ctx.shadowBlur=22;ctx.strokeStyle="#FFD700";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,DOG_R+9,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0}
      ctx.fillStyle=p.color;ctx.strokeStyle="#1A1A1A";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,DOG_R,0,Math.PI*2);ctx.fill();ctx.stroke()
      ctx.fillStyle="#C4956A";ctx.beginPath();ctx.ellipse(6,4,DOG_R*0.46,DOG_R*0.38,0.3,0,Math.PI*2);ctx.fill()
      ctx.fillStyle=p.color;ctx.strokeStyle="#1A1A1A";ctx.lineWidth=2.5
      ctx.beginPath();ctx.ellipse(-DOG_R*0.72,-DOG_R*0.72,7,13,-0.4,0,Math.PI*2);ctx.fill();ctx.stroke()
      ctx.beginPath();ctx.ellipse(DOG_R*0.72,-DOG_R*0.72,7,13,0.4,0,Math.PI*2);ctx.fill();ctx.stroke()
      ctx.fillStyle="#F4A0A0";ctx.beginPath();ctx.ellipse(-DOG_R*0.7,-DOG_R*0.7,4,8,-0.4,0,Math.PI*2);ctx.fill()
      ctx.beginPath();ctx.ellipse(DOG_R*0.7,-DOG_R*0.7,4,8,0.4,0,Math.PI*2);ctx.fill()
      ctx.fillStyle="#1A1A1A";ctx.beginPath();ctx.arc(-10,-8,5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(10,-8,5,0,Math.PI*2);ctx.fill()
      ctx.fillStyle="#FFF";ctx.beginPath();ctx.arc(-8,-10,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(12,-10,2,0,Math.PI*2);ctx.fill()
      ctx.fillStyle="#C4956A";ctx.strokeStyle="#1A1A1A";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(2,4,11,8,0,0,Math.PI*2);ctx.fill();ctx.stroke()
      ctx.fillStyle="#1A1A1A";ctx.beginPath();ctx.arc(2,2,4,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle=p.side==="left"?"#5B3FDB":"#C17A2A";ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,DOG_R*0.3,DOG_R*0.7,-2.3,-0.8);ctx.stroke()
      ctx.fillStyle="rgba(20,10,50,0.88)";ctx.strokeStyle="#2D2D2D";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-30,DOG_R+8,60,18,4);ctx.fill();ctx.stroke()
      ctx.fillStyle=p.side==="left"?"#C17A2A":"#8B7FDB";ctx.font="bold 8px 'Press Start 2P',monospace";ctx.textAlign="center";ctx.textBaseline="middle"
      ctx.fillText(p.name.slice(0,6),0,DOG_R+17)
      ctx.restore()
    }

    function drawBall(){
      ctx.fillStyle="rgba(0,0,0,0.22)";ctx.beginPath();ctx.ellipse(ball.x+3,ball.y+BALL_R+2,BALL_R*0.9,5,0,0,Math.PI*2);ctx.fill()
      ctx.save();ctx.translate(ball.x,ball.y);ctx.rotate(ball.spin)
      ctx.fillStyle="#F5EFE0";ctx.strokeStyle="#1A1A1A";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,BALL_R,0,Math.PI*2);ctx.fill();ctx.stroke()
      ctx.fillStyle="#1A1A1A";ctx.beginPath();ctx.arc(0,0,BALL_R*0.28,0,Math.PI*2);ctx.fill()
      for(let i=0;i<5;i++){const a=(i/5)*Math.PI*2-Math.PI/2;ctx.beginPath();ctx.arc(Math.cos(a)*BALL_R*0.62,Math.sin(a)*BALL_R*0.62,BALL_R*0.18,0,Math.PI*2);ctx.fill()}
      ctx.restore()
    }

    function drawHUD(){
      ctx.fillStyle="rgba(10,5,30,0.9)";ctx.strokeStyle="#2D2D2D";ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(CW/2-105,6,210,50,10);ctx.fill();ctx.stroke()
      ctx.font="bold 9px 'Press Start 2P',monospace";ctx.fillStyle="#C17A2A";ctx.textAlign="left";ctx.fillText(p1.name.slice(0,6),CW/2-98,22)
      ctx.fillStyle="#8B7FDB";ctx.textAlign="right";ctx.fillText(p2.name.slice(0,6),CW/2+98,22)
      ctx.fillStyle="#F5EFE0";ctx.font="bold 24px 'Press Start 2P',monospace";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(`${scores[0]}  –  ${scores[1]}`,CW/2,36)
      ctx.font="7px 'Press Start 2P',monospace";ctx.fillStyle=timeLeft<=15?"#FF6B6B":"#A0C4FF";ctx.fillText(`${Math.ceil(timeLeft)}s`,CW/2,50)
      if(goalFlash>0){
        ctx.save();ctx.globalAlpha=Math.min(1,goalFlash*0.55)
        ctx.fillStyle=goalSide===0?"rgba(193,122,42,0.35)":"rgba(91,63,219,0.35)";ctx.fillRect(0,0,CW,CH)
        ctx.globalAlpha=Math.min(1,goalFlash);ctx.fillStyle="#F0B429";ctx.font="bold 30px 'Press Start 2P',monospace";ctx.textAlign="center";ctx.textBaseline="middle"
        ctx.shadowColor="#000";ctx.shadowBlur=12;ctx.fillText("⚽ GOAL! ⚽",CW/2,CH/2);ctx.shadowBlur=0;ctx.restore()
      }
    }

    function drawButtons(){
      for(const [k,label,color] of [["left","←","#C17A2A"],["right","→","#C17A2A"],["up","↑","#5B3FDB"],["a","KICK","#E05050"],["t","TACKLE","#E8A020"]]){
        const b=BTN[k];if(!b)continue
        ctx.save();ctx.fillStyle=keys[k]?color:"rgba(30,20,70,0.85)";ctx.strokeStyle=keys[k]?"#FFD700":"#2D2D2D";ctx.lineWidth=3
        ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,12);ctx.fill();ctx.stroke()
        ctx.fillStyle=keys[k]?"#FFD700":"#F5EFE0";ctx.font=`bold ${label.length>2?9:22}px 'Press Start 2P',monospace`;ctx.textAlign="center";ctx.textBaseline="middle"
        ctx.fillText(label,b.x+b.w/2,b.y+b.h/2);ctx.restore()
      }
    }

    let animId
    function loop(now){
      animId=requestAnimationFrame(loop)
      if(gameOver){draw();return}
      const delta=Math.min((now-lastTime)/1000,0.05);lastTime=now
      timeLeft-=delta;goalFlash=Math.max(0,goalFlash-delta*1.3)

      // P1 input
      if(keys.left)p1.vx=-SPD
      if(keys.right)p1.vx=SPD
      if(!keys.left&&!keys.right)p1.vx*=0.72
      if(keys.up&&p1.onGround){p1.vy=JUMP_V;p1.onGround=false;if(isPVP&&sync)sync.broadcastInput({jump:true})}
      if(keys.a){p1.power=true;p1.powerTimer=0.15;if(isPVP&&sync)sync.broadcastInput({power:true})}
      if(keys.t&&p1.tackleCd<=0){
        const d=Math.hypot(p2.x-p1.x,p2.y-p1.y)
        if(d<DOG_R*2.8){ball.vx=(ball.x-p2.x>0?1:-1)*8;ball.vy=-6;p2.vx=(p2.x-p1.x>0?1:-1)*7;p2.vy=-6;p1.tackleCd=1.5;if(isPVP&&sync)sync.broadcastInput({tackle:true})}
      }
      if(p1.tackleCd>0)p1.tackleCd-=delta

      // Broadcast movement in PVP
      if(isPVP&&sync)sync.broadcastInput({vx:p1.vx})

      updateAI(delta)
      updatePlayer(p1,delta);updatePlayer(p2,delta)
      updateBall()

      if(timeLeft<=0){
        timeLeft=0;gameOver=true
        const winner=scores[0]>=scores[1]?0:1
        if(isPVP&&sync)sync.broadcastGameEnd(winner===0?"left":"right",scores[0],scores[1])
        window.ANAGO_UI?.showResult(winner,[...scores])
      }
      draw()
    }

    function draw(){
      ctx.clearRect(0,0,CW,CH)
      drawBg();drawGoals();drawDog(p1);drawDog(p2);drawBall();drawHUD();drawButtons()
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
      sync?.disconnect()
    }
  },[config])
  return <canvas ref={ref} style={{display:"block",width:"100vw",height:"100vh",touchAction:"none"}} />
}
