/**
 * ChandraAlign - Ultra-Cinematic 3D WebGL Space Engine (Three.js Powered)
 * Recreates the deep cosmic space visual from the mission reference:
 * 1. Giant Curved Cratered Moon (Bottom-Left) with realistic surface topology, maria, crater rims & limb glow
 * 2. 3D Irregular Asteroids & Large Meteoroids with realistic rock geometry, lighting, shadows & continuous tumbling drift
 * 3. Frequent Dynamic Constellation Centroids passing by with 3D laser telemetry interconnect lines & targeting reticles
 * 4. Volumetric Interstellar Nebulae (Electric Cyan, Deep Space Blue & Cosmic Violet)
 * 5. Prominent Pulsar Stars with 4-Point Diffraction Spikes & Twinkling 3D Parallax Stars
 * 6. Distant Secondary Celestial Moon/Orb (Top-Right)
 * 7. Blazing Shooting Meteor Bolides with glowing ion trails
 */

class CinematicSpaceEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = canvasId;
      document.body.prepend(this.canvas);
    }

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.time = 0;

    // Check if Three.js is available
    if (typeof THREE !== 'undefined') {
      this.initThreeJS();
    } else {
      console.warn('Three.js not found, falling back to 2D canvas space engine');
      this.initCanvas2DFallback();
    }
  }

  /* ========================================================================
     THREE.JS 3D WEBGL ENGINE
     ======================================================================== */
  initThreeJS() {
    this.isWebGL = true;

    // 1. Scene, Camera, Renderer
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0B0C10, 0.0006);

    this.camera = new THREE.PerspectiveCamera(55, this.width / this.height, 1, 3000);
    this.camera.position.set(0, 0, 600);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0B0C10, 1.0);

    // 2. Procedural Texture Generators
    this.textures = {
      lunarSurface: this.generateLunarTexture(1024, 512),
      asteroidRoughness: this.generateAsteroidTexture(256, 256),
      glowSprite: this.generateGlowSprite(),
      crossSpike: this.generateCrossSpikeSprite(),
      nebulaPuff: this.generateNebulaPuffTexture(),
      reticleRing: this.generateReticleRingTexture()
    };

    // 3. Dynamic 3D Lights
    this.setupLighting();

    // 4. Build 3D Cosmic Elements
    this.createStarfield();
    this.createPulsarStars();
    this.createNebulaClouds();
    this.createGiantMoon();
    this.createDistantMoon();
    this.createAsteroids();
    this.createConstellationCentroids();
    this.createBolideSystem();

    // 5. Event Listeners & Loop
    this.bindEvents();
    this.animate();
  }

  setupLighting() {
    // Ambient cosmic fill
    const ambientLight = new THREE.AmbientLight(0x1F2833, 0.6);
    this.scene.add(ambientLight);

    // Primary Sun directional light (illuminates moon & asteroid crests)
    this.sunLight = new THREE.DirectionalLight(0xFFFFFF, 2.2);
    this.sunLight.position.set(-500, 350, 400);
    this.scene.add(this.sunLight);

    // Secondary Matrix Cyan rim light (gives space-age edge glow)
    this.cyanRimLight = new THREE.DirectionalLight(0x66FCF1, 1.2);
    this.cyanRimLight.position.set(300, -200, 200);
    this.scene.add(this.cyanRimLight);

    // Violet deep-space fill light
    const violetLight = new THREE.PointLight(0x9333EA, 1.0, 1200);
    violetLight.position.set(200, 150, -100);
    this.scene.add(violetLight);
  }

  /* ------------------------------------------------------------------------
     1. Procedural Texture Helpers (Zero External Assets Required)
     ------------------------------------------------------------------------ */
  generateGlowSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.2, 'rgba(102, 252, 241, 0.85)');
    grad.addColorStop(0.5, 'rgba(69, 162, 158, 0.35)');
    grad.addColorStop(1, 'rgba(11, 12, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  generateCrossSpikeSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cx = 128, cy = 128;

    // Radial central core
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 64);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.2, 'rgba(102, 252, 241, 0.9)');
    grad.addColorStop(0.6, 'rgba(69, 162, 158, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // 4-point cross diffraction spikes
    ctx.strokeStyle = '#66FCF1';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#66FCF1';
    ctx.shadowBlur = 12;

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(8, cy);
    ctx.lineTo(248, cy);
    ctx.stroke();

    // Vertical
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx, 248);
    ctx.stroke();

    // Subtle 45-degree diagonal spikes
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = 'rgba(197, 198, 199, 0.6)';
    ctx.beginPath();
    ctx.moveTo(48, 48);
    ctx.lineTo(208, 208);
    ctx.moveTo(208, 48);
    ctx.lineTo(48, 208);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  generateNebulaPuffTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    grad.addColorStop(0.3, 'rgba(102, 252, 241, 0.2)');
    grad.addColorStop(0.65, 'rgba(147, 51, 234, 0.12)');
    grad.addColorStop(1, 'rgba(11, 12, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }

  generateReticleRingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const cx = 64, cy = 64;

    ctx.strokeStyle = '#66FCF1';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#66FCF1';
    ctx.shadowBlur = 8;

    // Outer segmented ring
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0.15, Math.PI * 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 48, Math.PI * 0.65, Math.PI * 0.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 48, Math.PI * 1.15, Math.PI * 1.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 48, Math.PI * 1.65, Math.PI * 1.95);
    ctx.stroke();

    // Center cross ticks
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 5, cy);
    ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy - 5);
    ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + 12);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  generateLunarTexture(w = 1024, h = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Basaltic base gradient
    const baseGrad = ctx.createLinearGradient(0, 0, w, h);
    baseGrad.addColorStop(0, '#CBD5E1');
    baseGrad.addColorStop(0.3, '#64748B');
    baseGrad.addColorStop(0.7, '#334155');
    baseGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // Procedural basalt maria flow patches
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.random() * w, Math.random() * h,
        Math.random() * 120 + 40, Math.random() * 80 + 30,
        Math.random() * Math.PI, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // Impact craters with rims & central peaks
    const craterCount = 140;
    for (let i = 0; i < craterCount; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = Math.random() * 32 + 3;

      // Radial bright ray ejecta for large craters
      if (r > 16) {
        const rayGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.8);
        rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        rayGrad.addColorStop(0.5, 'rgba(102, 252, 241, 0.06)');
        rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Crater Rim (Sunlit NW edge, Shadow SE edge)
      const rimGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      rimGrad.addColorStop(0, '#FFFFFF');
      rimGrad.addColorStop(0.35, '#94A3B8');
      rimGrad.addColorStop(0.7, '#1E293B');
      rimGrad.addColorStop(1, '#020617');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Deep shadowed crater floor basin
      ctx.fillStyle = '#06080D';
      ctx.beginPath();
      ctx.arc(cx + r * 0.12, cy + r * 0.12, r * 0.75, 0, Math.PI * 2);
      ctx.fill();

      // Central uplift peak
      if (r > 14) {
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  generateAsteroidTexture(w = 256, h = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Base rock noise
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, w, h);

    // Rocky texture flecks
    for (let i = 0; i < 400; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      const rr = Math.random() * 4 + 1;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.4)';
      ctx.beginPath();
      ctx.arc(rx, ry, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mini crater pits on asteroid
    for (let i = 0; i < 20; i++) {
      const px = Math.random() * w;
      const py = Math.random() * h;
      const pr = Math.random() * 12 + 3;

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
  }

  /* ------------------------------------------------------------------------
     2. Starfield & Pulsars
     ------------------------------------------------------------------------ */
  createStarfield() {
    const starCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const palette = [
      new THREE.Color('#FFFFFF'),
      new THREE.Color('#C5C6C7'),
      new THREE.Color('#66FCF1'),
      new THREE.Color('#45A29E'),
      new THREE.Color('#93C5FD'),
      new THREE.Color('#DDD6FE')
    ];

    for (let i = 0; i < starCount; i++) {
      // Spread across wide 3D space
      positions[i * 3] = (Math.random() - 0.5) * 2200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1600;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1200 - 300;

      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = Math.random() * 4.0 + 1.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 4,
      vertexColors: true,
      map: this.textures.glowSprite,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starPoints = new THREE.Points(geometry, material);
    this.scene.add(this.starPoints);
  }

  createPulsarStars() {
    this.pulsars = [];
    const pulsarConfigs = [
      { x: -160, y: 140, z: -180, scale: 42, color: 0x66FCF1, speed: 0.03 },
      { x: 220, y: 180, z: -220, scale: 56, color: 0x93C5FD, speed: 0.02 },
      { x: 340, y: -80, z: -150, scale: 38, color: 0x66FCF1, speed: 0.04 },
      { x: 60, y: -160, z: -100, scale: 32, color: 0xFFFFFF, speed: 0.025 },
      { x: 380, y: 120, z: -300, scale: 48, color: 0xDDD6FE, speed: 0.018 },
      { x: -320, y: 20, z: -200, scale: 36, color: 0x45A29E, speed: 0.035 }
    ];

    pulsarConfigs.forEach(cfg => {
      const mat = new THREE.SpriteMaterial({
        map: this.textures.crossSpike,
        color: cfg.color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(cfg.x, cfg.y, cfg.z);
      sprite.scale.set(cfg.scale, cfg.scale, 1);
      this.scene.add(sprite);

      this.pulsars.push({
        sprite: sprite,
        baseScale: cfg.scale,
        phase: Math.random() * Math.PI * 2,
        speed: cfg.speed
      });
    });
  }

  /* ------------------------------------------------------------------------
     3. Volumetric Interstellar Nebulae
     ------------------------------------------------------------------------ */
  createNebulaClouds() {
    this.nebulaGroup = new THREE.Group();
    const cloudCount = 28;
    const colors = [0x66FCF1, 0x3B82F6, 0x9333EA, 0x45A29E, 0xA855F7];

    for (let i = 0; i < cloudCount; i++) {
      const mat = new THREE.SpriteMaterial({
        map: this.textures.nebulaPuff,
        color: colors[i % colors.length],
        transparent: true,
        opacity: Math.random() * 0.18 + 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);

      // Distribute in sweeping diagonal band (like galactic plane)
      const t = (i / cloudCount) * 2 - 1;
      sprite.position.set(
        t * 800 + (Math.random() - 0.5) * 250,
        -t * 400 + (Math.random() - 0.5) * 200 + 50,
        -350 + (Math.random() - 0.5) * 150
      );
      const scale = Math.random() * 420 + 300;
      sprite.scale.set(scale, scale, 1);
      this.nebulaGroup.add(sprite);
    }

    this.scene.add(this.nebulaGroup);
  }

  /* ------------------------------------------------------------------------
     4. Giant Curved Cratered Moon (Bottom-Left Horizon)
     ------------------------------------------------------------------------ */
  createGiantMoon() {
    const moonGroup = new THREE.Group();
    const moonRadius = 420;

    // Lunar sphere geometry
    const geometry = new THREE.SphereGeometry(moonRadius, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: this.textures.lunarSurface,
      roughness: 0.88,
      metalness: 0.08,
      bumpMap: this.textures.lunarSurface,
      bumpScale: 3.5
    });

    this.giantMoon = new THREE.Mesh(geometry, material);
    moonGroup.add(this.giantMoon);

    // Cyan Atmospheric Exosphere Limb Glow Layer
    const glowGeom = new THREE.SphereGeometry(moonRadius * 1.025, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x66FCF1,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const moonGlow = new THREE.Mesh(glowGeom, glowMat);
    moonGroup.add(moonGlow);

    // Position in bottom-left viewport
    moonGroup.position.set(-380, -320, -100);
    this.scene.add(moonGroup);
    this.moonGroup = moonGroup;
  }

  /* ------------------------------------------------------------------------
     5. Distant Secondary Celestial Moon (Top-Right)
     ------------------------------------------------------------------------ */
  createDistantMoon() {
    const moonGroup = new THREE.Group();
    const radius = 60;

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      map: this.textures.lunarSurface,
      roughness: 0.8,
      metalness: 0.1,
      bumpMap: this.textures.lunarSurface,
      bumpScale: 2.0
    });

    this.distantMoon = new THREE.Mesh(geometry, material);
    moonGroup.add(this.distantMoon);

    // Blue atmospheric glow ring
    const glowGeom = new THREE.SphereGeometry(radius * 1.05, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    moonGroup.add(new THREE.Mesh(glowGeom, glowMat));

    moonGroup.position.set(480, 270, -260);
    this.scene.add(moonGroup);
  }

  /* ------------------------------------------------------------------------
     6. 3D Irregular Asteroids & Large Meteoroid Belt with Constant Drift
     ------------------------------------------------------------------------ */
  createAsteroidGeometry(radius, irregularity = 0.35) {
    // Generate perturbed icosahedron with procedural rock deformities & jagged facets
    const geom = new THREE.IcosahedronGeometry(radius, 2);
    const posAttr = geom.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);

      // Multi-frequency noise displacement for authentic craggy meteoroid look
      const noise = (Math.sin(vertex.x * 0.15) * Math.cos(vertex.y * 0.15) * Math.sin(vertex.z * 0.15)) * irregularity;
      const noise2 = (Math.sin(vertex.x * 0.4) + Math.cos(vertex.z * 0.4)) * (irregularity * 0.4);
      const factor = 1.0 + noise + noise2;

      vertex.multiplyScalar(factor);
      posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geom.computeVertexNormals();
    return geom;
  }

  createAsteroids() {
    this.asteroidMeshes = [];
    this.asteroidGroup = new THREE.Group();

    // 3 Tiers of Asteroids exactly matching user reference:
    // 6 Huge/Large Meteoroids (45-75px), 16 Medium (20-38px), 24 Small (6-16px)
    const count = 46;

    for (let i = 0; i < count; i++) {
      let radius, speedMultiplier;
      const rand = Math.random();

      if (i < 6) {
        // Large Prominent Meteoroids
        radius = Math.random() * 26 + 48; // 48 - 74 units
        speedMultiplier = 0.4;
      } else if (i < 22) {
        // Medium Asteroids
        radius = Math.random() * 16 + 20; // 20 - 36 units
        speedMultiplier = 0.65;
      } else {
        // Small fragments
        radius = Math.random() * 10 + 6;  // 6 - 16 units
        speedMultiplier = 1.0;
      }

      const geom = this.createAsteroidGeometry(radius, 0.38);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xCBD5E1,
        roughness: 0.85,
        metalness: 0.15,
        map: this.textures.asteroidRoughness,
        bumpMap: this.textures.asteroidRoughness,
        bumpScale: 2.2,
        flatShading: true
      });

      const mesh = new THREE.Mesh(geom, mat);

      // Random starting positions spread across right and top field
      mesh.position.set(
        (Math.random() - 0.2) * 1100 + 200,
        (Math.random() - 0.4) * 800 + 100,
        (Math.random() - 0.5) * 450 - 50
      );

      // Drift velocity (drifting smoothly down-left into the camera/lunar horizon)
      const angle = Math.PI * (1.18 + (Math.random() - 0.5) * 0.25);
      const baseSpeed = Math.random() * 0.8 + 0.5;

      const asteroidData = {
        mesh: mesh,
        radius: radius,
        vx: Math.cos(angle) * baseSpeed * speedMultiplier,
        vy: Math.sin(angle) * baseSpeed * speedMultiplier * 0.65,
        vz: (Math.random() - 0.5) * 0.2,
        rotSpeedX: (Math.random() - 0.5) * 0.016,
        rotSpeedY: (Math.random() - 0.5) * 0.018,
        rotSpeedZ: (Math.random() - 0.5) * 0.012
      };

      this.asteroidMeshes.push(asteroidData);
      this.asteroidGroup.add(mesh);
    }

    this.scene.add(this.asteroidGroup);
  }

  /* ------------------------------------------------------------------------
     7. Frequent Dynamic Centroids Passing By & 3D Laser Interconnect Lines
     ------------------------------------------------------------------------ */
  createConstellationCentroids() {
    this.centroidNodes = [];
    this.centroidCount = 28;
    this.centroidGroup = new THREE.Group();

    for (let i = 0; i < this.centroidCount; i++) {
      // Glow Sprite Node
      const spriteMat = new THREE.SpriteMaterial({
        map: this.textures.glowSprite,
        color: i % 3 === 0 ? 0x66FCF1 : (i % 3 === 1 ? 0x45A29E : 0xDDD6FE),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const nodeSprite = new THREE.Sprite(spriteMat);
      nodeSprite.scale.set(16, 16, 1);

      // Targeting Reticle Ring
      const ringMat = new THREE.SpriteMaterial({
        map: this.textures.reticleRing,
        color: 0x66FCF1,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ringSprite = new THREE.Sprite(ringMat);
      ringSprite.scale.set(28, 28, 1);

      const nodeObj = new THREE.Group();
      nodeObj.add(nodeSprite);
      nodeObj.add(ringSprite);

      nodeObj.position.set(
        (Math.random() - 0.5) * 1200,
        (Math.random() - 0.5) * 900,
        (Math.random() - 0.5) * 300
      );

      const centroidData = {
        group: nodeObj,
        ring: ringSprite,
        vx: (Math.random() - 0.5) * 0.75,
        vy: (Math.random() - 0.5) * 0.65,
        vz: (Math.random() - 0.5) * 0.3,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.04 + 0.02
      };

      this.centroidNodes.push(centroidData);
      this.centroidGroup.add(nodeObj);
    }

    // Dynamic 3D Telemetry Line Network Segments
    this.maxLines = 180;
    const linePositions = new Float32Array(this.maxLines * 6);
    const lineColors = new Float32Array(this.maxLines * 6);

    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeom.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      linewidth: 1.5,
      depthWrite: false
    });

    this.telemetryLines = new THREE.LineSegments(lineGeom, lineMat);
    this.centroidGroup.add(this.telemetryLines);

    this.scene.add(this.centroidGroup);
  }

  /* ------------------------------------------------------------------------
     8. Blazing Shooting Bolides / Fireballs
     ------------------------------------------------------------------------ */
  createBolideSystem() {
    this.bolides = [];
    this.lastBolideTime = Date.now();
    this.nextBolideInterval = 800 + Math.random() * 1200; // Frequent passing bolides
  }

  spawnBolide() {
    const startX = (Math.random() - 0.2) * 900 + 200;
    const startY = 450 + Math.random() * 150;
    const startZ = (Math.random() - 0.5) * 200;

    const angle = Math.PI * (1.15 + (Math.random() - 0.5) * 0.2);
    const speed = Math.random() * 18 + 26;

    // Trail geometry
    const length = Math.random() * 180 + 140;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    positions[0] = startX;
    positions[1] = startY;
    positions[2] = startZ;
    positions[3] = startX - Math.cos(angle) * length;
    positions[4] = startY - Math.sin(angle) * length;
    positions[5] = startZ;
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: Math.random() > 0.4 ? 0x66FCF1 : 0xDDD6FE,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      linewidth: 2.0
    });

    const line = new THREE.Line(geom, mat);

    // Glowing head sprite
    const headMat = new THREE.SpriteMaterial({
      map: this.textures.glowSprite,
      color: 0xFFFFFF,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    const head = new THREE.Sprite(headMat);
    head.scale.set(24, 24, 1);
    head.position.set(startX, startY, startZ);

    this.scene.add(line);
    this.scene.add(head);

    this.bolides.push({
      line: line,
      head: head,
      x: startX,
      y: startY,
      z: startZ,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: length,
      life: 0,
      maxLife: Math.floor(Math.random() * 45 + 35)
    });
  }

  /* ------------------------------------------------------------------------
     9. Interactive Events & Dynamic Animation Loop
     ------------------------------------------------------------------------ */
  bindEvents() {
    window.addEventListener('resize', () => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX / this.width) * 2 - 1;
      this.mouse.targetY = -(e.clientY / this.height) * 2 + 1;
    });

    // Touch support for mobile/tablets
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouse.targetX = (e.touches[0].clientX / this.width) * 2 - 1;
        this.mouse.targetY = -(e.touches[0].clientY / this.height) * 2 + 1;
      }
    }, { passive: true });
  }

  animate() {
    this.time += 0.01;

    // Smooth Mouse Parallax Lerp
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    this.camera.position.x = this.mouse.x * 65;
    this.camera.position.y = this.mouse.y * 50;
    this.camera.lookAt(0, 0, 0);

    // 1. Rotate & Animate Celestial Moons
    if (this.giantMoon) {
      this.giantMoon.rotation.y += 0.0006;
      this.giantMoon.rotation.x = Math.sin(this.time * 0.2) * 0.02;
    }
    if (this.distantMoon) {
      this.distantMoon.rotation.y += 0.0015;
    }

    // 2. Animate Pulsar Diffraction Spikes
    this.pulsars.forEach(p => {
      p.phase += p.speed;
      const scale = p.baseScale * (0.85 + 0.25 * Math.sin(p.phase));
      p.sprite.scale.set(scale, scale, 1);
      p.sprite.material.rotation = Math.sin(p.phase * 0.5) * 0.15;
    });

    // 3. Asteroid Drift & Realistic 3D Tumbling
    this.asteroidMeshes.forEach(a => {
      a.mesh.position.x += a.vx;
      a.mesh.position.y += a.vy;
      a.mesh.position.z += a.vz;

      a.mesh.rotation.x += a.rotSpeedX;
      a.mesh.rotation.y += a.rotSpeedY;
      a.mesh.rotation.z += a.rotSpeedZ;

      // Wrap boundaries seamlessly (drifting from upper right towards lower left)
      if (a.mesh.position.x < -700 || a.mesh.position.y < -550) {
        a.mesh.position.x = 650 + Math.random() * 300;
        a.mesh.position.y = 400 + Math.random() * 250;
        a.mesh.position.z = (Math.random() - 0.5) * 400;
      }
    });

    // 4. Update Centroids & Dynamic Telemetry Line Network
    const linePosAttr = this.telemetryLines.geometry.attributes.position;
    const lineColAttr = this.telemetryLines.geometry.attributes.color;
    let lineIdx = 0;
    const maxConnectDist = 220;

    this.centroidNodes.forEach(c => {
      c.group.position.x += c.vx;
      c.group.position.y += c.vy;
      c.group.position.z += c.vz;

      // Bounce/wrap bounds softly
      if (c.group.position.x < -600 || c.group.position.x > 600) c.vx *= -1;
      if (c.group.position.y < -450 || c.group.position.y > 450) c.vy *= -1;
      if (c.group.position.z < -250 || c.group.position.z > 200) c.vz *= -1;

      c.pulsePhase += c.pulseSpeed;
      const pulseScale = 1.0 + Math.sin(c.pulsePhase) * 0.25;
      c.ring.scale.set(28 * pulseScale, 28 * pulseScale, 1);
      c.ring.material.rotation += 0.015;
    });

    // Compute dynamic telemetry lines between nearby centroids
    for (let i = 0; i < this.centroidNodes.length; i++) {
      for (let j = i + 1; j < this.centroidNodes.length; j++) {
        if (lineIdx >= this.maxLines) break;

        const p1 = this.centroidNodes[i].group.position;
        const p2 = this.centroidNodes[j].group.position;
        const dist = p1.distanceTo(p2);

        if (dist < maxConnectDist) {
          const alpha = (1.0 - dist / maxConnectDist) * 0.65;

          // Segment start
          linePosAttr.setXYZ(lineIdx * 2, p1.x, p1.y, p1.z);
          lineColAttr.setXYZ(lineIdx * 2, 0.4 * alpha, 0.98 * alpha, 0.94 * alpha);

          // Segment end
          linePosAttr.setXYZ(lineIdx * 2 + 1, p2.x, p2.y, p2.z);
          lineColAttr.setXYZ(lineIdx * 2 + 1, 0.27 * alpha, 0.63 * alpha, 0.61 * alpha);

          lineIdx++;
        }
      }
    }

    // Zero out unused line segments
    for (let k = lineIdx * 2; k < this.maxLines * 2; k++) {
      linePosAttr.setXYZ(k, 0, 0, 0);
      lineColAttr.setXYZ(k, 0, 0, 0);
    }
    linePosAttr.needsUpdate = true;
    lineColAttr.needsUpdate = true;

    // 5. Spawn & Animate Shooting Meteor Bolides
    const now = Date.now();
    if (now - this.lastBolideTime > this.nextBolideInterval) {
      this.spawnBolide();
      this.lastBolideTime = now;
      this.nextBolideInterval = 700 + Math.random() * 1300;
    }

    for (let i = this.bolides.length - 1; i >= 0; i--) {
      const b = this.bolides[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life++;

      const lifeRatio = b.life / b.maxLife;
      const alpha = Math.max(0, 1 - lifeRatio);

      b.head.position.set(b.x, b.y, b.z);
      b.head.material.opacity = alpha;

      const pos = b.line.geometry.attributes.position;
      const speedNorm = Math.hypot(b.vx, b.vy);
      const tailX = b.x - (b.vx / speedNorm) * b.length;
      const tailY = b.y - (b.vy / speedNorm) * b.length;

      pos.setXYZ(0, b.x, b.y, b.z);
      pos.setXYZ(1, tailX, tailY, b.z);
      pos.needsUpdate = true;
      b.line.material.opacity = alpha * 0.9;

      if (b.life >= b.maxLife || b.x < -800 || b.y < -600) {
        this.scene.remove(b.line);
        this.scene.remove(b.head);
        b.line.geometry.dispose();
        b.line.material.dispose();
        b.head.material.dispose();
        this.bolides.splice(i, 1);
      }
    }

    // 6. Slow Volumetric Nebula Swirl
    if (this.nebulaGroup) {
      this.nebulaGroup.rotation.z = Math.sin(this.time * 0.05) * 0.04;
    }

    // Render WebGL Scene
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this.animate());
  }

  /* ========================================================================
     CANVAS 2D FALLBACK ENGINE (For environments without WebGL)
     ======================================================================== */
  initCanvas2DFallback() {
    this.ctx = this.canvas.getContext('2d');
    this.starCount = 200;
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 1.5 + 0.4,
        alpha: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * 0.05 + 0.02
      });
    }

    const loop = () => {
      this.ctx.fillStyle = '#0B0C10';
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.stars.forEach(s => {
        s.alpha += Math.sin(Date.now() * s.twinkle) * 0.01;
        this.ctx.fillStyle = '#66FCF1';
        this.ctx.globalAlpha = Math.max(0.1, Math.min(1.0, s.alpha));
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.globalAlpha = 1.0;
      requestAnimationFrame(loop);
    };
    loop();
  }
}

// Auto-initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.cinematicSpace = new CinematicSpaceEngine('space-starfield-bg');
});
