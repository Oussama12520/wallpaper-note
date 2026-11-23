/**
 * NoteWall - Main Coordinator & Application Controller
 */

window.NoteWallApp = (function () {
  let autosaveTimer = null;

  async function init() {
    // 1. Startup Experience Animation (OSAMA -> NoteWall)
    runStartupAnimation();

    // 2. Initialize Sub-modules
    NoteWallBackground.init();
    NoteWallCanvas.init();
    NoteWallNotes.init();
    NoteWallProperties.init();
    NoteWallLayers.init();
    NoteWallLayout.init();
    NoteWallTemplates.init();
    NoteWallPreview.init();

    // 3. Setup Topbar & Toolbar Actions
    setupTopbarEvents();
    setupToolbarEvents();
    setupModals();
    setupKeyboardShortcuts();
    setupDragAndDropPhotos();
    setupNativeBridgeListeners();

    // 4. Load Multi-monitor Displays & Autosave Project
    await loadDisplays();
    await loadSavedProjectOrDefault();

    // 5. Setup Autosave interval (every 15 seconds)
    autosaveTimer = setInterval(performAutosave, 15000);
  }

  // Startup animation
  function runStartupAnimation() {
    const overlay = document.getElementById('startup-overlay');
    if (!overlay) return;

    function dismiss() {
      overlay.classList.add('fade-out');
      overlay.style.pointerEvents = 'none';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 350);
    }

    setTimeout(dismiss, 700);

    overlay.addEventListener('click', dismiss);
    window.addEventListener('keydown', dismiss, { once: true });
  }

  // Load connected displays for multi-monitor support
  async function loadDisplays() {
    try {
      const displays = await NoteWallBridge.call('getDisplays');
      const tabsContainer = document.getElementById('monitor-tabs');
      if (!tabsContainer) return;

      if (displays && displays.length > 0) {
        NoteWallState.displays = displays;
        tabsContainer.innerHTML = '';

        displays.forEach((disp, idx) => {
          const w = disp.width || disp.Width || 1920;
          const h = disp.height || disp.Height || 1080;
          const isPrimary = disp.isPrimary !== undefined ? disp.isPrimary : (disp.IsPrimary !== undefined ? disp.IsPrimary : (idx === 0));

          const btn = document.createElement('button');
          btn.className = `monitor-tab-btn ${idx === 0 ? 'active' : ''}`;
          btn.dataset.index = idx;
          btn.textContent = `Monitor ${idx + 1}${isPrimary ? ' (Primary)' : ''}`;

          btn.addEventListener('click', () => {
            document.querySelectorAll('.monitor-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            NoteWallState.activeDisplayIndex = idx;
            // Adjust canvas resolution to chosen monitor
            NoteWallCanvas.setCanvasResolution(w, h);
            showToast(`Switched to Monitor ${idx + 1} (${w}×${h})`);
          });

          tabsContainer.appendChild(btn);
        });
      }
    } catch (e) {
      console.warn('Could not detect displays:', e);
    }
  }

  // Topbar events
  function setupTopbarEvents() {
    const projectNameInput = document.getElementById('project-name-input');
    projectNameInput?.addEventListener('input', (e) => {
      const proj = NoteWallState.getProject();
      proj.name = e.target.value || 'Workspace';
    });

    document.getElementById('btn-undo')?.addEventListener('click', () => NoteWallState.undo());
    document.getElementById('btn-redo')?.addEventListener('click', () => NoteWallState.redo());

    document.getElementById('btn-reset-example')?.addEventListener('click', () => {
      const defaultProj = NoteWallTemplates.getDefaultProject();
      NoteWallState.setProject(defaultProj, true);
      const nameInput = document.getElementById('project-name-input');
      if (nameInput) nameInput.value = defaultProj.name;
      NoteWallCanvas.renderBackground();
      NoteWallNotes.renderAllNotes();
      NoteWallCanvas.fitToScreen();
      showToast('Reset to "My Desktop" default project', 'success');
    });

    document.getElementById('btn-welcome-start')?.addEventListener('click', () => {
      closeModal('modal-welcome');
    });

    document.getElementById('btn-welcome-templates')?.addEventListener('click', () => {
      closeModal('modal-welcome');
      openModal('modal-templates');
    });

    document.getElementById('btn-templates')?.addEventListener('click', () => {
      openModal('modal-templates');
    });

    document.getElementById('btn-set-wallpaper')?.addEventListener('click', () => {
      NoteWallExporter.applyAsWallpaper();
    });

    document.getElementById('btn-export-png')?.addEventListener('click', () => {
      openModal('modal-export');
    });

    document.getElementById('btn-confirm-export')?.addEventListener('click', () => {
      const resVal = document.getElementById('export-res-select')?.value;
      let multiplier = 1.0;
      if (resVal === '2x') multiplier = 2.0;
      else if (resVal === '2k') {
        const curW = NoteWallState.getProject().width;
        multiplier = 2560 / curW;
      } else if (resVal === '4k') {
        const curW = NoteWallState.getProject().width;
        multiplier = 3840 / curW;
      }
      closeModal('modal-export');
      NoteWallExporter.exportPng(multiplier);
    });

    document.getElementById('btn-history')?.addEventListener('click', openHistoryModal);
    document.getElementById('btn-settings')?.addEventListener('click', () => openModal('modal-settings'));
    document.getElementById('btn-search')?.addEventListener('click', () => openModal('modal-search'));
  }

  // Left Toolbar events
  function setupToolbarEvents() {
    const toolAddNote = document.getElementById('tool-add-note');
    const flyout = document.getElementById('note-flyout');

    toolAddNote?.addEventListener('click', (e) => {
      e.stopPropagation();
      flyout.classList.toggle('visible');
    });

    // Close flyout on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#tool-add-note') && !e.target.closest('#note-flyout')) {
        flyout?.classList.remove('visible');
      }
    });

    // Flyout item click
    document.querySelectorAll('.flyout-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        flyout?.classList.remove('visible');
        const type = item.dataset.type || 'standard';
        if (type === 'photo') {
          promptAddPhotoNote();
        } else {
          createDefaultNote(type);
        }
      });
    });

    // Text tool
    document.getElementById('tool-text')?.addEventListener('click', () => {
      createDefaultNote('standard');
    });

    // Shape / Card
    document.getElementById('tool-shape')?.addEventListener('click', () => {
      createDefaultNote('standard', { color: '#18181b', title: 'CONTAINER CARD', body: '' });
    });

    // Photo Note from Device
    document.getElementById('tool-image')?.addEventListener('click', () => {
      promptAddPhotoNote();
    });

    // Grouping
    document.getElementById('tool-group')?.addEventListener('click', groupSelectedNotes);

    // Lock toggle
    document.getElementById('tool-lock')?.addEventListener('click', () => {
      const selected = NoteWallState.getSelectedNotes();
      if (selected.length > 0) {
        const lockState = !selected[0].isLocked;
        selected.forEach(n => n.isLocked = lockState);
        NoteWallState.pushHistory(lockState ? 'Lock Notes' : 'Unlock Notes');
        NoteWallNotes.renderAllNotes();
      }
    });

    // Delete
    document.getElementById('tool-delete')?.addEventListener('click', () => {
      const selected = NoteWallState.getSelectedNotes();
      if (selected.length > 0) {
        selected.forEach(n => NoteWallState.deleteNote(n.id));
      }
    });
  }

  function createDefaultNote(type = 'standard', overrides = {}) {
    const proj = NoteWallState.getProject();
    const count = proj.notes.length;

    // Stagger positions
    const x = 120 + (count % 6) * 40;
    const y = 120 + (count % 5) * 40;

    let defaults = {
      type,
      title: type.toUpperCase(),
      x,
      y,
      width: 280,
      height: 180,
      color: '#27272a'
    };

    switch (type) {
      case 'checklist':
        defaults.title = 'DAILY TASKS';
        defaults.checklist = [
          { text: 'Finish project requirements', done: false },
          { text: 'Review code changes', done: false },
          { text: 'Test wallpaper rendering', done: false }
        ];
        defaults.color = '#18181b';
        defaults.height = 200;
        break;
      case 'reminder':
        defaults.title = 'REMINDER';
        defaults.body = 'Complete urgent submission';
        defaults.date = 'Today, 6:00 PM';
        defaults.color = '#311010';
        defaults.priority = 'critical';
        defaults.height = 140;
        break;
      case 'quote':
        defaults.title = 'QUOTE';
        defaults.body = 'Focus is saying no to 1,000 other things.';
        defaults.tag = 'Steve Jobs';
        defaults.color = '#1c1917';
        defaults.height = 160;
        break;
      case 'link':
        defaults.title = 'GITHUB REPO';
        defaults.body = 'Main branch repository';
        defaults.url = 'https://github.com';
        defaults.color = '#18181b';
        defaults.height = 140;
        break;
      case 'code':
        defaults.title = 'TERMINAL';
        defaults.body = 'npm run dev\ngit status';
        defaults.color = '#0f172a';
        defaults.height = 150;
        break;
      case 'photo':
        defaults.title = overrides.title || 'PHOTO';
        defaults.body = overrides.body || '';
        defaults.width = overrides.width || 320;
        defaults.height = overrides.height || 260;
        defaults.color = overrides.color || '#18181b';
        defaults.image = overrides.image || null;
        defaults.imageFit = overrides.imageFit || 'cover';
        break;
      default:
        defaults.title = 'TODAY';
        defaults.body = 'Double click to edit or write notes freely.';
        break;
    }

    const note = NoteWallState.addNote({ ...defaults, ...overrides });
    showToast(`Added ${type} note`);
    return note;
  }

  function promptAddPhotoNote(screenCoords = null) {
    const fileInput = document.getElementById('note-photo-file-input') || document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        createPhotoNoteFromFile(file, screenCoords);
      }
      fileInput.value = '';
    };
    fileInput.click();
  }

  function createPhotoNoteFromFile(file, screenCoords = null) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target.result;
      const img = new Image();
      img.onload = () => {
        let w = 320;
        let h = Math.round(w * (img.naturalHeight / img.naturalWidth)) + 40;
        if (h > 460) {
          h = 460;
          w = Math.round((h - 40) * (img.naturalWidth / img.naturalHeight));
        }

        let x, y;
        if (screenCoords && NoteWallCanvas.screenToCanvas) {
          const c = NoteWallCanvas.screenToCanvas(screenCoords.x, screenCoords.y);
          x = Math.round(c.x);
          y = Math.round(c.y);
        } else {
          const proj = NoteWallState.getProject();
          const count = proj.notes.length;
          x = 120 + (count % 6) * 40;
          y = 120 + (count % 5) * 40;
        }

        const rawName = file.name ? file.name.replace(/\.[^/.]+$/, '').toUpperCase() : 'PHOTO';
        createDefaultNote('photo', {
          title: rawName,
          image: dataUrl,
          imageFit: 'cover',
          x: Math.max(20, x),
          y: Math.max(20, y),
          width: Math.max(220, w),
          height: Math.max(180, h)
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function setupDragAndDropPhotos() {
    const viewport = document.getElementById('canvas-viewport');
    if (!viewport) return;

    viewport.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      viewport.classList.add('drag-over-active');
    });

    viewport.addEventListener('dragleave', (e) => {
      if (!e.relatedTarget || !viewport.contains(e.relatedTarget)) {
        viewport.classList.remove('drag-over-active');
      }
    });

    viewport.addEventListener('drop', (e) => {
      e.preventDefault();
      viewport.classList.remove('drag-over-active');

      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) {
        files.forEach((file, idx) => {
          createPhotoNoteFromFile(file, { x: e.clientX + (idx * 24), y: e.clientY + (idx * 24) });
        });
      }
    });

    // Clipboard paste support (Ctrl+V)
    window.addEventListener('paste', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            createPhotoNoteFromFile(file);
          }
          break;
        }
      }
    });
  }

  function groupSelectedNotes() {
    const selected = NoteWallState.getSelectedNotes();
    if (selected.length < 2) {
      showToast('Select at least 2 notes with Ctrl+Click to group');
      return;
    }
    NoteWallState.pushHistory('Group Notes');
    const groupId = 'group_' + Date.now();
    selected.forEach(n => n.groupId = groupId);
    showToast(`Grouped ${selected.length} notes`);
  }

  // Keyboard Shortcuts
  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept when user is typing in form controls
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) NoteWallState.redo();
          else NoteWallState.undo();
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          saveProjectManually();
        } else if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          const selected = NoteWallState.getSelectedNote();
          if (selected) NoteWallState.duplicateNote(selected.id);
        } else if (e.key === 'g' || e.key === 'G') {
          e.preventDefault();
          groupSelectedNotes();
        } else if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          const selected = NoteWallState.getSelectedNotes();
          if (selected.length > 0) {
            const lock = !selected[0].isLocked;
            selected.forEach(n => n.isLocked = lock);
            NoteWallNotes.renderAllNotes();
          }
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          NoteWallPreview.enterFullscreenPreview();
        } else if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          openModal('modal-export');
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          openModal('modal-search');
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = NoteWallState.getSelectedNotes();
        if (selected.length > 0) {
          e.preventDefault();
          selected.forEach(n => NoteWallState.deleteNote(n.id));
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const selected = NoteWallState.getSelectedNotes();
        if (selected.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

          selected.forEach(n => {
            n.x += dx;
            n.y += dy;
          });
          NoteWallNotes.renderAllNotes();
        }
      } else if (e.key === 'v' || e.key === 'V') {
        document.getElementById('tool-select')?.click();
      } else if (e.key === 'n' || e.key === 'N') {
        createDefaultNote('standard');
      } else if (e.key === 'i' || e.key === 'I') {
        promptAddPhotoNote();
      }
    });
  }

  // Modals management
  function setupModals() {
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal(btn.dataset.close);
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
        }
      });
    });

    // Global Search setup
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results-list');

    searchInput?.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      if (!searchResults) return;
      searchResults.innerHTML = '';

      if (!query) return;

      const proj = NoteWallState.getProject();
      const matches = proj.notes.filter(n =>
        (n.title && n.title.toLowerCase().includes(query)) ||
        (n.body && n.body.toLowerCase().includes(query)) ||
        (n.tag && n.tag.toLowerCase().includes(query)) ||
        (n.date && n.date.toLowerCase().includes(query))
      );

      if (matches.length === 0) {
        searchResults.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">No matching notes found</div>';
        return;
      }

      matches.forEach(note => {
        const row = document.createElement('div');
        row.style.cssText = 'padding: 8px 12px; background: var(--bg-surface-elevated); border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;';
        row.innerHTML = `
          <div>
            <div style="font-weight: 600; font-size: 12px;">${note.title || 'Untitled'}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${note.body ? note.body.substring(0, 40) + '...' : ''}</div>
          </div>
          <span style="font-size: 10px; color: var(--accent-primary);">${note.tag || ''}</span>
        `;

        row.addEventListener('click', () => {
          closeModal('modal-search');
          NoteWallState.selectNote(note.id, false);
          // Highlight card animation
          const card = document.getElementById(`note-${note.id}`);
          if (card) {
            card.style.outline = '3px solid #f43f5e';
            setTimeout(() => card.style.outline = '', 1800);
          }
        });

        searchResults.appendChild(row);
      });
    });
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
    if (id === 'modal-search') {
      setTimeout(() => document.getElementById('search-input')?.focus(), 50);
    }
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
  }

  // Wallpaper History Modal
  async function openHistoryModal() {
    try {
      const history = await NoteWallBridge.call('getWallpaperHistory');
      const container = document.getElementById('history-items-container');
      if (!container) return;
      container.innerHTML = '';

      if (!history || history.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">No wallpaper history yet. Click "Set Wallpaper" to apply your first creation!</div>';
      } else {
        history.forEach(item => {
          const row = document.createElement('div');
          row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: 8px;';
          row.innerHTML = `
            <div>
              <div style="font-weight: 600; font-size: 13px;">${item.ProjectName || item.projectName || 'Workspace'}</div>
              <div style="font-size: 11px; color: var(--text-muted);">${item.AppliedAt || item.appliedAt || ''} • ${(item.Width || item.width || 1920)}×${(item.Height || item.height || 1080)} • ${item.MonitorName || item.monitorName || 'All Displays'}</div>
            </div>
            <button class="btn-secondary" style="font-size: 11px; padding: 4px 10px;">Restore Wallpaper</button>
          `;

          const restoreBtn = row.querySelector('button');
          restoreBtn.addEventListener('click', async () => {
            const imgPath = item.ImagePath || item.imagePath;
            const pName = item.ProjectName || item.projectName || 'Workspace';
            if (imgPath) {
              await NoteWallBridge.call('setWallpaper', {
                base64: '',
                monitorIndex: -1,
                projectName: pName
              });
              showToast('Restored wallpaper from history!', 'success');
              closeModal('modal-history');
            }
          });

          container.appendChild(row);
        });
      }

      openModal('modal-history');
    } catch (e) {
      console.warn(e);
    }
  }

  // Native bridge event listeners
  function setupNativeBridgeListeners() {
    // Quick Note HUD trigger
    NoteWallBridge.on('quickNoteAdded', (data) => {
      if (data && data.text) {
        createDefaultNote('standard', {
          title: 'QUICK NOTE',
          body: data.text,
          priority: 'high',
          tag: '#quick'
        });
        showToast(`Added Quick Note: "${data.text}"`);
      }
    });

    // Tray: Apply Current Wallpaper
    NoteWallBridge.on('triggerApplyWallpaper', () => {
      NoteWallExporter.applyAsWallpaper();
    });

    // Tray: Open Settings
    NoteWallBridge.on('openSettings', () => {
      openModal('modal-settings');
    });
  }

  // Autosave & Project Storage
  async function performAutosave() {
    if (!NoteWallState.settings.autosave) return;

    const pill = document.getElementById('save-status-pill');
    const text = document.getElementById('save-status-text');
    if (pill) {
      pill.className = 'save-status-pill saving';
      if (text) text.textContent = 'Saving...';
    }

    try {
      const proj = NoteWallState.getProject();
      await NoteWallBridge.call('autosave', {
        projectJson: JSON.stringify(proj)
      });

      setTimeout(() => {
        if (pill) {
          pill.className = 'save-status-pill saved';
          if (text) text.textContent = 'Saved';
        }
      }, 400);
    } catch (e) {
      console.warn('Autosave notice:', e);
      setTimeout(() => {
        if (pill) {
          pill.className = 'save-status-pill saved';
          if (text) text.textContent = 'Saved';
        }
      }, 1000);
    }
  }

  async function saveProjectManually() {
    const proj = NoteWallState.getProject();
    try {
      const res = await NoteWallBridge.call('saveProject', {
        projectJson: JSON.stringify(proj),
        projectName: proj.name
      });
      if (res && res.filePath) {
        showToast(`Saved project: ${res.name}.notewall`, 'success');
      }
    } catch (e) {
      if (!e.message?.includes('cancelled')) {
        showToast('Save failed: ' + e.message, 'error');
      }
    }
  }

  async function loadSavedProjectOrDefault() {
    let hasLoadedExisting = false;
    try {
      const res = await NoteWallBridge.call('loadautosave');
      if (res && res.json) {
        const loaded = JSON.parse(res.json);
        if (loaded && loaded.notes && loaded.notes.length > 0) {
          NoteWallState.setProject(loaded, false);
          const nameInput = document.getElementById('project-name-input');
          if (nameInput) nameInput.value = loaded.name || 'Workspace';
          hasLoadedExisting = true;
          NoteWallCanvas.renderBackground();
          NoteWallNotes.renderAllNotes();
          NoteWallCanvas.fitToScreen();
        }
      }
    } catch (e) {}

    if (!hasLoadedExisting) {
      // Default: "My Desktop" fully designed example project
      const defProj = NoteWallTemplates.getDefaultProject();
      NoteWallState.setProject(defProj, false);
      const nameInput = document.getElementById('project-name-input');
      if (nameInput) nameInput.value = defProj.name;
      NoteWallCanvas.renderBackground();
      NoteWallNotes.renderAllNotes();
      NoteWallCanvas.fitToScreen();
    }

    // First Launch Welcome Experience
    if (!localStorage.getItem('notewall_welcomed')) {
      localStorage.setItem('notewall_welcomed', 'true');
      setTimeout(() => {
        openModal('modal-welcome');
      }, 1800);
    }
  }

  // Notification Toast Helper
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'success' : ''}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '●'}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  return {
    init,
    showToast
  };
})();

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  NoteWallApp.init();
});
