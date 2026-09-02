/**
 * ChandraAlign - Main Mission Control Dashboard Controller
 * Smart India Hackathon: Sub-pixel Lunar Image Registration
 */

// Toggle flag: Set to true for standalone zero-backend mock mode, or false for live ML pipeline integration
const USE_MOCK = true;

class ChandraAlignApp {
  constructor() {
    this.currentPresetKey = 'boguslawsky_south_pole';
    this.mockPayload = null;
    this.activeData = null;
    this.selectedCraterId = null;
    this.selectedSector = null;

    // Sub-inspectors
    this.curtainInspector = null;
    this.checkerInspector = null;
    this.anmsHeatmap = null;

    // Filter states
    this.minConfidence = 0.85;

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
        // Standalone fetch from local assets directory or fallback embedded data
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
      // Fallback if opened directly via file:// protocol where fetch might be restricted
      this.activeData = this.getEmbeddedFallbackData();
      this.showToast('Operating in Offline Standalone Mode', 'warning');
    }
  }

  async switchPreset(presetKey) {
    if (!this.mockPayload || !this.mockPayload.presets[presetKey]) return;
    this.currentPresetKey = presetKey;
    this.activeData = this.mockPayload.presets[presetKey];
    this.selectedCraterId = null;
    this.selectedSector = null;

    this.showToast(`Switching target region: ${this.activeData.name}`, 'info');
    this.renderAllTabs();
  }

  /* ========================================================================
     Navigation & Tab Management
     ======================================================================== */
  bindNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        this.setActiveTab(targetTab);
      });
    });

    // Preset selector change
    const presetSelect = document.getElementById('select-lunar-preset');
    presetSelect?.addEventListener('change', (e) => {
      this.switchPreset(e.target.value);
    });

    // Run Registration Pipeline
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

    // Trigger canvas resize/render for active visualizers
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
     Initialize Interactive Visualizer Components
     ======================================================================== */
  initVisualizers() {
    // 10x10 ANMS Heatmap in Tab 2
    this.anmsHeatmap = new ANMSGridHeatmap('anms-grid-container', {
      gridSize: 10,
      onCellSelect: (cell) => {
        this.selectedSector = cell;
        this.renderMatchingCanvas();
        if (cell) {
          this.showToast(`Selected Sector [${cell.row+1}, ${cell.col+1}]: ${cell.count} Keypoints`, 'info');
        }
      },
      onCellHover: (cell) => {
        const hoverInfo = document.getElementById('anms-hover-info');
        if (hoverInfo) {
          hoverInfo.textContent = `Sector [${cell.row+1}, ${cell.col+1}] | Density: ${cell.count} pts | Status: Optimal`;
        }
      }
    });

    // Curtain Slider in Tab 3
    this.curtainInspector = new CurtainSliderInspector('curtain-slider-mount');

    // Checkerboard Inspector in Tab 3
    this.checkerInspector = new CheckerboardInspector('checkerboard-mount');
  }

  /* ========================================================================
     Render All Tabs
     ======================================================================== */
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
    if (sensorEl) sensorEl.textContent = `${this.activeData.ch2_metadata.sensor.split(' ')[0]} / LROC`;
    if (rmseEl) rmseEl.textContent = `${this.activeData.telemetry.rmse_px.toFixed(4)} px`;
  }

  /* ========================================================================
     Tab 1: AI Crater Landmark Segmentation
     ======================================================================== */
  renderLandmarkCanvases() {
    const cvsCh2 = document.getElementById('cvs-landmark-ch2');
    const cvsLroc = document.getElementById('cvs-landmark-lroc');
    if (!cvsCh2 || !cvsLroc || !this.activeData) return;

    const setupCanvas = (cvs) => {
      const parent = cvs.parentElement;
      cvs.width = parent.clientWidth || 500;
      cvs.height = parent.clientHeight || 450;
      return cvs.getContext('2d');
    };

    const ctxCh2 = setupCanvas(cvsCh2);
    const ctxLroc = setupCanvas(cvsLroc);

    // Draw base lunar surfaces
    this.drawProceduralTerrain(ctxCh2, cvsCh2.width, cvsCh2.height, false);
    this.drawProceduralTerrain(ctxLroc, cvsLroc.width, cvsLroc.height, true);

    // Draw AI Crater Landmark Ellipses
    const craters = (this.activeData.craters || []).filter(c => c.confidence >= this.minConfidence);

    craters.forEach(crater => {
      const isSelected = this.selectedCraterId === crater.id;

      // Draw on CH-2 Canvas
      this.drawCraterEllipse(ctxCh2, cvsCh2.width, cvsCh2.height, crater.ch2_center, crater, '#00F0FF', isSelected);

      // Draw on LROC Canvas
      this.drawCraterEllipse(ctxLroc, cvsLroc.width, cvsLroc.height, crater.lroc_center, crater, '#FFB300', isSelected);
    });

    // Bind canvas hover
    this.bindLandmarkCanvasHover(cvsCh2, craters, false);
    this.bindLandmarkCanvasHover(cvsLroc, craters, true);
  }

  drawCraterEllipse(ctx, w, h, center, crater, color, isSelected) {
    const cx = (center[0] / 1000) * w;
    const cy = (center[1] / 1000) * h;
    const a = (crater.semi_major / 1000) * w;
    const b = (crater.semi_minor / 1000) * h;
    const rot = (crater.angle_deg * Math.PI) / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    // Ellipse boundary
    ctx.beginPath();
    ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
    ctx.strokeStyle = isSelected ? '#FFFFFF' : color;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    if (isSelected) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    }
    ctx.stroke();

    // Semi-major and semi-minor orientation crosshairs
    ctx.beginPath();
    ctx.moveTo(-a, 0);
    ctx.lineTo(a, 0);
    ctx.moveTo(0, -b);
    ctx.lineTo(0, b);
    ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.7)' : `${color}88`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Landmark Tag Label
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.font = '600 10px monospace';
    ctx.fillStyle = isSelected ? '#FFFFFF' : color;
    ctx.fillText(`${crater.id} (${(crater.confidence * 100).toFixed(0)}%)`, a + 6, -b / 2);
    ctx.restore();
  }

  bindLandmarkCanvasHover(cvs, craters, isLroc) {
    cvs.onmousemove = (e) => {
      const rect = cvs.getBoundingClientRect();
      const x = (e.clientX - rect.left) / cvs.width * 1000;
      const y = (e.clientY - rect.top) / cvs.height * 1000;

      let found = null;
      for (const c of craters) {
        const center = isLroc ? c.lroc_center : c.ch2_center;
        const dist = Math.hypot(center[0] - x, center[1] - y);
        if (dist <= c.semi_major * 1.2) {
          found = c.id;
          break;
        }
      }

      if (found !== this.selectedCraterId) {
        this.selectedCraterId = found;
        this.renderLandmarkCanvases();
        this.highlightTableRow(found);
      }
    };

    cvs.onmouseleave = () => {
      if (this.selectedCraterId) {
        this.selectedCraterId = null;
        this.renderLandmarkCanvases();
        this.highlightTableRow(null);
      }
    };
  }

  renderLandmarkTable() {
    const tbody = document.getElementById('table-crater-landmarks-body');
    const badgeCount = document.getElementById('badge-crater-count');
    if (!tbody || !this.activeData) return;

    const craters = (this.activeData.craters || []).filter(c => c.confidence >= this.minConfidence);
    if (badgeCount) badgeCount.textContent = `${craters.length} Landmarks`;

    tbody.innerHTML = craters.map(c => `
      <tr data-crater-id="${c.id}" class="${this.selectedCraterId === c.id ? 'selected' : ''}">
        <td style="font-weight:700; color:var(--accent-cyan);">${c.id}</td>
        <td>${c.name}</td>
        <td>(${c.ch2_center[0]}, ${c.ch2_center[1]})</td>
        <td>(${c.lroc_center[0]}, ${c.lroc_center[1]})</td>
        <td>${c.semi_major} x ${c.semi_minor} px</td>
        <td>${c.angle_deg > 0 ? '+' : ''}${c.angle_deg.toFixed(1)}°</td>
        <td>${c.diameter_km.toFixed(2)} km</td>
        <td>
          <div class="conf-bar-cell">
            <span>${(c.confidence * 100).toFixed(1)}%</span>
            <div class="conf-mini-bar">
              <div class="conf-mini-fill" style="width: ${c.confidence * 100}%;"></div>
            </div>
          </div>
        </td>
      </tr>
    `).join('');

    // Row hover events
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

    ctx.clearRect(0, 0, w, h);

    // Render Side-by-Side Frames: Left = CH-2, Right = LROC
    const halfW = w / 2;

    // Draw Left (CH-2)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, halfW - 2, h);
    ctx.clip();
    this.drawProceduralTerrain(ctx, halfW, h, false);
    ctx.restore();

    // Draw Right (LROC)
    ctx.save();
    ctx.translate(halfW + 2, 0);
    ctx.beginPath();
    ctx.rect(0, 0, halfW - 2, h);
    ctx.clip();
    this.drawProceduralTerrain(ctx, halfW, h, true);
    ctx.restore();

    // Central neon dividing boundary
    ctx.strokeStyle = 'var(--border-subtle)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, h);
    ctx.stroke();

    // Draw match correspondence lines
    let matches = this.activeData.keypoint_matches_sample || [];

    // Filter by sector if one is selected in 10x10 heatmap
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

      // Draw Keypoint dots
      ctx.beginPath();
      ctx.arc(p1x, p1y, 3, 0, Math.PI * 2);
      ctx.fillStyle = m.is_inlier ? '#00F0FF' : '#FF3D71';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p2x, p2y, 3, 0, Math.PI * 2);
      ctx.fillStyle = m.is_inlier ? '#FFB300' : '#FF3D71';
      ctx.fill();

      // Draw Epipolar / Homography match vector line
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);

      if (m.is_inlier) {
        const grad = ctx.createLinearGradient(p1x, p1y, p2x, p2y);
        grad.addColorStop(0, 'rgba(0, 240, 255, 0.7)');
        grad.addColorStop(1, 'rgba(255, 179, 0, 0.7)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
      } else {
        ctx.strokeStyle = 'rgba(255, 61, 113, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Update match statistics counter
    const matchCounter = document.getElementById('match-vector-stats');
    if (matchCounter) {
      matchCounter.textContent = `DISPLAYING: ${matches.length} VECTORS | INLIERS: ${this.activeData.telemetry.inlier_matches} | RESIDUAL: ${this.activeData.telemetry.rmse_px.toFixed(4)} px`;
    }
  }

  /* ========================================================================
     Tab 4: Telemetry Metrics Cards & Export Engine
     ======================================================================== */
  renderTelemetryTab() {
    if (!this.activeData) return;
    const tel = this.activeData.telemetry;

    // KPI Values
    this.setText('kpi-rmse-px', `${tel.rmse_px.toFixed(4)} px`);
    this.setText('kpi-rmse-meters', `≈ ${tel.rmse_meters.toFixed(4)} m ground resolution`);
    this.setText('kpi-uniformity', `${tel.uniformity_index.toFixed(4)}`);
    this.setText('kpi-inlier-ratio', `${tel.inlier_ratio.toFixed(2)}%`);
    this.setText('kpi-inlier-count', `${tel.inlier_matches} / ${tel.total_matches} vectors`);
    this.setText('kpi-ssim', `${tel.ssim_post.toFixed(4)}`);
    this.setText('kpi-ssim-gain', `Pre: ${tel.ssim_pre.toFixed(4)} (+${((tel.ssim_post - tel.ssim_pre)*100).toFixed(1)}%)`);
    this.setText('kpi-psnr', `${tel.psnr_db.toFixed(2)} dB`);
    this.setText('kpi-latency-total', `${tel.latency_breakdown_ms.total_pipeline} ms`);

    // Homography 3x3 Matrix render
    const H = tel.transformation.homography_matrix;
    const matrixBox = document.getElementById('homography-matrix-grid');
    if (matrixBox && H) {
      matrixBox.innerHTML = H.map(row => 
        row.map(val => `<div>${val >= 0 ? ' ' : ''}${val.toFixed(6)}</div>`).join('')
      ).join('');
    }

    // Latency Pipeline Breakdown Bars
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
     Export Engine
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

  /* ========================================================================
     Simulated Live Registration Execution
     ======================================================================== */
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

    this.showToast('Initiating Sub-Pixel Deep Homography Solver...', 'info');

    // Simulate pipeline latency or call live backend
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

  /* ========================================================================
     Helper: Procedural Lunar Regolith Generator
     ======================================================================== */
  drawProceduralTerrain(ctx, w, h, isLroc) {
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w/2, h/2, 40, w/2, h/2, w*0.75);
    if (isLroc) {
      grad.addColorStop(0, '#2D3748');
      grad.addColorStop(0.5, '#1A202C');
      grad.addColorStop(1, '#0D111A');
    } else {
      grad.addColorStop(0, '#334155');
      grad.addColorStop(0.5, '#1E293B');
      grad.addColorStop(1, '#0B0F19');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Micro speckling
    ctx.fillStyle = isLroc ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.055)';
    const seed = isLroc ? 19 : 73;
    for (let i = 0; i < 400; i++) {
      const rx = ((Math.sin(i * 45 + seed) * 10000) % 1 + 1) % 1 * w;
      const ry = ((Math.cos(i * 67 + seed) * 10000) % 1 + 1) % 1 * h;
      ctx.beginPath();
      ctx.arc(rx, ry, ((i % 3) + 1) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ========================================================================
     Toast Notifications & Telemetry Clock
     ======================================================================== */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    const color = type === 'success' ? '#00E676' : type === 'warning' ? '#FFB300' : '#00F0FF';
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

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new ChandraAlignApp();
});
