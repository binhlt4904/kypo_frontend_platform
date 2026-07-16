document.addEventListener('DOMContentLoaded', function () {
(function(){
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const hud = document.getElementById('hud');
  const W = 680, H = 380;

  // The whole scene below is drawn assuming a 680x380 coordinate space.
  // We render it into a larger backing buffer (SCALE×) so it stays crisp
  // when the <canvas> is stretched via CSS to cover the full page.
  const SCALE = 2;
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  ctx.scale(SCALE, SCALE);

  const TILE_W = 44, TILE_H = 22;
  const hw = TILE_W/2, hh = TILE_H/2;
  const MAP_W = 14, MAP_H = 10;
  const OX = 296, OY = 80;

  const toScreen = (tx, ty) => ({ x:(tx-ty)*hw + OX, y:(tx+ty)*hh + OY });

  function shade(hex, amt){
    const c = parseInt(hex.slice(1),16);
    let r=(c>>16)&255, g=(c>>8)&255, b=c&255;
    if(amt<0){ r*=1+amt; g*=1+amt; b*=1+amt; }
    else { r+=(255-r)*amt; g+=(255-g)*amt; b+=(255-b)*amt; }
    return `rgb(${r|0},${g|0},${b|0})`;
  }

  const ATK = {
    brute: { weapon:'hammer',  color:'#ff6b6b', dark:'#7a1a1a', target:'AUTH', rate:130, dmg:35, arc:55 },
    sqli:  { weapon:'syringe', color:'#9ccc65', dark:'#3b6d11', target:'DB',   rate:95,  dmg:25, arc:32 },
    binex: { weapon:'bolt',    color:'#4dd0e1', dark:'#00838f', target:'API',  rate:140, dmg:48, arc:18 },
    xss:   { weapon:'shuriken',color:'#ffd54f', dark:'#7c5a00', target:'WEB',  rate:75,  dmg:18, arc:45 },
    ddos:  { weapon:'packet',  color:'#ff9800', dark:'#663c00', target:'WEB',  rate:32,  dmg:8,  arc:25 },
    phish: { weapon:'hook',    color:'#f06292', dark:'#880e4f', target:'AUTH', rate:105, dmg:22, arc:22 }
  };
  const typeKeys = Object.keys(ATK);

  const servers = [
    { name:'WEB',  tx:11, ty:1, hp:1000, max:1000, c:'#2d7ff9', shake:0, dead:0 },
    { name:'API',  tx:12, ty:3, hp:1000, max:1000, c:'#1fbfa3', shake:0, dead:0 },
    { name:'DB',   tx:12, ty:6, hp:1000, max:1000, c:'#f4a03f', shake:0, dead:0 },
    { name:'AUTH', tx:11, ty:8, hp:1000, max:1000, c:'#b24bd8', shake:0, dead:0 }
  ];
  const getServer = n => servers.find(s => s.name === n);

  const attackers = [];
  for(let ty=0; ty<MAP_H; ty++){
    for(let tx=0; tx<3; tx++){
      if(Math.random() < 0.82){
        const k = typeKeys[Math.floor(Math.random()*typeKeys.length)];
        const t = ATK[k];
        const hx = tx + 0.15 + Math.random()*0.7;
        const hy = ty + 0.15 + Math.random()*0.7;
        attackers.push({
          tx: hx, ty: hy,
          homeTx: hx, homeTy: hy,
          type: t, typeKey: k,
          state: 'idle',
          cd: Math.random()*t.rate,
          bob: Math.random()*Math.PI*2,
          swing: 0,
          strikeT: 0,
          advTx: 0, advTy: 0,
          moveSpeed: 0.045 + Math.random()*0.02
        });
      }
    }
  }

  const FARM_HOME_X = 13.1;
  const FARM_HOME_Y = 4.5;
  const farmers = [];
  for(let i=0; i<7; i++){
    const hx = FARM_HOME_X + (Math.random()-0.5)*0.8;
    const hy = FARM_HOME_Y + (Math.random()-0.5)*4;
    farmers.push({
      tx: hx, ty: hy, homeTx: hx, homeTy: hy,
      state: 'idle',
      target: null, repairTx: 0, repairTy: 0,
      bob: Math.random()*Math.PI*2,
      swingPhase: 0,
      repairTick: 0,
      moveSpeed: 0.04 + Math.random()*0.015
    });
  }

  const projectiles = [];
  const particles = [];
  const floaters = [];
  let stats = { attacks: 0, breaches: 0, repairs: 0 };
  let frame = 0;

  function drawTileFill(tx, ty, fill){
    const p = toScreen(tx, ty);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - hh);
    ctx.lineTo(p.x + hw, p.y);
    ctx.lineTo(p.x, p.y + hh);
    ctx.lineTo(p.x - hw, p.y);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();
  }

  function drawGrid(){
    for(let ty=0; ty<MAP_H; ty++){
      for(let tx=0; tx<MAP_W; tx++){
        const zoneAtt = tx < 3;
        const zoneSrv = tx > 9;
        let col;
        if(zoneAtt) col = (tx+ty)%2===0 ? '#172047' : '#121a38';
        else if(zoneSrv) col = (tx+ty)%2===0 ? '#2a1437' : '#1a0b28';
        else col = (tx+ty)%2===0 ? '#0f1833' : '#0c1428';
        drawTileFill(tx, ty, col);
      }
    }
    ctx.fillStyle = 'rgba(150,200,255,0.35)';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    const a = toScreen(1, -0.8);
    ctx.fillText('ATTACKERS', a.x, a.y);
    const s = toScreen(11.5, -0.8);
    ctx.fillStyle = 'rgba(255,170,180,0.4)';
    ctx.fillText('SERVERS', s.x, s.y);
    const d = toScreen(13.2, 0.4);
    ctx.fillStyle = 'rgba(120,200,255,0.4)';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('REPAIR DEPOT', d.x, d.y);
  }

  function drawIsoBlock(tx, ty, h, cTop, cLeft, cRight){
    const p = toScreen(tx, ty);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(p.x - hw, p.y); ctx.lineTo(p.x, p.y + hh);
    ctx.lineTo(p.x, p.y + hh - h); ctx.lineTo(p.x - hw, p.y - h);
    ctx.closePath(); ctx.fillStyle = cLeft; ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x + hw, p.y); ctx.lineTo(p.x, p.y + hh);
    ctx.lineTo(p.x, p.y + hh - h); ctx.lineTo(p.x + hw, p.y - h);
    ctx.closePath(); ctx.fillStyle = cRight; ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - hh - h); ctx.lineTo(p.x + hw, p.y - h);
    ctx.lineTo(p.x, p.y + hh - h); ctx.lineTo(p.x - hw, p.y - h);
    ctx.closePath(); ctx.fillStyle = cTop; ctx.fill(); ctx.stroke();
  }

  function drawHPBar(x, y, w, h, pct){
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x-1, y-1, w+2, h+2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x, y, w, h);
    const col = pct > 0.5 ? '#5fd27a' : pct > 0.25 ? '#f4a03f' : '#ff4d5e';
    ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, pct), h);
  }

  function drawServer(s){
    const p = toScreen(s.tx, s.ty);
    const sx = (Math.random()-0.5) * s.shake;
    const sy = (Math.random()-0.5) * s.shake;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 6, 22, 7, 0, 0, Math.PI*2); ctx.fill();

    if(s.dead > 0){
      ctx.fillStyle = 'rgba(120,40,40,0.7)'; ctx.fillRect(p.x - 20, p.y - 8, 40, 10);
      const pulse = 0.4 + Math.sin(frame*0.18)*0.4;
      ctx.fillStyle = `rgba(255,100,120,${pulse})`;
      ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('REBOOTING...', p.x, p.y - 18);
      return;
    }

    ctx.save();
    ctx.translate(sx, sy);
    const h = 44;
    drawIsoBlock(s.tx, s.ty, h, s.c, shade(s.c, -0.55), shade(s.c, -0.3));
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.5;
    for(let i=1; i<5; i++){
      const hi = h*i/5;
      ctx.beginPath(); ctx.moveTo(p.x - hw, p.y - hi); ctx.lineTo(p.x, p.y + hh - hi); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x + hw, p.y - hi); ctx.lineTo(p.x, p.y + hh - hi); ctx.stroke();
    }
    for(let i=0; i<4; i++){
      const phase = (frame + i*23 + s.tx*11) % 70;
      if(phase < 40){
        const hi = h - 6 - i*9;
        const lx = p.x - hw + 6;
        const ly = p.y - hi + (6/hw)*hh;
        ctx.fillStyle = i%2===0 ? '#6effa0' : '#ffdc4a';
        ctx.fillRect(lx, ly, 2.5, 1.8);
      }
    }
    ctx.restore();

    const topY = p.y - h - hh;
    drawHPBar(p.x - 24, topY - 10, 48, 5, s.hp / s.max);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(s.name, p.x, topY - 12);
    ctx.textBaseline = 'alphabetic';
  }

  function drawAttacker(a){
    const p = toScreen(a.tx, a.ty);
    const moving = a.state === 'advance' || a.state === 'retreat';
    const bobSpeed = moving ? 0.22 : 0.05;
    const bobAmp = moving ? 1.8 : 1.2;
    const bY = Math.sin(a.bob)*bobAmp;
    const t = a.type;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 7, 3, 0, 0, Math.PI*2); ctx.fill();

    const bodyTop = p.y - 14 + bY;
    ctx.fillStyle = t.color; ctx.strokeStyle = t.dark; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - 4.5, p.y - 2 + bY); ctx.lineTo(p.x + 4.5, p.y - 2 + bY);
    ctx.lineTo(p.x + 3, bodyTop); ctx.lineTo(p.x - 3, bodyTop);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#111'; ctx.strokeStyle = t.dark;
    ctx.beginPath(); ctx.arc(p.x, bodyTop - 4, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = t.color;
    ctx.beginPath(); ctx.arc(p.x, bodyTop - 4, 4, Math.PI, Math.PI*2); ctx.fill();
    ctx.fillStyle = t.color; ctx.fillRect(p.x - 1.5, bodyTop - 4.5, 3, 1.2);

    const s = a.swing;
    const wx = p.x + (5 + s*3);
    const wy = bodyTop + 3 + bY*0.5;
    const rot = -Math.PI/7 - s*0.6;
    drawHeldWeapon(t.weapon, wx, wy, t.color, t.dark, rot);
  }

  function drawHeldWeapon(w, x, y, color, dark, rot){
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineWidth = 1;
    switch(w){
      case 'hammer':
        ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-10); ctx.stroke();
        ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
        ctx.fillRect(-4, -14, 8, 6); ctx.strokeRect(-4, -14, 8, 6); break;
      case 'syringe':
        ctx.fillStyle = color; ctx.strokeStyle = dark;
        ctx.fillRect(-2, -9, 4, 8); ctx.strokeRect(-2, -9, 4, 8);
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(0,-13); ctx.stroke();
        ctx.fillStyle = '#777'; ctx.fillRect(-2.5, -2, 5, 1.5); break;
      case 'bolt':
        ctx.fillStyle = color; ctx.strokeStyle = dark;
        ctx.beginPath();
        ctx.moveTo(0,-12); ctx.lineTo(-2.5,-4); ctx.lineTo(0,-6); ctx.lineTo(2.5,-4);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(0,2); ctx.stroke(); break;
      case 'shuriken':
        ctx.fillStyle = color; ctx.strokeStyle = dark;
        ctx.translate(0, -7); ctx.rotate(frame*0.3);
        ctx.beginPath();
        for(let i=0; i<8; i++){
          const a = i*Math.PI/4, r = i%2===0 ? 5.5 : 2.2;
          const px = Math.cos(a)*r, py = Math.sin(a)*r;
          if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke(); break;
      case 'packet':
        ctx.fillStyle = color; ctx.strokeStyle = dark;
        ctx.fillRect(-3, -11, 6, 4); ctx.strokeRect(-3, -11, 6, 4);
        ctx.fillRect(-3, -5, 6, 4); ctx.strokeRect(-3, -5, 6, 4); break;
      case 'hook':
        ctx.strokeStyle = color; ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, -9);
        ctx.quadraticCurveTo(3, -12, 3, -8);
        ctx.lineTo(2, -6);
        ctx.stroke(); break;
    }
    ctx.restore();
  }

  function drawFarmer(f){
    const p = toScreen(f.tx, f.ty);
    const moving = f.state === 'moving' || f.state === 'returning';
    const bobAmp = moving ? 1.8 : 0.9;
    const bY = Math.sin(f.bob) * bobAmp;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 7, 3, 0, 0, Math.PI*2); ctx.fill();

    const bodyTop = p.y - 14 + bY;
    ctx.fillStyle = '#4a90d9'; ctx.strokeStyle = '#1a4578'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - 4.5, p.y - 2 + bY); ctx.lineTo(p.x + 4.5, p.y - 2 + bY);
    ctx.lineTo(p.x + 3, bodyTop); ctx.lineTo(p.x - 3, bodyTop);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#1a4578'; ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(p.x - 1.8, bodyTop + 1); ctx.lineTo(p.x - 1.8, p.y - 2 + bY);
    ctx.moveTo(p.x + 1.8, bodyTop + 1); ctx.lineTo(p.x + 1.8, p.y - 2 + bY);
    ctx.stroke();

    ctx.fillStyle = '#f5c49a'; ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.x, bodyTop - 4, 3.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#ffc107'; ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.x, bodyTop - 4, 3.5, Math.PI, 2*Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffc107'; ctx.strokeStyle = '#7a5a00';
    ctx.fillRect(p.x - 4.5, bodyTop - 4, 9, 1.2);
    ctx.strokeRect(p.x - 4.5, bodyTop - 4, 9, 1.2);
    ctx.fillStyle = '#7a5a00'; ctx.fillRect(p.x - 0.8, bodyTop - 6.5, 1.6, 1);

    const swing = f.state === 'repairing' ? Math.sin(f.swingPhase)*0.9 : 0;
    const wx = p.x + 5;
    const wy = bodyTop + 3 + bY*0.3;
    const rot = -Math.PI/5 + swing;
    ctx.save();
    ctx.translate(wx, wy); ctx.rotate(rot);
    ctx.strokeStyle = '#9aa5b5'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.stroke();
    ctx.fillStyle = '#c0c8d4'; ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 0.7;
    ctx.fillRect(-3, -12, 6, 3); ctx.strokeRect(-3, -12, 6, 3);
    ctx.fillStyle = '#2a303a'; ctx.fillRect(-0.8, -12, 1.6, 1.6);
    ctx.restore();
  }

  function fire(a, srv){
    const fromP = toScreen(a.tx, a.ty);
    fromP.y -= 14;
    const toP = toScreen(srv.tx, srv.ty);
    toP.y -= 30;
    projectiles.push({
      from: fromP, to: toP, t:0,
      speed: 0.014 + Math.random()*0.01,
      weapon: a.type.weapon, color: a.type.color, dark: a.type.dark,
      dmg: a.type.dmg, arc: a.type.arc, target: srv.name,
      rot: Math.random()*Math.PI*2,
      rotSpeed: (Math.random()-0.5)*0.45
    });
    for(let i=0; i<3; i++){
      const ang = Math.atan2(toP.y-fromP.y, toP.x-fromP.x) + (Math.random()-0.5);
      particles.push({
        x: fromP.x, y: fromP.y,
        vx: Math.cos(ang)*1.5, vy: Math.sin(ang)*1.5,
        life: 10, maxLife: 10, color: a.type.color, size: 1.5
      });
    }
  }

  function applyHit(p){
    const srv = getServer(p.target);
    if(!srv || srv.dead > 0) return;
    stats.attacks++;
    srv.hp -= p.dmg;
    srv.shake = 6;

    for(let i=0; i<10; i++){
      const ang = Math.random()*Math.PI*2;
      const sp = Math.random()*3 + 1;
      particles.push({
        x: p.to.x, y: p.to.y,
        vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp - 1.5,
        life: 22 + Math.random()*15, maxLife: 37,
        color: p.color, size: 2 + Math.random()*2
      });
    }
    floaters.push({
      x: p.to.x + (Math.random()-0.5)*16, y: p.to.y - 8,
      text: '-' + p.dmg, color: p.color, life: 45, maxLife: 45, big: false
    });

    if(srv.hp <= 0){
      srv.hp = 0; srv.dead = 200;
      stats.breaches++;
      const sp = toScreen(srv.tx, srv.ty);
      floaters.push({
        x: sp.x, y: sp.y - 40, text: 'BREACHED',
        color: '#ff3d5a', life: 130, maxLife: 130, big: true
      });
      for(let i=0; i<36; i++){
        const ang = Math.random()*Math.PI*2;
        const sp2 = Math.random()*5 + 2;
        particles.push({
          x: sp.x, y: sp.y - 25,
          vx: Math.cos(ang)*sp2, vy: Math.sin(ang)*sp2 - 2.5,
          life: 45 + Math.random()*25, maxLife: 70,
          color: ['#ff3d5a','#ff9800','#ffffff'][Math.floor(Math.random()*3)],
          size: 2 + Math.random()*3
        });
      }
    }
  }

  function drawProjectile(p){
    const cx = p.from.x + (p.to.x - p.from.x)*p.t;
    const cy = p.from.y + (p.to.y - p.from.y)*p.t - Math.sin(p.t*Math.PI)*p.arc;
    for(let i=1; i<=4; i++){
      const tt = Math.max(0, p.t - i*0.045);
      const tx = p.from.x + (p.to.x - p.from.x)*tt;
      const ty = p.from.y + (p.to.y - p.from.y)*tt - Math.sin(tt*Math.PI)*p.arc;
      ctx.globalAlpha = (5 - i)/14;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(tx, ty, 3.2 - i*0.55, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.rot);
    drawProjWeapon(p.weapon, p.color, p.dark);
    ctx.restore();
  }

  function drawProjWeapon(w, color, dark){
    switch(w){
      case 'hammer':
        ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-9,0); ctx.lineTo(4,0); ctx.stroke();
        ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
        ctx.fillRect(2,-7,11,14); ctx.strokeRect(2,-7,11,14);
        ctx.fillStyle = shade(color, 0.25); ctx.fillRect(3,-6,3,12); break;
      case 'syringe':
        ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
        ctx.fillRect(-9,-3,13,6); ctx.strokeRect(-9,-3,13,6);
        ctx.fillStyle = '#888'; ctx.fillRect(-13,-4.5,4,9);
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.7;
        ctx.beginPath(); ctx.moveTo(4,0); ctx.lineTo(13,0); ctx.stroke();
        ctx.fillStyle = shade(color, 0.3); ctx.fillRect(-5,-2,7,4); break;
      case 'bolt':
        ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(13,0); ctx.lineTo(4,-4); ctx.lineTo(4,-2);
        ctx.lineTo(-9,-2); ctx.lineTo(-9,2); ctx.lineTo(4,2);
        ctx.lineTo(4,4); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = color; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left';
        ctx.fillText('10', -16, 3); break;
      case 'shuriken':
        ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<8; i++){
          const a = i*Math.PI/4, r = i%2===0 ? 9 : 3.5;
          const px = Math.cos(a)*r, py = Math.sin(a)*r;
          if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#0a1028';
        ctx.beginPath(); ctx.arc(0,0,1.8,0,Math.PI*2); ctx.fill(); break;
      case 'packet':
        ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
        ctx.fillRect(-6,-5,12,10); ctx.strokeRect(-6,-5,12,10);
        ctx.fillStyle = '#000'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; ctx.fillText('PKT', 0, 0); ctx.textBaseline = 'alphabetic'; break;
      case 'hook':
        ctx.strokeStyle = 'rgba(240,98,146,0.4)'; ctx.lineWidth = 0.7;
        ctx.setLineDash([2,2]);
        ctx.beginPath(); ctx.moveTo(-16,-3); ctx.lineTo(-3,-5); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = color; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-3,-5); ctx.lineTo(8,-5);
        ctx.quadraticCurveTo(13,0,7,4);
        ctx.lineTo(4,3); ctx.lineTo(6,1);
        ctx.stroke(); break;
    }
  }

  function drawParticle(pt){
    ctx.globalAlpha = pt.life / pt.maxLife;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * (pt.life/pt.maxLife), 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawFloater(f){
    ctx.globalAlpha = Math.min(1, f.life / (f.maxLife*0.6));
    ctx.fillStyle = f.color;
    ctx.font = (f.big ? 'bold 14px' : 'bold 11px') + ' monospace';
    ctx.textAlign = 'center';
    if(f.big){
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y);
    }
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  }

  function moveToward(o, tgtTx, tgtTy, speed){
    const dx = tgtTx - o.tx, dy = tgtTy - o.ty;
    const d = Math.hypot(dx, dy);
    if(d < 0.08) return true;
    o.tx += dx/d * speed;
    o.ty += dy/d * speed;
    return false;
  }

  function pickAdvance(a, srv){
    const dx = srv.tx - a.homeTx, dy = srv.ty - a.homeTy;
    const d = Math.hypot(dx, dy);
    const dist = 1.1 + Math.random()*0.5;
    a.advTx = a.homeTx + dx/d * dist;
    a.advTy = a.homeTy + dy/d * dist;
  }

  function updateAttacker(a){
    a.swing *= 0.85;
    if(a.state === 'idle'){
      a.bob += 0.05;
      a.cd--;
      if(a.cd <= 0){
        const srv = getServer(a.type.target);
        if(srv && srv.dead <= 0){
          pickAdvance(a, srv);
          a.state = 'advance';
        } else {
          a.cd = 40 + Math.random()*30;
        }
      }
    } else if(a.state === 'advance'){
      a.bob += 0.22;
      if(moveToward(a, a.advTx, a.advTy, a.moveSpeed)){
        a.state = 'strike';
        a.strikeT = 12;
      }
    } else if(a.state === 'strike'){
      a.bob += 0.08;
      a.strikeT--;
      if(a.strikeT === 7){
        const srv = getServer(a.type.target);
        if(srv && srv.dead <= 0){ fire(a, srv); a.swing = 1; }
      }
      if(a.strikeT <= 0){ a.state = 'retreat'; }
    } else if(a.state === 'retreat'){
      a.bob += 0.22;
      if(moveToward(a, a.homeTx, a.homeTy, a.moveSpeed*0.85)){
        a.state = 'idle';
        a.cd = a.type.rate * (0.5 + Math.random()*0.5);
      }
    }
  }

  function assignFarmer(f){
    const candidates = servers.filter(s => s.dead <= 0 && s.hp < s.max * 0.92);
    if(candidates.length === 0) return false;
    candidates.sort((x, y) => (x.hp/x.max) - (y.hp/y.max));
    for(const s of candidates){
      const assigned = farmers.filter(x => x.target === s && (x.state === 'moving' || x.state === 'repairing')).length;
      if(assigned < 3){
        f.target = s;
        const slot = assigned;
        const ox = [0.9, 1.0, 0.7][slot] || 0.8;
        const oy = [0.7, -0.4, 0.2][slot] || 0.3;
        f.repairTx = s.tx + ox;
        f.repairTy = s.ty + oy;
        f.state = 'moving';
        return true;
      }
    }
    return false;
  }

  function updateFarmer(f){
    f.bob += (f.state === 'moving' || f.state === 'returning') ? 0.22 : 0.05;
    if(f.state === 'idle'){
      assignFarmer(f);
    } else if(f.state === 'moving'){
      if(!f.target || f.target.dead > 0){
        f.target = null; f.state = 'returning'; return;
      }
      if(moveToward(f, f.repairTx, f.repairTy, f.moveSpeed)){
        f.state = 'repairing';
        f.swingPhase = 0;
        f.repairTick = 0;
      }
    } else if(f.state === 'repairing'){
      if(!f.target || f.target.dead > 0 || f.target.hp >= f.target.max){
        f.state = 'returning';
        return;
      }
      f.swingPhase += 0.25;
      f.target.hp = Math.min(f.target.max, f.target.hp + 0.45);
      f.repairTick++;
      if(f.repairTick % 30 === 0){
        const sp = toScreen(f.target.tx, f.target.ty);
        for(let i=0; i<5; i++){
          const ang = -Math.PI/2 + (Math.random()-0.5)*1.2;
          const spd = 1 + Math.random()*2;
          particles.push({
            x: sp.x + (Math.random()-0.5)*14, y: sp.y - 20,
            vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd,
            life: 18, maxLife: 18,
            color: ['#ffdc4a','#fff4a0','#ffb84a'][i%3], size: 1.6
          });
        }
      }
      if(f.repairTick % 75 === 0){
        const me = toScreen(f.tx, f.ty);
        floaters.push({
          x: me.x + 4, y: me.y - 18,
          text: '+15', color: '#5fd27a',
          life: 40, maxLife: 40, big: false
        });
        stats.repairs++;
      }
    } else if(f.state === 'returning'){
      if(moveToward(f, f.homeTx, f.homeTy, f.moveSpeed*0.9)){
        f.state = 'idle';
        f.target = null;
      }
    }
  }

  function update(){
    frame++;
    servers.forEach(s => {
      s.shake *= 0.82;
      if(s.dead > 0){
        s.dead--;
        if(s.dead <= 0) s.hp = s.max;
      } else if(s.hp < s.max){
        s.hp = Math.min(s.max, s.hp + 0.18);
      }
    });
    attackers.forEach(updateAttacker);
    farmers.forEach(updateFarmer);

    for(let i=projectiles.length-1; i>=0; i--){
      const p = projectiles[i];
      p.t += p.speed;
      p.rot += p.rotSpeed;
      if(p.t >= 1){ applyHit(p); projectiles.splice(i, 1); }
    }
    for(let i=particles.length-1; i>=0; i--){
      const pt = particles[i];
      pt.x += pt.vx; pt.y += pt.vy;
      pt.vy += 0.12; pt.vx *= 0.98; pt.life--;
      if(pt.life <= 0) particles.splice(i, 1);
    }
    for(let i=floaters.length-1; i>=0; i--){
      const f = floaters[i];
      f.y -= f.big ? 0.3 : 0.7;
      f.life--;
      if(f.life <= 0) floaters.splice(i, 1);
    }
    if(frame % 12 === 0){
      const busy = farmers.filter(x => x.state !== 'idle').length;
      hud.textContent = `attacks ${stats.attacks} · breaches ${stats.breaches} · repairs ${stats.repairs} · crew on-duty ${busy}/${farmers.length}`;
    }
  }

  function render(){
    ctx.fillStyle = '#0a1028';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(100,200,255,0.025)';
    for(let y=0; y<H; y+=3) ctx.fillRect(0, y, W, 1);
    drawGrid();

    const objs = [];
    attackers.forEach(a => objs.push({ k:'a', r:a, d:a.tx+a.ty }));
    servers.forEach(s => objs.push({ k:'s', r:s, d:s.tx+s.ty }));
    farmers.forEach(f => objs.push({ k:'f', r:f, d:f.tx+f.ty }));
    objs.sort((x, y) => x.d - y.d);
    objs.forEach(o => {
      if(o.k === 'a') drawAttacker(o.r);
      else if(o.k === 's') drawServer(o.r);
      else drawFarmer(o.r);
    });

    projectiles.forEach(drawProjectile);
    particles.forEach(drawParticle);
    floaters.forEach(drawFloater);
  }

  function loop(){ update(); render(); requestAnimationFrame(loop); }
  loop();
})();

  // password show/hide toggle
  const pwField = document.getElementById('password');
  const eyeToggle = document.getElementById('eyeToggle');
  const eyeIcon = document.getElementById('eyeIcon');
  const eyeOpen = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>';
  const eyeClosed = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a21.6 21.6 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
  if (eyeToggle && pwField && eyeIcon) {
    eyeToggle.addEventListener('click', () => {
      const showing = pwField.type === 'text';
      pwField.type = showing ? 'password' : 'text';
      eyeIcon.innerHTML = showing ? eyeOpen : eyeClosed;
    });
  }

});
