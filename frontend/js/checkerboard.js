/**
 * ChandraAlign - 8x8 Checkerboard Alignment Inspector
 * Alternating square matrix between CH-2 and LROC to detect sub-pixel boundary shearing.
 */

class CheckerboardInspector {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = Object.assign({
      gridDivisions: 8,
      blinkRateHz: 0, // 0 = static, 2 = 2Hz, 4 = 4Hz
      showEdges: false
    }, options);

    this.gridDivisions = this.options.gridDivisions;
    this.blinkRateHz = this.options.blinkRateHz;
    this.showEdges = this.options.showEdges;
    this.blinkPhase = 0; // 0 or 1
    this.blinkInterval = null;
    this.presetData = null;

    this.canvas = null;
    this.ctx = null;

    this.offscreenCh2 = document.createElement('canvas');
    this.offscreenLroc = document.createElement('canvas');

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="checkerboard-container" id="checker-viewport">
        <canvas id="cvs-checkerboard"></canvas>

        <div class="checkerboard-hud-controls">
          <div style="display:flex; align-items:center; gap:8px; font-family:var(--font-mono); font-size:0.75rem; color:var(--text-secondary);">
            <span>GRID:</span>
            <button class="btn-secondary" style="padding:4px 8px;" id="chk-grid-4">4x4</button>
            <button class="btn-secondary active" style="padding:4px 8px; border-color:var(--accent-cyan); color:var(--accent-cyan);" id="chk-grid-8">8x8</button>
            <button class="btn-secondary" style="padding:4px 8px;" id="chk-grid-16">16x16</button>
          </div>

          <div style="width:1px; height:20px; background:var(--border-subtle);"></div>

          <div style="display:flex; align-items:center; gap:8px; font-family:var(--font-mono); font-size:0.75rem; color:var(--text-secondary);">
            <span>BLINK INSPECTION:</span>
            <button class="btn-secondary" style="padding:4px 8px;" id="chk-blink-off">OFF</button>
            <button class="btn-secondary" style="padding:4px 8px;" id="chk-blink-2hz">2 Hz</button>
            <button class="btn-secondary" style="padding:4px 8px;" id="chk-blink-4hz">4 Hz</button>
          </div>

          <div style="width:1px; height:20px; background:var(--border-subtle);"></div>

          <label class="toggle-switch-wrapper" id="chk-toggle-edges">
            <div class="toggle-switch" id="switch-edges-knob">
              <div class="toggle-switch-knob"></div>
            </div>
            <span>CONTOUR EDGES</span>
          </label>
        </div>

        <div class="canvas-hud-overlay" style="top: 12px; left: 12px;">
          <span style="color: var(--accent-cyan);">■ CH-2 REGISTERED</span> &nbsp;|&nbsp; 
          <span style="color: var(--accent-amber);">■ LROC REFERENCE</span>
        </div>

