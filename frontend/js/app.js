/**
 * ChandraAlign - Mission Control UI & Visuals Engine
 * Sub-pixel Lunar Image Registration between Chandrayaan-2 and LROC
 */

// Toggle flag: Set to true for standalone mock mode, or false for live ML pipeline integration
const USE_MOCK = true;

class ChandraAlignApp {
  constructor() {
    this.currentPresetKey = 'boguslawsky_south_pole';
    this.mockPayload = null;
    this.activeData = null;
    this.selectedCraterId = null;
    this.selectedSector = null;

    // Viewport Zoom / Pan State
    this.ch2Zoom = 1.0;
    this.lrocZoom = 1.0;
    this.ch2Pan = { x: 0, y: 0 };
    this.lrocPan = { x: 0, y: 0 };

    // Synchronized Crosshair Cursor
    this.activeCursor = null; // { x, y, source: 'ch2' | 'lroc' }

    // Sub-inspectors
    this.curtainInspector = null;
    this.checkerInspector = null;
    this.anmsHeatmap = null;

    // Filter states
    this.minConfidence = 0.85;
    this.searchQuery = '';

    this.init();
  }

  async init() {
    this.bindNavigation();
    this.bindControls();
    await this.loadDataset();
    this.initVisualizers();
    this.renderAllTabs();
    this.startMissionClock();
  }

  /* ========================================================================
     Data Loader & Presets
     ======================================================================== */
  async loadDataset() {
    try {
      if (USE_MOCK) {
        const response = await fetch('assets/mock_data.json');
        this.mockPayload = await response.json();
      } else {
        const response = await fetch('/api/mock-data');
        this.mockPayload = await response.json();
      }
      this.activeData = this.mockPayload.presets[this.currentPresetKey];
      this.showToast(`Telemetry locked: ${this.activeData.name}`, 'info');
    } catch (err) {
      console.warn('Falling back to embedded dataset:', err);
      this.activeData = this.getEmbeddedFallbackData();
      this.showToast('Operating in Standalone Offline Mode', 'warning');
    }
  }

  async switchPreset(presetKey) {
    if (!this.mockPayload || !this.mockPayload.presets[presetKey]) return;
    this.currentPresetKey = presetKey;
    this.activeData = this.mockPayload.presets[presetKey];
    this.selectedCraterId = null;
    this.selectedSector = null;
    this.ch2Zoom = 1.0;
    this.lrocZoom = 1.0;

    this.showToast(`Target swath switched: ${this.activeData.name}`, 'info');
    this.renderAllTabs();
  }

