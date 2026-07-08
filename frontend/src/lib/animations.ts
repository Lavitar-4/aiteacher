/**
 * Physics Animation Engine
 * Draws physics simulations on an HTML5 canvas.
 */

export type AnimationType =
  | "projectile"
  | "pendulum"
  | "wave"
  | "orbital"
  | "electric_field"
  | "collision"
  | "spring"
  | "quantum_wave"
  | "graph"
  | "doppler"
  | "gravitational_field"
  | "atom"
  | "nuclear"
  | "solar_blast"
  | "gravity_change"
  | "black_hole"
  | "custom"
  | "code"
  | "3d_code";

export interface AnimationParams {
  [key: string]: unknown;
}

export class PhysicsAnimator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rafId: number | null = null;
  private startTime: number = 0;
  private currentType: AnimationType | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  start(type: AnimationType, params: AnimationParams = {}) {
    this.stop();
    this.currentType = type;
    this.startTime = performance.now();
    const animate = (now: number) => {
      const t = (now - this.startTime) / 1000;
      this.clear();
      this.draw(type, t, params);
      this.rafId = requestAnimationFrame(animate);
    };
    this.rafId = requestAnimationFrame(animate);
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private clear() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    // Dark background
    this.ctx.fillStyle = "#0a0e1a";
    this.ctx.fillRect(0, 0, width, height);
  }

  private draw(type: AnimationType, t: number, p: AnimationParams) {
    switch (type) {
      case "projectile": return this.drawProjectile(t, p);
      case "pendulum": return this.drawPendulum(t, p);
      case "wave": return this.drawWave(t, p);
      case "orbital": return this.drawOrbital(t, p);
      case "electric_field": return this.drawElectricField(t, p);
      case "collision": return this.drawCollision(t, p);
      case "spring": return this.drawSpring(t, p);
      case "quantum_wave": return this.drawQuantumWave(t, p);
      case "graph": return this.drawGraph(t, p);
      case "doppler": return this.drawDoppler(t, p);
      case "gravitational_field": return this.drawGravitationalField(t, p);
      case "atom": return this.drawAtom(t, p);
      case "nuclear": return this.drawNuclear(t, p);
      case "solar_blast": return this.drawSolarBlast(t, p);
      case "gravity_change": return this.drawGravityChange(t, p);
      case "black_hole": return this.drawBlackHole(t, p);
      case "custom": return this.drawCustom(t, p);
      case "code": return this.drawCode(t, p);
      default: this.drawPlaceholder(type);
    }
  }

  private drawProjectile(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const angle = ((p.angle as number) || 45) * Math.PI / 180;
    const v0 = (p.velocity as number) || 20;
    const g = (p.gravity as number) || 9.8;
    const scale = W / 80;

    // Ground
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - 40);
    ctx.lineTo(W, H - 40);
    ctx.stroke();

    // Trajectory path
    ctx.strokeStyle = "rgba(99,179,237,0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const totalT = (2 * v0 * Math.sin(angle)) / g;
    for (let ti = 0; ti <= totalT; ti += 0.05) {
      const x = v0 * Math.cos(angle) * ti * scale + 40;
      const y = H - 40 - (v0 * Math.sin(angle) * ti - 0.5 * g * ti * ti) * scale;
      ti === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Ball
    const loopT = t % (totalT + 0.5);
    if (loopT <= totalT) {
      const bx = v0 * Math.cos(angle) * loopT * scale + 40;
      const by = H - 40 - (v0 * Math.sin(angle) * loopT - 0.5 * g * loopT * loopT) * scale;
      const grd = ctx.createRadialGradient(bx, by, 2, bx, by, 14);
      grd.addColorStop(0, "#60a5fa");
      grd.addColorStop(1, "#1d4ed8");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(bx, Math.max(by, H - 53), 12, 0, Math.PI * 2);
      ctx.fill();
    }

    this.label(`Projectile: v₀=${v0} m/s  θ=${p.angle || 45}°`, W / 2, 24);
  }

  private drawPendulum(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const L = ((p.length as number) || 1) * 160;
    const theta0 = ((p.angle as number) || 30) * Math.PI / 180;
    const g = 9.8;
    const omega = Math.sqrt(g / (L / 160));
    const theta = theta0 * Math.cos(omega * t);

    const pivotX = W / 2, pivotY = 60;
    const bobX = pivotX + L * Math.sin(theta);
    const bobY = pivotY + L * Math.cos(theta);

    // Pivot
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath(); ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2); ctx.fill();

    // Rod
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(bobX, bobY); ctx.stroke();

    // Bob
    const grd = ctx.createRadialGradient(bobX, bobY, 4, bobX, bobY, 22);
    grd.addColorStop(0, "#f59e0b"); grd.addColorStop(1, "#92400e");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(bobX, bobY, 20, 0, Math.PI * 2); ctx.fill();

    this.label(`Pendulum: L=${p.length || 1}m  θ₀=${p.angle || 30}°`, W / 2, 24);
  }

  private drawWave(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const freq = (p.frequency as number) || 2;
    const amp = (p.amplitude as number) || 60;
    const cy = H / 2;

    ctx.strokeStyle = "#818cf8";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#6366f1";
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      const y = cy + amp * Math.sin(2 * Math.PI * freq * (x / W) - t * 3);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Axis
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();

    this.label(`Wave: f=${freq} Hz  A=${amp}`, W / 2, 24);
  }

  private drawOrbital(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W / 2, cy = H / 2;
    const ecc = (p.eccentricity as number) || 0.2;
    const a = 130, b = a * Math.sqrt(1 - ecc * ecc);

    // Orbit path
    ctx.strokeStyle = "rgba(167,139,250,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2); ctx.stroke();

    // Sun
    const sunGrd = ctx.createRadialGradient(cx, cy, 4, cx, cy, 24);
    sunGrd.addColorStop(0, "#fef08a"); sunGrd.addColorStop(1, "#f97316");
    ctx.fillStyle = sunGrd;
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fill();

    // Planet
    const angle = t * 0.8;
    const px = cx + a * Math.cos(angle);
    const py = cy + b * Math.sin(angle);
    const grd = ctx.createRadialGradient(px, py, 2, px, py, 12);
    grd.addColorStop(0, "#60a5fa"); grd.addColorStop(1, "#1e40af");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill();

    this.label(`Orbital Motion  e=${ecc}`, W / 2, 24);
  }

  private drawElectricField(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    type Charge = { x: number; y: number; charge: number };
    const charges: Charge[] = (p.charges as Charge[]) || [
      { x: 0.35, y: 0.5, charge: 1 },
      { x: 0.65, y: 0.5, charge: -1 },
    ];

    const lines = 16;
    charges.forEach((c) => {
      const cx = c.x * W, cy = c.y * H;
      for (let i = 0; i < lines; i++) {
        const startAngle = (i / lines) * Math.PI * 2;
        let x = cx + 22 * Math.cos(startAngle);
        let y = cy + 22 * Math.sin(startAngle);
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let step = 0; step < 80; step++) {
          let fx = 0, fy = 0;
          charges.forEach((cc) => {
            const dx = x - cc.x * W, dy = y - cc.y * H;
            const r2 = dx * dx + dy * dy + 1;
            const f = cc.charge / r2;
            fx += f * dx; fy += f * dy;
          });
          const mag = Math.sqrt(fx * fx + fy * fy);
          x += (fx / mag) * 5; y += (fy / mag) * 5;
          ctx.lineTo(x, y);
          if (x < 0 || x > W || y < 0 || y > H) break;
        }
        ctx.strokeStyle = c.charge > 0 ? "rgba(248,113,113,0.7)" : "rgba(96,165,250,0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.fillStyle = c.charge > 0 ? "#f87171" : "#60a5fa";
      ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(c.charge > 0 ? "+" : "−", cx, cy + 5);
    });
    this.label("Electric Field Lines", W / 2, 24);
  }

  private drawCollision(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const m1 = (p.m1 as number) || 2, m2 = (p.m2 as number) || 1;
    const v1i = (p.v1 as number) || 5, v2i = (p.v2 as number) || 0;
    const isElastic = (p.type as string) !== "inelastic";
    const collideAt = 2;
    const cy = H / 2;
    const r1 = 10 + m1 * 8, r2 = 10 + m2 * 8;
    let x1: number, x2: number;
    const v1f = isElastic ? ((m1 - m2) * v1i + 2 * m2 * v2i) / (m1 + m2) : (m1 * v1i + m2 * v2i) / (m1 + m2);
    const v2f = isElastic ? ((m2 - m1) * v2i + 2 * m1 * v1i) / (m1 + m2) : v1f;

    if (t < collideAt) {
      x1 = 60 + v1i * t * 30;
      x2 = W - 80 + v2i * t * 30;
    } else {
      const dt = t - collideAt;
      x1 = 60 + v1i * collideAt * 30 + v1f * dt * 30;
      x2 = W - 80 + v2i * collideAt * 30 + v2f * dt * 30;
    }

    [[x1, r1, "#f59e0b", `m₁=${m1}kg`], [x2, r2, "#60a5fa", `m₂=${m2}kg`]].forEach(([x, r, color, label]) => {
      const grd = ctx.createRadialGradient(x as number, cy, 2, x as number, cy, r as number);
      grd.addColorStop(0, color as string); grd.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(x as number, cy, r as number, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText(label as string, x as number, cy + (r as number) + 16);
    });

    // Ground line
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy + 40); ctx.lineTo(W, cy + 40); ctx.stroke();
    this.label(`${isElastic ? "Elastic" : "Inelastic"} Collision`, W / 2, 24);
  }

  private drawSpring(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const k = (p.k as number) || 10, mass = (p.mass as number) || 1, A = ((p.amplitude as number) || 0.2) * 200;
    const omega = Math.sqrt(k / mass);
    const x = W / 2 + A * Math.cos(omega * t);
    const cy = H / 2;
    const wallX = W / 2 - A - 60;

    // Spring coils
    ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(wallX, cy);
    const coils = 10, coilW = (x - wallX) / coils, coilH = 18;
    for (let i = 0; i < coils; i++) {
      ctx.bezierCurveTo(
        wallX + coilW * (i + 0.25), cy - coilH,
        wallX + coilW * (i + 0.75), cy + coilH,
        wallX + coilW * (i + 1), cy
      );
    }
    ctx.stroke();

    // Mass
    const grd = ctx.createRadialGradient(x, cy, 4, x, cy, 24);
    grd.addColorStop(0, "#34d399"); grd.addColorStop(1, "#064e3b");
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, cy, 24, 0, Math.PI * 2); ctx.fill();

    // Wall
    ctx.fillStyle = "#475569";
    ctx.fillRect(wallX - 20, cy - 60, 20, 120);
    this.label(`Spring-Mass: k=${k} N/m  m=${mass} kg`, W / 2, 24);
  }

  private drawQuantumWave(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const n = (p.n as number) || 1;
    const cy = H / 2;

    // Box walls
    ctx.fillStyle = "#64748b";
    ctx.fillRect(40, cy - 80, 8, 160);
    ctx.fillRect(W - 48, cy - 80, 8, 160);

    // Probability density |ψ|²
    ctx.fillStyle = "rgba(99,102,241,0.15)";
    ctx.beginPath(); ctx.moveTo(48, cy);
    for (let x = 48; x < W - 48; x++) {
      const xn = (x - 48) / (W - 96);
      const psi = Math.sin(n * Math.PI * xn) * Math.cos(t * 2);
      const y = cy - psi * 70;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W - 48, cy); ctx.closePath(); ctx.fill();

    // Wave function
    ctx.strokeStyle = "#818cf8"; ctx.lineWidth = 2.5; ctx.shadowBlur = 10; ctx.shadowColor = "#6366f1";
    ctx.beginPath();
    for (let x = 48; x < W - 48; x++) {
      const xn = (x - 48) / (W - 96);
      const psi = Math.sin(n * Math.PI * xn) * Math.cos(t * 2);
      const y = cy - psi * 70;
      x === 48 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
    this.label(`Particle in Box: n=${n} (quantum number)`, W / 2, 24);
  }

  private drawGraph(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const label = (p.label as string) || "y = f(x)";
    const xRange = (p.xRange as [number, number]) || [-5, 5];
    const fn = (p.fn as string) || "x*x";

    const evalFn = (x: number): number => {
      try { return Function("x", "t", `return ${fn}`)(x, t); }
      catch { return 0; }
    };

    const cx = W / 2, cy = H / 2;
    const scaleX = W / (xRange[1] - xRange[0]) * 0.8;
    const scaleY = 40;

    // Axes
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // Plot
    ctx.strokeStyle = "#f472b6"; ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8; ctx.shadowColor = "#ec4899";
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = xRange[0] + (i / 200) * (xRange[1] - xRange[0]);
      const y = evalFn(x);
      const px = cx + x * scaleX;
      const py = cy - y * scaleY;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.shadowBlur = 0;
    this.label(label, W / 2, 24);
  }

  private drawGravitationalField(t: number, _p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W / 2, cy = H / 2;
    const GM = 5000;

    const gridSpacing = 50;
    for (let gx = gridSpacing; gx < W; gx += gridSpacing) {
      for (let gy = gridSpacing; gy < H; gy += gridSpacing) {
        const dx = gx - cx, dy = gy - cy;
        const r2 = dx * dx + dy * dy;
        const r = Math.sqrt(r2);
        if (r < 40) continue;
        const f = GM / r2;
        const scale = Math.min(f * 20, 18);
        const ax = -(dx / r) * scale, ay = -(dy / r) * scale;
        ctx.strokeStyle = `rgba(167,139,250,${Math.min(f * 8, 0.8)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + ax, gy + ay); ctx.stroke();
        ctx.fillStyle = `rgba(167,139,250,${Math.min(f * 8, 0.8)})`;
        ctx.beginPath(); ctx.arc(gx + ax, gy + ay, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    const sunGrd = ctx.createRadialGradient(cx, cy, 4, cx, cy, 30);
    sunGrd.addColorStop(0, "#fef08a"); sunGrd.addColorStop(1, "#f97316");
    ctx.fillStyle = sunGrd; ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.fill();
    this.label("Gravitational Field", W / 2, 24);
  }

  private drawDoppler(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cy = H / 2;
    const sourceX = 110 + ((t * 80) % (W - 220));
    const sourceY = cy;
    const frequency = (p.frequency as number) || 2;

    for (let i = 0; i < 11; i++) {
      const age = (t * frequency * 48 + i * 42) % 460;
      const centerX = sourceX - age * 0.42;
      const alpha = Math.max(0, 1 - age / 460);
      ctx.strokeStyle = `rgba(96,165,250,${alpha * 0.55})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, sourceY, age, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(sourceX, sourceY, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.moveTo(sourceX + 22, sourceY);
    ctx.lineTo(sourceX - 2, sourceY - 11);
    ctx.lineTo(sourceX - 2, sourceY + 11);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(0, cy + 55);
    ctx.lineTo(W, cy + 55);
    ctx.stroke();
    this.label("Doppler Effect: compressed wavefronts ahead", W / 2, 24);
  }

  private drawAtom(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W / 2, cy = H / 2;
    const element = (p.element as string) || "hydrogen";

    const nucleus = ctx.createRadialGradient(cx, cy, 4, cx, cy, 30);
    nucleus.addColorStop(0, "#fef08a");
    nucleus.addColorStop(1, "#e11d48");
    ctx.fillStyle = nucleus;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();

    const shells = element.toLowerCase() === "hydrogen" ? 1 : 3;
    for (let shell = 0; shell < shells; shell++) {
      const r = 80 + shell * 42;
      ctx.strokeStyle = `rgba(129,140,248,${0.5 - shell * 0.08})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.42, shell * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      const electronCount = shell === 0 ? 2 : 4;
      for (let e = 0; e < electronCount; e++) {
        const a = t * (1.2 + shell * 0.25) + (e / electronCount) * Math.PI * 2;
        const orbitAngle = shell * 0.7;
        const ox = r * Math.cos(a);
        const oy = r * 0.42 * Math.sin(a);
        const ex = cx + ox * Math.cos(orbitAngle) - oy * Math.sin(orbitAngle);
        const ey = cy + ox * Math.sin(orbitAngle) + oy * Math.cos(orbitAngle);
        ctx.fillStyle = "#60a5fa";
        ctx.beginPath();
        ctx.arc(ex, ey, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this.label(`Atom model: ${element}`, W / 2, 24);
  }

  private drawNuclear(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W / 2, cy = H / 2;
    const mode = ((p.type as string) || "fission").toLowerCase();
    const split = Math.min(1, (t % 4) / 2);
    const wobble = Math.sin(t * 10) * 2;

    const drawCluster = (x: number, y: number, scale: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + t * 0.25;
        const radius = (18 + (i % 3) * 9) * scale;
        const px = x + Math.cos(a) * radius + wobble;
        const py = y + Math.sin(a * 1.3) * radius;
        ctx.fillStyle = i % 2 === 0 ? "#f87171" : "#60a5fa";
        ctx.beginPath();
        ctx.arc(px, py, 10 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    if (mode === "fusion") {
      const offset = 110 * (1 - Math.min(1, (t % 3) / 1.5));
      drawCluster(cx - offset, cy, 0.8, 6);
      drawCluster(cx + offset, cy, 0.8, 6);
      if (offset < 10) drawCluster(cx, cy, 1.1, 14);
      this.label("Nuclear Fusion: light nuclei combine", W / 2, 24);
      return;
    }

    drawCluster(cx - split * 120, cy - split * 22, 1 - split * 0.25, 11);
    drawCluster(cx + split * 120, cy + split * 22, 0.8, 8);
    for (let i = 0; i < 3; i++) {
      const a = t * 1.7 + i * 2.1;
      ctx.strokeStyle = "#fef08a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (90 + split * 150), cy + Math.sin(a) * (70 + split * 120));
      ctx.stroke();
    }
    this.label("Nuclear Fission: nucleus splits and releases energy", W / 2, 24);
  }

  private drawSolarBlast(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W * 0.32, cy = H / 2;
    const cycle = (t % 7) / 7;
    const blastRadius = 35 + cycle * W * 0.9;
    const lightDelay = (p.lightDelayMinutes as number) || 8.3;

    const star = ctx.createRadialGradient(cx, cy, 10, cx, cy, 78 + Math.sin(t * 4) * 8);
    star.addColorStop(0, "#fff7ad");
    star.addColorStop(0.35, "#f59e0b");
    star.addColorStop(1, "rgba(185,28,28,0.15)");
    ctx.fillStyle = star;
    ctx.beginPath();
    ctx.arc(cx, cy, 62 + Math.sin(t * 5) * 5, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 4; i++) {
      const r = blastRadius - i * 80;
      if (r <= 20) continue;
      const alpha = Math.max(0, 1 - r / (W * 0.9));
      ctx.strokeStyle = `rgba(251,191,36,${alpha * 0.85})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const earthX = W * 0.77, earthY = cy + 42;
    ctx.strokeStyle = "rgba(96,165,250,0.22)";
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, W * 0.45, H * 0.28, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const reached = blastRadius > Math.hypot(earthX - cx, earthY - cy);
    ctx.fillStyle = reached ? "#f97316" : "#60a5fa";
    ctx.beginPath();
    ctx.arc(earthX, earthY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = reached ? "rgba(249,115,22,0.8)" : "rgba(96,165,250,0.6)";
    ctx.beginPath();
    ctx.arc(earthX, earthY, reached ? 30 + Math.sin(t * 8) * 6 : 23, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(226,232,240,0.72)";
    ctx.font = "12px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Earth receives the change after light-speed delay", earthX, earthY + 48);
    this.label(`What-if: Sun blast signal reaches Earth in about ${lightDelay} min`, W / 2, 24);
  }

  private drawGravityChange(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const factor = (p.gravityFactor as number) || 2;
    const ground = H - 70;
    const g = 9.8 * factor;
    const ballX = W * 0.34;
    const dropT = t % 2.6;
    const y = Math.min(ground, 80 + 0.5 * g * dropT * dropT * 42);

    ctx.strokeStyle = "rgba(74,222,128,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, ground);
    ctx.lineTo(W, ground);
    ctx.stroke();

    for (let i = 0; i < 10; i++) {
      const x = W * 0.58 + (i % 5) * 34;
      const y0 = 115 + Math.floor(i / 5) * 90;
      const arrowLen = 22 * factor;
      ctx.strokeStyle = "rgba(167,139,250,0.65)";
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y0 + arrowLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 5, y0 + arrowLen - 6);
      ctx.lineTo(x, y0 + arrowLen);
      ctx.lineTo(x + 5, y0 + arrowLen - 6);
      ctx.stroke();
    }

    const grd = ctx.createRadialGradient(ballX, y, 4, ballX, y, 20);
    grd.addColorStop(0, "#fef3c7");
    grd.addColorStop(1, "#f97316");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(ballX, y, 18, 0, Math.PI * 2);
    ctx.fill();

    this.label(`What-if gravity x${factor}: falling gets faster`, W / 2, 24);
  }

  private drawBlackHole(t: number, _p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W / 2, cy = H / 2;

    for (let i = 0; i < 7; i++) {
      const r = 55 + i * 28;
      ctx.strokeStyle = `rgba(129,140,248,${0.38 - i * 0.035})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.65, r * 0.42, Math.sin(t * 0.25) * 0.25, 0, Math.PI * 2);
      ctx.stroke();
    }

    const disk = ctx.createRadialGradient(cx, cy, 25, cx, cy, 160);
    disk.addColorStop(0, "rgba(0,0,0,1)");
    disk.addColorStop(0.35, "rgba(0,0,0,1)");
    disk.addColorStop(0.5, "rgba(251,146,60,0.85)");
    disk.addColorStop(0.75, "rgba(129,140,248,0.22)");
    disk.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = disk;
    ctx.beginPath();
    ctx.arc(cx, cy, 160, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(cx, cy, 46 + Math.sin(t * 2) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.stroke();
    this.label("Black hole: light bends near the event horizon", W / 2, 24);
  }

  private drawCustom(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const entities = (p.entities as any[]) || [];
    const cx = W / 2;
    const cy = H - 40; // Ground level by default

    // Draw Ground
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();

    // Scale: meters to pixels (e.g. 1m = 3px)
    const scale = 3;

    entities.forEach(e => {
      // Kinematics: s = ut + 1/2 at^2
      const x0 = Number(e.x) || 0;
      const y0 = Number(e.y) || 0;
      const vx = Number(e.vx) || 0;
      const vy = Number(e.vy) || 0;
      const ax = Number(e.ax) || 0;
      const ay = Number(e.ay) || 0;

      const currX = x0 + vx * t + 0.5 * ax * t * t;
      // Stop falling if hitting ground (simplified physics constraint)
      let currY = y0 + vy * t + 0.5 * ay * t * t;
      if (currY < 0 && ay < 0) currY = 0;

      // Map to canvas (physics Y is up, Canvas Y is down)
      const px = cx + currX * scale;
      const py = cy - currY * scale;

      ctx.fillStyle = e.color || "#fff";
      ctx.beginPath();
      
      if (e.shape === "rect") {
        const w = Number(e.width) || 20;
        const h = Number(e.height) || 20;
        ctx.fillRect(px - w/2, py - h, w, h);
      } else {
        const r = Number(e.radius) || 15;
        // Don't let circles sink into ground
        const adjustedPy = currY <= 0 ? cy - r : py;
        ctx.arc(px, adjustedPy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    this.label("AI Custom Physics Simulation", W / 2, 24);
  }

  private drawCode(t: number, p: AnimationParams) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    if (!p.code || typeof p.code !== "string") {
      this.label("AI Code Execution Failed: No code provided", W / 2, 24);
      return;
    }
    
    try {
      // Set default text/draw color to white so it's visible on dark bg
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#ffffff";
      ctx.font = "16px 'Inter', sans-serif";
      
      // Inject helper functions for physics drawing
      const helpers = `
        const drawArrow = (x1, y1, x2, y2, color = '#f87171', label = '') => {
          ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          const angle = Math.atan2(y2 - y1, x2 - x1);
          ctx.beginPath(); ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - 10 * Math.cos(angle - Math.PI/6), y2 - 10 * Math.sin(angle - Math.PI/6));
          ctx.lineTo(x2 - 10 * Math.cos(angle + Math.PI/6), y2 - 10 * Math.sin(angle + Math.PI/6));
          ctx.fill();
          if(label) {
            ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(label, (x1+x2)/2, (y1+y2)/2 - 10);
          }
        };
        const drawBar = (x, y, w, h, percent, color = '#4ade80', label = '') => {
          ctx.strokeStyle = '#fff'; ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = color; ctx.fillRect(x, y + h*(1-percent), w, h*percent);
          if(label) {
            ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(label, x + w/2, y + h + 15);
          }
        };
        const drawText = (text, x, y, color = '#fff') => {
          ctx.save();
          if (ctx.getTransform().d < 0) {
            ctx.translate(x, y);
            ctx.scale(1, -1);
            ctx.fillStyle = color; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(text, 0, 0);
          } else {
            ctx.fillStyle = color; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(text, x, y);
          }
          ctx.restore();
        };
        const drawImage = (emoji, x, y, size = 40) => {
          ctx.save();
          if (ctx.getTransform().d < 0) {
            ctx.translate(x, y);
            ctx.scale(1, -1);
            ctx.font = size + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 0, 0);
          } else {
            ctx.font = size + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(emoji, x, y);
          }
          ctx.restore();
        };
      `;

      // Safely evaluate the AI-generated code with helpers
      // Include the live slider values 'S' in the function signature
      const S = p.liveSliders || {};
      const runCustom = new Function("ctx", "W", "H", "t", "S", helpers + "\n" + (p.code as string));
      runCustom(ctx, W, H, t, S);
    } catch (e) {
      this.label("Code Simulation Error", W / 2, 24);
      console.error("AI Physics Simulation Error:", e);
    }
  }

  private drawPlaceholder(type: string) {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Animation: ${type}`, W / 2, H / 2);
  }

  private label(text: string, x: number, y: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "13px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
  }
}
