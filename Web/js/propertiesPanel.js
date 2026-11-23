/**
 * NoteWall - Contextual Properties Panel & Background Studio Controller
 */

window.NoteWallProperties = (function () {
  // Sidebar Tabs
  const tabPropertiesBtn = document.getElementById('tab-btn-properties');
  const tabBackgroundBtn = document.getElementById('tab-btn-background');
  const tabLayoutBtn = document.getElementById('tab-btn-layout');
  const tabLayersBtn = document.getElementById('tab-btn-layers');

  const tabPropertiesContent = document.getElementById('tab-content-properties');
  const tabBackgroundContent = document.getElementById('tab-content-background');
  const tabLayoutContent = document.getElementById('tab-content-layout');
  const tabLayersContent = document.getElementById('tab-content-layers');

  const noSelectionPrompt = document.getElementById('no-selection-prompt');
  const selectionInspector = document.getElementById('selection-inspector');

  // Note Property Input Elements
  const propTitle = document.getElementById('prop-title');
  const propBody = document.getElementById('prop-body');
  const propTag = document.getElementById('prop-tag');
  const propPriority = document.getElementById('prop-priority');
  const propTypeBadge = document.getElementById('prop-note-type-badge');

  const propPosX = document.getElementById('prop-pos-x');
  const propPosY = document.getElementById('prop-pos-y');
  const propWidth = document.getElementById('prop-width');
  const propHeight = document.getElementById('prop-height');
  const propRotation = document.getElementById('prop-rotation');

  const propColorHex = document.getElementById('prop-color-hex');
  const propColorPicker = document.getElementById('prop-color-picker');
  const propRadius = document.getElementById('prop-radius');
  const propOpacity = document.getElementById('prop-opacity');
  const propShadow = document.getElementById('prop-shadow');
  const propGlass = document.getElementById('prop-glass');

  const propFontFamily = document.getElementById('prop-font-family');
  const propFontSize = document.getElementById('prop-font-size');
  const propTextAlign = document.getElementById('prop-text-align');

  let activeNote = null;
  let currentLibraryCategory = 'all';

  function init() {
    setupTabSwitching();
    setupPropertyBindings();
    setupBackgroundControls();

    NoteWallState.subscribe((changeType, payload) => {
      if (changeType === 'selection_changed' || changeType === 'note_added') {
        syncWithSelection();
      } else if (changeType === 'note_updated') {
        if (selectionInspector && !selectionInspector.contains(document.activeElement)) {
          syncWithSelection();
        }
      }
      if (changeType === 'project_loaded' || changeType === 'undo' || changeType === 'redo') {
        syncWithSelection();
        syncBackgroundControls();
      }
    });

    syncBackgroundControls();
  }

  function setupTabSwitching() {
    const tabs = [
      { btn: tabPropertiesBtn, content: tabPropertiesContent },
      { btn: tabBackgroundBtn, content: tabBackgroundContent },
      { btn: tabLayoutBtn, content: tabLayoutContent },
      { btn: tabLayersBtn, content: tabLayersContent }
    ];

    tabs.forEach(({ btn, content }) => {
      btn?.addEventListener('click', () => {
        tabs.forEach(t => {
          t.btn?.classList.remove('active');
          if (t.content) t.content.style.display = 'none';
        });
        btn.classList.add('active');
        if (content) content.style.display = 'block';

        if (content === tabLayersContent && window.NoteWallLayers) {
          NoteWallLayers.render();
        }
        if (content === tabBackgroundContent) {
          syncBackgroundControls();
        }
      });
    });
  }

  // --- Note Properties Binding ---

  function syncWithSelection() {
    const selected = NoteWallState.getSelectedNotes();
    if (selected.length === 0) {
      activeNote = null;
      if (noSelectionPrompt) noSelectionPrompt.style.display = 'block';
      if (selectionInspector) selectionInspector.style.display = 'none';
      return;
    }

    activeNote = selected[0];
    if (noSelectionPrompt) noSelectionPrompt.style.display = 'none';
    if (selectionInspector) selectionInspector.style.display = 'block';

    if (propTitle) propTitle.value = activeNote.title || '';
    if (propBody) propBody.value = activeNote.body || (activeNote.checklist ? activeNote.checklist.map(c => (c.done ? '[x] ' : '[ ] ') + c.text).join('\n') : '');
    if (propTag) propTag.value = activeNote.tag || '';
    if (propPriority) propPriority.value = activeNote.priority || 'none';
    if (propTypeBadge) propTypeBadge.textContent = (activeNote.type || 'STANDARD').toUpperCase();

    if (propPosX) propPosX.value = Math.round(activeNote.x);
    if (propPosY) propPosY.value = Math.round(activeNote.y);
    if (propWidth) propWidth.value = Math.round(activeNote.width);
    if (propHeight) propHeight.value = Math.round(activeNote.height);
    if (propRotation) propRotation.value = activeNote.rotation || 0;

    const col = activeNote.color || '#27272a';
    if (propColorHex) propColorHex.value = col;
    if (propColorPicker) propColorPicker.value = sanitizeHex(col);

    if (propRadius) {
      propRadius.value = activeNote.borderRadius !== undefined ? activeNote.borderRadius : 12;
      const rv = document.getElementById('prop-radius-val');
      if (rv) rv.textContent = `${propRadius.value} px`;
    }
    if (propOpacity) {
      propOpacity.value = activeNote.opacity !== undefined ? activeNote.opacity : 100;
      const ov = document.getElementById('prop-opacity-val');
      if (ov) ov.textContent = `${propOpacity.value}%`;
    }
    if (propShadow) propShadow.value = activeNote.shadow || 'subtle';
    if (propGlass) propGlass.value = activeNote.glass || 'solid';

    if (propFontFamily) propFontFamily.value = activeNote.fontFamily || "'Inter', sans-serif";
    if (propFontSize) propFontSize.value = activeNote.fontSize || 13;
    if (propTextAlign) propTextAlign.value = activeNote.textAlign || 'left';

    // Photo Attachment section
    const secPhoto = document.getElementById('prop-section-photo');
    const photoPreview = document.getElementById('prop-photo-preview');
    const photoFit = document.getElementById('prop-photo-fit');

    if (activeNote.type === 'photo' || activeNote.image) {
      if (secPhoto) secPhoto.style.display = 'block';
      if (photoPreview) {
        if (activeNote.image) {
          photoPreview.style.display = 'block';
          photoPreview.style.backgroundImage = `url("${activeNote.image}")`;
          photoPreview.style.backgroundSize = activeNote.imageFit === 'contain' ? 'contain' : 'cover';
          photoPreview.style.backgroundRepeat = 'no-repeat';
        } else {
          photoPreview.style.display = 'none';
        }
      }
      if (photoFit) photoFit.value = activeNote.imageFit || 'cover';
    } else {
      if (secPhoto) secPhoto.style.display = 'none';
    }
  }

  function sanitizeHex(hex) {
    if (/^#[0-9A-F]{6}$/i.test(hex)) return hex;
    return '#27272a';
  }

  function setupPropertyBindings() {
    // Content
    propTitle?.addEventListener('input', (e) => {
      if (!activeNote) return;
      NoteWallState.updateNote(activeNote.id, { title: e.target.value });
    });

    propBody?.addEventListener('input', (e) => {
      if (!activeNote) return;
      NoteWallState.updateNote(activeNote.id, { body: e.target.value });
    });

    propTag?.addEventListener('input', (e) => {
      if (!activeNote) return;
      NoteWallState.updateNote(activeNote.id, { tag: e.target.value });
    });

    propPriority?.addEventListener('change', (e) => {
      if (!activeNote) return;
      NoteWallState.updateNote(activeNote.id, { priority: e.target.value });
    });

    // Geometry
    propPosX?.addEventListener('change', (e) => {
      if (!activeNote) return;
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) NoteWallState.updateNote(activeNote.id, { x: val }, true);
    });
    propPosY?.addEventListener('change', (e) => {
      if (!activeNote) return;
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) NoteWallState.updateNote(activeNote.id, { y: val }, true);
    });
    propWidth?.addEventListener('change', (e) => {
      if (!activeNote) return;
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) NoteWallState.updateNote(activeNote.id, { width: Math.max(120, val) }, true);
    });
    propHeight?.addEventListener('change', (e) => {
      if (!activeNote) return;
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) NoteWallState.updateNote(activeNote.id, { height: Math.max(80, val) }, true);
    });
    propRotation?.addEventListener('change', (e) => {
      if (!activeNote) return;
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) NoteWallState.updateNote(activeNote.id, { rotation: val }, true);
    });

    // Colors
    document.querySelectorAll('#note-color-presets .color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        if (!activeNote) return;
        const color = swatch.dataset.color;
        if (propColorHex) propColorHex.value = color;
        if (propColorPicker) propColorPicker.value = sanitizeHex(color);
        NoteWallState.updateNote(activeNote.id, { color }, true);
      });
    });

    propColorHex?.addEventListener('change', (e) => {
      if (!activeNote) return;
      const color = e.target.value;
      if (propColorPicker) propColorPicker.value = sanitizeHex(color);
      NoteWallState.updateNote(activeNote.id, { color }, true);
    });

    propColorPicker?.addEventListener('input', (e) => {
      if (!activeNote) return;
      const color = e.target.value;
      if (propColorHex) propColorHex.value = color;
      NoteWallState.updateNote(activeNote.id, { color }, false);
    });
    propColorPicker?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Note Color');
    });

    // Sliders
    propRadius?.addEventListener('input', (e) => {
      if (!activeNote) return;
      const val = Number(e.target.value);
      const rv = document.getElementById('prop-radius-val');
      if (rv) rv.textContent = `${val} px`;
      NoteWallState.updateNote(activeNote.id, { borderRadius: val }, false);
    });
    propRadius?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Corner Radius');
    });

    propOpacity?.addEventListener('input', (e) => {
      if (!activeNote) return;
      const val = Number(e.target.value);
      const ov = document.getElementById('prop-opacity-val');
      if (ov) ov.textContent = `${val}%`;
      NoteWallState.updateNote(activeNote.id, { opacity: val }, false);
    });
    propOpacity?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Opacity');
    });

    propShadow?.addEventListener('change', (e) => {
      if (!activeNote) return;
      NoteWallState.updateNote(activeNote.id, { shadow: e.target.value }, true);
    });

    propGlass?.addEventListener('change', (e) => {
      if (!activeNote) return;
      NoteWallState.updateNote(activeNote.id, { glass: e.target.value }, true);
    });

    // Typography
    propFontFamily?.addEventListener('change', (e) => {
      if (!activeNote) return;
      const selected = NoteWallState.getSelectedNotes();
      const targets = selected.length > 0 ? selected : [activeNote];
      targets.forEach(n => {
        NoteWallState.updateNote(n.id, { fontFamily: e.target.value }, false);
      });
      NoteWallState.pushHistory('Change Font Family');
    });

    function applyFontSizeChange(val, recordHistory = false) {
      if (!activeNote) return;
      const parsed = Math.max(8, Math.min(72, Math.round(val)));
      if (propFontSize) propFontSize.value = parsed;
      const selected = NoteWallState.getSelectedNotes();
      const targets = selected.length > 0 ? selected : [activeNote];
      targets.forEach(n => {
        NoteWallState.updateNote(n.id, { fontSize: parsed }, false);
      });
      if (recordHistory) {
        NoteWallState.pushHistory('Change Font Size');
      }
    }

    propFontSize?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (!isNaN(val) && val >= 6 && val <= 100) {
        applyFontSizeChange(val, false);
      }
    });

    propFontSize?.addEventListener('change', (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) val = activeNote ? (activeNote.fontSize || 13) : 13;
      applyFontSizeChange(val, true);
    });

    document.getElementById('btn-font-size-dec')?.addEventListener('click', () => {
      if (!activeNote) return;
      const current = activeNote.fontSize || 13;
      applyFontSizeChange(Math.max(8, current - 1), true);
    });

    document.getElementById('btn-font-size-inc')?.addEventListener('click', () => {
      if (!activeNote) return;
      const current = activeNote.fontSize || 13;
      applyFontSizeChange(Math.min(72, current + 1), true);
    });

    propTextAlign?.addEventListener('change', (e) => {
      if (!activeNote) return;
      const selected = NoteWallState.getSelectedNotes();
      const targets = selected.length > 0 ? selected : [activeNote];
      targets.forEach(n => {
        NoteWallState.updateNote(n.id, { textAlign: e.target.value }, false);
      });
      NoteWallState.pushHistory('Change Text Alignment');
    });

    // Note Actions
    document.getElementById('btn-prop-duplicate')?.addEventListener('click', () => {
      if (activeNote) NoteWallState.duplicateNote(activeNote.id);
    });
    document.getElementById('btn-prop-lock')?.addEventListener('click', () => {
      if (activeNote) NoteWallState.updateNote(activeNote.id, { isLocked: !activeNote.isLocked }, true);
    });
    document.getElementById('btn-prop-delete')?.addEventListener('click', () => {
      if (activeNote) NoteWallState.deleteNote(activeNote.id);
    });

    // Photo Attachment Bindings
    document.getElementById('btn-prop-choose-photo')?.addEventListener('click', () => {
      if (!activeNote) return;
      if (window.NoteWallNotes?.pickPhotoForNote) {
        window.NoteWallNotes.pickPhotoForNote(activeNote.id);
      }
    });

    document.getElementById('btn-prop-remove-photo')?.addEventListener('click', () => {
      if (!activeNote) return;
      NoteWallState.updateNote(activeNote.id, { image: null }, true);
      syncWithSelection();
      NoteWallNotes.renderAllNotes();
    });

    document.getElementById('prop-photo-fit')?.addEventListener('change', (e) => {
      if (!activeNote) return;
      NoteWallState.updateNote(activeNote.id, { imageFit: e.target.value }, true);
      syncWithSelection();
    });
  }

  // --- Background Studio Controls ---

  function setupBackgroundControls() {
    // 1. Quick Presets Chips
    document.querySelectorAll('.bg-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const preset = chip.dataset.preset;
        if (window.NoteWallBackground) {
          NoteWallBackground.applyPreset(preset);
          syncBackgroundControls();
        }
      });
    });

    // 2. Type Segmented Buttons
    const typeButtons = document.querySelectorAll('.bg-type-btn');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const proj = NoteWallState.getProject();
        if (!proj.background) proj.background = {};
        proj.background.type = type;
        NoteWallState.pushHistory(`Change Background Type: ${type}`);

        updateBackgroundTypePanels(type);
        if (window.NoteWallBackground) NoteWallBackground.render();
      });
    });

    // 3. Solid Color Controls
    document.querySelectorAll('#bg-solid-swatches .color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        setSolidColor(color, true);
      });
    });

    const bgColHex = document.getElementById('bg-color-hex');
    const bgColPicker = document.getElementById('bg-color-picker');

    bgColHex?.addEventListener('change', (e) => {
      setSolidColor(e.target.value, true);
    });

    bgColPicker?.addEventListener('input', (e) => {
      setSolidColor(e.target.value, false);
    });
    bgColPicker?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Background Color');
    });

    // RGB Channels
    const rgbR = document.getElementById('bg-rgb-r');
    const rgbG = document.getElementById('bg-rgb-g');
    const rgbB = document.getElementById('bg-rgb-b');

    [rgbR, rgbG, rgbB].forEach(el => {
      el?.addEventListener('input', () => {
        const r = Number(rgbR.value) || 0;
        const g = Number(rgbG.value) || 0;
        const b = Number(rgbB.value) || 0;
        const hex = NoteWallBackground.rgbToHex(r, g, b);
        setSolidColor(hex, false);
      });
      el?.addEventListener('change', () => {
        NoteWallState.pushHistory('Change Background Color');
      });
    });

    // HSL Channels
    const hslH = document.getElementById('bg-hsl-h');
    const hslS = document.getElementById('bg-hsl-s');
    const hslL = document.getElementById('bg-hsl-l');

    [hslH, hslS, hslL].forEach(el => {
      el?.addEventListener('input', () => {
        const h = Number(hslH.value) || 0;
        const s = Number(hslS.value) || 0;
        const l = Number(hslL.value) || 0;
        const rgb = NoteWallBackground.hslToRgb(h, s, l);
        const hex = NoteWallBackground.rgbToHex(rgb.r, rgb.g, rgb.b);
        setSolidColor(hex, false);
      });
      el?.addEventListener('change', () => {
        NoteWallState.pushHistory('Change Background Color');
      });
    });

    function setSolidColor(hex, recordHistory = false) {
      const proj = NoteWallState.getProject();
      if (!proj.background) proj.background = {};
      proj.background.type = 'solid';
      proj.background.color = hex;
      if (recordHistory) {
        NoteWallState.pushHistory('Change Background Color');
      }

      syncSolidColorInputs(hex);
      updateBackgroundTypePanels('solid');
      if (window.NoteWallBackground) {
        NoteWallBackground.updateSolidColor(hex);
      }
    }

    // 4. Gradient Studio Controls
    document.querySelectorAll('.grad-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const gName = chip.dataset.grad;
        const grad = NoteWallBackground.gradientPresets[gName];
        if (!grad) return;

        const proj = NoteWallState.getProject();
        if (!proj.background) proj.background = {};
        proj.background.type = 'gradient';
        proj.background.gradient = { ...grad };
        NoteWallState.pushHistory(`Gradient Preset: ${grad.name}`);

        syncGradientInputs(proj.background.gradient);
        updateBackgroundTypePanels('gradient');
        if (window.NoteWallBackground) NoteWallBackground.render();
      });
    });

    const gradType = document.getElementById('bg-grad-type');
    const gradAngle = document.getElementById('bg-grad-angle');
    const gradAngleSlider = document.getElementById('bg-grad-angle-slider');
    const gradC1 = document.getElementById('bg-grad-c1');
    const gradC1Hex = document.getElementById('bg-grad-c1-hex');
    const gradC2 = document.getElementById('bg-grad-c2');
    const gradC2Hex = document.getElementById('bg-grad-c2-hex');
    const gradC3 = document.getElementById('bg-grad-c3');
    const gradC3Hex = document.getElementById('bg-grad-c3-hex');
    const btnSwapGrad = document.getElementById('btn-swap-grad');
    const btnClearGradC3 = document.getElementById('btn-clear-grad-c3');

    function updateGradientFast() {
      const proj = NoteWallState.getProject();
      if (!proj.background) proj.background = {};
      proj.background.type = 'gradient';
      proj.background.gradient = {
        type: gradType.value,
        angle: Number(gradAngle.value),
        c1: gradC1Hex.value || gradC1.value,
        c2: gradC2Hex.value || gradC2.value,
        c3: gradC3Hex.value ? gradC3Hex.value : null
      };
      if (window.NoteWallBackground) NoteWallBackground.updateGradient();
    }

    gradType?.addEventListener('change', () => {
      updateGradientFast();
      NoteWallState.pushHistory('Change Gradient Type');
    });

    gradAngle?.addEventListener('change', (e) => {
      if (gradAngleSlider) gradAngleSlider.value = e.target.value;
      updateGradientFast();
      NoteWallState.pushHistory('Change Gradient Angle');
    });

    gradAngleSlider?.addEventListener('input', (e) => {
      if (gradAngle) gradAngle.value = e.target.value;
      updateGradientFast();
    });
    gradAngleSlider?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Gradient Angle');
    });

    gradC1?.addEventListener('input', (e) => {
      if (gradC1Hex) gradC1Hex.value = e.target.value;
      updateGradientFast();
    });
    gradC1?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Gradient Stop 1');
    });
    gradC1Hex?.addEventListener('change', (e) => {
      if (gradC1) gradC1.value = sanitizeHex(e.target.value);
      updateGradientFast();
      NoteWallState.pushHistory('Change Gradient Stop 1');
    });

    gradC2?.addEventListener('input', (e) => {
      if (gradC2Hex) gradC2Hex.value = e.target.value;
      updateGradientFast();
    });
    gradC2?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Gradient Stop 2');
    });
    gradC2Hex?.addEventListener('change', (e) => {
      if (gradC2) gradC2.value = sanitizeHex(e.target.value);
      updateGradientFast();
      NoteWallState.pushHistory('Change Gradient Stop 2');
    });

    gradC3?.addEventListener('input', (e) => {
      if (gradC3Hex) gradC3Hex.value = e.target.value;
      updateGradientFast();
    });
    gradC3?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Gradient Stop 3');
    });
    gradC3Hex?.addEventListener('change', (e) => {
      if (gradC3) gradC3.value = sanitizeHex(e.target.value);
      updateGradientFast();
      NoteWallState.pushHistory('Change Gradient Stop 3');
    });

    btnClearGradC3?.addEventListener('click', () => {
      if (gradC3Hex) gradC3Hex.value = '';
      updateGradientFast();
      NoteWallState.pushHistory('Clear Gradient Stop 3');
    });

    btnSwapGrad?.addEventListener('click', () => {
      const temp = gradC1Hex.value;
      gradC1Hex.value = gradC2Hex.value;
      gradC2Hex.value = temp;
      if (gradC1) gradC1.value = sanitizeHex(gradC1Hex.value);
      if (gradC2) gradC2.value = sanitizeHex(gradC2Hex.value);
      updateGradient();
      NoteWallState.pushHistory('Swap Gradient Stops');
    });

    // 5. Custom Image Controls
    const btnChooseImage = document.getElementById('btn-choose-image');
    const imageFileInput = document.getElementById('bg-image-file');
    const imageFitSelect = document.getElementById('bg-image-fit');

    const imgPanX = document.getElementById('bg-img-pan-x');
    const imgPanY = document.getElementById('bg-img-pan-y');
    const imgScale = document.getElementById('bg-img-scale');
    const imgRotation = document.getElementById('bg-img-rotation');
    const btnImgResetPos = document.getElementById('btn-img-reset-pos');

    btnChooseImage?.addEventListener('click', () => {
      imageFileInput?.click();
    });

    imageFileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const proj = NoteWallState.getProject();
        if (!proj.background) proj.background = {};
        proj.background.type = 'image';
        proj.background.image = event.target.result;
        proj.background.imageFit = imageFitSelect?.value || 'cover';
        proj.background.imageOffsetX = 0;
        proj.background.imageOffsetY = 0;
        proj.background.imageScale = 1.0;
        proj.background.imageRotation = 0;

        NoteWallState.pushHistory('Choose Background Image');
        updateBackgroundTypePanels('image');
        if (window.NoteWallBackground) NoteWallBackground.render();
      };
      reader.readAsDataURL(file);
    });

    imageFitSelect?.addEventListener('change', (e) => {
      const proj = NoteWallState.getProject();
      if (!proj.background) proj.background = {};
      proj.background.imageFit = e.target.value;
      NoteWallState.pushHistory('Change Image Fit');
      if (window.NoteWallBackground) NoteWallBackground.render();
    });

    function updateImageTransforms() {
      const proj = NoteWallState.getProject();
      if (!proj.background) proj.background = {};
      proj.background.imageOffsetX = Number(imgPanX.value) || 0;
      proj.background.imageOffsetY = Number(imgPanY.value) || 0;
      proj.background.imageScale = (Number(imgScale.value) || 100) / 100;
      proj.background.imageRotation = Number(imgRotation.value) || 0;

      const scaleBadge = document.getElementById('bg-img-scale-val');
      if (scaleBadge) scaleBadge.textContent = `${imgScale.value}%`;

      const rotBadge = document.getElementById('bg-img-rot-val');
      if (rotBadge) rotBadge.textContent = `${imgRotation.value}°`;

      if (window.NoteWallBackground) NoteWallBackground.updateTransforms();
    }

    [imgPanX, imgPanY, imgScale, imgRotation].forEach(el => {
      el?.addEventListener('input', updateImageTransforms);
      el?.addEventListener('change', () => {
        NoteWallState.pushHistory('Adjust Background Image');
      });
    });

    btnImgResetPos?.addEventListener('click', () => {
      if (window.NoteWallBackground) NoteWallBackground.resetPosition();
    });

    // 6. Overlays
    const darkOverlaySlider = document.getElementById('bg-dark-overlay');
    const darkOverlayVal = document.getElementById('bg-dark-overlay-val');

    darkOverlaySlider?.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (darkOverlayVal) darkOverlayVal.textContent = `${val}%`;

      const proj = NoteWallState.getProject();
      if (!proj.background) proj.background = {};
      proj.background.overlayOpacity = val;
      proj.background.overlayColor = '#000000';
      if (window.NoteWallBackground) NoteWallBackground.updateOverlay();
    });
    darkOverlaySlider?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Dark Overlay');
    });

    const colorOverlaySlider = document.getElementById('bg-color-overlay-opacity');
    const colorOverlayVal = document.getElementById('bg-color-overlay-val');
    const colorOverlayPicker = document.getElementById('bg-color-overlay-picker');

    colorOverlaySlider?.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (colorOverlayVal) colorOverlayVal.textContent = `${val}%`;

      const proj = NoteWallState.getProject();
      if (!proj.background) proj.background = {};
      proj.background.overlayOpacity = val;
      proj.background.overlayColor = colorOverlayPicker.value;
      if (window.NoteWallBackground) NoteWallBackground.updateOverlay();
    });
    colorOverlaySlider?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Color Overlay');
    });

    colorOverlayPicker?.addEventListener('input', (e) => {
      const proj = NoteWallState.getProject();
      if (!proj.background) proj.background = {};
      proj.background.overlayColor = e.target.value;
      if (window.NoteWallBackground) NoteWallBackground.updateOverlay();
    });
    colorOverlayPicker?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Overlay Color');
    });

    // 7. Background Blur
    const blurSlider = document.getElementById('bg-blur-slider');
    const blurVal = document.getElementById('bg-blur-val');

    blurSlider?.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      if (blurVal) blurVal.textContent = `${val} px`;

      const proj = NoteWallState.getProject();
      if (!proj.background) proj.background = {};
      proj.background.blur = val;
      if (window.NoteWallBackground) NoteWallBackground.updateFilters();
    });
    blurSlider?.addEventListener('change', () => {
      NoteWallState.pushHistory('Change Background Blur');
    });

    // 8. Effects
    const effBrightness = document.getElementById('bg-effect-brightness');
    const effContrast = document.getElementById('bg-effect-contrast');
    const effSaturation = document.getElementById('bg-effect-saturation');
    const effVignette = document.getElementById('bg-effect-vignette');
    const effGrayscale = document.getElementById('bg-effect-grayscale');
    const effSepia = document.getElementById('bg-effect-sepia');
    const btnResetEffects = document.getElementById('btn-reset-effects');

    function updateEffects() {
      const proj = NoteWallState.getProject();
      if (!proj.background) proj.background = {};
      proj.background.brightness = Number(effBrightness.value);
      proj.background.contrast = Number(effContrast.value);
      proj.background.saturation = Number(effSaturation.value);
      proj.background.vignette = Number(effVignette.value);
      proj.background.grayscale = Number(effGrayscale.value);
      proj.background.sepia = Number(effSepia.value);

      const bVal = document.getElementById('bg-brightness-val');
      if (bVal) bVal.textContent = `${effBrightness.value}%`;
      const cVal = document.getElementById('bg-contrast-val');
      if (cVal) cVal.textContent = `${effContrast.value}%`;
      const sVal = document.getElementById('bg-saturation-val');
      if (sVal) sVal.textContent = `${effSaturation.value}%`;
      const vVal = document.getElementById('bg-vignette-val');
      if (vVal) vVal.textContent = `${effVignette.value}%`;
      const gVal = document.getElementById('bg-grayscale-val');
      if (gVal) gVal.textContent = `${effGrayscale.value}%`;
      const sepVal = document.getElementById('bg-sepia-val');
      if (sepVal) sepVal.textContent = `${effSepia.value}%`;

      if (window.NoteWallBackground) {
        NoteWallBackground.updateFilters();
        NoteWallBackground.updateOverlay();
      }
    }

    [effBrightness, effContrast, effSaturation, effVignette, effGrayscale, effSepia].forEach(el => {
      el?.addEventListener('input', updateEffects);
      el?.addEventListener('change', () => {
        NoteWallState.pushHistory('Change Background Effects');
      });
    });

    btnResetEffects?.addEventListener('click', () => {
      if (window.NoteWallBackground) NoteWallBackground.resetEffects();
    });

    // 9. Built-in Vector Library Category Filtering & Grid
    setupLibraryGrid();

    // 10. Actions
    document.getElementById('btn-reset-background')?.addEventListener('click', () => {
      if (window.NoteWallBackground) NoteWallBackground.resetBackground();
    });

    document.getElementById('btn-remove-background')?.addEventListener('click', () => {
      if (window.NoteWallBackground) NoteWallBackground.removeBackground();
    });
  }

  function setupLibraryGrid() {
    const catButtons = document.querySelectorAll('.lib-cat-btn');
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLibraryCategory = btn.dataset.cat;
        renderLibraryCards();
      });
    });

    renderLibraryCards();
  }

  function renderLibraryCards() {
    const grid = document.getElementById('bg-library-grid');
    if (!grid || !window.NoteWallBackground) return;

    const list = NoteWallBackground.builtins.filter(b => {
      if (currentLibraryCategory === 'all') return true;
      return b.cat === currentLibraryCategory;
    });

    const proj = NoteWallState.getProject();
    const currentStyle = proj.background?.style || 'minimal-black';

    grid.innerHTML = '';
    list.forEach(item => {
      const card = document.createElement('div');
      card.className = `bg-library-card ${currentStyle === item.id ? 'active' : ''}`;
      card.innerHTML = `
        <div class="bg-library-thumb" id="thumb-${item.id}">${item.thumb}</div>
        <div class="bg-library-title">${item.name}</div>
        <div class="bg-library-desc">${item.desc}</div>
      `;

      card.addEventListener('click', () => {
        proj.background.type = 'builtin';
        proj.background.style = item.id;
        NoteWallState.pushHistory(`Built-in Wallpaper: ${item.name}`);

        document.querySelectorAll('.bg-library-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        updateBackgroundTypePanels('builtin');
        if (window.NoteWallBackground) NoteWallBackground.render();
      });

      grid.appendChild(card);
    });
  }

  function updateBackgroundTypePanels(type) {
    // Update segment buttons
    document.querySelectorAll('.bg-type-btn').forEach(btn => {
      if (btn.dataset.type === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle panels
    const pSolid = document.getElementById('bg-panel-solid');
    const pGrad = document.getElementById('bg-panel-gradient');
    const pImage = document.getElementById('bg-panel-image');
    const pLib = document.getElementById('bg-panel-library');
    const pTrans = document.getElementById('bg-panel-transparent');

    if (pSolid) pSolid.style.display = type === 'solid' ? 'block' : 'none';
    if (pGrad) pGrad.style.display = type === 'gradient' ? 'block' : 'none';
    if (pImage) pImage.style.display = type === 'image' ? 'block' : 'none';
    if (pLib) pLib.style.display = type === 'builtin' ? 'block' : 'none';
    if (pTrans) pTrans.style.display = type === 'transparent' ? 'block' : 'none';
  }

  function syncSolidColorInputs(hex) {
    const bgColHex = document.getElementById('bg-color-hex');
    const bgColPicker = document.getElementById('bg-color-picker');
    const rgbR = document.getElementById('bg-rgb-r');
    const rgbG = document.getElementById('bg-rgb-g');
    const rgbB = document.getElementById('bg-rgb-b');
    const hslH = document.getElementById('bg-hsl-h');
    const hslS = document.getElementById('bg-hsl-s');
    const hslL = document.getElementById('bg-hsl-l');

    if (bgColHex) bgColHex.value = hex;
    if (bgColPicker) bgColPicker.value = sanitizeHex(hex);

    if (window.NoteWallBackground) {
      const rgb = NoteWallBackground.hexToRgb(hex);
      if (rgbR) rgbR.value = rgb.r;
      if (rgbG) rgbG.value = rgb.g;
      if (rgbB) rgbB.value = rgb.b;

      const hsl = NoteWallBackground.rgbToHsl(rgb.r, rgb.g, rgb.b);
      if (hslH) hslH.value = hsl.h;
      if (hslS) hslS.value = hsl.s;
      if (hslL) hslL.value = hsl.l;
    }
  }

  function syncGradientInputs(grad) {
    if (!grad) return;
    const gradType = document.getElementById('bg-grad-type');
    const gradAngle = document.getElementById('bg-grad-angle');
    const gradAngleSlider = document.getElementById('bg-grad-angle-slider');
    const gradC1 = document.getElementById('bg-grad-c1');
    const gradC1Hex = document.getElementById('bg-grad-c1-hex');
    const gradC2 = document.getElementById('bg-grad-c2');
    const gradC2Hex = document.getElementById('bg-grad-c2-hex');
    const gradC3 = document.getElementById('bg-grad-c3');
    const gradC3Hex = document.getElementById('bg-grad-c3-hex');

    const c1 = grad.c1 || grad.color1 || '#000000';
    const c2 = grad.c2 || grad.color2 || '#0f172a';
    const c3 = grad.c3 || '';

    if (gradType) gradType.value = grad.type || 'linear';
    if (gradAngle) gradAngle.value = grad.angle !== undefined ? grad.angle : 135;
    if (gradAngleSlider) gradAngleSlider.value = gradAngle ? gradAngle.value : 135;

    if (gradC1) gradC1.value = sanitizeHex(c1);
    if (gradC1Hex) gradC1Hex.value = c1;

    if (gradC2) gradC2.value = sanitizeHex(c2);
    if (gradC2Hex) gradC2Hex.value = c2;

    if (gradC3) gradC3.value = c3 ? sanitizeHex(c3) : '#000000';
    if (gradC3Hex) gradC3Hex.value = c3 || '';
  }

  function syncBackgroundControls() {
    const proj = NoteWallState.getProject();
    const bg = proj.background || {};

    const type = bg.type || 'builtin';
    updateBackgroundTypePanels(type);

    if (bg.color) syncSolidColorInputs(bg.color);
    if (bg.gradient) syncGradientInputs(bg.gradient);

    // Image fit & transforms
    const imageFitSelect = document.getElementById('bg-image-fit');
    if (imageFitSelect) imageFitSelect.value = bg.imageFit || 'cover';

    const imgPanX = document.getElementById('bg-img-pan-x');
    const imgPanY = document.getElementById('bg-img-pan-y');
    const imgScale = document.getElementById('bg-img-scale');
    const imgRotation = document.getElementById('bg-img-rotation');

    if (imgPanX) imgPanX.value = bg.imageOffsetX || 0;
    if (imgPanY) imgPanY.value = bg.imageOffsetY || 0;
    if (imgScale) {
      imgScale.value = Math.round((bg.imageScale !== undefined ? bg.imageScale : 1.0) * 100);
      const sb = document.getElementById('bg-img-scale-val');
      if (sb) sb.textContent = `${imgScale.value}%`;
    }
    if (imgRotation) {
      imgRotation.value = bg.imageRotation || 0;
      const rb = document.getElementById('bg-img-rot-val');
      if (rb) rb.textContent = `${imgRotation.value}°`;
    }

    // Overlays
    const darkOverlaySlider = document.getElementById('bg-dark-overlay');
    const darkOverlayVal = document.getElementById('bg-dark-overlay-val');
    const ovOpacity = bg.overlayOpacity !== undefined ? bg.overlayOpacity : 0;
    if (darkOverlaySlider) darkOverlaySlider.value = ovOpacity;
    if (darkOverlayVal) darkOverlayVal.textContent = `${ovOpacity}%`;

    const colorOverlaySlider = document.getElementById('bg-color-overlay-opacity');
    const colorOverlayVal = document.getElementById('bg-color-overlay-val');
    const colorOverlayPicker = document.getElementById('bg-color-overlay-picker');
    if (colorOverlaySlider) colorOverlaySlider.value = ovOpacity;
    if (colorOverlayVal) colorOverlayVal.textContent = `${ovOpacity}%`;
    if (colorOverlayPicker) colorOverlayPicker.value = sanitizeHex(bg.overlayColor || '#000000');

    // Blur
    const blurSlider = document.getElementById('bg-blur-slider');
    const blurVal = document.getElementById('bg-blur-val');
    const b = bg.blur || 0;
    if (blurSlider) blurSlider.value = b;
    if (blurVal) blurVal.textContent = `${b} px`;

    // Effects
    const effBrightness = document.getElementById('bg-effect-brightness');
    const effContrast = document.getElementById('bg-effect-contrast');
    const effSaturation = document.getElementById('bg-effect-saturation');
    const effVignette = document.getElementById('bg-effect-vignette');
    const effGrayscale = document.getElementById('bg-effect-grayscale');
    const effSepia = document.getElementById('bg-effect-sepia');

    if (effBrightness) {
      effBrightness.value = bg.brightness !== undefined ? bg.brightness : 100;
      const el = document.getElementById('bg-brightness-val');
      if (el) el.textContent = `${effBrightness.value}%`;
    }
    if (effContrast) {
      effContrast.value = bg.contrast !== undefined ? bg.contrast : 100;
      const el = document.getElementById('bg-contrast-val');
      if (el) el.textContent = `${effContrast.value}%`;
    }
    if (effSaturation) {
      effSaturation.value = bg.saturation !== undefined ? bg.saturation : 100;
      const el = document.getElementById('bg-saturation-val');
      if (el) el.textContent = `${effSaturation.value}%`;
    }
    if (effVignette) {
      effVignette.value = bg.vignette || 0;
      const el = document.getElementById('bg-vignette-val');
      if (el) el.textContent = `${effVignette.value}%`;
    }
    if (effGrayscale) {
      effGrayscale.value = bg.grayscale || 0;
      const el = document.getElementById('bg-grayscale-val');
      if (el) el.textContent = `${effGrayscale.value}%`;
    }
    if (effSepia) {
      effSepia.value = bg.sepia || 0;
      const el = document.getElementById('bg-sepia-val');
      if (el) el.textContent = `${effSepia.value}%`;
    }

    renderLibraryCards();
  }

  return {
    init,
    syncBackgroundControls
  };
})();