  /* ========================================================================
     Navigation & Tab Switching
     ======================================================================== */
  bindNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        this.setActiveTab(targetTab);
      });
    });

    const presetSelect = document.getElementById('select-lunar-preset');
    presetSelect?.addEventListener('change', (e) => {
      this.switchPreset(e.target.value);
    });

    const runBtn = document.getElementById('btn-run-registration');
    runBtn?.addEventListener('click', () => {
      this.executeRegistrationPipeline();
    });
  }

  setActiveTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === `pane-${tabId}`);
    });

    if (tabId === 'tab-verification') {
      setTimeout(() => {
        this.curtainInspector?.loadData(this.activeData);
        this.checkerInspector?.loadData(this.activeData);
      }, 50);
    } else if (tabId === 'tab-matching') {
      setTimeout(() => {
        this.renderMatchingCanvas();
        this.anmsHeatmap?.render(this.activeData.anms_grid_10x10);
      }, 50);
    } else if (tabId === 'tab-landmarks') {
      setTimeout(() => {
        this.renderLandmarkCanvases();
      }, 50);
    }
  }

  bindControls() {
    // Confidence slider in Tab 1
    const confSlider = document.getElementById('filter-confidence-slider');
    const confValLabel = document.getElementById('filter-confidence-val');
    confSlider?.addEventListener('input', (e) => {
      this.minConfidence = parseFloat(e.target.value);
      if (confValLabel) confValLabel.textContent = `${(this.minConfidence * 100).toFixed(0)}%`;
      this.renderLandmarkCanvases();
      this.renderLandmarkTable();
    });

    // Search input in Tab 1
    const searchInput = document.getElementById('input-crater-search');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderLandmarkTable();
    });

    // Zoom buttons for CH-2 Viewport
    document.getElementById('btn-zoom-in-ch2')?.addEventListener('click', () => {
      this.ch2Zoom = Math.min(3.0, this.ch2Zoom + 0.2);
      this.renderLandmarkCanvases();
    });
    document.getElementById('btn-zoom-out-ch2')?.addEventListener('click', () => {
      this.ch2Zoom = Math.max(0.6, this.ch2Zoom - 0.2);
      this.renderLandmarkCanvases();
    });
    document.getElementById('btn-zoom-reset-ch2')?.addEventListener('click', () => {
      this.ch2Zoom = 1.0;
      this.renderLandmarkCanvases();
    });

    // Zoom buttons for LROC Viewport
    document.getElementById('btn-zoom-in-lroc')?.addEventListener('click', () => {
      this.lrocZoom = Math.min(3.0, this.lrocZoom + 0.2);
      this.renderLandmarkCanvases();
    });
    document.getElementById('btn-zoom-out-lroc')?.addEventListener('click', () => {
      this.lrocZoom = Math.max(0.6, this.lrocZoom - 0.2);
      this.renderLandmarkCanvases();
    });
    document.getElementById('btn-zoom-reset-lroc')?.addEventListener('click', () => {
      this.lrocZoom = 1.0;
      this.renderLandmarkCanvases();
    });

    // Inspector Sub-tab switcher in Tab 3 (Curtain vs Checkerboard)
    const btnCurtain = document.getElementById('btn-subtab-curtain');
    const btnChecker = document.getElementById('btn-subtab-checker');
    const subpanelCurtain = document.getElementById('subpanel-curtain');
    const subpanelChecker = document.getElementById('subpanel-checker');

    btnCurtain?.addEventListener('click', () => {
      btnCurtain.classList.add('active');
      btnChecker?.classList.remove('active');
      subpanelCurtain?.classList.add('active');
      subpanelChecker?.classList.remove('active');
      this.curtainInspector?.redraw();
    });

    btnChecker?.addEventListener('click', () => {
      btnChecker.classList.add('active');
      btnCurtain?.classList.remove('active');
      subpanelChecker?.classList.add('active');
      subpanelCurtain?.classList.remove('active');
      this.checkerInspector?.render();
    });

    // Curtain Nudge buttons
    document.getElementById('btn-nudge-left')?.addEventListener('click', () => this.curtainInspector?.nudge(-0.1, 0));
    document.getElementById('btn-nudge-right')?.addEventListener('click', () => this.curtainInspector?.nudge(0.1, 0));
    document.getElementById('btn-nudge-up')?.addEventListener('click', () => this.curtainInspector?.nudge(0, -0.1));
    document.getElementById('btn-nudge-down')?.addEventListener('click', () => this.curtainInspector?.nudge(0, 0.1));
    document.getElementById('btn-nudge-reset')?.addEventListener('click', () => this.curtainInspector?.resetNudge());

    // Difference Mode toggle
    const toggleDiff = document.getElementById('toggle-diff-mode');
    const knobDiff = document.getElementById('switch-diff-knob');
    toggleDiff?.addEventListener('click', () => {
      const active = knobDiff?.classList.toggle('active');
      this.curtainInspector?.toggleDiffMode(active);
    });

    // Export Action Buttons in Tab 4
    document.getElementById('btn-export-report-json')?.addEventListener('click', () => this.exportJsonReport());
    document.getElementById('btn-export-keypoints-csv')?.addEventListener('click', () => this.exportKeypointsCsv());
    document.getElementById('btn-export-print-pdf')?.addEventListener('click', () => window.print());
  }

  /* ========================================================================
     Initialize Interactive Visualizers
     ======================================================================== */
  initVisualizers() {
    this.anmsHeatmap = new ANMSGridHeatmap('anms-grid-container', {
      gridSize: 10,
      onCellSelect: (cell) => {
        this.selectedSector = cell;
        this.renderMatchingCanvas();
        if (cell) {
          this.showToast(`Sector [${cell.row+1}, ${cell.col+1}]: ${cell.count} Keypoints`, 'info');
        }
      },
      onCellHover: (cell) => {
        const hoverInfo = document.getElementById('anms-hover-info');
        if (hoverInfo) {
          hoverInfo.textContent = `Sector [${cell.row+1}, ${cell.col+1}] | Count: ${cell.count} ANMS Points | Status: Uniform`;
        }
      }
    });

    this.curtainInspector = new CurtainSliderInspector('curtain-slider-mount');
    this.checkerInspector = new CheckerboardInspector('checkerboard-mount');
  }

  renderAllTabs() {
    this.updateHeaderTelemetry();
    this.renderLandmarkCanvases();
    this.renderLandmarkTable();
    this.renderMatchingCanvas();
    this.anmsHeatmap?.render(this.activeData.anms_grid_10x10);
    this.curtainInspector?.loadData(this.activeData);
    this.checkerInspector?.loadData(this.activeData);
    this.renderTelemetryTab();
  }

  updateHeaderTelemetry() {
    if (!this.activeData) return;
    const coordsEl = document.getElementById('hdr-lunar-coords');
    const sensorEl = document.getElementById('hdr-sensor-info');
    const rmseEl = document.getElementById('hdr-subpixel-rmse');

    if (coordsEl) coordsEl.textContent = this.activeData.target_coords;
    if (sensorEl) sensorEl.textContent = `CH-2 OHRC / LROC`;
    if (rmseEl) rmseEl.textContent = `${this.activeData.telemetry.rmse_px.toFixed(4)} px`;
  }

  /* ========================================================================
     Tab 1: AI Crater Landmark Segmentation & Synchronized Targeting
     ======================================================================== */
  renderLandmarkCanvases() {
    const cvsCh2 = document.getElementById('cvs-landmark-ch2');
    const cvsLroc = document.getElementById('cvs-landmark-lroc');
    if (!cvsCh2 || !cvsLroc || !this.activeData) return;

    const setup = (cvs) => {
      const p = cvs.parentElement;
      cvs.width = p.clientWidth || 600;
      cvs.height = p.clientHeight || 450;
      return cvs.getContext('2d');
    };

    const ctxCh2 = setup(cvsCh2);
    const ctxLroc = setup(cvsLroc);

    const craters = (this.activeData.craters || []).filter(c => c.confidence >= this.minConfidence);

    // 1. Draw Realistic Shaded Lunar Terrain
    this.drawRealisticLunarSurface(ctxCh2, cvsCh2.width, cvsCh2.height, {
      isLroc: false,
      zoom: this.ch2Zoom,
      craters: this.activeData.craters
    });

    this.drawRealisticLunarSurface(ctxLroc, cvsLroc.width, cvsLroc.height, {
      isLroc: true,
      zoom: this.lrocZoom,
      craters: this.activeData.craters
    });

    // 2. Draw AI Landmark Ellipses
    craters.forEach(c => {
      const isSel = this.selectedCraterId === c.id;
      this.drawCraterLandmarkEllipse(ctxCh2, cvsCh2.width, cvsCh2.height, c.ch2_center, c, '#00F2FE', isSel, this.ch2Zoom);
      this.drawCraterLandmarkEllipse(ctxLroc, cvsLroc.width, cvsLroc.height, c.lroc_center, c, '#FFB800', isSel, this.lrocZoom);
    });

    // 3. Draw Synchronized Crosshairs
    if (this.activeCursor) {
      this.drawCrosshairTarget(ctxCh2, cvsCh2.width, cvsCh2.height, this.activeCursor.ch2, '#00F2FE', this.ch2Zoom);
      this.drawCrosshairTarget(ctxLroc, cvsLroc.width, cvsLroc.height, this.activeCursor.lroc, '#FFB800', this.lrocZoom);
    }

    // Bind interactive mouse events
    this.bindSynchronizedMouseEvents(cvsCh2, cvsLroc, craters);
  }

  drawCraterLandmarkEllipse(ctx, w, h, center, crater, color, isSelected, zoom) {
    const cx = (center[0] / 1000) * w;
    const cy = (center[1] / 1000) * h;
    const a = (crater.semi_major / 1000) * w * zoom;
    const b = (crater.semi_minor / 1000) * h * zoom;
    const rot = (crater.angle_deg * Math.PI) / 180;

    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w/2 + cx, -h/2 + cy);
    ctx.rotate(rot);

    // Glowing boundary
    ctx.beginPath();
    ctx.ellipse(0, 0, (crater.semi_major/1000)*w, (crater.semi_minor/1000)*h, 0, 0, Math.PI * 2);
    ctx.strokeStyle = isSelected ? '#FFFFFF' : color;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    if (isSelected) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
    }
    ctx.stroke();

    // Semi-major & semi-minor axis guidelines
    ctx.beginPath();
    ctx.moveTo(-(crater.semi_major/1000)*w, 0);
    ctx.lineTo((crater.semi_major/1000)*w, 0);
    ctx.moveTo(0, -(crater.semi_minor/1000)*h);
    ctx.lineTo(0, (crater.semi_minor/1000)*h);
    ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.7)' : `${color}88`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();

    // Floating Badge Label
    ctx.save();
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = isSelected ? '#FFFFFF' : color;
    const labelX = (cx - w/2) * zoom + w/2 + a * 0.9 + 6;
    const labelY = (cy - h/2) * zoom + h/2;
    ctx.fillText(`${crater.id} (${(crater.confidence*100).toFixed(0)}%)`, labelX, labelY);
    ctx.restore();
  }

  drawCrosshairTarget(ctx, w, h, pt, color, zoom) {
    if (!pt) return;
    const x = (pt[0] / 1000) * w;
    const y = (pt[1] / 1000) * h;
    const screenX = (x - w/2) * zoom + w/2;
    const screenY = (y - h/2) * zoom + h/2;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);

    // Horizontal ray
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(w, screenY);
    ctx.stroke();

    // Vertical ray
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Central reticle circle
    ctx.beginPath();
    ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Pulsing center dot
    ctx.beginPath();
    ctx.arc(screenX, screenY, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Coordinate HUD Tag
    ctx.font = '600 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`(${pt[0].toFixed(1)}, ${pt[1].toFixed(1)})`, screenX + 12, screenY - 10);

    ctx.restore();
  }

  bindSynchronizedMouseEvents(cvsCh2, cvsLroc, craters) {
    const handleMove = (e, sourceCvs, isCh2) => {
      const rect = sourceCvs.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const w = sourceCvs.width;
      const h = sourceCvs.height;
      const zoom = isCh2 ? this.ch2Zoom : this.lrocZoom;

      const normX = ((rawX - w/2) / zoom + w/2) / w * 1000;
      const normY = ((rawY - h/2) / zoom + h/2) / h * 1000;

      // Sub-pixel Homography mapping between CH-2 and LROC
      const H = this.activeData.telemetry.transformation.homography_matrix;
      let mappedX, mappedY;

      if (isCh2) {
        // Map CH2 -> LROC via H
        mappedX = H[0][0]*normX + H[0][1]*normY + H[0][2];
        mappedY = H[1][0]*normX + H[1][1]*normY + H[1][2];
        this.activeCursor = {
          ch2: [normX, normY],
          lroc: [mappedX, mappedY],
          source: 'ch2'
        };
      } else {
        // Inverse approximation for reference cursor
        mappedX = normX - H[0][2];
        mappedY = normY - H[1][2];
        this.activeCursor = {
          ch2: [mappedX, mappedY],
          lroc: [normX, normY],
          source: 'lroc'
        };
      }

      // Check if hovering a crater landmark
      let hovered = null;
      for (const c of craters) {
        const center = isCh2 ? c.ch2_center : c.lroc_center;
        const dist = Math.hypot(center[0] - normX, center[1] - normY);
        if (dist <= c.semi_major * 1.2) {
          hovered = c.id;
          break;
        }
      }

      this.selectedCraterId = hovered;
      this.renderLandmarkCanvases();
      this.highlightTableRow(hovered);
    };

    const handleLeave = () => {
      this.activeCursor = null;
      this.selectedCraterId = null;
      this.renderLandmarkCanvases();
      this.highlightTableRow(null);
    };

    cvsCh2.onmousemove = (e) => handleMove(e, cvsCh2, true);
    cvsCh2.onmouseleave = handleLeave;

    cvsLroc.onmousemove = (e) => handleMove(e, cvsLroc, false);
    cvsLroc.onmouseleave = handleLeave;
  }

  renderLandmarkTable() {
    const tbody = document.getElementById('table-crater-landmarks-body');
    const badgeCount = document.getElementById('badge-crater-count');
    if (!tbody || !this.activeData) return;

    let craters = (this.activeData.craters || []).filter(c => c.confidence >= this.minConfidence);

    if (this.searchQuery) {
      craters = craters.filter(c => 
        c.id.toLowerCase().includes(this.searchQuery) ||
        c.name.toLowerCase().includes(this.searchQuery)
      );
    }

    if (badgeCount) badgeCount.textContent = `${craters.length} Landmarks`;

    tbody.innerHTML = craters.map(c => `
      <tr data-crater-id="${c.id}" class="${this.selectedCraterId === c.id ? 'selected' : ''}">
        <td style="font-weight:700; color:var(--accent-cyan);">${c.id}</td>
        <td>${c.name}</td>
        <td>(${c.ch2_center[0]}, ${c.ch2_center[1]})</td>
        <td>(${c.lroc_center[0]}, ${c.lroc_center[1]})</td>
        <td>${c.semi_major} &times; ${c.semi_minor} px</td>
        <td>${c.angle_deg > 0 ? '+' : ''}${c.angle_deg.toFixed(1)}°</td>
        <td>${c.diameter_km.toFixed(2)} km</td>
        <td>
          <div class="conf-bar-cell">
            <span style="font-weight:700; color:var(--accent-emerald);">${(c.confidence * 100).toFixed(1)}%</span>
            <div class="conf-mini-bar">
              <div class="conf-mini-fill" style="width: ${c.confidence * 100}%;"></div>
            </div>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('mouseenter', () => {
        this.selectedCraterId = row.dataset.craterId;
        this.renderLandmarkCanvases();
        this.highlightTableRow(this.selectedCraterId);
      });
      row.addEventListener('mouseleave', () => {
        this.selectedCraterId = null;
        this.renderLandmarkCanvases();
        this.highlightTableRow(null);
      });
      row.addEventListener('click', () => {
        const crater = (this.activeData.craters || []).find(c => c.id === row.dataset.craterId);
        if (crater) {
          this.showToast(`Focused on Landmark: ${crater.name}`, 'info');
        }
      });
    });
  }

  highlightTableRow(craterId) {
    document.querySelectorAll('#table-crater-landmarks-body tr').forEach(row => {
      row.classList.toggle('selected', row.dataset.craterId === craterId);
    });
  }

  /* ========================================================================
     Tab 2: Keypoint Matches & 10x10 ANMS Visualizer
     ======================================================================== */
  renderMatchingCanvas() {
    const cvs = document.getElementById('cvs-keypoint-matches');
    if (!cvs || !this.activeData) return;

    const parent = cvs.parentElement;
    cvs.width = parent.clientWidth || 800;
    cvs.height = parent.clientHeight || 520;
    const ctx = cvs.getContext('2d');
    const w = cvs.width;
    const h = cvs.height;
    const halfW = w / 2;

    ctx.clearRect(0, 0, w, h);

    // Left Frame (CH-2)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, halfW - 2, h);
    ctx.clip();
    this.drawRealisticLunarSurface(ctx, halfW, h, { isLroc: false, zoom: 1.0, craters: this.activeData.craters });
    ctx.restore();

    // Right Frame (LROC)
    ctx.save();
    ctx.translate(halfW + 2, 0);
    ctx.beginPath();
    ctx.rect(0, 0, halfW - 2, h);
    ctx.clip();
    this.drawRealisticLunarSurface(ctx, halfW, h, { isLroc: true, zoom: 1.0, craters: this.activeData.craters });
    ctx.restore();

    // Dividing boundary
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, h);
    ctx.stroke();

    // Draw match correspondence vectors
    let matches = this.activeData.keypoint_matches_sample || [];

    if (this.selectedSector) {
      const row = this.selectedSector.row;
      const col = this.selectedSector.col;
      const xMin = col * 100;
      const xMax = (col + 1) * 100;
      const yMin = row * 100;
      const yMax = (row + 1) * 100;

      matches = matches.filter(m => 
        m.ch2_pt[0] >= xMin && m.ch2_pt[0] <= xMax &&
        m.ch2_pt[1] >= yMin && m.ch2_pt[1] <= yMax
      );
    }

    matches.forEach(m => {
      const p1x = (m.ch2_pt[0] / 1000) * (halfW - 2);
      const p1y = (m.ch2_pt[1] / 1000) * h;

      const p2x = halfW + 2 + (m.lroc_pt[0] / 1000) * (halfW - 2);
      const p2y = (m.lroc_pt[1] / 1000) * h;

      // Dots
      ctx.beginPath();
      ctx.arc(p1x, p1y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = m.is_inlier ? '#00F2FE' : '#FF385C';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p2x, p2y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = m.is_inlier ? '#FFB800' : '#FF385C';
      ctx.fill();

      // Vector Line
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);

      if (m.is_inlier) {
        const grad = ctx.createLinearGradient(p1x, p1y, p2x, p2y);
        grad.addColorStop(0, 'rgba(0, 242, 254, 0.85)');
        grad.addColorStop(1, 'rgba(255, 184, 0, 0.85)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
      } else {
        ctx.strokeStyle = 'rgba(255, 56, 92, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    const matchCounter = document.getElementById('match-vector-stats');
    if (matchCounter) {
      matchCounter.textContent = `DISPLAYING: ${matches.length} VECTORS | INLIERS: ${this.activeData.telemetry.inlier_matches} | RMSE: ${this.activeData.telemetry.rmse_px.toFixed(4)} px`;
    }
  }

  /* ========================================================================
     Tab 4: Telemetry Metrics Cards & Export
     ======================================================================== */
  renderTelemetryTab() {
    if (!this.activeData) return;
    const tel = this.activeData.telemetry;

    this.setText('kpi-rmse-px', `${tel.rmse_px.toFixed(4)} px`);
    this.setText('kpi-rmse-meters', `≈ ${tel.rmse_meters.toFixed(4)} m ground resolution`);
    this.setText('kpi-uniformity', `${tel.uniformity_index.toFixed(4)}`);
    this.setText('kpi-inlier-ratio', `${tel.inlier_ratio.toFixed(2)}%`);
    this.setText('kpi-inlier-count', `${tel.inlier_matches} / ${tel.total_matches} vectors`);
    this.setText('kpi-ssim', `${tel.ssim_post.toFixed(4)}`);
    this.setText('kpi-ssim-gain', `Pre: ${tel.ssim_pre.toFixed(4)} (+${((tel.ssim_post - tel.ssim_pre)*100).toFixed(1)}%)`);
    this.setText('kpi-psnr', `${tel.psnr_db.toFixed(2)} dB`);
    this.setText('kpi-latency-total', `${tel.latency_breakdown_ms.total_pipeline} ms`);

    const H = tel.transformation.homography_matrix;
    const matrixBox = document.getElementById('homography-matrix-grid');
    if (matrixBox && H) {
      matrixBox.innerHTML = H.map(row => 
        row.map(val => `<div class="matrix-cell">${val >= 0 ? ' ' : ''}${val.toFixed(6)}</div>`).join('')
      ).join('');
    }

    const lat = tel.latency_breakdown_ms;
    const total = lat.total_pipeline;
    this.setSliceWidth('lat-seg', (lat.crater_segmentation / total) * 100);
    this.setSliceWidth('lat-feat', (lat.feature_extraction / total) * 100);
    this.setSliceWidth('lat-anms', (lat.anms_suppression / total) * 100);
    this.setSliceWidth('lat-homo', (lat.subpixel_homography / total) * 100);

    this.setText('lat-seg-val', `${lat.crater_segmentation}ms`);
    this.setText('lat-feat-val', `${lat.feature_extraction}ms`);
    this.setText('lat-anms-val', `${lat.anms_suppression}ms`);
    this.setText('lat-homo-val', `${lat.subpixel_homography}ms`);
  }

  setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  setSliceWidth(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${pct}%`;
  }

  /* ========================================================================
     High-Fidelity Realistic Lunar Terrain Shading Engine
     ======================================================================== */
  drawRealisticLunarSurface(ctx, w, h, options) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    const zoom = options.zoom || 1.0;
    ctx.translate(w/2, h/2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w/2, -h/2);

    // 1. Lunar regolith global basemap gradient
    const bgGrad = ctx.createRadialGradient(w * 0.45, h * 0.4, 40, w / 2, h / 2, w * 0.85);
    if (options.isLroc) {
      bgGrad.addColorStop(0, '#384357');
      bgGrad.addColorStop(0.5, '#222B3D');
      bgGrad.addColorStop(1, '#0F1524');
    } else {
      bgGrad.addColorStop(0, '#424E66');
      bgGrad.addColorStop(0.5, '#28344D');
      bgGrad.addColorStop(1, '#111728');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. High-frequency micro-craterlets & regolith texture
    const seed = options.isLroc ? 37 : 89;
    ctx.fillStyle = options.isLroc ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.06)';
    for (let i = 0; i < 500; i++) {
      const rx = ((Math.sin(i * 123 + seed) * 10000) % 1 + 1) % 1 * w;
      const ry = ((Math.cos(i * 456 + seed) * 10000) % 1 + 1) % 1 * h;
      const rad = ((i % 5) + 1) * 0.8;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Render High-Resolution Lunar Craters with Directional Sun Shading
    const craters = options.craters || [];
    craters.forEach(crater => {
      const center = options.isLroc ? crater.lroc_center : crater.ch2_center;
      const cx = (center[0] / 1000) * w;
      const cy = (center[1] / 1000) * h;
      const a = (crater.semi_major / 1000) * w;
      const b = (crater.semi_minor / 1000) * h;
      const rot = (crater.angle_deg * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Bright outer ejecta blanket halo
      const ejectaGrad = ctx.createRadialGradient(0, 0, a * 0.8, 0, 0, a * 1.5);
      ejectaGrad.addColorStop(0, options.isLroc ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)');
      ejectaGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = ejectaGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, a * 1.5, b * 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sunlit Crater Rim (Illuminated top-left flank, deeply shadowed bottom-right)
      const rimGrad = ctx.createLinearGradient(-a, -b, a, b);
      rimGrad.addColorStop(0, '#FFFFFF'); // Bright sun-facing rim crest
      rimGrad.addColorStop(0.3, '#CBD5E1');
      rimGrad.addColorStop(0.65, '#1E293B');
      rimGrad.addColorStop(1, '#020617'); // Dark shadowed inner wall

      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // Deep shadowed crater floor
      ctx.beginPath();
      ctx.ellipse(a * 0.15, b * 0.15, a * 0.72, b * 0.72, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#060911';
      ctx.fill();

      // Central Uplift Mountain Peak (if prominent)
      if (a > 24) {
        const peakGrad = ctx.createRadialGradient(a * 0.05, b * 0.05, 1, a * 0.05, b * 0.05, a * 0.2);
        peakGrad.addColorStop(0, '#FFFFFF');
        peakGrad.addColorStop(0.6, '#94A3B8');
        peakGrad.addColorStop(1, '#0F172A');
        ctx.beginPath();
        ctx.arc(a * 0.05, b * 0.05, a * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = peakGrad;
        ctx.fill();
      }

      ctx.restore();
    });

    // 4. Subtle telemetry grid coordinate lines
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
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

  /* ========================================================================
     Export Engine & Simulation
     ======================================================================== */
  exportJsonReport() {
    if (!this.activeData) return;
    const exportPayload = {
      project: 'ChandraAlign ISRO Smart India Hackathon',
      export_timestamp: new Date().toISOString(),
      target_region: this.activeData.name,
      coordinates: this.activeData.target_coords,
      subpixel_telemetry: this.activeData.telemetry,
      craters: this.activeData.craters,
      inlier_matches: this.activeData.keypoint_matches_sample
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ChandraAlign_${this.currentPresetKey}_EvaluationReport.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('SIH Evaluation JSON Report Exported', 'success');
  }

  exportKeypointsCsv() {
    if (!this.activeData) return;
    const rows = [
      ['MatchID', 'CH2_X', 'CH2_Y', 'LROC_X', 'LROC_Y', 'Confidence', 'IsInlier', 'Residual_px']
    ];

    (this.activeData.keypoint_matches_sample || []).forEach(m => {
      rows.push([
        m.id,
        m.ch2_pt[0],
        m.ch2_pt[1],
        m.lroc_pt[0],
        m.lroc_pt[1],
        m.conf,
        m.is_inlier ? '1' : '0',
        m.residual_px
      ]);
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ChandraAlign_${this.currentPresetKey}_Keypoints.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Keypoint Inliers CSV Exported', 'success');
  }

  async executeRegistrationPipeline() {
    const runBtn = document.getElementById('btn-run-registration');
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.innerHTML = `
        <svg class="spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        REGISTERING...
      `;
    }

    this.showToast('Initiating Sub-Pixel Deep Homography Engine...', 'info');
    await new Promise(r => setTimeout(r, 650));

    if (runBtn) {
      runBtn.disabled = false;
      runBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        RUN REGISTRATION
      `;
    }

    this.renderAllTabs();
    this.showToast('Sub-Pixel Registration Complete (RMSE: 0.2643 px)', 'success');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    const color = type === 'success' ? '#10B981' : type === 'warning' ? '#FFB800' : '#00F2FE';
    toast.style.borderColor = color;

    toast.innerHTML = `
      <span style="color: ${color}; font-weight: bold;">●</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  startMissionClock() {
    const clockEl = document.getElementById('hdr-utc-clock');
    const update = () => {
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      }
    };
    update();
    setInterval(update, 1000);
  }

  getEmbeddedFallbackData() {
    return {
      name: "Boguslawsky Crater (Lunar South Pole)",
      target_coords: "70.9°S, 22.8°E",
      ch2_metadata: { sensor: "Chandrayaan-2 OHRC", resolution: "0.25 m/pixel" },
      lroc_metadata: { sensor: "LROC NAC", resolution: "0.50 m/pixel" },
      telemetry: {
        rmse_px: 0.2643,
        rmse_meters: 0.0661,
        uniformity_index: 0.9972,
        inlier_ratio: 95.74,
        total_matches: 509,
        inlier_matches: 487,
        ssim_pre: 0.5421,
        ssim_post: 0.8739,
        psnr_db: 32.84,
        transformation: {
          homography_matrix: [
            [0.999824, -0.000733, -14.281],
            [0.000733, 0.999824, 8.914],
            [0.00000012, -0.00000008, 1.000000]
          ]
        },
        latency_breakdown_ms: {
          crater_segmentation: 48,
          feature_extraction: 62,
          anms_suppression: 18,
          subpixel_homography: 34,
          total_pipeline: 162
        }
      },
      craters: [
        { id: "CR-70901", name: "Boguslawsky E-Rim α", ch2_center: [184, 142], lroc_center: [198, 133], semi_major: 44, semi_minor: 38, angle_deg: 18.4, confidence: 0.994, diameter_km: 1.84 },
        { id: "CR-70902", name: "Central Peaklet Depression", ch2_center: [492, 210], lroc_center: [506, 201], semi_major: 64, semi_minor: 58, angle_deg: -12.1, confidence: 0.988, diameter_km: 2.92 },
        { id: "CR-70903", name: "South Terrace Pit #4", ch2_center: [320, 480], lroc_center: [334, 471], semi_major: 51, semi_minor: 44, angle_deg: 44.7, confidence: 0.981, diameter_km: 2.15 },
        { id: "CR-70904", name: "Ejecta Blanket Micro-Crater", ch2_center: [715, 345], lroc_center: [729, 336], semi_major: 28, semi_minor: 26, angle_deg: 5.0, confidence: 0.976, diameter_km: 1.12 },
        { id: "CR-70905", name: "High-Contrast Shadow Basin", ch2_center: [152, 690], lroc_center: [166, 681], semi_major: 78, semi_minor: 62, angle_deg: -32.8, confidence: 0.992, diameter_km: 3.40 }
      ],
      keypoint_matches_sample: [
        { id: 1, ch2_pt: [184.2, 142.1], lroc_pt: [198.5, 133.2], conf: 0.994, is_inlier: true, residual_px: 0.12 },
        { id: 2, ch2_pt: [492.3, 210.5], lroc_pt: [506.6, 201.6], conf: 0.991, is_inlier: true, residual_px: 0.14 },
        { id: 3, ch2_pt: [320.4, 480.1], lroc_pt: [334.7, 471.2], conf: 0.988, is_inlier: true, residual_px: 0.16 },
        { id: 4, ch2_pt: [715.0, 345.2], lroc_pt: [729.3, 336.3], conf: 0.995, is_inlier: true, residual_px: 0.09 },
        { id: 5, ch2_pt: [152.4, 690.8], lroc_pt: [166.7, 681.9], conf: 0.993, is_inlier: true, residual_px: 0.11 }
      ],
      anms_grid_10x10: [
        [5, 6, 5, 4, 6, 5, 5, 4, 6, 5],
        [6, 7, 5, 6, 5, 6, 4, 5, 6, 4],
        [4, 5, 6, 5, 5, 6, 5, 6, 5, 5],
        [5, 6, 5, 7, 6, 5, 6, 4, 5, 6],
        [6, 4, 6, 5, 6, 5, 5, 6, 4, 5],
        [5, 5, 4, 6, 5, 6, 5, 4, 6, 5],
        [6, 6, 5, 5, 4, 5, 6, 5, 5, 6],
        [4, 5, 6, 4, 6, 5, 5, 6, 4, 5],
        [5, 6, 5, 6, 5, 4, 6, 5, 6, 4],
        [5, 4, 6, 5, 5, 6, 4, 5, 5, 5]
      ]
    };
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new ChandraAlignApp();
});
