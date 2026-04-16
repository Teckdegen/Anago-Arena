/**
 * Head Ball — rebuilt with real dog characters, 2.5D goals, better feel
 * Landscape optimised, smaller controls, stadium atmosphere
 */
import { useEffect, useRef } from "react"

const GRAVITY  = 0.48
const JUMP_V   = -18
const SPD      = 5.2
const BALL_R   = 18
const HEAD_R   = 42   // bigger dog head
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

    const p1 = { x:CW*0.22, y:FLOOR-HEAD_R, vx:0, vy:0, onGround:true, color:"#C17A2A", darkColor:"#8B5010", name:"YOU",  side:"left",  minX:GOAL_W+HEAD_R, maxX:MID_X-HEAD_R-4, power:false, powerTimer:0, tackleCd:0, kickAnim:0 }
    const p2 = { x:CW*0.78, y:FLOOR-HEAD_R, vx:0, vy:0, onGround:true, color:"#5B3FDB", darkColor:"#3A2490", name:isPVP?(config?.opponent||"P2"):"AI", side:"right", minX:MID_X+HEAD_R+4, maxX:CW-GOAL_W-HEAD_R, power:false, powerTimer:0, tackleCd:0, kickAnim:0 }
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
      // Smaller buttons for landscape
      const bw=52,bh=52,gap=6,by=CH-bh-10
      BTN.left={x:10,y:by,w:bw,h:bh}
      BTN.right={x:10+bw+gap,y:by,w:bw,h:bh}
      BTN.up={x:CW-bw-10,y:by,w:bw,h:bh}
      BTN.a={x:CW-bw*2-gap-10,y:by,w:bw,h:bh}
      BTN.t={x:CW-bw*3-gap*2-10,y:by,w:bw,h:bh}
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
      if(Math.hypot(ball.x-p2.x,ball.y-p2.y)<HEAD_R+BALL_R+12){p2.power=true;p2.powerTimer=0.15}
      if(p2.tackleCd<=0&&Math.hypot(p1.x-p2.x,p1.y-p2.y)<HEAD_R*2.8&&Math.random()<0.06){
        ball.vx=(ball.x-p1.x>0?1:-1)*7;ball.vy=-5;p1.vx=(p1.x-p2.x>0?1:-1)*6;p1.vy=-5;p2.tackleCd=1.5
      }
      if(p2.tackleCd>0)p2.tackleCd-=delta
    }

    function updatePlayer(p,delta){
      p.vy+=GRAVITY;p.x+=p.vx;p.y+=p.vy;p.vx*=0.80
      if(p.y+HEAD_R>=FLOOR){p.y=FLOOR-HEAD_R;p.vy=0;p.onGround=true}
      if(p.y-HEAD_R<=CEIL){p.y=CEIL+HEAD_R;p.vy*=-0.4}
      p.x=Math.max(p.minX,Math.min(p.maxX,p.x))
      if(p.powerTimer>0){p.powerTimer-=delta;if(p.powerTimer<=0)p.power=false}
      if(p.tackleCd>0)p.tackleCd-=delta
      if(p.kickAnim>0)p.kickAnim-=delta
    }

    function updateBall(){
      ball.vy+=GRAVITY*0.86;ball.x+=ball.vx;ball.y+=ball.vy;ball.vx*=0.993;ball.spin+=ball.vx*0.05
      if(ball.y+BALL_R>=FLOOR){ball.y=FLOOR-BALL_R;ball.vy*=-0.70;ball.vx*=0.86;if(Math.abs(ball.vy)<1.8)ball.vy=-1.8}
      if(ball.y-BALL_R<=CEIL){ball.y=CEIL+BALL_R;ball.vy*=-0.55}
      if(ball.x-BALL_R<=GOAL_W){if(ball.y>GOAL_Y){doGoal(1);return}ball.x=GOAL_W+BALL_R;ball.vx*=-0.65}
      if(ball.x+BALL_R>=CW-GOAL_W){if(ball.y>GOAL_Y){doGoal(0);return}ball.x=CW-GOAL_W-BALL_R;ball.vx*=-0.65}
      for(const p of [p1,p2]){
        const dx=ball.x-p.x,dy=ball.y-p.y,dd=Math.hypot(dx,dy),minD=HEAD_R+BALL_R
        if(dd<minD&&dd>0){
          const nx=dx/dd,ny=dy/dd,rv=(ball.vx-p.vx)*nx+(ball.vy-p.vy)*ny
          if(rv<0){const imp=-rv*(p.power?2.6:1.8);ball.vx+=nx*imp;ball.vy+=ny*imp-(p.power?5:2);p.kickAnim=0.2}
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

    function drawBg(){
      // Sky gradient — stadium atmosphere
      const g=ctx.createLinearGradient(0,0,0,CH)
      g.addColorStop(0,"#0a0a1a");g.addColorStop(0.3,"#1a1a3e");g.addColorStop(1,"#0f2010")
      ctx.fillStyle=g;ctx.fillRect(0,0,CW,CH)

      // Stadium lights glow
      for(const lx of [CW*0.15,CW*0.5,CW*0.85]){
        const lg=ctx.createRadialGradient(lx,0,0,lx,0,CH*0.4)
        lg.addColorStop(0,"rgba(255,255,200,0.12)");lg.addColorStop(1,"transparent")
        ctx.fillStyle=lg;ctx.fillRect(0,0,CW,CH)
      }

      // Crowd silhouette — more detailed
      ctx.fillStyle="rgba(80,60,120,0.6)"
      for(let i=0;i<80;i++){
        const cx=(i/80)*CW,cy=CEIL-8+Math.sin(i*2.1)*6
        const r=5+Math.sin(i*1.3)*2
        ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill()
      }
      // Second row
      ctx.fillStyle="rgba(60,40,100,0.5)"
      for(let i=0;i<60;i++){
        const cx=(i/60)*CW+CW/120,cy=CEIL-20+Math.sin(i*1.7)*5
        ctx.beginPath();ctx.arc(cx,cy,4+Math.sin(i)*1.5,0,Math.PI*2);ctx.fill()
      }

      // Pitch — bright green with stripes
      ctx.fillStyle="#1a7a1a";ctx.fillRect(0,CEIL,CW,FLOOR-CEIL)
      for(let i=0;i<10;i++){
        ctx.fillStyle=i%2===0?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.03)"
        ctx.fillRect(i*CW/10,CEIL,CW/10,FLOOR-CEIL)
      }

      // Pitch lines
      ctx.strokeStyle="rgba(255,255,255,0.7)";ctx.lineWidth=2
      // Centre line
      ctx.beginPath();ctx.moveTo(MID_X,CEIL+10);ctx.lineTo(MID_X,FLOOR);ctx.stroke()
      // Centre circle
      ctx.beginPath();ctx.arc(MID_X,FLOOR,CH*0.12,Math.PI,0);ctx.stroke()
      ctx.fillStyle="rgba(255,255,255,0.7)";ctx.beginPath();ctx.arc(MID_X,FLOOR,4,0,Math.PI*2);ctx.fill()
      // Penalty areas
      const penW=CW*0.12,penH=(FLOOR-CEIL)*0.55,penY=FLOOR-penH
      ctx.strokeRect(0,penY,penW,penH)
      ctx.strokeRect(CW-penW,penY,penW,penH)

      // Ground
      ctx.fillStyle="#0f4a0f";ctx.fillRect(0,FLOOR,CW,CH-FLOOR)
      // Ground line
      ctx.fillStyle="#1a6b1a";ctx.fillRect(0,FLOOR,CW,4)
    }

    function drawGoals(){
      // 2.5D perspective goals — depth effect
      const GH=GOAL_H, GW=GOAL_W
      const depth=18  // depth of goal in pixels

      for(const [isLeft,teamCol] of [[true,"#C17A2A"],[false,"#5B3FDB"]]){
        const gx=isLeft?0:CW-GW
        const gy=GOAL_Y

        // Back net (darker, perspective)
        ctx.fillStyle="rgba(255,255,255,0.08)"
        if(isLeft){
          ctx.beginPath()
          ctx.moveTo(gx+GW,gy);ctx.lineTo(gx+GW+depth,gy-depth*0.5)
          ctx.lineTo(gx+GW+depth,gy+GH-depth*0.5);ctx.lineTo(gx+GW,gy+GH)
          ctx.closePath();ctx.fill()
        } else {
          ctx.beginPath()
          ctx.moveTo(gx,gy);ctx.lineTo(gx-depth,gy-depth*0.5)
          ctx.lineTo(gx-depth,gy+GH-depth*0.5);ctx.lineTo(gx,gy+GH)
          ctx.closePath();ctx.fill()
        }

        // Net pattern on back
        ctx.strokeStyle="rgba(255,255,255,0.15)";ctx.lineWidth=1
        const nx=isLeft?gx+GW:gx-depth, nx2=isLeft?gx+GW+depth:gx
        for(let i=0;i<=5;i++){
          const t=i/5
          const y1=gy+GH*t, y2=gy+GH*t-depth*0.5
          ctx.beginPath();ctx.moveTo(nx,y1);ctx.lineTo(nx2,y2);ctx.stroke()
        }
        for(let i=0;i<=4;i++){
          const t=i/4
          const x1=nx+t*(nx2-nx), x2=nx+t*(nx2-nx)
          ctx.beginPath();ctx.moveTo(x1,gy);ctx.lineTo(x2,gy+GH-depth*0.5);ctx.stroke()
        }

        // Front net (main face)
        ctx.fillStyle=`rgba(${isLeft?"193,122,42":"91,63,219"},0.2)`
        ctx.fillRect(gx,gy,GW,GH)

        // Net grid on front
        ctx.strokeStyle="rgba(255,255,255,0.3)";ctx.lineWidth=1
        for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo(gx,gy+GH*i/6);ctx.lineTo(gx+GW,gy+GH*i/6);ctx.stroke()}
        for(let i=1;i<3;i++){ctx.beginPath();ctx.moveTo(gx+GW*i/3,gy);ctx.lineTo(gx+GW*i/3,gy+GH);ctx.stroke()}

        // Goal posts — white thick
        ctx.strokeStyle="#FFFFFF";ctx.lineWidth=4
        ctx.strokeRect(gx,gy,GW,GH)

        // Post shadow
        ctx.strokeStyle="rgba(0,0,0,0.4)";ctx.lineWidth=2
        ctx.strokeRect(gx+1,gy+1,GW,GH)

        // Team colour accent on post
        ctx.strokeStyle=teamCol;ctx.lineWidth=3
        ctx.beginPath()
        if(isLeft){ctx.moveTo(gx+GW,gy);ctx.lineTo(gx+GW,gy+GH)}
        else{ctx.moveTo(gx,gy);ctx.lineTo(gx,gy+GH)}
        ctx.stroke()
      }
    }

    // Real French Bulldog head character
    function drawDog(p){
      const R=HEAD_R
      ctx.save();ctx.translate(p.x,p.y)

      // Kick animation tilt
      if(p.kickAnim>0){
        const tilt=(p.side==="left"?1:-1)*0.3*(p.kickAnim/0.2)
        ctx.rotate(tilt)
      }

      // Shadow
      ctx.fillStyle="rgba(0,0,0,0.3)"
      ctx.beginPath();ctx.ellipse(0,R+6,R*0.85,8,0,0,Math.PI*2);ctx.fill()

      // Power glow
      if(p.power){
        ctx.shadowColor="#FFD700";ctx.shadowBlur=28
        ctx.strokeStyle="#FFD700";ctx.lineWidth=4
        ctx.beginPath();ctx.arc(0,0,R+12,0,Math.PI*2);ctx.stroke()
        ctx.shadowBlur=0
      }

      // ── BODY (small, below head) ──────────────────────
      ctx.fillStyle=p.darkColor;ctx.strokeStyle="#1A1008";ctx.lineWidth=2.5
      ctx.beginPath();ctx.ellipse(0,R*0.55,R*0.55,R*0.38,0,0,Math.PI*2);ctx.fill();ctx.stroke()
      // Belly
      ctx.fillStyle="#F5EFE0"
      ctx.beginPath();ctx.ellipse(0,R*0.62,R*0.28,R*0.22,0,0,Math.PI*2);ctx.fill()

      // ── HEAD (big, dominant) ──────────────────────────
      ctx.fillStyle=p.color;ctx.strokeStyle="#1A1008";ctx.lineWidth=3
      ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.fill();ctx.stroke()

      // Tan face markings (brindle pattern)
      ctx.fillStyle="#C4956A"
      ctx.beginPath();ctx.ellipse(R*0.18,-R*0.05,R*0.42,R*0.35,0.25,0,Math.PI*2);ctx.fill()
      ctx.beginPath();ctx.ellipse(-R*0.12,R*0.08,R*0.22,R*0.18,-0.2,0,Math.PI*2);ctx.fill()

      // ── EARS (large pointed French Bulldog ears) ──────
      ctx.fillStyle=p.color;ctx.strokeStyle="#1A1008";ctx.lineWidth=2.5
      // Left ear
      ctx.beginPath()
      ctx.moveTo(-R*0.45,-R*0.55)
      ctx.quadraticCurveTo(-R*0.95,-R*1.15,-R*0.55,-R*1.35)
      ctx.quadraticCurveTo(-R*0.15,-R*1.15,-R*0.2,-R*0.6)
      ctx.closePath();ctx.fill();ctx.stroke()
      // Right ear
      ctx.beginPath()
      ctx.moveTo(R*0.45,-R*0.55)
      ctx.quadraticCurveTo(R*0.95,-R*1.15,R*0.55,-R*1.35)
      ctx.quadraticCurveTo(R*0.15,-R*1.15,R*0.2,-R*0.6)
      ctx.closePath();ctx.fill();ctx.stroke()
      // Inner ear pink
      ctx.fillStyle="#F4A0A0"
      ctx.beginPath()
      ctx.moveTo(-R*0.42,-R*0.6)
      ctx.quadraticCurveTo(-R*0.78,-R*1.05,-R*0.52,-R*1.22)
      ctx.quadraticCurveTo(-R*0.22,-R*1.05,-R*0.25,-R*0.65)
      ctx.closePath();ctx.fill()
      ctx.beginPath()
      ctx.moveTo(R*0.42,-R*0.6)
      ctx.quadraticCurveTo(R*0.78,-R*1.05,R*0.52,-R*1.22)
      ctx.quadraticCurveTo(R*0.22,-R*1.05,R*0.25,-R*0.65)
      ctx.closePath();ctx.fill()

      // ── EYES (closed happy arcs) ──────────────────────
      ctx.strokeStyle="#1A1008";ctx.lineWidth=3;ctx.lineCap="round"
      // Left eye — closed arc
      ctx.beginPath();ctx.arc(-R*0.32,-R*0.22,R*0.18,Math.PI*0.1,Math.PI*0.9);ctx.stroke()
      // Right eye
      ctx.beginPath();ctx.arc(R*0.32,-R*0.22,R*0.18,Math.PI*0.1,Math.PI*0.9);ctx.stroke()
      // Eye shine dots
      ctx.fillStyle="#1A1008"
      ctx.beginPath();ctx.arc(-R*0.32,-R*0.22,R*0.06,0,Math.PI*2);ctx.fill()
      ctx.beginPath();ctx.arc(R*0.32,-R*0.22,R*0.06,0,Math.PI*2);ctx.fill()

      // ── SNOUT (big flat bulldog snout) ────────────────
      ctx.fillStyle="#C4956A";ctx.strokeStyle="#1A1008";ctx.lineWidth=2.5
      ctx.beginPath();ctx.ellipse(0,R*0.12,R*0.42,R*0.28,0,0,Math.PI*2);ctx.fill();ctx.stroke()
      // Nose
      ctx.fillStyle="#1A1008"
      ctx.beginPath();ctx.ellipse(0,-R*0.02,R*0.2,R*0.14,0,0,Math.PI*2);ctx.fill()
      // Nostrils
      ctx.fillStyle="#0A0502"
      ctx.beginPath();ctx.ellipse(-R*0.1,R*0.02,R*0.06,R*0.04,0,0,Math.PI*2);ctx.fill()
      ctx.beginPath();ctx.ellipse(R*0.1,R*0.02,R*0.06,R*0.04,0,0,Math.PI*2);ctx.fill()
      // Mouth wrinkles
      ctx.strokeStyle="#8B5010";ctx.lineWidth=1.5
      ctx.beginPath();ctx.moveTo(-R*0.15,R*0.2);ctx.quadraticCurveTo(-R*0.08,R*0.28,0,R*0.22);ctx.stroke()
      ctx.beginPath();ctx.moveTo(R*0.15,R*0.2);ctx.quadraticCurveTo(R*0.08,R*0.28,0,R*0.22);ctx.stroke()

      // ── COLLAR ────────────────────────────────────────
      const collarCol=p.side==="left"?"#5B3FDB":"#C17A2A"
      ctx.strokeStyle=collarCol;ctx.lineWidth=6;ctx.lineCap="round"
      ctx.beginPath();ctx.arc(0,R*0.42,R*0.72,-2.4,-0.75);ctx.stroke()
      // Collar tag
      ctx.fillStyle=collarCol;ctx.strokeStyle="#1A1008";ctx.lineWidth=2
      ctx.beginPath();ctx.arc(0,R*0.78,R*0.12,0,Math.PI*2);ctx.fill();ctx.stroke()
      ctx.fillStyle="#FFF";ctx.font=`bold ${R*0.12}px sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle"
      ctx.fillText("★",0,R*0.78)

      // ── NAME TAG ──────────────────────────────────────
      ctx.fillStyle="rgba(10,5,30,0.9)";ctx.strokeStyle="#2D2D2D";ctx.lineWidth=2
      ctx.beginPath();ctx.roundRect(-R*0.85,R+10,R*1.7,20,5);ctx.fill();ctx.stroke()
      ctx.fillStyle=p.side==="left"?"#C17A2A":"#8B7FDB"
      ctx.font=`bold ${Math.max(7,R*0.22)}px 'Press Start 2P',monospace`
      ctx.textAlign="center";ctx.textBaseline="middle"
      ctx.fillText(p.name.slice(0,6),0,R+20)

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
      if(keys.a){p1.power=true;p1.powerTimer=0.15;p1.kickAnim=0.2;if(isPVP&&sync)sync.broadcastInput({power:true})}
      if(keys.t&&p1.tackleCd<=0){
        const d=Math.hypot(p2.x-p1.x,p2.y-p1.y)
        if(d<HEAD_R*2.8){ball.vx=(ball.x-p2.x>0?1:-1)*8;ball.vy=-6;p2.vx=(p2.x-p1.x>0?1:-1)*7;p2.vy=-6;p1.tackleCd=1.5;if(isPVP&&sync)sync.broadcastInput({tackle:true})}
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
