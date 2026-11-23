/**
 * NoteWall - Layout Engine
 * Automatic Layouts: Grid, Masonry, Smart Pack, Horizontal, Vertical, Alignments and Distributions.
 */

window.NoteWallLayout = (function () {
  function init() {
    // Layouts
    document.getElementById('btn-layout-grid')?.addEventListener('click', layoutGrid);
    document.getElementById('btn-layout-masonry')?.addEventListener('click', layoutMasonry);
    document.getElementById('btn-layout-pack')?.addEventListener('click', layoutSmartPack);
    document.getElementById('btn-layout-horiz')?.addEventListener('click', layoutHorizontal);
    document.getElementById('btn-layout-vert')?.addEventListener('click', layoutVertical);
    document.getElementById('btn-layout-center')?.addEventListener('click', centerAllNotes);

    // Alignments
    document.getElementById('btn-align-left')?.addEventListener('click', () => align('left'));
    document.getElementById('btn-align-hcenter')?.addEventListener('click', () => align('hcenter'));
    document.getElementById('btn-align-right')?.addEventListener('click', () => align('right'));
    document.getElementById('btn-align-top')?.addEventListener('click', () => align('top'));
    document.getElementById('btn-align-vcenter')?.addEventListener('click', () => align('vcenter'));
    document.getElementById('btn-align-bottom')?.addEventListener('click', () => align('bottom'));

    // Distribute
    document.getElementById('btn-dist-horiz')?.addEventListener('click', distributeHorizontal);
    document.getElementById('btn-dist-vert')?.addEventListener('click', distributeVertical);
  }

  function getTargetNotes() {
    const selected = NoteWallState.getSelectedNotes();
    if (selected.length > 1) return selected;
    return NoteWallState.getProject().notes.filter(n => !n.isLocked && n.isVisible !== false);
  }

  // Uniform Grid Layout
  function layoutGrid() {
    const notes = getTargetNotes();
    if (notes.length === 0) return;

    NoteWallState.pushHistory('Layout Grid');
    const cols = Math.ceil(Math.sqrt(notes.length));
    const startX = 120;
    const startY = 120;
    const gapX = 30;
    const gapY = 30;

    let col = 0;
    let row = 0;
    let maxHInRow = 0;
    let currentY = startY;

    notes.forEach((note, i) => {
      if (col >= cols) {
        col = 0;
        row++;
        currentY += maxHInRow + gapY;
        maxHInRow = 0;
      }

      note.x = startX + col * (note.width + gapX);
      note.y = currentY;
      maxHInRow = Math.max(maxHInRow, note.height);
      col++;
    });

    NoteWallNotes.renderAllNotes();
  }

  // Masonry Multi-column Layout
  function layoutMasonry() {
    const notes = getTargetNotes();
    if (notes.length === 0) return;

    NoteWallState.pushHistory('Layout Masonry');
    const cols = 3;
    const startX = 140;
    const startY = 120;
    const gapX = 32;
    const gapY = 24;

    const colHeights = new Array(cols).fill(startY);

    notes.forEach(note => {
      // Find column with min height
      let minCol = 0;
      for (let c = 1; c < cols; c++) {
        if (colHeights[c] < colHeights[minCol]) minCol = c;
      }

      note.x = startX + minCol * (note.width + gapX);
      note.y = colHeights[minCol];
      colHeights[minCol] += note.height + gapY;
    });

    NoteWallNotes.renderAllNotes();
  }

  // Smart Pack (Fit into available space)
  function layoutSmartPack() {
    const notes = getTargetNotes();
    if (notes.length === 0) return;

    NoteWallState.pushHistory('Layout Smart Pack');
    const proj = NoteWallState.getProject();
    const padding = 100;
    const gap = 24;

    let curX = padding;
    let curY = padding;
    let rowHeight = 0;

    // Sort descending by height
    const sorted = [...notes].sort((a, b) => b.height - a.height);

    sorted.forEach(note => {
      if (curX + note.width > proj.width - padding) {
        curX = padding;
        curY += rowHeight + gap;
        rowHeight = 0;
      }

      note.x = curX;
      note.y = curY;
      curX += note.width + gap;
      rowHeight = Math.max(rowHeight, note.height);
    });

    NoteWallNotes.renderAllNotes();
  }

  function layoutHorizontal() {
    const notes = getTargetNotes();
    if (notes.length === 0) return;

    NoteWallState.pushHistory('Layout Horizontal');
    let curX = 120;
    const y = 140;
    const gap = 24;

    notes.forEach(note => {
      note.x = curX;
      note.y = y;
      curX += note.width + gap;
    });

    NoteWallNotes.renderAllNotes();
  }

  function layoutVertical() {
    const notes = getTargetNotes();
    if (notes.length === 0) return;

    NoteWallState.pushHistory('Layout Vertical');
    const x = 140;
    let curY = 120;
    const gap = 24;

    notes.forEach(note => {
      note.x = x;
      note.y = curY;
      curY += note.height + gap;
    });

    NoteWallNotes.renderAllNotes();
  }

  function centerAllNotes() {
    const notes = getTargetNotes();
    if (notes.length === 0) return;

    NoteWallState.pushHistory('Center Notes');
    const proj = NoteWallState.getProject();

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    notes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const groupW = maxX - minX;
    const groupH = maxY - minY;

    const targetX = (proj.width - groupW) / 2;
    const targetY = (proj.height - groupH) / 2;

    const dx = targetX - minX;
    const dy = targetY - minY;

    notes.forEach(n => {
      n.x = Math.round(n.x + dx);
      n.y = Math.round(n.y + dy);
    });

    NoteWallNotes.renderAllNotes();
  }

  // Alignment functions
  function align(mode) {
    const notes = NoteWallState.getSelectedNotes();
    if (notes.length < 2) return;

    NoteWallState.pushHistory(`Align ${mode}`);

    let refVal = 0;
    switch (mode) {
      case 'left':
        refVal = Math.min(...notes.map(n => n.x));
        notes.forEach(n => n.x = refVal);
        break;
      case 'right':
        refVal = Math.max(...notes.map(n => n.x + n.width));
        notes.forEach(n => n.x = refVal - n.width);
        break;
      case 'hcenter':
        const minX = Math.min(...notes.map(n => n.x));
        const maxX = Math.max(...notes.map(n => n.x + n.width));
        refVal = (minX + maxX) / 2;
        notes.forEach(n => n.x = Math.round(refVal - n.width / 2));
        break;
      case 'top':
        refVal = Math.min(...notes.map(n => n.y));
        notes.forEach(n => n.y = refVal);
        break;
      case 'bottom':
        refVal = Math.max(...notes.map(n => n.y + n.height));
        notes.forEach(n => n.y = refVal - n.height);
        break;
      case 'vcenter':
        const minY = Math.min(...notes.map(n => n.y));
        const maxY = Math.max(...notes.map(n => n.y + n.height));
        refVal = (minY + maxY) / 2;
        notes.forEach(n => n.y = Math.round(refVal - n.height / 2));
        break;
    }

    NoteWallNotes.renderAllNotes();
  }

  function distributeHorizontal() {
    const notes = NoteWallState.getSelectedNotes();
    if (notes.length < 3) return;

    NoteWallState.pushHistory('Distribute Horizontally');
    const sorted = [...notes].sort((a, b) => a.x - b.x);
    const minX = sorted[0].x;
    const maxX = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
    const totalNoteW = sorted.reduce((sum, n) => sum + n.width, 0);

    const gap = (maxX - minX - totalNoteW) / (sorted.length - 1);
    let curX = minX;

    sorted.forEach((n, idx) => {
      n.x = Math.round(curX);
      curX += n.width + gap;
    });

    NoteWallNotes.renderAllNotes();
  }

  function distributeVertical() {
    const notes = NoteWallState.getSelectedNotes();
    if (notes.length < 3) return;

    NoteWallState.pushHistory('Distribute Vertically');
    const sorted = [...notes].sort((a, b) => a.y - b.y);
    const minY = sorted[0].y;
    const maxY = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
    const totalNoteH = sorted.reduce((sum, n) => sum + n.height, 0);

    const gap = (maxY - minY - totalNoteH) / (sorted.length - 1);
    let curY = minY;

    sorted.forEach((n, idx) => {
      n.y = Math.round(curY);
      curY += n.height + gap;
    });

    NoteWallNotes.renderAllNotes();
  }

  return {
    init,
    layoutGrid,
    layoutMasonry,
    layoutSmartPack
  };
})();