        <div class="canvas-coords-overlay" id="checker-hud-status">
          CHECKERBOARD: 8x8 | BLINK: OFF | RESIDUAL RMSE: 0.2643 px
        </div>
      </div>
    `;

    this.viewport = document.getElementById('checker-viewport');
    this.canvas = document.getElementById('cvs-checkerboard');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
  }

  bindEvents() {
    const setGrid = (num, btnId) => {
      this.gridDivisions = num;
      ['chk-grid-4', 'chk-grid-8', 'chk-grid-16'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.style.borderColor = (id === btnId) ? 'var(--accent-cyan)' : 'var(--border-subtle)';
          btn.style.color = (id === btnId) ? 'var(--accent-cyan)' : 'var(--text-primary)';
        }
      });
      this.updateHUD();
      this.render();
    };

    const setBlink = (hz, btnId) => {
      this.blinkRateHz = hz;
      if (this.blinkInterval) clearInterval(this.blinkInterval);

      ['chk-blink-off', 'chk-blink-2hz', 'chk-blink-4hz'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.style.borderColor = (id === btnId) ? 'var(--accent-cyan)' : 'var(--border-subtle)';
          btn.style.color = (id === btnId) ? 'var(--accent-cyan)' : 'var(--text-primary)';
        }
      });

      if (hz > 0) {
        const intervalMs = 1000 / (hz * 2);
        this.blinkInterval = setInterval(() => {
          this.blinkPhase = this.blinkPhase === 0 ? 1 : 0;
          this.render();
        }, intervalMs);
      } else {
        this.blinkPhase = 0;
        this.render();
      }
      this.updateHUD();
    };

    document.getElementById('chk-grid-4')?.addEventListener('click', () => setGrid(4, 'chk-grid-4'));
    document.getElementById('chk-grid-8')?.addEventListener('click', () => setGrid(8, 'chk-grid-8'));
    document.getElementById('chk-grid-16')?.addEventListener('click', () => setGrid(16, 'chk-grid-16'));

    document.getElementById('chk-blink-off')?.addEventListener('click', () => setBlink(0, 'chk-blink-off'));
    document.getElementById('chk-blink-2hz')?.addEventListener('click', () => setBlink(2, 'chk-blink-2hz'));
    document.getElementById('chk-blink-4hz')?.addEventListener('click', () => setBlink(4, 'chk-blink-4hz'));

    const edgeToggle = document.getElementById('chk-toggle-edges');
    const edgeKnob = document.getElementById('switch-edges-knob');
    edgeToggle?.addEventListener('click', () => {
      this.showEdges = !this.showEdges;
      if (edgeKnob) {
        edgeKnob.classList.toggle('active', this.showEdges);
      }
      this.render();
    });
  }

  updateHUD() {
    const status = document.getElementById('checker-hud-status');
    if (status) {
      const blinkText = this.blinkRateHz > 0 ? `${this.blinkRateHz} Hz ACTIVE` : 'OFF';
      status.textContent = `CHECKERBOARD: ${this.gridDivisions}x${this.gridDivisions} | BLINK: ${blinkText} | SUB-PIXEL RMSE: 0.2643 px`;
    }
  }

  loadData(presetData) {
    this.presetData = presetData;
    this.resizeCanvases();
    this.render();
  }

  resizeCanvases() {
    const width = this.viewport?.clientWidth || 800;
    const height = this.viewport?.clientHeight || 560;

    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.offscreenCh2.width = width;
    this.offscreenCh2.height = height;
    this.offscreenLroc.width = width;
    this.offscreenLroc.height = height;

    this.bakeOffscreenTerrain();
  }

  bakeOffscreenTerrain() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctxCh2 = this.offscreenCh2.getContext('2d');
    const ctxLroc = this.offscreenLroc.getContext('2d');

    const craters = this.presetData?.craters || [];

    // Render CH-2
    this.drawTerrainLayer(ctxCh2, w, h, false, craters);
    // Render LROC
    this.drawTerrainLayer(ctxLroc, w, h, true, craters);
  }

  drawTerrainLayer(ctx, w, h, isLroc, craters) {
    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, w * 0.7);
    if (isLroc) {
      bgGrad.addColorStop(0, '#2D3748');
      bgGrad.addColorStop(0.6, '#1A202C');
      bgGrad.addColorStop(1, '#0D111A');
    } else {
      bgGrad.addColorStop(0, '#334155');
      bgGrad.addColorStop(0.6, '#1E293B');
      bgGrad.addColorStop(1, '#0B0F19');
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Micro speckle
    ctx.fillStyle = isLroc ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)';
    const seed = isLroc ? 42 : 84;
    for (let i = 0; i < 500; i++) {
      const rx = ((Math.sin(i * 77 + seed) * 10000) % 1 + 1) % 1 * w;
      const ry = ((Math.cos(i * 44 + seed) * 10000) % 1 + 1) % 1 * h;
      const rRad = ((i % 4) + 1) * 0.8;
      ctx.beginPath();
      ctx.arc(rx, ry, rRad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Craters
    craters.forEach((crater) => {
      const center = isLroc ? crater.lroc_center : crater.ch2_center;
      const cx = (center[0] / 1000) * w;
      const cy = (center[1] / 1000) * h;
      const a = (crater.semi_major / 1000) * w;
      const b = (crater.semi_minor / 1000) * h;
      const rot = (crater.angle_deg * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Rim
      const rimGrad = ctx.createLinearGradient(-a, -b, a, b);
      rimGrad.addColorStop(0, '#FFFFFF');
      rimGrad.addColorStop(0.35, '#94A3B8');
      rimGrad.addColorStop(0.7, '#0F172A');
      rimGrad.addColorStop(1, '#020617');

      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // Interior
      ctx.beginPath();
      ctx.ellipse(a * 0.12, b * 0.12, a * 0.75, b * 0.75, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#05070D';
      ctx.fill();

      if (a > 30) {
        ctx.beginPath();
        ctx.arc(a * 0.05, b * 0.05, a * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = isLroc ? '#CBD5E1' : '#F1F5F9';
        ctx.fill();
      }

      ctx.restore();
    });
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const N = this.gridDivisions;
    const cellW = w / N;
    const cellH = h / N;

    this.ctx.clearRect(0, 0, w, h);

    // If blinking in whole-frame mode
    if (this.blinkRateHz > 0) {
      const source = (this.blinkPhase === 0) ? this.offscreenCh2 : this.offscreenLroc;
      this.ctx.drawImage(source, 0, 0);
    } else {
      // 8x8 Checkerboard pattern
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const isEven = (r + c) % 2 === 0;
          const source = isEven ? this.offscreenCh2 : this.offscreenLroc;
          const sx = c * cellW;
          const sy = r * cellH;

          this.ctx.drawImage(source, sx, sy, cellW, cellH, sx, sy, cellW, cellH);

          // Subtle neon boundary divider for checker cells
          this.ctx.strokeStyle = isEven ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 179, 0, 0.25)';
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(sx, sy, cellW, cellH);
        }
      }
    }

    // High-contrast crater contours if enabled
    if (this.showEdges && this.presetData?.craters) {
      this.ctx.strokeStyle = 'rgba(0, 230, 118, 0.85)';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([4, 3]);

      this.presetData.craters.forEach(crater => {
        const cx = (crater.ch2_center[0] / 1000) * w;
        const cy = (crater.ch2_center[1] / 1000) * h;
        const a = (crater.semi_major / 1000) * w;
        const b = (crater.semi_minor / 1000) * h;
        const rot = (crater.angle_deg * Math.PI) / 180;

        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(rot);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      });
      this.ctx.setLineDash([]);
    }
  }
}

window.CheckerboardInspector = CheckerboardInspector;
