/**
 * NoteWall - Wallpaper Exporter & Canvas Renderer
 * Offscreen high-resolution renderer that produces pixel-perfect PNGs without any editor UI or handles.
 * Directly interfaces with C# WallpaperService.
 */

window.NoteWallExporter = (function () {
  /**
   * Renders the current workspace onto an offscreen canvas at the specified resolution multiplier.
   * Returns a base64 PNG data URL.
   */
  async function renderToDataURL(scaleMultiplier = 1.0) {
    const proj = NoteWallState.getProject();
    const projW = (typeof proj.width === 'number' && !isNaN(proj.width) && proj.width > 0) ? proj.width : 1920;
    const projH = (typeof proj.height === 'number' && !isNaN(proj.height) && proj.height > 0) ? proj.height : 1080;
    const scale = (typeof scaleMultiplier === 'number' && !isNaN(scaleMultiplier) && scaleMultiplier > 0) ? scaleMultiplier : 1.0;
    const width = Math.max(1, Math.round(projW * scale));
    const height = Math.max(1, Math.round(projH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');

    // Scale canvas context
    ctx.scale(scale, scale);

    // 1. Draw Background
    await drawBackground(ctx, projW, projH, proj.background);

    // 2. Draw Notes (sorted by z-index)
    const sortedNotes = [...proj.notes]
      .filter(n => n.isVisible !== false)
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    for (const note of sortedNotes) {
      await drawNote(ctx, note);
    }

    return canvas.toDataURL('image/png', 1.0);
  }

  // Draw Background
  async function drawBackground(ctx, w, h, bg) {
    w = (typeof w === 'number' && !isNaN(w) && w > 0) ? Math.round(w) : 1920;
    h = (typeof h === 'number' && !isNaN(h) && h > 0) ? Math.round(h) : 1080;

    if (!bg || bg.type === 'transparent') {
      // Preserve alpha transparency for PNG export
      return;
    }

    ctx.save();

    // 1. Offscreen Buffer for Background Media
    const bufCanvas = document.createElement('canvas');
    bufCanvas.width = Math.max(1, w);
    bufCanvas.height = Math.max(1, h);
    const bufCtx = bufCanvas.getContext('2d');
    if (!bufCtx) {
      ctx.restore();
      return;
    }

    if (bg.type === 'solid') {
      bufCtx.fillStyle = bg.color || '#000000';
      bufCtx.fillRect(0, 0, w, h);
    } else if (bg.type === 'gradient') {
      const grad = bg.gradient || {};
      const c1 = grad.c1 || grad.color1 || '#000000';
      const c2 = grad.c2 || grad.color2 || '#0f172a';
      const c3 = grad.c3 || null;

      let g;
      if (grad.type === 'radial') {
        g = bufCtx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) / 1.5);
        g.addColorStop(0, c2);
        if (c3) g.addColorStop(0.5, c3);
        g.addColorStop(1, c1);
      } else {
        const rad = ((grad.angle !== undefined ? grad.angle : 135) * Math.PI) / 180;
        const x2 = w / 2 + Math.cos(rad) * (w / 2);
        const y2 = h / 2 + Math.sin(rad) * (h / 2);
        const x1 = w / 2 - Math.cos(rad) * (w / 2);
        const y1 = h / 2 - Math.sin(rad) * (h / 2);

        g = bufCtx.createLinearGradient(x1, y1, x2, y2);
        g.addColorStop(0, c1);
        if (c3) g.addColorStop(0.5, c3);
        g.addColorStop(1, c2);
      }
      bufCtx.fillStyle = g;
      bufCtx.fillRect(0, 0, w, h);
    } else if (bg.type === 'image' && bg.image) {
      await drawImageBackground(bufCtx, w, h, bg);
    } else {
      // Built-in presets
      drawBuiltinBackground(bufCtx, w, h, bg.style || 'minimal-black');
    }

    // 2. Draw Buffer onto main Canvas with Filters
    const blur = bg.blur || 0;
    const brightness = bg.brightness !== undefined ? bg.brightness : 100;
    const contrast = bg.contrast !== undefined ? bg.contrast : 100;
    const saturation = bg.saturation !== undefined ? bg.saturation : 100;
    const grayscale = bg.grayscale || 0;
    const sepia = bg.sepia || 0;

    ctx.save();
    ctx.filter = `blur(${blur}px) brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%)`.trim();
    if (bufCanvas.width > 0 && bufCanvas.height > 0 && w > 0 && h > 0) {
      ctx.drawImage(bufCanvas, 0, 0, w, h);
    }
    ctx.restore();

    // 3. Draw Background Overlay (Dark or Color Overlay)
    const overlayAlpha = (bg.overlayOpacity !== undefined ? bg.overlayOpacity : 0) / 100;
    if (overlayAlpha > 0) {
      const overlayColor = bg.overlayColor || '#000000';
      ctx.fillStyle = hexToRgba(overlayColor, overlayAlpha);
      ctx.fillRect(0, 0, w, h);
    }

    // 4. Draw Vignette Layer
    const vignetteIntensity = (bg.vignette || 0) / 100;
    if (vignetteIntensity > 0) {
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(1, `rgba(0, 0, 0, ${vignetteIntensity * 0.95})`);
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  function drawBuiltinBackground(ctx, w, h, style) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    switch (style) {
      case 'minimal-black':
      case 'dark-solid':
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        break;

      case 'minimal-charcoal':
        ctx.fillStyle = '#111114';
        ctx.fillRect(0, 0, w, h);
        // Soft stipple
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        for (let x = 12; x < w; x += 24) {
          for (let y = 12; y < h; y += 24) {
            ctx.fillRect(x, y, 1.5, 1.5);
          }
        }
        break;

      case 'minimal-white':
      case 'light-solid':
        ctx.fillStyle = '#fbfbfe';
        ctx.fillRect(0, 0, w, h);
        const radWhite = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.5, w / 2, h / 2, Math.max(w, h) * 0.8);
        radWhite.addColorStop(0, 'rgba(0,0,0,0)');
        radWhite.addColorStop(1, 'rgba(0,0,0,0.06)');
        ctx.fillStyle = radWhite;
        ctx.fillRect(0, 0, w, h);
        break;

      case 'minimal-dark-gradient':
      case 'minimal-gradient':
        const mg = ctx.createLinearGradient(0, 0, w, h);
        mg.addColorStop(0, '#050508');
        mg.addColorStop(0.4, '#0d0d12');
        mg.addColorStop(1, '#171720');
        ctx.fillStyle = mg;
        ctx.fillRect(0, 0, w, h);
        break;

      case 'abstract-aurora':
      case 'abstract-dark':
        ctx.fillStyle = '#040508';
        ctx.fillRect(0, 0, w, h);

        const radA1 = ctx.createRadialGradient(w * 0.2, h * 0.3, 0, w * 0.2, h * 0.3, w * 0.5);
        radA1.addColorStop(0, 'rgba(147, 51, 234, 0.28)');
        radA1.addColorStop(1, 'transparent');
        ctx.fillStyle = radA1;
        ctx.fillRect(0, 0, w, h);

        const radA2 = ctx.createRadialGradient(w * 0.8, h * 0.7, 0, w * 0.8, h * 0.7, w * 0.5);
        radA2.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
        radA2.addColorStop(1, 'transparent');
        ctx.fillStyle = radA2;
        ctx.fillRect(0, 0, w, h);

        const radA3 = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
        radA3.addColorStop(0, 'rgba(99, 102, 241, 0.18)');
        radA3.addColorStop(1, 'transparent');
        ctx.fillStyle = radA3;
        ctx.fillRect(0, 0, w, h);
        break;

      case 'abstract-mesh':
        ctx.fillStyle = '#06070a';
        ctx.fillRect(0, 0, w, h);

        const meshG = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.6);
        meshG.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
        meshG.addColorStop(1, 'transparent');
        ctx.fillStyle = meshG;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const mStep = 48;
        for (let x = 0; x < w; x += mStep) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += mStep) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        break;

      case 'abstract-silk':
        const silkG = ctx.createLinearGradient(0, 0, w, h);
        silkG.addColorStop(0, '#09090c');
        silkG.addColorStop(0.45, '#16171f');
        silkG.addColorStop(1, '#0d0e14');
        ctx.fillStyle = silkG;
        ctx.fillRect(0, 0, w, h);

        const radSilk = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.5);
        radSilk.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        radSilk.addColorStop(1, 'transparent');
        ctx.fillStyle = radSilk;
        ctx.fillRect(0, 0, w, h);
        break;

      case 'abstract-prismatic':
        const prisG = ctx.createLinearGradient(0, 0, w, h);
        prisG.addColorStop(0, '#040407');
        prisG.addColorStop(1, '#0d0f17');
        ctx.fillStyle = prisG;
        ctx.fillRect(0, 0, w, h);

        const radPris1 = ctx.createRadialGradient(w * 0.15, h * 0.85, 0, w * 0.15, h * 0.85, w * 0.4);
        radPris1.addColorStop(0, 'rgba(236, 72, 153, 0.16)');
        radPris1.addColorStop(1, 'transparent');
        ctx.fillStyle = radPris1;
        ctx.fillRect(0, 0, w, h);

        const radPris2 = ctx.createRadialGradient(w * 0.85, h * 0.15, 0, w * 0.85, h * 0.15, w * 0.4);
        radPris2.addColorStop(0, 'rgba(59, 130, 246, 0.18)');
        radPris2.addColorStop(1, 'transparent');
        ctx.fillStyle = radPris2;
        ctx.fillRect(0, 0, w, h);
        break;

      case 'nature-alpine':
        // Sky gradient
        const skyG = ctx.createLinearGradient(0, 0, 0, h);
        skyG.addColorStop(0, '#050814');
        skyG.addColorStop(0.5, '#0c162d');
        skyG.addColorStop(0.75, '#151b32');
        skyG.addColorStop(1, '#080b14');
        ctx.fillStyle = skyG;
        ctx.fillRect(0, 0, w, h);

        // Moon / Starlight glow
        const moonG = ctx.createRadialGradient(w * 0.8, h * 0.2, 0, w * 0.8, h * 0.2, w * 0.4);
        moonG.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        moonG.addColorStop(0.3, 'rgba(99, 102, 241, 0.1)');
        moonG.addColorStop(1, 'transparent');
        ctx.fillStyle = moonG;
        ctx.fillRect(0, 0, w, h);

        // Stars
        ctx.fillStyle = '#ffffff';
        const stars = [
          [0.1, 0.11, 1.5, 0.8], [0.23, 0.07, 1.0, 0.6], [0.44, 0.14, 1.8, 0.9],
          [0.62, 0.08, 1.2, 0.7], [0.83, 0.15, 1.5, 0.8], [0.73, 0.2, 1.0, 0.5]
        ];
        stars.forEach(([sx, sy, sr, so]) => {
          ctx.globalAlpha = so;
          ctx.beginPath();
          ctx.arc(w * sx, h * sy, sr, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Distant mountain ridge
        ctx.fillStyle = '#0d1424';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.69);
        ctx.lineTo(w * 0.18, h * 0.48);
        ctx.lineTo(w * 0.36, h * 0.69);
        ctx.lineTo(w * 0.60, h * 0.44);
        ctx.lineTo(w * 0.81, h * 0.67);
        ctx.lineTo(w, h * 0.50);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        // Mid mountain ridge
        ctx.fillStyle = '#080c16';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.79);
        ctx.lineTo(w * 0.25, h * 0.55);
        ctx.lineTo(w * 0.46, h * 0.76);
        ctx.lineTo(w * 0.70, h * 0.52);
        ctx.lineTo(w * 0.93, h * 0.74);
        ctx.lineTo(w, h * 0.66);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        // Foreground foothills
        ctx.fillStyle = '#03050a';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.89);
        ctx.lineTo(w * 0.15, h * 0.72);
        ctx.lineTo(w * 0.38, h * 0.86);
        ctx.lineTo(w * 0.61, h * 0.73);
        ctx.lineTo(w * 0.84, h * 0.84);
        ctx.lineTo(w, h * 0.77);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        break;

      case 'nature-forest':
        const forestG = ctx.createLinearGradient(0, 0, 0, h);
        forestG.addColorStop(0, '#020604');
        forestG.addColorStop(0.55, '#051a10');
        forestG.addColorStop(1, '#020c07');
        ctx.fillStyle = forestG;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#061e12';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.76);
        ctx.quadraticCurveTo(w * 0.25, h * 0.70, w * 0.5, h * 0.74);
        ctx.quadraticCurveTo(w * 0.75, h * 0.72, w, h * 0.72);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#03120a';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.82);
        ctx.quadraticCurveTo(w * 0.27, h * 0.78, w * 0.54, h * 0.81);
        ctx.quadraticCurveTo(w * 0.77, h * 0.79, w, h * 0.79);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#010603';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.89);
        ctx.quadraticCurveTo(w * 0.24, h * 0.84, w * 0.51, h * 0.87);
        ctx.quadraticCurveTo(w * 0.78, h * 0.85, w, h * 0.85);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        break;

      case 'nature-abyss':
        const abyssG = ctx.createLinearGradient(0, 0, 0, h);
        abyssG.addColorStop(0, '#020a14');
        abyssG.addColorStop(0.45, '#031528');
        abyssG.addColorStop(1, '#01060c');
        ctx.fillStyle = abyssG;
        ctx.fillRect(0, 0, w, h);

        const radAbyss = ctx.createRadialGradient(w * 0.5, h * 0.1, 0, w * 0.5, h * 0.1, w * 0.65);
        radAbyss.addColorStop(0, 'rgba(14, 165, 233, 0.22)');
        radAbyss.addColorStop(1, 'transparent');
        ctx.fillStyle = radAbyss;
        ctx.fillRect(0, 0, w, h);
        break;

      case 'nature-stars':
        ctx.fillStyle = '#030306';
        ctx.fillRect(0, 0, w, h);

        const radNeb1 = ctx.createRadialGradient(w * 0.6, h * 0.4, 0, w * 0.6, h * 0.4, w * 0.5);
        radNeb1.addColorStop(0, 'rgba(168, 85, 247, 0.18)');
        radNeb1.addColorStop(1, 'transparent');
        ctx.fillStyle = radNeb1;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        for (let x = 16; x < w; x += 32) {
          for (let y = 16; y < h; y += 32) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
        break;

      case 'arch-skyline':
        const skyG2 = ctx.createLinearGradient(0, 0, 0, h);
        skyG2.addColorStop(0, '#040812');
        skyG2.addColorStop(0.65, '#0c1830');
        skyG2.addColorStop(1, '#050a14');
        ctx.fillStyle = skyG2;
        ctx.fillRect(0, 0, w, h);

        // Building silhouettes
        const bldgs = [
          [180, 620, 110, 460, '#080e1c'],
          [340, 540, 140, 540, '#060b17'],
          [520, 680, 90, 400, '#091022'],
          [660, 580, 130, 500, '#050914'],
          [840, 510, 160, 570, '#070c18'],
          [1050, 640, 120, 440, '#091022'],
          [1220, 560, 150, 520, '#060b17'],
          [1420, 670, 100, 410, '#080e1a'],
          [1570, 590, 140, 490, '#050914']
        ];
        bldgs.forEach(([bx, by, bw, bh, col]) => {
          ctx.fillStyle = col;
          ctx.fillRect(bx * (w / 1920), by * (h / 1080), bw * (w / 1920), bh * (h / 1080));
        });
        break;

      case 'arch-monolith':
        const monoG = ctx.createLinearGradient(0, 0, w, h);
        monoG.addColorStop(0, '#09090b');
        monoG.addColorStop(0.5, '#18181c');
        monoG.addColorStop(1, '#060608');
        ctx.fillStyle = monoG;
        ctx.fillRect(0, 0, w, h);
        break;

      case 'dev-grid':
      case 'subtle-grid':
        ctx.fillStyle = '#070709';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
        ctx.lineWidth = 1;
        const gStep = 40;
        for (let x = 0; x < w; x += gStep) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += gStep) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        break;

      case 'dev-circuit':
        ctx.fillStyle = '#04070e';
        ctx.fillRect(0, 0, w, h);

        const circG = ctx.createRadialGradient(w * 0.75, h * 0.3, 0, w * 0.75, h * 0.3, w * 0.5);
        circG.addColorStop(0, 'rgba(14, 165, 233, 0.12)');
        circG.addColorStop(1, 'transparent');
        ctx.fillStyle = circG;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(14, 165, 233, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += 60) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        break;

      case 'dev-terminal':
        const termG = ctx.createLinearGradient(0, 0, w, h);
        termG.addColorStop(0, '#050508');
        termG.addColorStop(1, '#0d0e14');
        ctx.fillStyle = termG;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#10b981';
        ctx.fillText('> _', 80 * (w / 1920), 160 * (h / 1080));
        ctx.font = '14px monospace';
        ctx.fillStyle = '#6ee7b7';
        ctx.fillText("const notewall = new Workspace({ canvas: '1920x1080', status: 'ready' });", 80 * (w / 1920), 220 * (h / 1080));
        ctx.restore();
        break;

      default:
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        break;
    }
  }

  function drawImageBackground(ctx, w, h, bg) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        const fit = bg.imageFit || 'cover';
        const tx = bg.imageOffsetX || 0;
        const ty = bg.imageOffsetY || 0;
        const sc = bg.imageScale !== undefined ? bg.imageScale : 1.0;
        const rot = bg.imageRotation || 0;

        // Apply custom transforms around center
        if (tx || ty || sc !== 1.0 || rot) {
          ctx.translate(w / 2 + tx, h / 2 + ty);
          if (rot) ctx.rotate((rot * Math.PI) / 180);
          if (sc !== 1.0) ctx.scale(sc, sc);
          ctx.translate(-w / 2, -h / 2);
        }

        let dw = w, dh = h, dx = 0, dy = 0;
        if (fit === 'cover') {
          const ratio = Math.max(w / img.width, h / img.height);
          dw = img.width * ratio;
          dh = img.height * ratio;
          dx = (w - dw) / 2;
          dy = (h - dh) / 2;
        } else if (fit === 'contain' || fit === 'custom') {
          const ratio = Math.min(w / img.width, h / img.height);
          dw = img.width * ratio;
          dh = img.height * ratio;
          dx = (w - dw) / 2;
          dy = (h - dh) / 2;
        } else if (fit === 'center') {
          dw = img.width;
          dh = img.height;
          dx = (w - dw) / 2;
          dy = (h - dh) / 2;
        } else if (fit === 'stretch') {
          dw = w;
          dh = h;
          dx = 0;
          dy = 0;
        }

        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
        resolve();
      };
      img.onerror = () => resolve();
      img.src = bg.image;
    });
  }

  function hexToRgba(hex, alpha) {
    if (!hex) return `rgba(0, 0, 0, ${alpha})`;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  // Draw individual note
  async function drawNote(ctx, note) {
    if (!note) return;
    const nx = typeof note.x === 'number' && !isNaN(note.x) ? note.x : 100;
    const ny = typeof note.y === 'number' && !isNaN(note.y) ? note.y : 100;
    const nw = typeof note.width === 'number' && !isNaN(note.width) && note.width >= 50 ? note.width : 280;
    const nh = typeof note.height === 'number' && !isNaN(note.height) && note.height >= 40 ? note.height : 180;

    ctx.save();

    const cx = nx + nw / 2;
    const cy = ny + nh / 2;

    // Apply rotation
    if (note.rotation) {
      ctx.translate(cx, cy);
      ctx.rotate((note.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    ctx.globalAlpha = (note.opacity !== undefined ? note.opacity : 100) / 100;

    // Shadow
    applyCanvasShadow(ctx, note.shadow);

    const r = note.borderRadius !== undefined ? note.borderRadius : 12;

    // Fill card background with rounded rect
    roundRect(ctx, nx, ny, nw, nh, r);
    ctx.fillStyle = note.color || '#27272a';
    ctx.fill();

    // Reset shadow for inner elements
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Border
    roundRect(ctx, nx, ny, nw, nh, r);
    ctx.strokeStyle = note.glass === 'blur' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Content padding
    const px = nx + 16;
    const py = ny + 16;
    const innerW = nw - 32;

    // Header: Title
    ctx.fillStyle = note.textColor || '#f4f4f5';
    ctx.font = `bold ${Math.round((note.fontSize || 13) * 1.08)}px ${note.fontFamily || "'Inter', sans-serif"}`;
    ctx.textBaseline = 'top';

    const titleText = note.title || 'Untitled';
    ctx.fillText(titleText, px, py, innerW - 50);

    // Header: Priority Dot
    if (note.priority && note.priority !== 'none') {
      const dotX = nx + nw - 24;
      const dotY = py + 4;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = getPriorityColor(note.priority);
      ctx.fill();
    }

    // Body Offset
    const bodyY = py + 26;

    // Draw body according to Note Type
    ctx.font = `normal ${note.fontSize || 13}px ${note.fontFamily || "'Inter', sans-serif"}`;

    switch (note.type) {
      case 'photo':
      case 'image':
        await drawPhoto(ctx, note, px, bodyY, innerW, (ny + nh - 16) - bodyY);
        break;
      case 'checklist':
        drawChecklist(ctx, note, px, bodyY, innerW);
        break;
      case 'quote':
        drawQuote(ctx, note, px, bodyY, innerW);
        break;
      case 'code':
        drawCode(ctx, note, px, bodyY, innerW);
        break;
      case 'reminder':
        drawReminder(ctx, note, px, bodyY, innerW);
        break;
      case 'datetime':
        drawDatetime(ctx, note, px, bodyY, innerW);
        break;
      case 'link':
        drawLink(ctx, note, px, bodyY, innerW);
        break;
      case 'standard':
      default:
        drawStandardText(ctx, note, px, bodyY, innerW);
        break;
    }

    ctx.restore();
  }

  function drawChecklist(ctx, note, x, y, maxW) {
    const list = note.checklist || [];
    let curY = y;
    const lineH = (note.fontSize || 13) * 1.55;

    list.forEach(item => {
      // Checkbox
      ctx.strokeStyle = note.textColor || '#f4f4f5';
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, curY + 2, 12, 12, 2.5);
      if (item.done) {
        ctx.fillStyle = note.textColor || '#f4f4f5';
        ctx.fill();
      } else {
        ctx.stroke();
      }

      // Text
      ctx.fillStyle = item.done ? 'rgba(255, 255, 255, 0.45)' : (note.textColor || '#f4f4f5');
      ctx.fillText(item.text, x + 20, curY, maxW - 22);

      curY += lineH;
    });
  }

  function drawQuote(ctx, note, x, y, maxW) {
    ctx.font = `italic 16px ${note.fontFamily || "'Playfair Display', serif"}`;
    ctx.fillStyle = note.textColor || '#f4f4f5';
    wrapText(ctx, `“${note.body || ''}”`, x, y + 10, maxW, 22);

    if (note.tag) {
      ctx.font = `500 11px ${note.fontFamily || "'Inter', sans-serif"}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(`— ${note.tag}`, x, y + 60);
    }
  }

  function drawCode(ctx, note, x, y, maxW) {
    // Code block container
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    roundRect(ctx, x, y, maxW, note.height - 65, 6);
    ctx.fill();

    ctx.font = `normal 11.5px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#a5b4fc';
    const lines = (note.body || '').split('\n');
    let curY = y + 10;
    lines.forEach(line => {
      ctx.fillText(line, x + 10, curY, maxW - 20);
      curY += 16;
    });
  }

  function drawReminder(ctx, note, x, y, maxW) {
    ctx.fillStyle = note.textColor || '#f4f4f5';
    wrapText(ctx, note.body || '', x, y, maxW, 18);

    if (note.date) {
      const pillY = y + 42;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      roundRect(ctx, x, pillY, 140, 22, 11);
      ctx.fill();

      ctx.fillStyle = '#fca5a5';
      ctx.font = `bold 10.5px sans-serif`;
      ctx.fillText(`⏰ ${note.date}`, x + 10, pillY + 4);
    }
  }

  function drawLink(ctx, note, x, y, maxW) {
    if (note.body) {
      ctx.fillStyle = note.textColor || '#f4f4f5';
      wrapText(ctx, note.body, x, y, maxW, 16);
      y += 24;
    }

    const links = note.links || [
      { label: note.url ? 'Open Link' : 'GitHub', url: note.url || 'https://github.com' }
    ];

    let pillY = y;
    links.forEach(l => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      roundRect(ctx, x, pillY, maxW, 28, 6);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#818cf8';
      ctx.font = `bold 11px 'JetBrains Mono', monospace`;
      ctx.fillText(`🔗 ${l.label}`, x + 10, pillY + 8);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`↗`, x + maxW - 18, pillY + 8);

      pillY += 34;
    });
  }

  function drawDatetime(ctx, note, x, y, maxW) {
    const now = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-US', options).toUpperCase();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${mins}`;

    ctx.textAlign = 'center';
    const centerX = note.x + note.width / 2;

    ctx.fillStyle = '#a1a1aa';
    ctx.font = `600 11px 'Inter', sans-serif`;
    ctx.fillText(dateStr, centerX, y + 2);

    ctx.fillStyle = '#f4f4f5';
    ctx.font = `bold 26px 'Outfit', sans-serif`;
    ctx.fillText(timeStr, centerX, y + 22);

    ctx.textAlign = 'left';
  }

  function drawStandardText(ctx, note, x, y, maxW) {
    ctx.fillStyle = note.textColor || '#f4f4f5';
    wrapText(ctx, note.body || '', x, y, maxW, (note.fontSize || 13) * 1.5);
  }

  async function drawPhoto(ctx, note, x, y, maxW, availableH) {
    if (!note.image) return;

    try {
      const img = new Image();
      const loadPromise = new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
      img.src = note.image;
      if (!img.complete) {
        await loadPromise;
      }

      const imgW = img.naturalWidth || img.width;
      const imgH = img.naturalHeight || img.height;
      if (!imgW || !imgH) return;

      const fit = note.imageFit || 'cover';
      const hasCaption = !!(note.body && note.body.trim());
      const captionH = hasCaption ? 24 : 0;
      const photoH = Math.max(40, availableH - captionH);

      // Clip image area to rounded rectangle
      ctx.save();
      roundRect(ctx, x, y, maxW, photoH, 6);
      ctx.clip();

      if (fit === 'contain') {
        const sc = Math.min(maxW / imgW, photoH / imgH);
        const dw = imgW * sc;
        const dh = imgH * sc;
        const dx = x + (maxW - dw) / 2;
        const dy = y + (photoH - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      } else {
        // cover
        const sc = Math.max(maxW / imgW, photoH / imgH);
        const dw = imgW * sc;
        const dh = imgH * sc;
        const dx = x + (maxW - dw) / 2;
        const dy = y + (photoH - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      }
      ctx.restore();

      // Border around photo
      ctx.save();
      roundRect(ctx, x, y, maxW, photoH, 6);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Optional Caption
      if (hasCaption) {
        ctx.fillStyle = note.textColor || '#f4f4f5';
        ctx.font = `italic ${note.fontSize || 12}px ${note.fontFamily || "'Inter', sans-serif"}`;
        wrapText(ctx, note.body, x, y + photoH + 8, maxW, 16);
      }
    } catch (err) {
      console.warn('Could not draw photo on export canvas:', err);
    }
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const lines = text.split('\n');
    let curY = y;

    for (let i = 0; i < lines.length; i++) {
      const words = lines[i].split(' ');
      let currentLine = '';

      for (let n = 0; n < words.length; n++) {
        const testLine = currentLine + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(currentLine, x, curY);
          currentLine = words[n] + ' ';
          curY += lineHeight;
        } else {
          currentLine = testLine;
        }
      }
      ctx.fillText(currentLine, x, curY);
      curY += lineHeight;
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function applyCanvasShadow(ctx, shadow) {
    switch (shadow) {
      case 'none':
        ctx.shadowColor = 'transparent';
        break;
      case 'subtle':
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        break;
      case 'deep':
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 14;
        break;
      case 'glow':
        ctx.shadowColor = 'rgba(99, 102, 241, 0.5)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 0;
        break;
      case 'medium':
      default:
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
        break;
    }
  }

  function getPriorityColor(p) {
    switch (p) {
      case 'low': return '#3b82f6';
      case 'normal': return '#10b981';
      case 'high': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return 'transparent';
    }
  }

  // --- Public Action APIs ---

  async function applyAsWallpaper() {
    try {
      NoteWallApp.showToast('Rendering wallpaper at target resolution...');
      const proj = NoteWallState.getProject();
      const base64 = await renderToDataURL(1.0);

      const res = await NoteWallBridge.call('setWallpaper', {
        base64,
        monitorIndex: NoteWallState.activeDisplayIndex,
        projectName: proj.name,
        width: proj.width,
        height: proj.height
      });

      NoteWallApp.showToast('✓ Wallpaper applied successfully to Windows desktop!', 'success');
    } catch (err) {
      console.error(err);
      NoteWallApp.showToast('Unable to apply wallpaper. ' + err.message, 'error');
    }
  }

  async function exportPng(scaleMultiplier = 1.0) {
    try {
      const proj = NoteWallState.getProject();
      NoteWallApp.showToast('Generating high-resolution PNG...');
      const base64 = await renderToDataURL(scaleMultiplier);

      const fileName = `${proj.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_wallpaper.png`;

      await NoteWallBridge.call('exportPng', {
        base64,
        fileName
      });

      NoteWallApp.showToast('✓ Wallpaper exported successfully!', 'success');
    } catch (err) {
      if (!err.message?.includes('cancelled')) {
        NoteWallApp.showToast('Export failed: ' + err.message, 'error');
      }
    }
  }

  return {
    renderToDataURL,
    applyAsWallpaper,
    exportPng
  };
})();
