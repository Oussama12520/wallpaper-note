/**
 * NoteWall - Global State and Undo/Redo Store
 */

window.NoteWallState = (function () {
  let project = {
    id: 'proj_' + Date.now(),
    name: 'My Workspace',
    width: 1920,
    height: 1080,
    background: {
      type: 'builtin', // 'builtin', 'solid', 'gradient', 'image'
      style: 'dark-solid', // for builtin: 'dark-solid', 'light-solid', 'subtle-grid', 'minimal-gradient', 'soft-noise', 'abstract-dark', 'abstract-light'
      color: '#09090b',
      gradient: {
        type: 'linear',
        angle: 135,
        color1: '#09090b',
        color2: '#1e1b4b'
      },
      image: null,
      imageFit: 'cover'
    },
    notes: []
  };

  let selectedNoteIds = new Set();
  let displays = [];
  let activeDisplayIndex = 0;

  // Settings
  let settings = {
    autosave: true,
    snapGrid: true,
    smartGuides: true,
    gridSize: 8,
    theme: 'dark'
  };

  // Undo / Redo Stacks
  const MAX_HISTORY = 35;
  const undoStack = [];
  const redoStack = [];
  let isPerformingHistoryAction = false;

  const listeners = new Set();

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify(changeType, payload) {
    listeners.forEach(fn => fn(changeType, payload));
    updateUndoRedoUI();
  }

  function getProject() {
    return project;
  }

  function sanitizeProject(p) {
    if (!p) return;
    if (typeof p.width !== 'number' || isNaN(p.width) || p.width <= 0) p.width = 1920;
    if (typeof p.height !== 'number' || isNaN(p.height) || p.height <= 0) p.height = 1080;
    if (!p.background) p.background = { type: 'solid', color: '#000000' };
    if (!Array.isArray(p.notes)) p.notes = [];
    p.notes.forEach((note, idx) => {
      if (typeof note.x !== 'number' || isNaN(note.x)) note.x = 120 + ((idx % 6) * 40);
      if (typeof note.y !== 'number' || isNaN(note.y)) note.y = 120 + ((idx % 5) * 40);
      if (typeof note.width !== 'number' || isNaN(note.width) || note.width < 80) note.width = 300;
      if (typeof note.height !== 'number' || isNaN(note.height) || note.height < 60) note.height = 200;
    });
  }

  function setProject(newProject, recordHistory = true) {
    if (recordHistory) {
      pushHistory('Load Project');
    }
    project = JSON.parse(JSON.stringify(newProject));
    sanitizeProject(project);
    selectedNoteIds.clear();
    notify('project_loaded', project);
  }

  const imageCache = new Map();

  function snapshotProject() {
    let bg = project.background;
    if (bg && bg.image && bg.image.length > 512) {
      const imgKey = 'cached_bg_' + (bg.image.length);
      imageCache.set(imgKey, bg.image);
      bg = { ...bg, image: imgKey };
    }
    const notesCopy = (project.notes || []).map(n => {
      if (n.image && n.image.length > 512) {
        const imgKey = 'cached_note_img_' + n.id + '_' + n.image.length;
        imageCache.set(imgKey, n.image);
        return { ...n, image: imgKey };
      }
      return n;
    });
    return JSON.stringify({
      id: project.id,
      name: project.name,
      width: project.width,
      height: project.height,
      background: bg,
      notes: notesCopy
    });
  }

  function restoreProjectFromSnapshot(str) {
    const data = JSON.parse(str);
    if (data.background && data.background.image && imageCache.has(data.background.image)) {
      data.background.image = imageCache.get(data.background.image);
    }
    if (Array.isArray(data.notes)) {
      data.notes.forEach(n => {
        if (n.image && imageCache.has(n.image)) {
          n.image = imageCache.get(n.image);
        }
      });
    }
    return data;
  }

  function pushHistory(description = 'Edit') {
    if (isPerformingHistoryAction) return;

    const snapshot = snapshotProject();

    undoStack.push({ snapshot, description });
    if (undoStack.length > MAX_HISTORY) {
      undoStack.shift();
    }
    redoStack.length = 0; // Clear redo
    updateUndoRedoUI();
  }

  function undo() {
    if (undoStack.length === 0) return;
    isPerformingHistoryAction = true;

    const currentSnapshot = snapshotProject();
    redoStack.push({ snapshot: currentSnapshot, description: 'Undo action' });

    const stateToRestore = undoStack.pop();
    const data = restoreProjectFromSnapshot(stateToRestore.snapshot);

    project.name = data.name;
    project.width = data.width;
    project.height = data.height;
    project.background = data.background;
    project.notes = data.notes;

    isPerformingHistoryAction = false;
    notify('undo', stateToRestore.description);
    updateUndoRedoUI();
  }

  function redo() {
    if (redoStack.length === 0) return;
    isPerformingHistoryAction = true;

    const currentSnapshot = snapshotProject();
    undoStack.push({ snapshot: currentSnapshot, description: 'Redo action' });

    const stateToRestore = redoStack.pop();
    const data = restoreProjectFromSnapshot(stateToRestore.snapshot);

    project.name = data.name;
    project.width = data.width;
    project.height = data.height;
    project.background = data.background;
    project.notes = data.notes;

    isPerformingHistoryAction = false;
    notify('redo', stateToRestore.description);
    updateUndoRedoUI();
  }

  function updateUndoRedoUI() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.disabled = undoStack.length === 0;
    if (btnRedo) btnRedo.disabled = redoStack.length === 0;
  }

  // Note CRUD operations
  function addNote(noteData, selectAfter = true) {
    pushHistory('Add Note');
    const note = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: noteData.type || 'standard', // 'standard', 'checklist', 'reminder', 'quote', 'link', 'code'
      title: noteData.title || 'NEW NOTE',
      body: noteData.body || '',
      checklist: noteData.checklist || [],
      date: noteData.date || '',
      icon: noteData.icon || '',
      tag: noteData.tag || '',
      priority: noteData.priority || 'none', // 'none', 'low', 'normal', 'high', 'critical'
      url: noteData.url || '',
      x: typeof noteData.x === 'number' && !isNaN(noteData.x) ? noteData.x : 100,
      y: typeof noteData.y === 'number' && !isNaN(noteData.y) ? noteData.y : 100,
      width: typeof noteData.width === 'number' && !isNaN(noteData.width) ? Math.max(80, noteData.width) : 260,
      height: typeof noteData.height === 'number' && !isNaN(noteData.height) ? Math.max(60, noteData.height) : 180,
      rotation: noteData.rotation || 0,
      color: noteData.color || '#27272a',
      textColor: noteData.textColor || '#f4f4f5',
      fontFamily: noteData.fontFamily || "'Inter', sans-serif",
      fontSize: noteData.fontSize || 13,
      textAlign: noteData.textAlign || 'left',
      borderRadius: noteData.borderRadius !== undefined ? noteData.borderRadius : 12,
      opacity: noteData.opacity !== undefined ? noteData.opacity : 100,
      shadow: noteData.shadow || 'medium',
      glass: noteData.glass || 'none',
      isLocked: !!noteData.isLocked,
      isVisible: noteData.isVisible !== undefined ? noteData.isVisible : true,
      zIndex: project.notes.length + 1
    };

    project.notes.push(note);
    if (selectAfter) {
      selectNote(note.id);
    }
    notify('note_added', note);
    return note;
  }

  function updateNote(id, updates, recordHistory = false) {
    if (recordHistory) {
      pushHistory('Update Note');
    }
    const note = project.notes.find(n => n.id === id);
    if (!note) return null;

    if (updates.x !== undefined && (typeof updates.x !== 'number' || isNaN(updates.x))) delete updates.x;
    if (updates.y !== undefined && (typeof updates.y !== 'number' || isNaN(updates.y))) delete updates.y;
    if (updates.width !== undefined && (typeof updates.width !== 'number' || isNaN(updates.width))) delete updates.width;
    if (updates.height !== undefined && (typeof updates.height !== 'number' || isNaN(updates.height))) delete updates.height;

    Object.assign(note, updates);
    notify('note_updated', note);
    return note;
  }

  function deleteNote(id) {
    pushHistory('Delete Note');
    const index = project.notes.findIndex(n => n.id === id);
    if (index !== -1) {
      const deleted = project.notes.splice(index, 1)[0];
      selectedNoteIds.delete(id);
      notify('note_deleted', deleted);
    }
  }

  function duplicateNote(id) {
    const note = project.notes.find(n => n.id === id);
    if (!note) return null;

    pushHistory('Duplicate Note');
    const duplicate = JSON.parse(JSON.stringify(note));
    duplicate.id = 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    duplicate.x += 24;
    duplicate.y += 24;
    duplicate.zIndex = project.notes.length + 1;
    project.notes.push(duplicate);
    selectNote(duplicate.id);
    notify('note_added', duplicate);
    return duplicate;
  }

  function selectNote(id, multi = false) {
    if (!multi) {
      selectedNoteIds.clear();
    }
    if (id) {
      selectedNoteIds.add(id);
    }
    notify('selection_changed', getSelectedNotes());
  }

  function deselectAll() {
    selectedNoteIds.clear();
    notify('selection_changed', []);
  }

  function getSelectedNotes() {
    return project.notes.filter(n => selectedNoteIds.has(n.id));
  }

  function getSelectedNote() {
    const selected = getSelectedNotes();
    return selected.length > 0 ? selected[0] : null;
  }

  return {
    getProject,
    setProject,
    pushHistory,
    undo,
    redo,
    addNote,
    updateNote,
    deleteNote,
    duplicateNote,
    selectNote,
    deselectAll,
    getSelectedNotes,
    getSelectedNote,
    subscribe,
    settings,
    displays,
    activeDisplayIndex
  };
})();
