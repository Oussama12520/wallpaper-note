/**
 * NoteWall - Layers Panel
 * Handles Z-Index ordering, visibility, lock toggles, and layer list representation.
 */

window.NoteWallLayers = (function () {
  const layersList = document.getElementById('layers-list');
  const btnLockAll = document.getElementById('btn-layer-lock-all');
  const btnUnlockAll = document.getElementById('btn-layer-unlock-all');

  function init() {
    btnLockAll?.addEventListener('click', () => {
      NoteWallState.pushHistory('Lock All Notes');
      NoteWallState.getProject().notes.forEach(n => n.isLocked = true);
      render();
    });

    btnUnlockAll?.addEventListener('click', () => {
      NoteWallState.pushHistory('Unlock All Notes');
      NoteWallState.getProject().notes.forEach(n => n.isLocked = false);
      render();
    });

    NoteWallState.subscribe((changeType) => {
      if (document.getElementById('tab-content-layers')?.style.display !== 'none') {
        render();
      }
    });
  }

  function render() {
    if (!layersList) return;
    layersList.innerHTML = '';

    const proj = NoteWallState.getProject();
    const selectedNotes = NoteWallState.getSelectedNotes();
    const selectedIds = new Set(selectedNotes.map(n => n.id));

    // Display highest z-index on top
    const sorted = [...proj.notes].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

    if (sorted.length === 0) {
      layersList.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 12px;">No notes on canvas</div>';
      return;
    }

    sorted.forEach((note, index) => {
      const item = document.createElement('div');
      item.className = `layer-item ${selectedIds.has(note.id) ? 'active' : ''}`;

      const left = document.createElement('div');
      left.className = 'layer-left';

      const icon = document.createElement('span');
      icon.textContent = getNoteTypeIcon(note.type);
      left.appendChild(icon);

      const title = document.createElement('span');
      title.textContent = note.title || 'Untitled Note';
      title.style.maxWidth = '140px';
      title.style.overflow = 'hidden';
      title.style.textOverflow = 'ellipsis';
      left.appendChild(title);

      const actions = document.createElement('div');
      actions.className = 'layer-actions';

      // Lock toggle
      const lockBtn = document.createElement('button');
      lockBtn.className = 'layer-btn';
      lockBtn.title = note.isLocked ? 'Unlock' : 'Lock';
      lockBtn.innerHTML = note.isLocked ? '🔒' : '🔓';
      lockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        note.isLocked = !note.isLocked;
        NoteWallState.updateNote(note.id, { isLocked: note.isLocked }, true);
        render();
      });

      // Visibility toggle
      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'layer-btn';
      eyeBtn.title = note.isVisible !== false ? 'Hide' : 'Show';
      eyeBtn.innerHTML = note.isVisible !== false ? '👁️' : '🕶️';
      eyeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        note.isVisible = !(note.isVisible !== false);
        NoteWallState.updateNote(note.id, { isVisible: note.isVisible }, true);
        render();
      });

      // Z-Index Up / Down
      const upBtn = document.createElement('button');
      upBtn.className = 'layer-btn';
      upBtn.title = 'Bring Forward';
      upBtn.innerHTML = '▲';
      upBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        bringForward(note.id);
      });

      const downBtn = document.createElement('button');
      downBtn.className = 'layer-btn';
      downBtn.title = 'Send Backward';
      downBtn.innerHTML = '▼';
      downBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sendBackward(note.id);
      });

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(lockBtn);
      actions.appendChild(eyeBtn);

      item.appendChild(left);
      item.appendChild(actions);

      item.addEventListener('click', () => {
        NoteWallState.selectNote(note.id, false);
      });

      layersList.appendChild(item);
    });
  }

  function getNoteTypeIcon(type) {
    switch (type) {
      case 'checklist': return '☑️';
      case 'reminder': return '⏰';
      case 'quote': return '💬';
      case 'link': return '🔗';
      case 'code': return '💻';
      default: return '📝';
    }
  }

  function bringForward(noteId) {
    const proj = NoteWallState.getProject();
    const note = proj.notes.find(n => n.id === noteId);
    if (!note) return;

    NoteWallState.pushHistory('Bring Forward');
    note.zIndex = (note.zIndex || 1) + 1;
    render();
  }

  function sendBackward(noteId) {
    const proj = NoteWallState.getProject();
    const note = proj.notes.find(n => n.id === noteId);
    if (!note) return;

    NoteWallState.pushHistory('Send Backward');
    note.zIndex = Math.max(1, (note.zIndex || 1) - 1);
    render();
  }

  return {
    init,
    render
  };
})();
