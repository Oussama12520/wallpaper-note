/**
 * NoteWall - Canvas Controller
 * Handles Viewport Pan & Zoom, Screen Resolutions, Background Rendering, and Smart Alignment Guides.
 */

window.NoteWallCanvas = (function () {
  const viewport = document.getElementById('canvas-viewport');
  const stage = document.getElementById('canvas-stage');
  const bgContainer = document.getElementById('canvas-background-container');
  const guidesLayer = document.getElementById('guides-layer');
  const zoomLabel = document.getElementById('zoom-value');
  const coordsLabel = document.getElementById('coords-indicator');

  let scale = 0.55;
  let panX = 40;
  let panY = 40;
  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;
  let isSpacePressed = false;

  function init() {
    setupPanAndZoom();
    setupResolutionControls();
    updateTransform();
    renderBackground();

    // Re-render when project state changes
    NoteWallState.subscribe((changeType) => {
      if (changeType === 'project_loaded' || changeType === 'undo' || changeType === 'redo') {
        renderBackground();
        fitToScreen();
      }
    });

    // Auto fit on window resize
    window.addEventListener('resize', () => {
      fitToScreen();
    });

    setTimeout(() => {
      fitToScreen();
    }, 100);
  }

  function setupPanAndZoom() {
    // Spacebar toggling pan cursor
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (!isSpacePressed) {
          isSpacePressed = true;
          viewport.classList.add('panning');
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        isSpacePressed = false;
        viewport.classList.remove('panning', 'panning-active');
      }
    });

    // Panning with mouse (middle button OR space + left button)
    viewport.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
        isPanning = true;
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
        viewport.classList.add('panning-active');
        e.preventDefault();
      } else if (e.target === viewport || e.target === stage || e.target === bgContainer || (bgContainer && bgContainer.contains(e.target))) {
        // Click on empty canvas deselects
        NoteWallState.deselectAll();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isPanning) {
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        updateTransform();
      }

      // Track cursor canvas coordinates
      const rect = stage.getBoundingClientRect();
      const canvasX = Math.round((e.clientX - rect.left) / scale);
      const canvasY = Math.round((e.clientY - rect.top) / scale);
      if (coordsLabel) {
        coordsLabel.textContent = `X: ${canvasX} Y: ${canvasY}`;
      }
    });

    window.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        viewport.classList.remove('panning-active');
      }
    });

    // Mouse wheel zoom centered on cursor
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const currentScale = (!isNaN(scale) && scale > 0) ? scale : 0.5;
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const rect = stage.getBoundingClientRect();

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newScale = Math.min(Math.max(currentScale * zoomFactor, 0.15), 3.0);

      // Adjust pan to zoom towards mouse position
      panX += (mouseX / currentScale) * (currentScale - newScale);
      panY += (mouseY / currentScale) * (currentScale - newScale);
      if (isNaN(panX)) panX = 0;
      if (isNaN(panY)) panY = 0;

      scale = newScale;
      updateTransform();
    }, { passive: false });

    // Zoom Buttons
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => setZoom(scale * 1.2));
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => setZoom(scale / 1.2));
    document.getElementById('btn-zoom-fit')?.addEventListener('click', fitToScreen);
    zoomLabel?.addEventListener('click', fitToScreen);
  }

  function setZoom(newScale) {
    if (isNaN(newScale) || newScale <= 0) return;
    const vRect = viewport.getBoundingClientRect();
    const centerX = vRect.width / 2;
    const centerY = vRect.height / 2;

    const currentScale = (!isNaN(scale) && scale > 0) ? scale : 1.0;
    const clampedScale = Math.min(Math.max(newScale, 0.15), 3.0);

    panX += (centerX - panX) * (1 - clampedScale / currentScale);
    panY += (centerY - panY) * (1 - clampedScale / currentScale);
    if (isNaN(panX)) panX = 0;
    if (isNaN(panY)) panY = 0;

    scale = clampedScale;
    updateTransform();
  }

  function fitToScreen() {
    const proj = NoteWallState.getProject();
    const projW = (typeof proj.width === 'number' && !isNaN(proj.width) && proj.width > 0) ? proj.width : 1920;
    const projH = (typeof proj.height === 'number' && !isNaN(proj.height) && proj.height > 0) ? proj.height : 1080;
    proj.width = projW;
    proj.height = projH;

    const vRect = viewport.getBoundingClientRect();
    const padding = 60;

    const availableW = Math.max(100, vRect.width - padding * 2);
    const availableH = Math.max(100, vRect.height - padding * 2);

    const scaleW = availableW / projW;
    const scaleH = availableH / projH;

    let newScale = Math.min(scaleW, scaleH, 1.0);
    if (isNaN(newScale) || newScale <= 0) newScale = 0.5;

    scale = newScale;

    panX = (vRect.width - projW * scale) / 2;
    panY = (vRect.height - projH * scale) / 2;
    if (isNaN(panX)) panX = 0;
    if (isNaN(panY)) panY = 0;

    updateTransform();
  }

  function updateTransform() {
    if (isNaN(panX)) panX = 0;
    if (isNaN(panY)) panY = 0;
    if (isNaN(scale) || scale <= 0) scale = 0.5;

    stage.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(scale * 100)}%`;
    }
  }

  function setupResolutionControls() {
    const selector = document.getElementById('resolution-selector');
    if (!selector) return;

    selector.addEventListener('change', async () => {
      const proj = NoteWallState.getProject();
      const val = selector.value;

      if (val === 'screen') {
        try {
          const displays = await NoteWallBridge.call('getDisplays');
          if (displays && displays.length > 0) {
            const activeIdx = NoteWallState.activeDisplayIndex || 0;
            const disp = displays[activeIdx] || displays.find(d => d.isPrimary || d.IsPrimary) || displays[0];
            const w = disp.width || disp.Width || window.screen.width || 1920;
            const h = disp.height || disp.Height || window.screen.height || 1080;
            setCanvasResolution(w, h);
            if (window.showToast) {
              window.showToast(`Set resolution to screen: ${w} × ${h}`);
            }
          } else {
            const w = window.screen.width || 1920;
            const h = window.screen.height || 1080;
            setCanvasResolution(w, h);
          }
        } catch (err) {
          console.warn('Failed to get displays from bridge, falling back to window.screen:', err);
          const w = window.screen.width || 1920;
          const h = window.screen.height || 1080;
          setCanvasResolution(w, h);
        }
      } else if (val === 'custom') {
        const currentW = proj.width || 1920;
        const currentH = proj.height || 1080;
        const w = prompt('Enter Canvas Width (e.g. 1920):', currentW);
        const h = prompt('Enter Canvas Height (e.g. 1080):', currentH);
        if (w && h && !isNaN(w) && !isNaN(h)) {
          setCanvasResolution(parseInt(w, 10), parseInt(h, 10));
        } else {
          selector.value = `${currentW}x${currentH}`;
        }
      } else {
        const parts = val.split('x').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          setCanvasResolution(parts[0], parts[1]);
        }
      }
    });
  }

  function setCanvasResolution(width, height) {
    const w = typeof width === 'number' && !isNaN(width) && width > 0 ? Math.round(width) : 1920;
    const h = typeof height === 'number' && !isNaN(height) && height > 0 ? Math.round(height) : 1080;

    NoteWallState.pushHistory('Change Canvas Resolution');
    const proj = NoteWallState.getProject();
    proj.width = w;
    proj.height = h;

    stage.style.width = `${w}px`;
    stage.style.height = `${h}px`;

    // Sync selector UI
    const selector = document.getElementById('resolution-selector');
    if (selector) {
      const matchOpt = Array.from(selector.options).find(opt => opt.value === `${w}x${h}`);
      if (matchOpt) {
        selector.value = `${w}x${h}`;
      } else {
        const screenOpt = Array.from(selector.options).find(opt => opt.value === 'screen');
        if (screenOpt) {
          screenOpt.textContent = `Screen (${w} × ${h})`;
          selector.value = 'screen';
        }
      }
    }

    renderBackground();
    fitToScreen();
    NoteWallState.notify('resolutionChange', { width: w, height: h });
  }

  // Render wallpaper background (built-in, solid, gradient, image)
  function renderBackground() {
    const proj = NoteWallState.getProject();
    const w = (typeof proj.width === 'number' && !isNaN(proj.width) && proj.width > 0) ? proj.width : 1920;
    const h = (typeof proj.height === 'number' && !isNaN(proj.height) && proj.height > 0) ? proj.height : 1080;
    proj.width = w;
    proj.height = h;

    stage.style.width = `${w}px`;
    stage.style.height = `${h}px`;

    if (window.NoteWallBackground) {
      NoteWallBackground.render();
    }
  }

  // Smart Guides Engine
  function showGuides(activeNote, guides) {
    guidesLayer.innerHTML = '';
    if (!NoteWallState.settings.smartGuides) return;

    guides.forEach(g => {
      const line = document.createElement('div');
      line.className = `smart-guide smart-guide-${g.type}`;
      if (g.type === 'h') {
        line.style.top = `${g.pos}px`;
      } else {
        line.style.left = `${g.pos}px`;
      }
      guidesLayer.appendChild(line);

      if (g.distance) {
        const badge = document.createElement('div');
        badge.className = 'distance-badge';
        badge.textContent = `${Math.round(g.distance)}px`;
        badge.style.left = `${g.badgeX}px`;
        badge.style.top = `${g.badgeY}px`;
        guidesLayer.appendChild(badge);
      }
    });
  }

  function clearGuides() {
    guidesLayer.innerHTML = '';
  }

  function screenToCanvas(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  }

  return {
    init,
    fitToScreen,
    setZoom,
    renderBackground,
    showGuides,
    clearGuides,
    screenToCanvas,
    getScale: () => scale,
    getPan: () => ({ x: panX, y: panY }),
    setCanvasResolution
  };
})();
