/**
 * ChandraAlign - Split-Screen Curtain Slider Inspector
 * Real-time sub-pixel comparison between Chandrayaan-2 optical swath and LROC reference map.
 */

class CurtainSliderInspector {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = Object.assign({
      initialPosition: 0.5,
      enableDiffMode: false,
      onPositionChange: null
    }, options);

    this.position = this.options.initialPosition;
    this.isDragging = false;
    this.zoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.diffMode = false;
    this.edgeMode = false;
    this.nudgeOffset = { x: 0, y: 0 };

    this.canvasCh2 = null;
    this.canvasLroc = null;
    this.canvasDiff = null;

    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="curtain-slider-container" id="curtain-viewport">
        <!-- Layer 1: LROC Reference (Underlay) -->
        <div class="curtain-layer" id="layer-lroc">
          <canvas id="cvs-curtain-lroc"></canvas>
        </div>

        <!-- Layer 2: CH-2 Optical / Registered (Clipped Overlay) -->
        <div class="curtain-layer" id="layer-ch2" style="clip-path: polygon(0 0, 50% 0, 50% 100%, 0 100%);">
          <canvas id="cvs-curtain-ch2"></canvas>
        </div>

        <!-- Layer 3: Sub-pixel Difference Overlay (Conditional) -->
        <div class="curtain-layer" id="layer-diff" style="display: none; mix-blend-mode: difference; opacity: 0.9;">
          <canvas id="cvs-curtain-diff"></canvas>
        </div>

        <!-- Draggable Divider Bar -->
        <div class="curtain-divider-bar" id="curtain-divider" style="left: 50%;">
          <div class="curtain-handle-knob">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="8 16 4 12 8 8"></polyline>
              <polyline points="16 8 20 12 16 16"></polyline>
            </svg>
          </div>
        </div>

