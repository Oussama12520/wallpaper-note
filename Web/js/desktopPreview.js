/**
 * NoteWall - Desktop Live Preview & Focus Mode Controller
 */

window.NoteWallPreview = (function () {
  const desktopOverlay = document.getElementById('desktop-preview-overlay');
  const btnDesktopPreview = document.getElementById('btn-desktop-preview');
  const btnPreviewMode = document.getElementById('btn-preview-mode');
  const btnExitPreview = document.getElementById('btn-exit-preview');
  const btnFocusMode = document.getElementById('btn-focus-mode');
  const clockEl = document.getElementById('sim-taskbar-clock');

  let isDesktopPreviewActive = false;
  let isFullscreenPreviewActive = false;
  let isFocusModeActive = false;
  let savedNotesBeforeFocus = null;

  function init() {
    updateClock();
    setInterval(updateClock, 1000);

    // Desktop Live Preview Toggle
    btnDesktopPreview?.addEventListener('click', toggleDesktopPreview);

    // Fullscreen Preview (hides UI)
    btnPreviewMode?.addEventListener('click', enterFullscreenPreview);
    btnExitPreview?.addEventListener('click', exitFullscreenPreview);

    // Escape exits preview
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (isFullscreenPreviewActive) exitFullscreenPreview();
        if (isDesktopPreviewActive) toggleDesktopPreview();
      }
    });

    // Focus Mode
    btnFocusMode?.addEventListener('click', toggleFocusMode);
  }

  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = `${hours}:${mins}`;
  }

  function toggleDesktopPreview() {
    isDesktopPreviewActive = !isDesktopPreviewActive;
    desktopOverlay.classList.toggle('visible', isDesktopPreviewActive);
    btnDesktopPreview.classList.toggle('active', isDesktopPreviewActive);

    if (isDesktopPreviewActive) {
      NoteWallApp.showToast('Desktop Preview active: Taskbar & Desktop Icons overlay shown');
    }
  }

  function enterFullscreenPreview() {
    isFullscreenPreviewActive = true;
    document.body.classList.add('preview-mode');
    NoteWallCanvas.fitToScreen();
    NoteWallApp.showToast('Fullscreen Preview — Press Esc to exit');
  }

  function exitFullscreenPreview() {
    isFullscreenPreviewActive = false;
    document.body.classList.remove('preview-mode');
    NoteWallCanvas.fitToScreen();
  }

  function toggleFocusMode() {
    isFocusModeActive = !isFocusModeActive;
    btnFocusMode.classList.toggle('active', isFocusModeActive);

    const proj = NoteWallState.getProject();

    if (isFocusModeActive) {
      // Save current notes snapshot
      savedNotesBeforeFocus = JSON.parse(JSON.stringify(proj.notes));

      // Filter to keep only 1 or 2 critical/high notes, or center the first active task
      NoteWallState.pushHistory('Enable Focus Mode');
      const criticalNote = proj.notes.find(n => n.priority === 'critical') || proj.notes[0];
      const reminderNote = proj.notes.find(n => n.type === 'reminder' && n !== criticalNote);

      if (criticalNote) {
        criticalNote.x = (proj.width - criticalNote.width) / 2;
        criticalNote.y = (proj.height - criticalNote.height) / 2;
        criticalNote.isVisible = true;

        proj.notes.forEach(n => {
          if (n !== criticalNote && n !== reminderNote) {
            n.isVisible = false;
          }
        });
      }

      NoteWallNotes.renderAllNotes();
      NoteWallApp.showToast('🎯 Focus Mode Enabled: Distraction-free desktop');
    } else {
      // Restore notes
      if (savedNotesBeforeFocus) {
        NoteWallState.pushHistory('Disable Focus Mode');
        proj.notes = savedNotesBeforeFocus;
        savedNotesBeforeFocus = null;
        NoteWallNotes.renderAllNotes();
      }
      NoteWallApp.showToast('Focus Mode Disabled');
    }
  }

  return {
    init,
    toggleDesktopPreview,
    enterFullscreenPreview,
    exitFullscreenPreview
  };
})();
