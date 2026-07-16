document.addEventListener('DOMContentLoaded', function () {

  (function () {
    const canvas = document.getElementById('cyber-bg');
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, DPR = 1;

    function shade(hex, amt) {
      const c = parseInt(hex.slice(1), 16);
      let r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
      if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
      else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
      return `rgb(${r | 0},${g | 0},${b | 0})`;
    }
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    // Bảng màu cho nền trắng — đậm vừa đủ nhìn, không gắt
    const ATK = {
      brute: { weapon: 'hammer', color: '#e5484d', dark: '#8c1d21', target: 'AUTH', rate: 95, dmg: 40, arc: 70 },
      sqli: { weapon: 'syringe', color: '#46a758', dark: '#1d5a2a', target: 'DB', rate: 70, dmg: 30, arc: 45 },
      binex: { weapon: 'bolt', color: '#00a2c7', dark: '#065b70', target: 'API', rate: 100, dmg: 55, arc: 30 },
      xss: { weapon: 'shuriken', color: '#d98d06', dark: '#7a4e00', target: 'WEB', rate: 55, dmg: 22, arc: 60 },
      ddos: { weapon: 'packet', color: '#f76b15', dark: '#873a08', target: 'WEB', rate: 24, dmg: 10, arc: 38 },
      phish: { weapon: 'hook', color: '#d6409f', dark: '#7a1d59', target: 'AUTH', rate: 80, dmg: 26, arc: 34 }
    };
    const typeKeys = Object.keys(ATK);
    const CODE_GLYPHS = ['</>', '{ }', '$_', '#!', '010', 'sudo', '::', '&&'];

    let servers = [], attackers = [], farmers = [], glyphs = [], lanes = [];
    const projectiles = [], particles = [], floaters = [], rings = [], beams = [], debris = [], booms = [];
    const drone = { x: 0, y: 0, cd: 180, flash: 0 };
    let wallX = 0;
    let camShake = 0;
    let stats = { attacks: 0, breaches: 0, repairs: 0, blocked: 0, quarantined: 0 };
    let frame = 0;

    const getServer = n => servers.find(s => s.name === n);

    function initScene() {
      servers = []; attackers = []; farmers = []; glyphs = []; lanes = [];
      projectiles.length = 0; particles.length = 0; floaters.length = 0;
      rings.length = 0; beams.length = 0; debris.length = 0; booms.length = 0;

      wallX = W * 0.72;

      // ---- Server rack: cột bên phải ----
      const srvX = W * 0.855;
      const srvDefs = [
        { name: 'WEB', c: '#2d7ff9' },
        { name: 'API', c: '#1fbfa3' },
        { name: 'DB', c: '#f4a03f' },
        { name: 'AUTH', c: '#b24bd8' }
      ];
      const top = H * 0.16, gap = (H * 0.72) / 3;
      srvDefs.forEach((d, i) => {
        servers.push({
          name: d.name, c: d.c,
          x: srvX, y: top + gap * i,
          w: 44, h: 44,
          hp: 700, max: 700, shake: 0, dead: 0
        });
      });

      // ---- Đám tấn công: lưới bên trái ----
      const cols = 3, rows = Math.max(4, Math.floor(H / 110));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() < 0.8) {
            const k = typeKeys[Math.floor(Math.random() * typeKeys.length)];
            const hx = W * 0.045 + c * W * 0.045 + (Math.random() - 0.5) * W * 0.02;
            const hy = H * 0.12 + (r + 0.5) * (H * 0.8 / rows) + (Math.random() - 0.5) * 20;
            attackers.push({
              x: hx, y: hy, homeX: hx, homeY: hy,
              type: ATK[k], typeKey: k,
              state: 'idle',
              cd: Math.random() * ATK[k].rate,
              bob: Math.random() * Math.PI * 2,
              swing: 0, strikeT: 0, stunT: 0,
              advX: 0, advY: 0,
              moveSpeed: 1.4 + Math.random() * 0.8
            });
          }
        }
      }

      // ---- Đội phòng thủ: sát mép phải ----
      for (let i = 0; i < 6; i++) {
        const hx = W * 0.955 + (Math.random() - 0.5) * W * 0.02;
        const hy = H * 0.15 + (i + 0.5) * (H * 0.72 / 6);
        farmers.push({
          x: hx, y: hy, homeX: hx, homeY: hy,
          state: 'idle', target: null,
          repairX: 0, repairY: 0,
          bob: Math.random() * Math.PI * 2,
          swingPhase: 0, repairTick: 0,
          moveSpeed: 1.2 + Math.random() * 0.6
        });
      }

      // ---- Drone AV tuần tra trước tường lửa ----
      drone.x = W * 0.765; drone.y = H * 0.5;
      drone.cd = 120; drone.flash = 0;

      // ---- Ký tự binary trôi hai bên mép (chừa vùng giữa cho form) ----
      const nGlyph = Math.max(14, Math.floor(W / 70));
      for (let i = 0; i < nGlyph; i++) {
        const leftSide = Math.random() < 0.5;
        glyphs.push({
          x: leftSide ? Math.random() * W * 0.28 : W * 0.68 + Math.random() * W * 0.32,
          y: Math.random() * H,
          vy: 0.15 + Math.random() * 0.3,
          size: 9 + Math.random() * 4,
          ch: Math.random() < 0.5 ? '0' : '1',
          left: leftSide
        });
      }

      // ---- Luồng traffic mờ chạy ngang (né vùng giữa màn hình) ----
      const laneYs = [0.09, 0.16, 0.86, 0.93];
      laneYs.forEach((fy, i) => {
        lanes.push({
          x1: W * 0.16, y1: H * fy,
          cx: W * 0.45, cy: H * fy + (fy < 0.5 ? -H * 0.04 : H * 0.04),
          x2: W * 0.70, y2: H * (fy + (i % 2 === 0 ? 0.02 : -0.02)),
          speed: 0.0018 + Math.random() * 0.0016,
          off: Math.random(),
          off2: Math.random()
        });
      });
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      initScene();
    }
    window.addEventListener('resize', resize);
    resize();

    // ================= NỀN =================

    function bezierPoint(l, t) {
      const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      return {
        x: a * l.x1 + b * l.cx + c * l.x2,
        y: a * l.y1 + b * l.cy + c * l.y2
      };
    }

    function drawBackground() {
      // nền trắng kem ấm
      ctx.fillStyle = '#f8f6f1';
      ctx.fillRect(0, 0, W, H);

      // lưới ô vuông kiểu giấy kẻ ô — phủ toàn màn hình
      const cell = 42;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120,100,70,0.065)';
      ctx.beginPath();
      for (let x = 0; x <= W; x += cell) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
      for (let y = 0; y <= H; y += cell) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
      ctx.stroke();
      // đường kẻ đậm hơn mỗi 4 ô
      ctx.strokeStyle = 'rgba(120,100,70,0.10)';
      ctx.beginPath();
      for (let x = 0; x <= W; x += cell * 4) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
      for (let y = 0; y <= H; y += cell * 4) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
      ctx.stroke();

      // gradient dọc rất nhẹ để phần dưới hơi sẫm hơn, đỡ phẳng
      const vGrad = ctx.createLinearGradient(0, 0, 0, H);
      vGrad.addColorStop(0, 'rgba(248,246,241,0.55)');
      vGrad.addColorStop(0.5, 'rgba(248,246,241,0)');
      vGrad.addColorStop(1, 'rgba(90,70,40,0.030)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, W, H);

      // tint hai phe
      let g = ctx.createLinearGradient(0, 0, W * 0.3, 0);
      g.addColorStop(0, 'rgba(229,72,77,0.05)');
      g.addColorStop(1, 'rgba(229,72,77,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.3, H);

      g = ctx.createLinearGradient(W * 0.7, 0, W, 0);
      g.addColorStop(0, 'rgba(59,130,246,0)');
      g.addColorStop(1, 'rgba(59,130,246,0.06)');
      ctx.fillStyle = g; ctx.fillRect(W * 0.7, 0, W * 0.3, H);

      // ký tự binary trôi
      ctx.textAlign = 'center';
      glyphs.forEach(gl => {
        ctx.font = `${gl.size}px monospace`;
        ctx.fillStyle = gl.left ? 'rgba(200,60,66,0.10)' : 'rgba(37,99,235,0.10)';
        ctx.fillText(gl.ch, gl.x, gl.y);
      });

      // luồng traffic
      lanes.forEach(l => {
        ctx.strokeStyle = 'rgba(90,110,150,0.10)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 7]);
        ctx.lineDashOffset = -frame * 0.4;
        ctx.beginPath();
        ctx.moveTo(l.x1, l.y1);
        ctx.quadraticCurveTo(l.cx, l.cy, l.x2, l.y2);
        ctx.stroke();
        ctx.setLineDash([]);
        // gói tin chạy dọc luồng
        [l.off, l.off2].forEach((off, j) => {
          const t = (frame * l.speed + off) % 1;
          const p = bezierPoint(l, t);
          ctx.fillStyle = j === 0 ? 'rgba(229,72,77,0.35)' : 'rgba(37,99,235,0.35)';
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
        });
      });

      // ===== tường lửa: bức tường gạch + quầng sáng + xung năng lượng =====
      const fwTop = H * 0.10, fwBot = H * 0.94, fwH = fwBot - fwTop;
      const wwHalf = 9;

      // quầng sáng hai bên tường
      const fwGlow = ctx.createLinearGradient(wallX - 26, 0, wallX + 26, 0);
      fwGlow.addColorStop(0, 'rgba(37,99,235,0)');
      fwGlow.addColorStop(0.5, 'rgba(37,99,235,0.09)');
      fwGlow.addColorStop(1, 'rgba(37,99,235,0)');
      ctx.fillStyle = fwGlow;
      ctx.fillRect(wallX - 26, fwTop, 52, fwH);

      // thân tường bán trong suốt
      ctx.fillStyle = 'rgba(37,99,235,0.13)';
      ctx.fillRect(wallX - wwHalf, fwTop, wwHalf * 2, fwH);
      ctx.strokeStyle = 'rgba(37,99,235,0.40)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(wallX - wwHalf + 0.5, fwTop + 0.5, wwHalf * 2 - 1, fwH - 1);

      // mạch gạch: kẻ ngang + mối dọc so le
      ctx.strokeStyle = 'rgba(37,99,235,0.30)';
      ctx.lineWidth = 1;
      const brickH = 11;
      let row = 0;
      for (let y = fwTop + brickH; y < fwBot; y += brickH, row++) {
        ctx.beginPath();
        ctx.moveTo(wallX - wwHalf + 1, y + 0.5);
        ctx.lineTo(wallX + wwHalf - 1, y + 0.5);
        ctx.stroke();
        if (row % 2 === 0) {
          ctx.beginPath();
          ctx.moveTo(wallX + 0.5, y + 0.5);
          ctx.lineTo(wallX + 0.5, Math.min(y + brickH, fwBot) + 0.5);
          ctx.stroke();
        }
      }

      // xung năng lượng chạy dọc tường
      for (let k = 0; k < 2; k++) {
        const py = fwTop + ((frame * 1.6 + k * fwH / 2) % fwH);
        const pulse = ctx.createLinearGradient(0, py - 26, 0, py + 26);
        pulse.addColorStop(0, 'rgba(96,165,250,0)');
        pulse.addColorStop(0.5, 'rgba(96,165,250,0.45)');
        pulse.addColorStop(1, 'rgba(96,165,250,0)');
        ctx.fillStyle = pulse;
        ctx.fillRect(wallX - wwHalf + 1, py - 26, wwHalf * 2 - 2, 52);
      }

      // khiên + nhãn
      const shieldPulse = 1 + Math.sin(frame * 0.05) * 0.08;
      ctx.save();
      ctx.translate(wallX, H * 0.075);
      ctx.scale(shieldPulse, shieldPulse);
      ctx.font = '18px serif'; ctx.textAlign = 'center';
      ctx.fillText('🛡', 0, 0);
      ctx.restore();
      ctx.fillStyle = 'rgba(37,99,235,0.60)';
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText('FIREWALL', wallX, fwTop + 16);

    }

    // ================= VẼ ENTITY =================

    function drawHPBar(x, y, w, h, pct) {
      ctx.fillStyle = 'rgba(30,45,80,0.10)';
      ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill();
      const col = pct > 0.5 ? '#22a55e' : pct > 0.25 ? '#f59e0b' : '#e5484d';
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.roundRect(x, y, w * Math.max(0.02, pct), h, h / 2); ctx.fill();
    }

    // kích thước tile isometric của asset gốc (TILE 44×22)
    const IHW = 22, IHH = 11;
    // hệ số phóng to các đối tượng trên nền
    const SRV_SCALE = 1.3, CHAR_SCALE = 1.4, DRONE_SCALE = 1.25;

    function drawIsoBlockAt(px, py, h, cTop, cLeft, cRight) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px - IHW, py); ctx.lineTo(px, py + IHH);
      ctx.lineTo(px, py + IHH - h); ctx.lineTo(px - IHW, py - h);
      ctx.closePath(); ctx.fillStyle = cLeft; ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + IHW, py); ctx.lineTo(px, py + IHH);
      ctx.lineTo(px, py + IHH - h); ctx.lineTo(px + IHW, py - h);
      ctx.closePath(); ctx.fillStyle = cRight; ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py - IHH - h); ctx.lineTo(px + IHW, py - h);
      ctx.lineTo(px, py + IHH - h); ctx.lineTo(px - IHW, py - h);
      ctx.closePath(); ctx.fillStyle = cTop; ctx.fill(); ctx.stroke();
    }

    function drawServer(s) {
      const sx = s.x + (Math.random() - 0.5) * s.shake;
      const sy = s.y + (Math.random() - 0.5) * s.shake;
      const h = 44;
      const topY = sy - h - IHH;

      ctx.save();
      ctx.translate(sx, sy); ctx.scale(SRV_SCALE, SRV_SCALE); ctx.translate(-sx, -sy);

      // bóng đổ
      ctx.fillStyle = 'rgba(30,45,80,0.14)';
      ctx.beginPath(); ctx.ellipse(sx, sy + 6, 22, 7, 0, 0, Math.PI * 2); ctx.fill();

      if (s.dead > 0) {
        ctx.fillStyle = 'rgba(229,72,77,0.16)';
        ctx.fillRect(sx - 20, sy - 8, 40, 10);
        const pulse = 0.45 + Math.sin(frame * 0.18) * 0.35;
        ctx.fillStyle = `rgba(229,72,77,${pulse})`;
        ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
        ctx.fillText('REBOOTING…', sx, sy - 18);
        ctx.fillStyle = 'rgba(30,45,80,0.35)';
        ctx.fillText(s.name, sx, sy - 34);
        ctx.restore();
        return;
      }

      // cảnh báo nguy kịch: viền đỏ nhấp nháy
      if (s.hp < s.max * 0.25) {
        const pulse = 0.25 + (Math.sin(frame * 0.15) + 1) * 0.15;
        ctx.strokeStyle = `rgba(229,72,77,${pulse})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.roundRect(sx - 28, topY - 3, 56, h + IHH * 2 + 6, 6); ctx.stroke();
        ctx.globalAlpha = 0.4 + (Math.sin(frame * 0.15) + 1) * 0.25;
        ctx.font = '12px serif'; ctx.textAlign = 'center';
        ctx.fillText('⚠', sx + 34, sy - 26);
        ctx.globalAlpha = 1;
      }

      // khối server isometric (asset gốc)
      drawIsoBlockAt(sx, sy, h, s.c, shade(s.c, -0.55), shade(s.c, -0.3));

      // vạch ngăn rack trên hai mặt
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.5;
      for (let i = 1; i < 5; i++) {
        const hi = h * i / 5;
        ctx.beginPath(); ctx.moveTo(sx - IHW, sy - hi); ctx.lineTo(sx, sy + IHH - hi); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + IHW, sy - hi); ctx.lineTo(sx, sy + IHH - hi); ctx.stroke();
      }

      // đèn nháy trên mặt trái
      for (let i = 0; i < 4; i++) {
        const phase = (frame + i * 23 + (s.x | 0)) % 70;
        if (phase < 40) {
          const hi = h - 6 - i * 9;
          ctx.fillStyle = i % 2 === 0 ? '#6effa0' : '#ffdc4a';
          ctx.fillRect(sx - IHW + 6, sy - hi + 3, 2.5, 1.8);
        }
      }

      drawHPBar(sx - 24, topY - 10, 48, 5, s.hp / s.max);
      ctx.fillStyle = '#39455c';
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText(s.name, sx, topY - 15);
      ctx.restore();
    }

    function drawAttacker(a) {
      const moving = a.state === 'advance' || a.state === 'retreat';
      const bY = Math.sin(a.bob) * (moving ? 2 : 1.2);
      const t = a.type;
      let px = a.x;
      const py = a.y + bY;
      if (a.state === 'stunned') px += Math.sin(frame * 0.5) * 2;

      ctx.save();
      ctx.translate(a.x, a.y); ctx.scale(CHAR_SCALE, CHAR_SCALE); ctx.translate(-a.x, -a.y);

      ctx.fillStyle = 'rgba(30,45,80,0.12)';
      ctx.beginPath(); ctx.ellipse(a.x, a.y + 4, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

      // thân + đầu theo asset gốc
      const bodyTop = py - 14;
      ctx.fillStyle = t.color; ctx.strokeStyle = t.dark; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px - 4.5, py - 2); ctx.lineTo(px + 4.5, py - 2);
      ctx.lineTo(px + 3, bodyTop); ctx.lineTo(px - 3, bodyTop);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#111'; ctx.strokeStyle = t.dark;
      ctx.beginPath(); ctx.arc(px, bodyTop - 4, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = t.color;
      ctx.beginPath(); ctx.arc(px, bodyTop - 4, 4, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(px - 1.5, bodyTop - 4.5, 3, 1.2);

      if (a.state === 'stunned') {
        // vòng cách ly xanh + tia choáng
        const pulse = 0.35 + (Math.sin(frame * 0.2) + 1) * 0.15;
        ctx.strokeStyle = `rgba(37,99,235,${pulse})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(px, py - 8, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '10px serif'; ctx.textAlign = 'center';
        ctx.fillText('💫', px + Math.cos(frame * 0.2) * 6, bodyTop - 12);
      } else {
        const s = a.swing;
        drawHeldWeapon(t.weapon, px + (5 + s * 3), bodyTop + 3 + bY * 0.5, t.color, t.dark, -Math.PI / 7 - s * 0.6);
      }
      ctx.restore();
    }

    function drawHeldWeapon(w, x, y, color, dark, rot) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.lineWidth = 1;
      switch (w) {
        case 'hammer':
          ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -10); ctx.stroke();
          ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
          ctx.fillRect(-4, -14, 8, 6); ctx.strokeRect(-4, -14, 8, 6); break;
        case 'syringe':
          ctx.fillStyle = color; ctx.strokeStyle = dark;
          ctx.fillRect(-2, -9, 4, 8); ctx.strokeRect(-2, -9, 4, 8);
          ctx.strokeStyle = '#9aa'; ctx.lineWidth = 0.9;
          ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, -13); ctx.stroke();
          ctx.fillStyle = '#777'; ctx.fillRect(-2.5, -2, 5, 1.5); break;
        case 'bolt':
          ctx.fillStyle = color; ctx.strokeStyle = dark;
          ctx.beginPath();
          ctx.moveTo(0, -12); ctx.lineTo(-2.5, -4); ctx.lineTo(0, -6); ctx.lineTo(2.5, -4);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, 2); ctx.stroke(); break;
        case 'shuriken':
          ctx.fillStyle = color; ctx.strokeStyle = dark;
          ctx.translate(0, -7); ctx.rotate(frame * 0.3);
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4, r = i % 2 === 0 ? 5.5 : 2.2;
            const px2 = Math.cos(a) * r, py2 = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
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

    function drawFarmer(f) {
      const moving = f.state === 'moving' || f.state === 'returning';
      const bY = Math.sin(f.bob) * (moving ? 2 : 0.9);
      const px = f.x, py = f.y + bY;

      ctx.save();
      ctx.translate(f.x, f.y); ctx.scale(CHAR_SCALE, CHAR_SCALE); ctx.translate(-f.x, -f.y);

      ctx.fillStyle = 'rgba(30,45,80,0.12)';
      ctx.beginPath(); ctx.ellipse(f.x, f.y + 4, 8, 3, 0, 0, Math.PI * 2); ctx.fill();

      // thân áo yếm xanh + dây đai (asset gốc)
      const bodyTop = py - 14;
      ctx.fillStyle = '#4a90d9'; ctx.strokeStyle = '#1a4578'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px - 4.5, py - 2); ctx.lineTo(px + 4.5, py - 2);
      ctx.lineTo(px + 3, bodyTop); ctx.lineTo(px - 3, bodyTop);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#1a4578'; ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(px - 1.8, bodyTop + 1); ctx.lineTo(px - 1.8, py - 2);
      ctx.moveTo(px + 1.8, bodyTop + 1); ctx.lineTo(px + 1.8, py - 2);
      ctx.stroke();

      // đầu + mũ bảo hộ có vành và núm (asset gốc)
      ctx.fillStyle = '#f5c49a'; ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, bodyTop - 4, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffc107'; ctx.strokeStyle = '#7a5a00'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, bodyTop - 4, 3.5, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffc107'; ctx.strokeStyle = '#7a5a00';
      ctx.fillRect(px - 4.5, bodyTop - 4, 9, 1.2);
      ctx.strokeRect(px - 4.5, bodyTop - 4, 9, 1.2);
      ctx.fillStyle = '#7a5a00'; ctx.fillRect(px - 0.8, bodyTop - 6.5, 1.6, 1);

      // cờ lê cầm tay phải (asset gốc)
      const swing = f.state === 'repairing' ? Math.sin(f.swingPhase) * 0.9 : 0;
      ctx.save();
      ctx.translate(px + 5, bodyTop + 3 + bY * 0.3); ctx.rotate(-Math.PI / 5 + swing);
      ctx.strokeStyle = '#9aa5b5'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.stroke();
      ctx.fillStyle = '#c0c8d4'; ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 0.7;
      ctx.fillRect(-3, -12, 6, 3); ctx.strokeRect(-3, -12, 6, 3);
      ctx.fillStyle = '#2a303a'; ctx.fillRect(-0.8, -12, 1.6, 1.6);
      ctx.restore();
      ctx.restore();
    }

    function drawDrone() {
      const hov = Math.sin(frame * 0.06) * 3;
      const x = drone.x, y = drone.y + hov;

      ctx.save();
      ctx.translate(drone.x, drone.y); ctx.scale(DRONE_SCALE, DRONE_SCALE); ctx.translate(-drone.x, -drone.y);

      ctx.fillStyle = 'rgba(30,45,80,0.10)';
      ctx.beginPath(); ctx.ellipse(x, drone.y + 26, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();

      // cánh quạt quay
      ctx.strokeStyle = 'rgba(90,110,150,0.55)';
      ctx.lineWidth = 1.2;
      const spin = frame * 0.7;
      for (let i = 0; i < 2; i++) {
        const ang = spin + i * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(ang) * 9, y - 12 - Math.sin(ang) * 2);
        ctx.lineTo(x + Math.cos(ang) * 9, y - 12 + Math.sin(ang) * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = '#5b6b80';
      ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y - 7); ctx.stroke();

      // thân lục giác
      ctx.fillStyle = '#dbeafe'; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = i * Math.PI / 3 + Math.PI / 6;
        const px = x + Math.cos(ang) * 8, py = y + Math.sin(ang) * 8;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // mắt cảm biến quét
      const eyeX = x + Math.sin(frame * 0.05) * 2.5;
      ctx.fillStyle = drone.flash > 0 ? '#e5484d' : '#2563eb';
      ctx.beginPath(); ctx.arc(eyeX, y, 2.4, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = 'rgba(37,99,235,0.55)';
      ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
      ctx.fillText('AV-BOT', x, y + 18);

      if (drone.flash > 0) {
        ctx.strokeStyle = `rgba(37,99,235,${drone.flash / 12 * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 12 + (12 - drone.flash) * 1.5, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }

    // ================= LOGIC =================

    function fire(a, srv) {
      const fromP = { x: a.x, y: a.y - 14 };
      const toP = { x: srv.x - 18, y: srv.y - 26 };
      const blocked = Math.random() < 0.13;
      projectiles.push({
        from: fromP, to: toP, t: 0,
        speed: 0.008 + Math.random() * 0.005,
        weapon: a.type.weapon, color: a.type.color, dark: a.type.dark,
        dmg: a.type.dmg, arc: a.type.arc, target: srv.name,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.4,
        blocked,
        tBlock: blocked ? (wallX - fromP.x) / (toP.x - fromP.x) : 2
      });
    }

    function projPos(p, t) {
      return {
        x: p.from.x + (p.to.x - p.from.x) * t,
        y: p.from.y + (p.to.y - p.from.y) * t - Math.sin(t * Math.PI) * p.arc
      };
    }

    function blockHit(p) {
      const pos = projPos(p, p.tBlock);
      stats.blocked++;
      rings.push({ x: pos.x, y: pos.y, r0: 4, maxR: 26, color: '37,99,235', life: 22, maxLife: 22 });
      floaters.push({
        x: pos.x, y: pos.y - 14, text: 'BLOCKED',
        color: '#2563eb', life: 45, maxLife: 45, big: false
      });
      for (let i = 0; i < 8; i++) {
        const ang = Math.PI + (Math.random() - 0.5) * 1.6; // bật ngược lại
        const sp = Math.random() * 2.5 + 1;
        particles.push({
          x: pos.x, y: pos.y,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 0.8,
          life: 18 + Math.random() * 10, maxLife: 28,
          color: '#60a5fa', size: 1.6 + Math.random() * 1.2
        });
      }
    }

    function spawnExplosion(x, y, baseColor) {
      camShake = 10;
      // cầu lửa hai lớp
      booms.push({ x, y, r0: 8, maxR: 62, life: 24, maxLife: 24 });
      booms.push({ x, y, r0: 4, maxR: 34, life: 14, maxLife: 14 });
      // sóng xung kích lan nhiều lớp
      rings.push({ x, y, r0: 8, maxR: 85, color: '229,72,77', life: 32, maxLife: 32 });
      rings.push({ x, y, r0: 5, maxR: 55, color: '247,107,21', life: 24, maxLife: 24 });
      // mảnh vỡ server văng tứ tung
      for (let i = 0; i < 16; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 2 + Math.random() * 4.5;
        debris.push({
          x, y,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 3.2,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.5,
          size: 3 + Math.random() * 4.5,
          color: pick([baseColor, '#5b6b80', '#39455c', '#9aa5b8', '#e5484d']),
          life: 55 + Math.random() * 35, maxLife: 90
        });
      }
      // lửa phụt lên
      for (let i = 0; i < 20; i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        const sp = 1.5 + Math.random() * 3.5;
        particles.push({
          x: x + (Math.random() - 0.5) * 24, y,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 26 + Math.random() * 18, maxLife: 44, grav: -0.02,
          color: pick(['#ff9838', '#ffc24a', '#ff6a3d', '#ffe08a']),
          size: 2.2 + Math.random() * 2.2
        });
      }
      // cột khói đen bùng lên ngay lúc nổ
      for (let i = 0; i < 10; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 30, y: y - 8,
          vx: (Math.random() - 0.5) * 0.8, vy: -0.9 - Math.random() * 1.1,
          life: 48 + Math.random() * 24, maxLife: 72, grav: -0.008,
          color: pick(['#4a5364', '#6b7688', '#8a94a8']),
          size: 3.4 + Math.random() * 2.6, alpha: 0.55
        });
      }
    }

    function applyHit(p) {
      const srv = getServer(p.target);
      if (!srv || srv.dead > 0) return;
      stats.attacks++;
      srv.hp -= p.dmg;
      srv.shake = 5;

      rings.push({ x: p.to.x, y: p.to.y, r0: 3, maxR: 20, color: '229,72,77', life: 18, maxLife: 18 });
      for (let i = 0; i < 9; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = Math.random() * 2.5 + 1;
        particles.push({
          x: p.to.x, y: p.to.y,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1.2,
          life: 20 + Math.random() * 14, maxLife: 34,
          color: p.color, size: 1.8 + Math.random() * 1.6
        });
      }
      floaters.push({
        x: p.to.x - 10 + (Math.random() - 0.5) * 14, y: p.to.y - 10,
        text: '-' + p.dmg, color: p.color, life: 42, maxLife: 42, big: false
      });

      if (srv.hp <= 0) {
        srv.hp = 0; srv.dead = 150;
        stats.breaches++;
        spawnExplosion(srv.x, srv.y - 22, srv.c);
        floaters.push({
          x: srv.x, y: srv.y - 48, text: 'BREACHED',
          color: '#e5484d', life: 120, maxLife: 120, big: true
        });
        for (let i = 0; i < 30; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp2 = Math.random() * 4.5 + 1.5;
          particles.push({
            x: srv.x, y: srv.y,
            vx: Math.cos(ang) * sp2, vy: Math.sin(ang) * sp2 - 2,
            life: 40 + Math.random() * 22, maxLife: 62,
            color: ['#e5484d', '#f76b15', '#8b5cf6'][Math.floor(Math.random() * 3)],
            size: 2 + Math.random() * 2.5
          });
        }
      }
    }

    function drawProjectile(p) {
      const cur = projPos(p, p.t);
      for (let i = 1; i <= 4; i++) {
        const tt = Math.max(0, p.t - i * 0.04);
        const tp = projPos(p, tt);
        ctx.globalAlpha = (5 - i) / 16;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(tp.x, tp.y, 3 - i * 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(cur.x, cur.y); ctx.rotate(p.rot);
      drawProjWeapon(p.weapon, p.color, p.dark);
      ctx.restore();
    }

    function drawProjWeapon(w, color, dark) {
      switch (w) {
        case 'hammer':
          ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(4, 0); ctx.stroke();
          ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
          ctx.fillRect(2, -7, 11, 14); ctx.strokeRect(2, -7, 11, 14);
          ctx.fillStyle = shade(color, 0.3); ctx.fillRect(3, -6, 3, 12); break;
        case 'syringe':
          ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
          ctx.fillRect(-9, -3, 13, 6); ctx.strokeRect(-9, -3, 13, 6);
          ctx.fillStyle = '#8a94a8'; ctx.fillRect(-13, -4.5, 4, 9);
          ctx.strokeStyle = '#aab4c6'; ctx.lineWidth = 1.7;
          ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(13, 0); ctx.stroke();
          ctx.fillStyle = shade(color, 0.35); ctx.fillRect(-5, -2, 7, 4); break;
        case 'bolt':
          ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(13, 0); ctx.lineTo(4, -4); ctx.lineTo(4, -2);
          ctx.lineTo(-9, -2); ctx.lineTo(-9, 2); ctx.lineTo(4, 2);
          ctx.lineTo(4, 4); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = color; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left';
          ctx.fillText('10', -16, 3); break;
        case 'shuriken':
          ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4, r = i % 2 === 0 ? 9 : 3.5;
            const px = Math.cos(a) * r, py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill(); break;
        case 'packet':
          ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 1;
          ctx.fillRect(-6, -5, 12, 10); ctx.strokeRect(-6, -5, 12, 10);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center';
          ctx.textBaseline = 'middle'; ctx.fillText('PKT', 0, 0); ctx.textBaseline = 'alphabetic'; break;
        case 'hook':
          ctx.strokeStyle = 'rgba(214,64,159,0.4)'; ctx.lineWidth = 0.7;
          ctx.setLineDash([2, 2]);
          ctx.beginPath(); ctx.moveTo(-16, -3); ctx.lineTo(-3, -5); ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = color; ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(-3, -5); ctx.lineTo(8, -5);
          ctx.quadraticCurveTo(13, 0, 7, 4);
          ctx.lineTo(4, 3); ctx.lineTo(6, 1);
          ctx.stroke(); break;
      }
    }

    function drawParticle(pt) {
      ctx.globalAlpha = (pt.alpha !== undefined ? pt.alpha : 0.85) * pt.life / pt.maxLife;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (pt.life / pt.maxLife), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    function drawFloater(f) {
      ctx.globalAlpha = Math.min(1, f.life / (f.maxLife * 0.6));
      ctx.fillStyle = f.color;
      const size = f.big ? 14 : f.small ? 8 : 11;
      ctx.font = `bold ${size}px monospace`;
      ctx.textAlign = 'center';
      if (f.big) {
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
        ctx.strokeText(f.text, f.x, f.y);
      }
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    function drawBoom(b) {
      const k = 1 - b.life / b.maxLife;
      const a = b.life / b.maxLife;
      const r = b.r0 + (b.maxR - b.r0) * Math.pow(k, 0.55);
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
      g.addColorStop(0, `rgba(255,240,200,${0.9 * a})`);
      g.addColorStop(0.4, `rgba(255,150,60,${0.65 * a})`);
      g.addColorStop(1, 'rgba(255,80,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
    }

    function drawDebris(d) {
      ctx.save();
      ctx.translate(d.x, d.y); ctx.rotate(d.rot);
      ctx.globalAlpha = Math.min(1, d.life / (d.maxLife * 0.35));
      ctx.fillStyle = d.color;
      ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size * 0.7);
      ctx.strokeStyle = 'rgba(30,45,80,0.35)'; ctx.lineWidth = 0.6;
      ctx.strokeRect(-d.size / 2, -d.size / 2, d.size, d.size * 0.7);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawRing(r) {
      const k = 1 - r.life / r.maxLife;
      ctx.strokeStyle = `rgba(${r.color},${0.5 * (r.life / r.maxLife)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r0 + (r.maxR - r.r0) * k, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawBeam(b) {
      const a = b.life / b.maxLife;
      ctx.strokeStyle = `rgba(37,99,235,${a * 0.65})`;
      ctx.lineWidth = 2.5 * a;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.strokeStyle = `rgba(147,197,253,${a * 0.9})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    }

    function moveToward(o, tx, ty, speed) {
      const dx = tx - o.x, dy = ty - o.y;
      const d = Math.hypot(dx, dy);
      if (d < 3) return true;
      o.x += dx / d * speed;
      o.y += dy / d * speed;
      return false;
    }

    function updateAttacker(a) {
      a.swing *= 0.85;
      if (a.state === 'stunned') {
        a.bob += 0.3;
        a.stunT--;
        if (a.stunT <= 0) a.state = 'retreat';
        return;
      }
      if (a.state === 'idle') {
        a.bob += 0.05;
        a.cd--;
        // gõ phím: nhả ký hiệu code lơ lửng
        if (Math.random() < 0.004) {
          floaters.push({
            x: a.x + 8, y: a.y - 24,
            text: pick(CODE_GLYPHS), color: a.type.color,
            life: 35, maxLife: 35, big: false, small: true
          });
        }
        if (a.cd <= 0) {
          const srv = getServer(a.type.target);
          if (srv && srv.dead <= 0) {
            const dx = srv.x - a.homeX, dy = srv.y - a.homeY;
            const d = Math.hypot(dx, dy);
            const dist = W * (0.045 + Math.random() * 0.025);
            a.advX = a.homeX + dx / d * dist;
            a.advY = a.homeY + dy / d * dist * 0.4;
            a.state = 'advance';
          } else {
            a.cd = 40 + Math.random() * 30;
          }
        }
      } else if (a.state === 'advance') {
        a.bob += 0.24;
        if (moveToward(a, a.advX, a.advY, a.moveSpeed)) {
          a.state = 'strike';
          a.strikeT = 12;
        }
      } else if (a.state === 'strike') {
        a.bob += 0.08;
        a.strikeT--;
        if (a.strikeT === 7) {
          const srv = getServer(a.type.target);
          if (srv && srv.dead <= 0) { fire(a, srv); a.swing = 1; }
        }
        if (a.strikeT <= 0) { a.state = 'retreat'; }
      } else if (a.state === 'retreat') {
        a.bob += 0.24;
        if (moveToward(a, a.homeX, a.homeY, a.moveSpeed * 0.85)) {
          a.state = 'idle';
          a.cd = a.type.rate * (0.5 + Math.random() * 0.5);
        }
      }
    }

    function assignFarmer(f) {
      const candidates = servers.filter(s => s.dead <= 0 && s.hp < s.max * 0.92);
      if (candidates.length === 0) return false;
      candidates.sort((x, y) => (x.hp / x.max) - (y.hp / y.max));
      for (const s of candidates) {
        const assigned = farmers.filter(x => x.target === s && (x.state === 'moving' || x.state === 'repairing')).length;
        if (assigned < 2) {
          f.target = s;
          f.repairX = s.x + s.w / 2 + 16;
          f.repairY = s.y + (assigned === 0 ? 8 : -10);
          f.state = 'moving';
          return true;
        }
      }
      return false;
    }

    function updateFarmer(f) {
      f.bob += (f.state === 'moving' || f.state === 'returning') ? 0.24 : 0.05;
      if (f.state === 'idle') {
        assignFarmer(f);
      } else if (f.state === 'moving') {
        if (!f.target || f.target.dead > 0) {
          f.target = null; f.state = 'returning'; return;
        }
        if (moveToward(f, f.repairX, f.repairY, f.moveSpeed)) {
          f.state = 'repairing';
          f.swingPhase = 0;
          f.repairTick = 0;
        }
      } else if (f.state === 'repairing') {
        if (!f.target || f.target.dead > 0 || f.target.hp >= f.target.max) {
          f.state = 'returning';
          return;
        }
        f.swingPhase += 0.25;
        f.target.hp = Math.min(f.target.max, f.target.hp + 0.3);
        f.repairTick++;
        if (f.repairTick % 30 === 0) {
          for (let i = 0; i < 4; i++) {
            const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
            const spd = 1 + Math.random() * 1.6;
            particles.push({
              x: f.target.x + (Math.random() - 0.5) * 30, y: f.target.y - 10,
              vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
              life: 16, maxLife: 16,
              color: ['#f5b50a', '#fbbf24', '#f59e0b'][i % 3], size: 1.6
            });
          }
        }
        if (f.repairTick % 75 === 0) {
          floaters.push({
            x: f.x, y: f.y - 22,
            text: '+15', color: '#22a55e',
            life: 38, maxLife: 38, big: false
          });
          stats.repairs++;
        }
      } else if (f.state === 'returning') {
        if (moveToward(f, f.homeX, f.homeY, f.moveSpeed * 0.9)) {
          f.state = 'idle';
          f.target = null;
        }
      }
    }

    function updateDrone() {
      // tuần tra dọc tường lửa
      drone.y = H * 0.5 + Math.sin(frame * 0.008) * H * 0.34;
      drone.x = W * 0.765 + Math.sin(frame * 0.017) * W * 0.012;
      if (drone.flash > 0) drone.flash--;
      drone.cd--;
      if (drone.cd <= 0) {
        const targets = attackers.filter(a => a.state === 'advance' || a.state === 'strike');
        if (targets.length === 0) { drone.cd = 40; return; }
        // ưu tiên thằng gần drone nhất
        targets.sort((p, q) => Math.hypot(p.x - drone.x, p.y - drone.y) - Math.hypot(q.x - drone.x, q.y - drone.y));
        const victim = targets[0];
        beams.push({ x1: drone.x, y1: drone.y, x2: victim.x, y2: victim.y - 12, life: 14, maxLife: 14 });
        victim.state = 'stunned';
        victim.stunT = 90;
        victim.swing = 0;
        stats.quarantined++;
        drone.flash = 12;
        drone.cd = 200 + Math.random() * 160;
        floaters.push({
          x: victim.x, y: victim.y - 34, text: 'QUARANTINED',
          color: '#2563eb', life: 60, maxLife: 60, big: false
        });
        rings.push({ x: victim.x, y: victim.y - 10, r0: 3, maxR: 22, color: '37,99,235', life: 20, maxLife: 20 });
        for (let i = 0; i < 10; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = Math.random() * 2.2 + 0.8;
          particles.push({
            x: victim.x, y: victim.y - 10,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1,
            life: 18 + Math.random() * 10, maxLife: 28,
            color: '#60a5fa', size: 1.6
          });
        }
      }
    }

    function update() {
      frame++;
      camShake *= 0.88;

      servers.forEach(s => {
        s.shake *= 0.82;
        if (s.dead > 0) {
          s.dead--;
          if (s.dead <= 0) {
            s.hp = s.max;
          } else {
            // khói đen cuộn liên tục từ xác server
            if (frame % 3 === 0) {
              particles.push({
                x: s.x + (Math.random() - 0.5) * s.w * 0.7, y: s.y - s.h / 2 + 4,
                vx: (Math.random() - 0.5) * 0.5, vy: -0.7 - Math.random() * 0.6,
                life: 50 + Math.random() * 20, maxLife: 70, grav: -0.008,
                color: pick(['#4a5364', '#6b7688', '#8a94a8']),
                size: 3 + Math.random() * 2.4, alpha: 0.5
              });
            }
            // lưỡi lửa liếm lên thất thường
            if (Math.random() < 0.25) {
              particles.push({
                x: s.x + (Math.random() - 0.5) * s.w * 0.5, y: s.y + s.h / 2 - 10,
                vx: (Math.random() - 0.5) * 0.4, vy: -1 - Math.random() * 0.8,
                life: 16 + Math.random() * 12, maxLife: 28, grav: -0.03,
                color: pick(['#ff9838', '#ffc24a', '#ff6a3d']),
                size: 1.8 + Math.random() * 1.8
              });
            }
            // thỉnh thoảng nổ lụp bụp lần hai
            if (Math.random() < 0.012) {
              const px = s.x + (Math.random() - 0.5) * s.w * 0.5;
              const py = s.y + (Math.random() - 0.5) * s.h * 0.4;
              booms.push({ x: px, y: py, r0: 2, maxR: 16, life: 10, maxLife: 10 });
              rings.push({ x: px, y: py, r0: 2, maxR: 18, color: '247,107,21', life: 14, maxLife: 14 });
              for (let i = 0; i < 6; i++) {
                const ang = Math.random() * Math.PI * 2;
                const sp = 1 + Math.random() * 2;
                particles.push({
                  x: px, y: py,
                  vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 1,
                  life: 14 + Math.random() * 10, maxLife: 24,
                  color: pick(['#ff9838', '#ffc24a', '#e5484d']), size: 1.6
                });
              }
            }
          }
        } else if (s.hp < s.max) {
          s.hp = Math.min(s.max, s.hp + 0.08);
        }
        // khói khi server yếu máu — càng tụt máu khói càng dày, càng sẫm
        if (s.dead <= 0 && s.hp < s.max * 0.65) {
          const ratio = s.hp / s.max;
          const every = ratio < 0.25 ? 2 : ratio < 0.45 ? 3 : 5;
          if (frame % every === 0) {
            particles.push({
              x: s.x + (Math.random() - 0.5) * s.w * 0.7, y: s.y - s.h / 2,
              vx: (Math.random() - 0.5) * 0.35, vy: -0.6 - Math.random() * 0.5,
              life: 44, maxLife: 44, grav: -0.009,
              color: ratio < 0.25 ? '#6b7688' : '#9aa5b8',
              size: 2.8 + Math.random() * 2, alpha: ratio < 0.25 ? 0.55 : 0.4
            });
          }
        }
      });

      attackers.forEach(updateAttacker);
      farmers.forEach(updateFarmer);
      updateDrone();

      glyphs.forEach(gl => {
        gl.y -= gl.vy;
        if (gl.y < -12) {
          gl.y = H + 12;
          gl.x = gl.left ? Math.random() * W * 0.28 : W * 0.68 + Math.random() * W * 0.32;
          gl.ch = Math.random() < 0.5 ? '0' : '1';
        }
      });

      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.t += p.speed;
        p.rot += p.rotSpeed;
        if (p.blocked && p.t >= p.tBlock) {
          blockHit(p); projectiles.splice(i, 1);
        } else if (p.t >= 1) {
          applyHit(p); projectiles.splice(i, 1);
        }
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx; pt.y += pt.vy;
        pt.vy += (pt.grav !== undefined ? pt.grav : 0.1);
        pt.vx *= 0.98; pt.life--;
        if (pt.life <= 0) particles.splice(i, 1);
      }
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.y -= f.big ? 0.3 : 0.65;
        f.life--;
        if (f.life <= 0) floaters.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].life--;
        if (rings[i].life <= 0) rings.splice(i, 1);
      }
      for (let i = beams.length - 1; i >= 0; i--) {
        beams[i].life--;
        if (beams[i].life <= 0) beams.splice(i, 1);
      }
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.x += d.vx; d.y += d.vy;
        d.vy += 0.16; d.vx *= 0.99;
        d.rot += d.rotSpeed;
        d.life--;
        if (d.life <= 0) debris.splice(i, 1);
      }
      for (let i = booms.length - 1; i >= 0; i--) {
        booms[i].life--;
        if (booms[i].life <= 0) booms.splice(i, 1);
      }
    }

    function render() {
      ctx.save();
      if (camShake > 0.3) {
        ctx.translate((Math.random() - 0.5) * camShake, (Math.random() - 0.5) * camShake);
      }

      drawBackground();

      servers.forEach(drawServer);
      const chars = [...attackers.map(a => ({ t: 'a', r: a })), ...farmers.map(f => ({ t: 'f', r: f }))];
      chars.sort((x, y) => x.r.y - y.r.y);
      chars.forEach(c => c.t === 'a' ? drawAttacker(c.r) : drawFarmer(c.r));

      drawDrone();
      beams.forEach(drawBeam);
      projectiles.forEach(drawProjectile);
      booms.forEach(drawBoom);
      debris.forEach(drawDebris);
      rings.forEach(drawRing);
      particles.forEach(drawParticle);
      floaters.forEach(drawFloater);

      ctx.fillStyle = 'rgba(30,45,80,0.30)';
      ctx.font = '10px monospace'; ctx.textAlign = 'left';
      ctx.fillText(
        `attacks ${stats.attacks} · blocked ${stats.blocked} · quarantined ${stats.quarantined} · breaches ${stats.breaches} · repairs ${stats.repairs}`,
        14, H - 12
      );

      ctx.restore();
    }

    function loop() { update(); render(); requestAnimationFrame(loop); }
    loop();
  })();

  // password show/hide toggle
  (function () {
    const pwField = document.getElementById('lg-pass');
    const eyeToggle = document.getElementById('eyeToggle');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeOpen = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>';
    const eyeClosed = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a21.6 21.6 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    eyeToggle.addEventListener('click', () => {
      const showing = pwField.type === 'text';
      pwField.type = showing ? 'password' : 'text';
      eyeIcon.innerHTML = showing ? eyeOpen : eyeClosed;
    });
  })();
});