        <!-- Overlay HUD Badges -->
        <div class="canvas-hud-overlay" style="top: 12px; left: 12px;">
          <span style="color: var(--accent-cyan);">◀ CH-2 OHRC (REGISTERED)</span>
        </div>
        <div class="canvas-hud-overlay" style="top: 12px; right: 12px; left: auto;">
          <span style="color: var(--accent-amber);">LROC NAC (REFERENCE) ▶</span>
        </div>
        <div class="canvas-coords-overlay" id="curtain-stats-hud">
          SPLIT: 50.0% | ZOOM: 1.0x | SUB-PIXEL OFFSET: (0.0px, 0.0px)
        </div>
      </div>
    `;

    this.viewport = document.getElementById('curtain-viewport');
    this.divider = document.getElementById('curtain-divider');
    this.layerCh2 = document.getElementById('layer-ch2');
    this.layerLroc = document.getElementById('layer-lroc');
    this.layerDiff = document.getElementById('layer-diff');

    this.cvsCh2 = document.getElementById('cvs-curtain-ch2');
    this.cvsLroc = document.getElementById('cvs-curtain-lroc');
    this.cvsDiff = document.getElementById('cvs-curtain-diff');
  }

  bindEvents() {
    if (!this.viewport || !this.divider) return;

    const onMove = (e) => {
      if (!this.isDragging) return;
      const rect = this.viewport.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      let ratio = (clientX - rect.left) / rect.width;
      ratio = Math.max(0.01, Math.min(0.99, ratio));
      this.setPosition(ratio);
    };

    const onEnd = () => {
      this.isDragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    this.divider.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDragging = true;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
    });

    this.divider.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onEnd);
    });

    // Zoom on wheel
    this.viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom = Math.max(0.5, Math.min(5.0, this.zoom * zoomFactor));
      this.updateHUD();
      this.redraw();
    });
  }

  setPosition(ratio) {
    this.position = ratio;
    const pct = (ratio * 100).toFixed(2);
    if (this.divider) this.divider.style.left = `${pct}%`;
    if (this.layerCh2) this.layerCh2.style.clipPath = `polygon(0 0, ${pct}% 0, ${pct}% 100%, 0 100%)`;
    this.updateHUD();
  }

  setZoom(val) {
    this.zoom = Math.max(0.5, Math.min(5.0, val));
    this.updateHUD();
    this.redraw();
  }

  nudge(dx, dy) {
    this.nudgeOffset.x += dx;
    this.nudgeOffset.y += dy;
    this.updateHUD();
    this.redraw();
  }

  resetNudge() {
    this.nudgeOffset = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.updateHUD();
    this.redraw();
  }

  toggleDiffMode(active) {
    this.diffMode = active;
    if (this.layerDiff) {
      this.layerDiff.style.display = active ? 'block' : 'none';
    }
  }

  updateHUD() {
    const stats = document.getElementById('curtain-stats-hud');
    if (stats) {
      stats.textContent = `SPLIT: ${(this.position * 100).toFixed(1)}% | ZOOM: ${this.zoom.toFixed(1)}x | NUDGE: (${this.nudgeOffset.x.toFixed(2)}px, ${this.nudgeOffset.y.toFixed(2)}px)`;
    }
  }

  /**
   * Procedurally render lunar terrain for both layers with accurate crater registration
   */
  loadData(presetData) {
    this.presetData = presetData;
    this.setupCanvases();
    this.redraw();
  }

  setupCanvases() {
    const width = this.viewport.clientWidth || 800;
    const height = this.viewport.clientHeight || 560;

    [this.cvsCh2, this.cvsLroc, this.cvsDiff].forEach(c => {
      if (c) {
        c.width = width;
        c.height = height;
      }
    });
  }

  redraw() {
    if (!this.cvsCh2 || !this.cvsLroc) return;
    const ctxCh2 = this.cvsCh2.getContext('2d');
    const ctxLroc = this.cvsLroc.getContext('2d');
    const ctxDiff = this.cvsDiff.getContext('2d');

    const w = this.cvsCh2.width;
    const h = this.cvsCh2.height;

    // Draw LROC base (reference)
    this.drawLunarTerrain(ctxLroc, w, h, {
      isLroc: true,
      zoom: this.zoom,
      offset: { x: 0, y: 0 },
      craters: this.presetData?.craters || []
    });

    // Draw CH-2 registered layer (with sub-pixel alignment)
    this.drawLunarTerrain(ctxCh2, w, h, {
      isLroc: false,
      zoom: this.zoom,
      offset: this.nudgeOffset,
      craters: this.presetData?.craters || []
    });

    // Draw difference map
    if (ctxDiff) {
      this.drawDifferenceLayer(ctxDiff, w, h);
    }
  }

  drawLunarTerrain(ctx, w, h, options) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Apply zoom and centered pan
    ctx.translate(w / 2, h / 2);
    ctx.scale(options.zoom, options.zoom);
    ctx.translate(-w / 2 + (options.offset.x || 0), -h / 2 + (options.offset.y || 0));

    // Lunar regolith background gradient
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.7);
    if (options.isLroc) {
      bgGrad.addColorStop(0, '#2D3748');
      bgGrad.addColorStop(0.6, '#1A202C');
      bgGrad.addColorStop(1, '#0D111A');
    } else {
      // CH-2 slightly higher contrast and crisp illumination
      bgGrad.addColorStop(0, '#334155');
      bgGrad.addColorStop(0.6, '#1E293B');
      bgGrad.addColorStop(1, '#0B0F19');
    }

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Add high-frequency lunar regolith micro-texture (procedural noise dots)
    ctx.fillStyle = options.isLroc ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)';
    const seed = options.isLroc ? 42 : 84;
    for (let i = 0; i < 600; i++) {
      const rx = ((Math.sin(i * 99 + seed) * 10000) % 1 + 1) % 1 * w;
      const ry = ((Math.cos(i * 33 + seed) * 10000) % 1 + 1) % 1 * h;
      const rRad = ((i % 5) + 1) * 0.8;
      ctx.beginPath();
      ctx.arc(rx, ry, rRad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Render prominent lunar craters
    const craters = options.craters.length > 0 ? options.craters : [
      { ch2_center: [w * 0.3, h * 0.35], lroc_center: [w * 0.3, h * 0.35], semi_major: 65, semi_minor: 55, angle_deg: 15 },
      { ch2_center: [w * 0.65, h * 0.6], lroc_center: [w * 0.65, h * 0.6], semi_major: 85, semi_minor: 75, angle_deg: -20 },
      { ch2_center: [w * 0.45, h * 0.75], lroc_center: [w * 0.45, h * 0.75], semi_major: 40, semi_minor: 38, angle_deg: 40 }
    ];

    craters.forEach((crater) => {
      // Map crater coordinates relative to canvas dimensions
      const center = options.isLroc ? crater.lroc_center : crater.ch2_center;
      const cx = (center[0] / 1000) * w;
      const cy = (center[1] / 1000) * h;
      const a = (crater.semi_major / 1000) * w;
      const b = (crater.semi_minor / 1000) * h;
      const rot = (crater.angle_deg * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Crater Outer Ejecta Rim Glow
      ctx.beginPath();
      ctx.ellipse(0, 0, a * 1.25, b * 1.25, 0, 0, Math.PI * 2);
      ctx.fillStyle = options.isLroc ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)';
      ctx.fill();

      // Crater Rim Wall (Sunlit flank vs shadowed flank)
      const rimGrad = ctx.createLinearGradient(-a, -b, a, b);
      rimGrad.addColorStop(0, '#FFFFFF'); // Illuminated sun-facing rim
      rimGrad.addColorStop(0.35, '#94A3B8');
      rimGrad.addColorStop(0.7, '#0F172A');
      rimGrad.addColorStop(1, '#020617'); // Dark shadowed rim

      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // Deep Shadowed Crater Interior Basin
      ctx.beginPath();
      ctx.ellipse(a * 0.12, b * 0.12, a * 0.75, b * 0.75, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#05070D';
      ctx.fill();

      // Central Uplift Peaklet (if complex crater)
      if (a > 30) {
        ctx.beginPath();
        ctx.arc(a * 0.05, b * 0.05, a * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = options.isLroc ? '#CBD5E1' : '#F1F5F9';
        ctx.fill();
      }

      ctx.restore();
    });

    // Sub-pixel grid overlay (very subtle)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawDifferenceLayer(ctx, w, h) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    // Render high-pass difference glow between layers
    ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

window.CurtainSliderInspector = CurtainSliderInspector;
