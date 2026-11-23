/**
 * NoteWall - Background Engine
 * Dedicated high-resolution wallpaper background system with procedural vector art,
 * gradient builder, image manipulation, filters, overlays, and presets.
 * Optimized with cached layers, targeted DOM updates, and hardware-accelerated transforms.
 */

window.NoteWallBackground = (function () {
  let elContainer = null;
  let elMedia = null;
  let elOverlay = null;
  let elVignette = null;
  let elCheckerboard = null;

  // Cached state to avoid redundant DOM thrashing & SVG re-injections
  let cachedType = null;
  let cachedStyle = null;
  let cachedColor = null;
  let cachedImage = null;
  let cachedGradientKey = null;
  let cachedImageFit = null;

  let animFrameId = null;

  function getElements() {
    if (!elContainer) elContainer = document.getElementById('canvas-background-container');
    if (!elMedia) elMedia = document.getElementById('canvas-bg-media');
    if (!elOverlay) elOverlay = document.getElementById('canvas-bg-overlay');
    if (!elVignette) elVignette = document.getElementById('canvas-bg-vignette');
    if (!elCheckerboard) elCheckerboard = document.getElementById('canvas-bg-checkerboard');
    return {
      container: elContainer,
      media: elMedia,
      overlay: elOverlay,
      vignette: elVignette,
      checkerboard: elCheckerboard
    };
  }

  // Gradient Presets
  const gradientPresets = {
    midnight: { type: 'linear', angle: 135, c1: '#000000', c2: '#0f172a', name: 'Midnight (Black → Dark Blue)' },
    ember:    { type: 'linear', angle: 135, c1: '#000000', c2: '#450a0a', name: 'Ember (Black → Deep Red)' },
    ocean:    { type: 'linear', angle: 140, c1: '#040d1a', c2: '#0c4a6e', name: 'Ocean (Dark Blue → Cyan)' },
    forest:   { type: 'linear', angle: 135, c1: '#000000', c2: '#064e3b', name: 'Forest (Black → Deep Green)' },
    violet:   { type: 'linear', angle: 135, c1: '#000000', c2: '#3b0764', name: 'Violet (Black → Purple)' },
    sunset:   { type: 'linear', angle: 135, c1: '#11050a', c2: '#701a35', name: 'Sunset (Deep Plum → Berry)' },
    aurora:   { type: 'linear', angle: 145, c1: '#030712', c2: '#134e4a', name: 'Aurora (Void → Emerald)' }
  };

  // Built-in Library Catalog
  const builtins = [
    // Minimal
    { id: 'minimal-black', name: 'Pure Black', cat: 'minimal', thumb: '⬛', desc: 'True #000000 obsidian with pristine contrast' },
    { id: 'minimal-charcoal', name: 'Dark Charcoal', cat: 'minimal', thumb: '◼️', desc: 'Soft deep #111114 slate with faint texture' },
    { id: 'minimal-white', name: 'Porcelain White', cat: 'minimal', thumb: '◻️', desc: 'Studio white with subtle architectural vignette' },
    { id: 'minimal-dark-gradient', name: 'Minimal Obsidian', cat: 'minimal', thumb: '🌑', desc: 'Smooth gradient from #050508 to #141419' },

    // Abstract
    { id: 'abstract-aurora', name: 'Flowing Aurora', cat: 'abstract', thumb: '🌌', desc: 'Curved luminous ribbons of deep violet and cyan' },
    { id: 'abstract-mesh', name: 'Geometric Mesh', cat: 'abstract', thumb: '📐', desc: 'Isometric wireframe with glowing intersection' },
    { id: 'abstract-silk', name: 'Dark Silk', cat: 'abstract', thumb: '🌊', desc: 'Organic undulating titanium wave curves' },
    { id: 'abstract-prismatic', name: 'Prismatic Void', cat: 'abstract', thumb: '💎', desc: 'Dark crystal facets with subtle light refractions' },

    // Nature
    { id: 'nature-alpine', name: 'Alpine Night', cat: 'nature', thumb: '🏔️', desc: 'Layered mountain silhouettes beneath starfield' },
    { id: 'nature-forest', name: 'Emerald Forest', cat: 'nature', thumb: '🌲', desc: 'Misty pine forest silhouettes with deep spruce glow' },
    { id: 'nature-abyss', name: 'Oceanic Abyss', cat: 'nature', thumb: '🌊', desc: 'Bioluminescent deep-sea gradients and marine rays' },
    { id: 'nature-stars', name: 'Milky Way Stars', cat: 'nature', thumb: '✨', desc: 'Dense cosmic star cluster and interstellar dust' },

    // Architecture
    { id: 'arch-skyline', name: 'Midnight Skyline', cat: 'architecture', thumb: '🏙️', desc: 'Distant metropolitan skyline with subtle night lights' },
    { id: 'arch-monolith', name: 'Brutalist Monolith', cat: 'architecture', thumb: '🏛️', desc: 'Concrete pillars with atmospheric shadows' },

    // Developer
    { id: 'dev-grid', name: 'Technical Grid', cat: 'developer', thumb: '▦', desc: 'Fine 40px blueprint grid with origin crosshairs' },
    { id: 'dev-circuit', name: 'Cyber Blueprint', cat: 'developer', thumb: '⚡', desc: 'High-tech PCB traces in dark sapphire' },
    { id: 'dev-terminal', name: 'Terminal Horizon', cat: 'developer', thumb: '💻', desc: 'Subtle monospace watermark and glowing prompt' }
  ];

  function init() {
    render(true);
  }

  /**
   * High-speed Targeted Filter Update
   * Runs in sub-millisecond time on the GPU without touching base media DOM.
   */
  function updateFilters() {
    const { media } = getElements();
    if (!media) return;

    const proj = NoteWallState.getProject();
    const bg = proj.background || {};

    const blur = bg.blur || 0;
    const brightness = bg.brightness !== undefined ? bg.brightness : 100;
    const contrast = bg.contrast !== undefined ? bg.contrast : 100;
    const saturation = bg.saturation !== undefined ? bg.saturation : 100;
    const grayscale = bg.grayscale || 0;
    const sepia = bg.sepia || 0;

    media.style.filter = `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%)`;
  }

  /**
   * High-speed Targeted Overlay & Vignette Update
   */
  function updateOverlay() {
    const { overlay, vignette } = getElements();
    const proj = NoteWallState.getProject();
    const bg = proj.background || {};

    if (overlay) {
      const overlayAlpha = (bg.overlayOpacity !== undefined ? bg.overlayOpacity : 0) / 100;
      const overlayCol = bg.overlayColor || '#000000';
      overlay.style.backgroundColor = overlayAlpha > 0 ? hexToRgba(overlayCol, overlayAlpha) : 'transparent';
    }

    if (vignette) {
      const vignetteIntensity = (bg.vignette || 0) / 100;
      vignette.style.background = vignetteIntensity > 0
        ? `radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, ${vignetteIntensity * 0.95}) 100%)`
        : 'none';
    }
  }

  /**
   * High-speed Targeted Transform Update
   */
  function updateTransforms() {
    const { media } = getElements();
    if (!media) return;

    const proj = NoteWallState.getProject();
    const bg = proj.background || {};

    const tx = bg.imageOffsetX || 0;
    const ty = bg.imageOffsetY || 0;
    const sc = bg.imageScale !== undefined ? bg.imageScale : 1.0;
    const rot = bg.imageRotation || 0;

    if (tx || ty || sc !== 1.0 || rot !== 0) {
      media.style.transform = `translate(${tx}px, ${ty}px) scale(${sc}) rotate(${rot}deg)`;
    } else {
      media.style.transform = 'none';
    }
  }

  /**
   * High-speed Targeted Gradient Update
   */
  function updateGradient() {
    const { media } = getElements();
    if (!media) return;

    const proj = NoteWallState.getProject();
    const bg = proj.background || {};
    const grad = bg.gradient || gradientPresets.midnight;
    applyGradientToElement(media, grad);
    cachedGradientKey = getGradientKey(grad);
  }

  /**
   * High-speed Targeted Solid Color Update
   */
  function updateSolidColor(color) {
    const { media } = getElements();
    if (!media) return;
    const c = color || NoteWallState.getProject().background?.color || '#000000';
    media.style.backgroundColor = c;
    cachedColor = c;
  }

  function getGradientKey(g) {
    if (!g) return '';
    return `${g.type || 'linear'}_${g.angle || 135}_${g.c1 || g.color1 || ''}_${g.c2 || g.color2 || ''}_${g.c3 || ''}`;
  }

  /**
   * Full or Differential Render
   */
  function render(force = false) {
    const { checkerboard, media, overlay, vignette } = getElements();
    if (!media) return;

    const proj = NoteWallState.getProject();
    const bg = proj.background || {};

    // 1. Transparent Alpha Mode
    if (bg.type === 'transparent') {
      if (checkerboard) checkerboard.style.display = 'block';
      media.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
      if (vignette) vignette.style.display = 'none';
      cachedType = 'transparent';
      return;
    } else {
      if (checkerboard) checkerboard.style.display = 'none';
      media.style.display = 'block';
      if (overlay) overlay.style.display = 'block';
      if (vignette) vignette.style.display = 'block';
    }

    // 2. Base Media Layer: Only update if source/type actually changed
    const type = bg.type || 'builtin';
    const styleId = bg.style || 'minimal-black';
    const color = bg.color || '#000000';
    const image = bg.image || null;
    const gradKey = getGradientKey(bg.gradient);
    const fit = bg.imageFit || 'cover';

    const baseChanged = force ||
      cachedType !== type ||
      (type === 'solid' && cachedColor !== color) ||
      (type === 'builtin' && cachedStyle !== styleId) ||
      (type === 'image' && (cachedImage !== image || cachedImageFit !== fit)) ||
      (type === 'gradient' && cachedGradientKey !== gradKey);

    if (baseChanged) {
      media.innerHTML = '';
      media.style.background = '';
      media.style.backgroundImage = '';
      media.style.backgroundSize = '';
      media.style.backgroundPosition = '';
      media.style.backgroundRepeat = '';

      if (type === 'solid') {
        media.style.backgroundColor = color;
      } else if (type === 'gradient') {
        applyGradientToElement(media, bg.gradient || gradientPresets.midnight);
      } else if (type === 'image' && image) {
        media.style.backgroundImage = `url("${image}")`;
        media.style.backgroundPosition = 'center';
        media.style.backgroundRepeat = 'no-repeat';
        if (fit === 'stretch') {
          media.style.backgroundSize = '100% 100%';
        } else if (fit === 'center') {
          media.style.backgroundSize = 'auto';
        } else {
          media.style.backgroundSize = fit; // 'cover', 'contain', 'custom'
        }
      } else {
        renderBuiltinToElement(media, styleId, proj.width, proj.height);
      }

      cachedType = type;
      cachedStyle = styleId;
      cachedColor = color;
      cachedImage = image;
      cachedGradientKey = gradKey;
      cachedImageFit = fit;
    }

    // 3. Hardware-Accelerated Transforms
    updateTransforms();

    // 4. Hardware-Accelerated CSS Filters
    updateFilters();

    // 5. Overlays & Vignette
    updateOverlay();
  }

  /**
   * Request animation frame render to prevent slider input thrashing
   */
  function requestRender() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    animFrameId = requestAnimationFrame(() => {
      render(false);
      animFrameId = null;
    });
  }

  function applyGradientToElement(el, grad) {
    const c1 = grad.c1 || grad.color1 || '#000000';
    const c2 = grad.c2 || grad.color2 || '#0f172a';
    const c3 = grad.c3 || null;

    if (grad.type === 'radial') {
      if (c3) {
        el.style.background = `radial-gradient(circle at center, ${c2} 0%, ${c3} 50%, ${c1} 100%)`;
      } else {
        el.style.background = `radial-gradient(circle at center, ${c2} 0%, ${c1} 100%)`;
      }
    } else {
      const angle = grad.angle !== undefined ? grad.angle : 135;
      if (c3) {
        el.style.background = `linear-gradient(${angle}deg, ${c1} 0%, ${c3} 50%, ${c2} 100%)`;
      } else {
        el.style.background = `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`;
      }
    }
  }

  // --- High-Resolution Built-in Vector Background Generators ---

  function renderBuiltinToElement(el, id, w, h) {
    el.style.backgroundColor = '#000000';

    switch (id) {
      case 'minimal-black':
      case 'dark-solid':
        el.style.backgroundColor = '#000000';
        break;

      case 'minimal-charcoal':
        el.style.backgroundColor = '#111114';
        el.style.backgroundImage = 'radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)';
        el.style.backgroundSize = '24px 24px';
        break;

      case 'minimal-white':
      case 'light-solid':
        el.style.backgroundColor = '#fbfbfe';
        el.style.backgroundImage = 'radial-gradient(circle at center, transparent 70%, rgba(0,0,0,0.06) 100%)';
        break;

      case 'minimal-dark-gradient':
      case 'minimal-gradient':
        el.style.background = 'linear-gradient(150deg, #050508 0%, #0d0d12 40%, #171720 100%)';
        break;

      case 'abstract-aurora':
      case 'abstract-dark':
        el.style.background = `
          radial-gradient(circle at 20% 30%, rgba(147, 51, 234, 0.28) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(6, 182, 212, 0.22) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.18) 0%, transparent 60%),
          linear-gradient(160deg, #040508 0%, #0c0d15 100%)
        `;
        break;

      case 'abstract-mesh':
        el.style.background = `
          radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.25) 0%, transparent 60%),
          linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          #06070a
        `;
        el.style.backgroundSize = '100% 100%, 48px 48px, 48px 48px, 100% 100%';
        break;

      case 'abstract-silk':
        el.style.background = `
          radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.08) 0%, transparent 50%),
          linear-gradient(125deg, #09090c 0%, #16171f 45%, #0d0e14 100%)
        `;
        break;

      case 'abstract-prismatic':
        el.style.background = `
          radial-gradient(circle at 15% 85%, rgba(236, 72, 153, 0.16) 0%, transparent 40%),
          radial-gradient(circle at 85% 15%, rgba(59, 130, 246, 0.18) 0%, transparent 40%),
          linear-gradient(140deg, #040407 0%, #0d0f17 100%)
        `;
        break;

      case 'nature-alpine':
        el.style.background = `
          radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.25) 0%, rgba(99, 102, 241, 0.1) 25%, transparent 60%),
          linear-gradient(to bottom, #050814 0%, #0c162d 50%, #151b32 75%, #080b14 100%)
        `;
        const alpineSvg = `
          <svg viewBox="0 0 1920 1080" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%; opacity:0.85; pointer-events:none;">
            <circle cx="200" cy="120" r="1.5" fill="#ffffff" opacity="0.8"/>
            <circle cx="450" cy="80" r="1" fill="#ffffff" opacity="0.6"/>
            <circle cx="850" cy="150" r="1.8" fill="#ffffff" opacity="0.9"/>
            <circle cx="1200" cy="90" r="1.2" fill="#ffffff" opacity="0.7"/>
            <circle cx="1600" cy="160" r="1.5" fill="#ffffff" opacity="0.8"/>
            <circle cx="1400" cy="220" r="1" fill="#ffffff" opacity="0.5"/>
            <polygon points="0,750 350,520 700,750 1150,480 1550,720 1920,540 1920,1080 0,1080" fill="#0d1424" opacity="0.75"/>
            <polygon points="0,850 480,590 880,820 1350,560 1780,800 1920,710 1920,1080 0,1080" fill="#080c16" opacity="0.9"/>
            <polygon points="0,960 280,780 720,930 1180,790 1620,910 1920,830 1920,1080 0,1080" fill="#03050a"/>
          </svg>
        `;
        el.innerHTML = alpineSvg;
        break;

      case 'nature-forest':
        el.style.background = 'linear-gradient(to bottom, #020604 0%, #051a10 55%, #020c07 100%)';
        const forestSvg = `
          <svg viewBox="0 0 1920 1080" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%; opacity:0.75; pointer-events:none;">
            <path d="M0,820 Q480,760 960,800 T1920,780 L1920,1080 L0,1080 Z" fill="#061e12" opacity="0.5"/>
            <path d="M0,890 Q520,840 1040,880 T1920,850 L1920,1080 L0,1080 Z" fill="#03120a" opacity="0.8"/>
            <path d="M0,960 Q460,910 980,940 T1920,920 L1920,1080 L0,1080 Z" fill="#010603"/>
          </svg>
        `;
        el.innerHTML = forestSvg;
        break;

      case 'nature-abyss':
        el.style.background = `
          radial-gradient(circle at 50% 10%, rgba(14, 165, 233, 0.22) 0%, transparent 65%),
          linear-gradient(to bottom, #020a14 0%, #031528 45%, #01060c 100%)
        `;
        break;

      case 'nature-stars':
        el.style.background = `
          radial-gradient(circle at 60% 40%, rgba(168, 85, 247, 0.18) 0%, transparent 50%),
          radial-gradient(circle at 35% 65%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
          #030306
        `;
        el.style.backgroundImage = 'radial-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px)';
        el.style.backgroundSize = '32px 32px';
        break;

      case 'arch-skyline':
        el.style.background = 'linear-gradient(to bottom, #040812 0%, #0c1830 65%, #050a14 100%)';
        const citySvg = `
          <svg viewBox="0 0 1920 1080" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%; opacity:0.8; pointer-events:none;">
            <rect x="180" y="620" width="110" height="460" fill="#080e1c"/>
            <rect x="340" y="540" width="140" height="540" fill="#060b17"/>
            <polygon points="410,480 340,540 480,540" fill="#060b17"/>
            <rect x="520" y="680" width="90" height="400" fill="#091022"/>
            <rect x="660" y="580" width="130" height="500" fill="#050914"/>
            <rect x="840" y="510" width="160" height="570" fill="#070c18"/>
            <line x1="920" y1="420" x2="920" y2="510" stroke="#f43f5e" stroke-width="2"/>
            <rect x="1050" y="640" width="120" height="440" fill="#091022"/>
            <rect x="1220" y="560" width="150" height="520" fill="#060b17"/>
            <rect x="1420" y="670" width="100" height="410" fill="#080e1a"/>
            <rect x="1570" y="590" width="140" height="490" fill="#050914"/>
          </svg>
        `;
        el.innerHTML = citySvg;
        break;

      case 'arch-monolith':
        el.style.background = `
          radial-gradient(circle at 50% 25%, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
          linear-gradient(135deg, #09090b 0%, #18181c 50%, #060608 100%)
        `;
        break;

      case 'dev-grid':
      case 'subtle-grid':
        el.style.backgroundColor = '#070709';
        el.style.backgroundImage = `
          linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px)
        `;
        el.style.backgroundSize = '40px 40px';
        break;

      case 'dev-circuit':
        el.style.background = `
          radial-gradient(circle at 75% 30%, rgba(14, 165, 233, 0.12) 0%, transparent 50%),
          linear-gradient(rgba(14, 165, 233, 0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(14, 165, 233, 0.04) 1px, transparent 1px),
          #04070e
        `;
        el.style.backgroundSize = '100% 100%, 60px 60px, 60px 60px, 100% 100%';
        break;

      case 'dev-terminal':
        el.style.background = 'linear-gradient(160deg, #050508 0%, #0d0e14 100%)';
        const termSvg = `
          <svg viewBox="0 0 1920 1080" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%; opacity:0.18; pointer-events:none;">
            <text x="80" y="160" font-family="monospace" font-size="28" fill="#10b981" font-weight="bold">> _</text>
            <text x="80" y="220" font-family="monospace" font-size="14" fill="#6ee7b7">const notewall = new Workspace({ canvas: '1920x1080', status: 'ready' });</text>
          </svg>
        `;
        el.innerHTML = termSvg;
        break;

      default:
        el.style.backgroundColor = '#000000';
        break;
    }
  }

  // --- Quick Presets & Actions ---

  function applyPreset(name) {
    NoteWallState.pushHistory(`Apply Preset: ${name}`);
    const proj = NoteWallState.getProject();
    if (!proj.background) proj.background = {};

    switch (name) {
      case 'pure-black':
        proj.background = {
          type: 'solid',
          color: '#000000',
          blur: 0,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          vignette: 0,
          grayscale: 0,
          sepia: 0,
          overlayOpacity: 0
        };
        break;

      case 'dark':
        proj.background = {
          type: 'solid',
          color: '#111114',
          blur: 0,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          vignette: 0,
          grayscale: 0,
          sepia: 0,
          overlayOpacity: 0
        };
        break;

      case 'light':
        proj.background = {
          type: 'solid',
          color: '#f8fafc',
          blur: 0,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          vignette: 15,
          grayscale: 0,
          sepia: 0,
          overlayOpacity: 0
        };
        break;

      case 'gradient':
      case 'midnight':
        proj.background = {
          type: 'gradient',
          gradient: { ...gradientPresets.midnight },
          blur: 0,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          vignette: 0,
          grayscale: 0,
          sepia: 0,
          overlayOpacity: 0
        };
        break;

      case 'nature':
      case 'alpine':
        proj.background = {
          type: 'builtin',
          style: 'nature-alpine',
          blur: 0,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          vignette: 20,
          grayscale: 0,
          sepia: 0,
          overlayOpacity: 15,
          overlayColor: '#000000'
        };
        break;

      case 'blurred-photo':
        proj.background = {
          type: 'builtin',
          style: 'nature-alpine',
          blur: 18,
          brightness: 90,
          contrast: 105,
          saturation: 110,
          vignette: 30,
          grayscale: 0,
          sepia: 0,
          overlayOpacity: 25,
          overlayColor: '#000000'
        };
        break;

      case 'minimal':
        proj.background = {
          type: 'builtin',
          style: 'minimal-dark-gradient',
          blur: 0,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          vignette: 0,
          grayscale: 0,
          sepia: 0,
          overlayOpacity: 0
        };
        break;

      case 'transparent':
        proj.background = {
          type: 'transparent',
          blur: 0,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          vignette: 0,
          grayscale: 0,
          sepia: 0,
          overlayOpacity: 0
        };
        break;

      default:
        break;
    }

    render(true);
    if (window.NoteWallProperties) NoteWallProperties.syncBackgroundControls();
  }

  function resetEffects() {
    NoteWallState.pushHistory('Reset Background Effects');
    const proj = NoteWallState.getProject();
    if (!proj.background) proj.background = {};
    proj.background.blur = 0;
    proj.background.brightness = 100;
    proj.background.contrast = 100;
    proj.background.saturation = 100;
    proj.background.vignette = 0;
    proj.background.grayscale = 0;
    proj.background.sepia = 0;
    proj.background.overlayOpacity = 0;
    proj.background.overlayColor = '#000000';
    updateFilters();
    updateOverlay();
    if (window.NoteWallProperties) NoteWallProperties.syncBackgroundControls();
  }

  function resetPosition() {
    NoteWallState.pushHistory('Reset Background Position');
    const proj = NoteWallState.getProject();
    if (!proj.background) proj.background = {};
    proj.background.imageOffsetX = 0;
    proj.background.imageOffsetY = 0;
    proj.background.imageScale = 1.0;
    proj.background.imageRotation = 0;
    updateTransforms();
    if (window.NoteWallProperties) NoteWallProperties.syncBackgroundControls();
  }

  function removeBackground() {
    NoteWallState.pushHistory('Remove Background');
    const proj = NoteWallState.getProject();
    proj.background = {
      type: 'solid',
      color: '#000000',
      blur: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      vignette: 0,
      grayscale: 0,
      sepia: 0,
      overlayOpacity: 0
    };
    render(true);
    if (window.NoteWallProperties) NoteWallProperties.syncBackgroundControls();
  }

  function resetBackground() {
    NoteWallState.pushHistory('Reset Background');
    const proj = NoteWallState.getProject();
    proj.background = {
      type: 'builtin',
      style: 'minimal-black',
      color: '#000000',
      blur: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      vignette: 0,
      grayscale: 0,
      sepia: 0,
      overlayOpacity: 0
    };
    render(true);
    if (window.NoteWallProperties) NoteWallProperties.syncBackgroundControls();
  }

  // --- Color Conversion Helpers ---

  function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(0, 0, 0, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  function hexToRgb(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function rgbToHex(r, g, b) {
    const toHex = (n) => {
      const clamped = Math.max(0, Math.min(255, Math.round(n)));
      return clamped.toString(16).padStart(2, '0');
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  function hslToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  return {
    init,
    render,
    requestRender,
    updateFilters,
    updateOverlay,
    updateTransforms,
    updateGradient,
    updateSolidColor,
    gradientPresets,
    builtins,
    renderBuiltinToElement,
    applyPreset,
    resetEffects,
    resetPosition,
    removeBackground,
    resetBackground,
    hexToRgba,
    hexToRgb,
    rgbToHex,
    rgbToHsl,
    hslToRgb
  };
})();
