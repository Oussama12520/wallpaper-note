/**
 * NoteWall - Note Manager
 * Handles Note Rendering, 6 Note Types, Dragging with Smart Alignment, 8 Resize Handles, and Rotation.
 */

window.NoteWallNotes = (function () {
  const notesLayer = document.getElementById('canvas-notes-layer');

  // Dragging state
  let isDragging = false;
  let activeDragNoteId = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialPositions = new Map();

  // Resizing state
  let isResizing = false;
  let activeResizeHandle = null;
  let resizeNote = null;
  let initialBounds = null;

  // Rotating state
  let isRotating = false;
  let rotateNote = null;
  let rotateCenter = null;

  function init() {
    setupGlobalEvents();
    renderAllNotes();

    NoteWallState.subscribe((changeType, payload) => {
      if (changeType === 'note_updated' && payload) {
        updateNoteElement(payload);
      } else if (changeType === 'selection_changed') {
        updateSelectionVisuals();
      } else {
        renderAllNotes();
      }
    });
  }

  function updateSelectionVisuals() {
    const selectedNotes = NoteWallState.getSelectedNotes();
    const selectedIds = new Set(selectedNotes.map(n => n.id));
    notesLayer.querySelectorAll('.note-item').forEach(el => {
      const id = el.dataset.id;
      if (selectedIds.has(id)) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  function updateNoteElement(note) {
    const card = document.getElementById(`note-${note.id}`);
    if (!card) return;

    const nx = typeof note.x === 'number' && !isNaN(note.x) ? note.x : 120;
    const ny = typeof note.y === 'number' && !isNaN(note.y) ? note.y : 120;
    const nw = typeof note.width === 'number' && !isNaN(note.width) && note.width >= 80 ? note.width : 300;
    const nh = typeof note.height === 'number' && !isNaN(note.height) && note.height >= 60 ? note.height : 200;
    note.x = nx;
    note.y = ny;
    note.width = nw;
    note.height = nh;

    card.style.left = `${nx}px`;
    card.style.top = `${ny}px`;
    card.style.width = `${nw}px`;
    card.style.height = `${nh}px`;
    card.style.transform = `rotate(${note.rotation || 0}deg)`;
    card.style.backgroundColor = note.color || '#27272a';
    card.style.color = note.textColor || '#f4f4f5';
    card.style.borderRadius = `${note.borderRadius !== undefined ? note.borderRadius : 12}px`;
    card.style.opacity = `${(note.opacity !== undefined ? note.opacity : 100) / 100}`;

    const fs = typeof note.fontSize === 'number' && !isNaN(note.fontSize) && note.fontSize >= 8 ? note.fontSize : 13;
    const ff = note.fontFamily || "'Inter', sans-serif";
    const ta = note.textAlign || 'left';

    card.style.fontFamily = ff;
    card.style.fontSize = `${fs}px`;
    card.style.textAlign = ta;
    applyShadowStyle(card, note.shadow);

    if (note.glass === 'blur') {
      card.style.backdropFilter = 'blur(16px)';
      card.style.webkitBackdropFilter = 'blur(16px)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    } else {
      card.style.backdropFilter = 'none';
      card.style.webkitBackdropFilter = 'none';
      card.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    }

    // Sync title input if not currently focused
    const titleEl = card.querySelector('.note-title');
    if (titleEl) {
      titleEl.style.fontSize = `${Math.round(fs * 1.08)}px`;
      titleEl.style.fontFamily = ff;
      titleEl.style.textAlign = ta;
      if (document.activeElement !== titleEl && titleEl.value !== (note.title || '')) {
        titleEl.value = note.title || '';
        titleEl.readOnly = !!note.isLocked;
      }
    }

    // Sync body element typography
    const bodyEl = card.querySelector('.note-body');
    if (bodyEl) {
      bodyEl.style.fontSize = `${fs}px`;
      bodyEl.style.fontFamily = ff;
      bodyEl.style.textAlign = ta;
    }

    // Sync body content if not currently focused
    const standardBody = card.querySelector('.note-text-content');
    if (standardBody && document.activeElement !== standardBody && standardBody.textContent !== (note.body || '')) {
      standardBody.textContent = note.body || '';
      standardBody.contentEditable = !note.isLocked;
    }
    const quoteBody = card.querySelector('.quote-text');
    if (quoteBody && document.activeElement !== quoteBody) {
      quoteBody.textContent = `“${note.body || 'Design is intelligence made visible.'}”`;
      quoteBody.contentEditable = !note.isLocked;
    }
    const codeBody = card.querySelector('.code-text');
    if (codeBody && document.activeElement !== codeBody && codeBody.textContent !== (note.body || '')) {
      codeBody.textContent = note.body || '';
      codeBody.contentEditable = !note.isLocked;
    }

    // Sync photo body
    const photoImg = card.querySelector('.note-photo-img');
    if (photoImg && note.image && photoImg.src !== note.image) {
      photoImg.src = note.image;
    }
    if (photoImg && note.imageFit) {
      photoImg.style.objectFit = note.imageFit;
    }
    const photoCaption = card.querySelector('.note-photo-caption');
    if (photoCaption && document.activeElement !== photoCaption && photoCaption.textContent !== (note.body || '')) {
      photoCaption.textContent = note.body || '';
      photoCaption.contentEditable = !note.isLocked;
    }

    // Sync lock state
    if (note.isLocked) {
      card.classList.add('locked');
    } else {
      card.classList.remove('locked');
    }

    // Sync badges
    const badgesEl = card.querySelector('.note-badges');
    if (badgesEl) {
      badgesEl.innerHTML = '';
      if (note.priority && note.priority !== 'none') {
        const pDot = document.createElement('span');
        pDot.className = `priority-badge priority-${note.priority}`;
        pDot.title = `Priority: ${note.priority}`;
        badgesEl.appendChild(pDot);
      }
      if (note.tag) {
        const tagBadge = document.createElement('span');
        tagBadge.className = 'tag-badge';
        tagBadge.textContent = note.tag.startsWith('#') ? note.tag : `#${note.tag}`;
        badgesEl.appendChild(tagBadge);
      }
      if (note.isLocked) {
        const lockIcon = document.createElement('span');
        lockIcon.className = 'lock-badge';
        lockIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
        badgesEl.appendChild(lockIcon);
      }
    }
  }

  function renderAllNotes() {
    notesLayer.innerHTML = '';
    const proj = NoteWallState.getProject();
    const selectedNotes = NoteWallState.getSelectedNotes();
    const selectedIds = new Set(selectedNotes.map(n => n.id));

    proj.notes.forEach(note => {
      if (note.isVisible === false) return;
      const el = createNoteElement(note, selectedIds.has(note.id));
      notesLayer.appendChild(el);
    });
  }

  function createNoteElement(note, isSelected) {
    const card = document.createElement('div');
    card.id = `note-${note.id}`;
    card.className = `note-item ${isSelected ? 'selected' : ''} ${note.isLocked ? 'locked' : ''}`;
    card.dataset.id = note.id;

    // Apply geometry (safeguarded against null, NaN, or 0)
    const nx = typeof note.x === 'number' && !isNaN(note.x) ? note.x : 100;
    const ny = typeof note.y === 'number' && !isNaN(note.y) ? note.y : 120;
    const nw = typeof note.width === 'number' && !isNaN(note.width) && note.width >= 80 ? note.width : 300;
    const nh = typeof note.height === 'number' && !isNaN(note.height) && note.height >= 60 ? note.height : 200;
    note.x = nx;
    note.y = ny;
    note.width = nw;
    note.height = nh;

    card.style.left = `${nx}px`;
    card.style.top = `${ny}px`;
    card.style.width = `${nw}px`;
    card.style.height = `${nh}px`;
    card.style.transform = `rotate(${note.rotation || 0}deg)`;
    card.style.zIndex = note.zIndex || 1;

    // Apply styling
    card.style.backgroundColor = note.color || '#27272a';
    card.style.color = note.textColor || '#f4f4f5';
    card.style.borderRadius = `${note.borderRadius !== undefined ? note.borderRadius : 12}px`;
    card.style.opacity = `${(note.opacity !== undefined ? note.opacity : 100) / 100}`;

    const fs = typeof note.fontSize === 'number' && !isNaN(note.fontSize) && note.fontSize >= 8 ? note.fontSize : 13;
    const ff = note.fontFamily || "'Inter', sans-serif";
    const ta = note.textAlign || 'left';

    card.style.fontFamily = ff;
    card.style.fontSize = `${fs}px`;
    card.style.textAlign = ta;

    // Shadow
    applyShadowStyle(card, note.shadow);

    // Glass effect
    if (note.glass === 'blur') {
      card.style.backdropFilter = 'blur(16px)';
      card.style.webkitBackdropFilter = 'blur(16px)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    } else {
      card.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    }

    // Header (Title, badges, lock)
    const header = document.createElement('div');
    header.className = 'note-header';

    const titleEl = document.createElement('input');
    titleEl.className = 'note-title';
    titleEl.value = note.title || '';
    titleEl.placeholder = 'Untitled';
    titleEl.readOnly = !!note.isLocked;
    titleEl.style.fontSize = `${Math.round(fs * 1.08)}px`;
    titleEl.style.fontFamily = ff;
    titleEl.style.textAlign = ta;

    titleEl.addEventListener('input', (e) => {
      note.title = e.target.value;
      NoteWallState.updateNote(note.id, { title: e.target.value }, false);
    });

    const badges = document.createElement('div');
    badges.className = 'note-badges';

    if (note.priority && note.priority !== 'none') {
      const pDot = document.createElement('span');
      pDot.className = `priority-badge priority-${note.priority}`;
      pDot.title = `Priority: ${note.priority}`;
      badges.appendChild(pDot);
    }

    if (note.tag) {
      const tagBadge = document.createElement('span');
      tagBadge.className = 'tag-badge';
      tagBadge.textContent = note.tag.startsWith('#') ? note.tag : `#${note.tag}`;
      badges.appendChild(tagBadge);
    }

    if (note.isLocked) {
      const lockIcon = document.createElement('span');
      lockIcon.className = 'lock-badge';
      lockIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
      badges.appendChild(lockIcon);
    }

    header.appendChild(titleEl);
    header.appendChild(badges);
    card.appendChild(header);

    // Body based on Note Type
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'note-body';
    bodyContainer.style.fontSize = `${fs}px`;
    bodyContainer.style.fontFamily = ff;
    bodyContainer.style.textAlign = ta;

    switch (note.type) {
      case 'photo':
      case 'image':
        renderPhotoBody(bodyContainer, note);
        break;
      case 'checklist':
        renderChecklistBody(bodyContainer, note);
        break;
      case 'quote':
        renderQuoteBody(bodyContainer, note);
        break;
      case 'link':
        renderLinkBody(bodyContainer, note);
        break;
      case 'code':
        renderCodeBody(bodyContainer, note);
        break;
      case 'reminder':
        renderReminderBody(bodyContainer, note);
        break;
      case 'datetime':
        renderDatetimeBody(bodyContainer, note);
        break;
      case 'standard':
      default:
        renderStandardBody(bodyContainer, note);
        break;
    }

    card.appendChild(bodyContainer);

    // Resize Handles (if selected)
    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    handles.forEach(pos => {
      const h = document.createElement('div');
      h.className = `resize-handle handle-${pos}`;
      h.dataset.handle = pos;
      card.appendChild(h);
    });

    // Rotation Handle
    const rotLine = document.createElement('div');
    rotLine.className = 'rotate-line';
    const rotHandle = document.createElement('div');
    rotHandle.className = 'rotate-handle';
    rotHandle.title = 'Drag to Rotate';
    card.appendChild(rotLine);
    card.appendChild(rotHandle);

    // Card Mousedown for Selection and Dragging
    card.addEventListener('mousedown', (e) => {
      if (e.target.closest('.resize-handle') || e.target.closest('.rotate-handle')) {
        return; // Handled separately
      }
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        return; // Allow direct typing
      }

      e.stopPropagation();

      const isMulti = e.ctrlKey || e.shiftKey;
      NoteWallState.selectNote(note.id, isMulti);

      if (!note.isLocked) {
        startDrag(e, note.id);
      }
    });

    return card;
  }

  function applyShadowStyle(el, shadowType) {
    switch (shadowType) {
      case 'none':
        el.style.boxShadow = 'none';
        break;
      case 'subtle':
        el.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.25)';
        break;
      case 'deep':
        el.style.boxShadow = '0 16px 36px rgba(0, 0, 0, 0.55)';
        break;
      case 'glow':
        el.style.boxShadow = '0 0 24px rgba(99, 102, 241, 0.45)';
        break;
      case 'medium':
      default:
        el.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.38)';
        break;
    }
  }

  // --- Note Type Renderers ---

  function renderStandardBody(container, note) {
    const textEl = document.createElement('div');
    textEl.contentEditable = !note.isLocked;
    textEl.className = 'note-text-content';
    textEl.textContent = note.body || '';
    textEl.style.outline = 'none';
    textEl.style.minHeight = '40px';

    textEl.addEventListener('input', () => {
      note.body = textEl.textContent;
    });
    textEl.addEventListener('blur', () => {
      NoteWallState.updateNote(note.id, { body: textEl.textContent }, true);
    });

    container.appendChild(textEl);
  }

  function renderChecklistBody(container, note) {
    const list = document.createElement('div');
    list.className = 'checklist-container';

    if (!note.checklist) note.checklist = [];

    // Fallback if checklist is empty but body has lines
    if (note.checklist.length === 0 && note.body) {
      note.checklist = note.body.split('\n').filter(l => l.trim()).map(l => ({
        text: l.replace(/^[☐☑\-\*]\s*/, ''),
        done: l.startsWith('☑')
      }));
    }

    note.checklist.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'checklist-item';

      const box = document.createElement('div');
      box.className = `checklist-checkbox ${item.done ? 'checked' : ''}`;
      box.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;

      if (!note.isLocked) {
        box.addEventListener('click', (e) => {
          e.stopPropagation();
          item.done = !item.done;
          box.classList.toggle('checked', item.done);
          text.classList.toggle('checked', item.done);
          NoteWallState.updateNote(note.id, { checklist: note.checklist }, true);
        });
      }

      const text = document.createElement('div');
      text.className = `checklist-text ${item.done ? 'checked' : ''}`;
      text.contentEditable = !note.isLocked;
      text.textContent = item.text;

      text.addEventListener('input', () => {
        item.text = text.textContent;
      });
      text.addEventListener('blur', () => {
        NoteWallState.updateNote(note.id, { checklist: note.checklist }, true);
      });

      row.appendChild(box);
      row.appendChild(text);
      list.appendChild(row);
    });

    // Add item button if not locked
    if (!note.isLocked) {
      const addRowBtn = document.createElement('button');
      addRowBtn.style.cssText = 'font-size: 11px; opacity: 0.6; text-align: left; margin-top: 4px; color: inherit;';
      addRowBtn.textContent = '+ Add task';
      addRowBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        note.checklist.push({ text: 'New task', done: false });
        NoteWallState.updateNote(note.id, { checklist: note.checklist }, true);
        renderAllNotes();
      });
      list.appendChild(addRowBtn);
    }

    container.appendChild(list);
  }

  function renderQuoteBody(container, note) {
    const qText = document.createElement('div');
    qText.className = 'quote-text';
    qText.contentEditable = !note.isLocked;
    qText.textContent = `“${note.body || 'Design is intelligence made visible.'}”`;

    qText.addEventListener('blur', () => {
      note.body = qText.textContent.replace(/[“”]/g, '');
      NoteWallState.updateNote(note.id, { body: note.body }, true);
    });

    const author = document.createElement('div');
    author.className = 'quote-author';
    author.contentEditable = !note.isLocked;
    author.textContent = `— ${note.tag || 'Alina Wheeler'}`;

    container.appendChild(qText);
    container.appendChild(author);
  }

  function renderLinkBody(container, note) {
    if (note.body) {
      const desc = document.createElement('div');
      desc.textContent = note.body;
      desc.style.marginBottom = '8px';
      desc.style.fontSize = 'inherit';
      desc.style.color = 'var(--text-secondary)';
      container.appendChild(desc);
    }

    const linksList = document.createElement('div');
    linksList.style.display = 'flex';
    linksList.style.flexDirection = 'column';
    linksList.style.gap = '6px';

    const links = note.links || [
      { label: note.url ? 'Open Link' : 'GitHub', url: note.url || 'https://github.com' }
    ];

    links.forEach(l => {
      const item = document.createElement('div');
      item.className = 'link-badge-container';
      item.style.margin = '0';
      item.style.justifyContent = 'space-between';
      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span style="font-weight:600; color:var(--text-primary);">${l.label}</span>
        </div>
        <span style="opacity:0.6; font-size:10px;">↗</span>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (l.url) window.open(l.url, '_blank');
      });
      linksList.appendChild(item);
    });

    container.appendChild(linksList);
  }

  function renderDatetimeBody(container, note) {
    const wrap = document.createElement('div');
    wrap.style.textAlign = 'center';
    wrap.style.padding = '4px 0';

    const dateEl = document.createElement('div');
    dateEl.style.fontSize = '11px';
    dateEl.style.fontWeight = '600';
    dateEl.style.letterSpacing = '0.12em';
    dateEl.style.textTransform = 'uppercase';
    dateEl.style.color = '#a1a1aa';

    const timeEl = document.createElement('div');
    timeEl.style.fontSize = '24px';
    timeEl.style.fontWeight = '700';
    timeEl.style.letterSpacing = '-0.02em';
    timeEl.style.marginTop = '2px';
    timeEl.style.color = '#f4f4f5';

    function updateLiveDateTime() {
      const now = new Date();
      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('en-US', options).toUpperCase();

      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      timeEl.textContent = `${hours}:${mins}`;
    }

    updateLiveDateTime();
    const interval = setInterval(updateLiveDateTime, 1000);
    container._dtInterval = interval;

    wrap.appendChild(dateEl);
    wrap.appendChild(timeEl);
    container.appendChild(wrap);
  }

  function renderCodeBody(container, note) {
    const codeBox = document.createElement('div');
    codeBox.className = 'code-container';
    codeBox.contentEditable = !note.isLocked;
    codeBox.textContent = note.body || 'npm run build\nnode server.js';

    codeBox.addEventListener('blur', () => {
      NoteWallState.updateNote(note.id, { body: codeBox.textContent }, true);
    });

    container.appendChild(codeBox);
  }

  function renderReminderBody(container, note) {
    const text = document.createElement('div');
    text.textContent = note.body || 'Submit report before 5 PM';
    text.contentEditable = !note.isLocked;
    text.addEventListener('blur', () => {
      NoteWallState.updateNote(note.id, { body: text.textContent }, true);
    });
    container.appendChild(text);

    if (note.date) {
      const pill = document.createElement('div');
      pill.className = 'reminder-date-pill';
      pill.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>${note.date}</span>
      `;
      container.appendChild(pill);
    }
  }

  function pickPhotoForNote(noteId) {
    const fileInput = document.getElementById('note-photo-file-input') || document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const imgData = evt.target.result;
          const img = new Image();
          img.onload = () => {
            const updates = { image: imgData };
            const note = NoteWallState.getNote(noteId);
            if (note && note.width) {
              const targetH = Math.round(note.width * (img.naturalHeight / img.naturalWidth)) + 40;
              if (targetH > note.height) {
                updates.height = Math.min(650, Math.max(160, targetH));
              }
            }
            NoteWallState.updateNote(noteId, updates, true);
            renderAllNotes();
            if (window.showToast) {
              window.showToast('Photo added to note');
            }
          };
          img.src = imgData;
        };
        reader.readAsDataURL(file);
      }
      fileInput.value = '';
    };
    fileInput.click();
  }

  function renderPhotoBody(container, note) {
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.height = '100%';
    container.style.overflow = 'hidden';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'note-photo-wrapper';

    if (note.image) {
      const img = document.createElement('img');
      img.className = 'note-photo-img';
      img.src = note.image;
      img.alt = note.title || 'Photo Note';
      img.style.objectFit = note.imageFit || 'cover';
      imgWrap.appendChild(img);

      if (!note.isLocked) {
        const changeBtn = document.createElement('button');
        changeBtn.className = 'note-photo-overlay-btn';
        changeBtn.innerHTML = `📷 Change Photo`;
        changeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          pickPhotoForNote(note.id);
        });
        imgWrap.appendChild(changeBtn);
      }
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'note-photo-placeholder';
      placeholder.innerHTML = `
        <span style="font-size: 26px;">🖼️</span>
        <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Choose Photo from Device</span>
        <span style="font-size: 10px; opacity: 0.7;">Click or drop image file here</span>
      `;
      if (!note.isLocked) {
        placeholder.addEventListener('click', (e) => {
          e.stopPropagation();
          pickPhotoForNote(note.id);
        });
      }
      imgWrap.appendChild(placeholder);
    }

    container.appendChild(imgWrap);

    // Caption below photo
    const caption = document.createElement('div');
    caption.className = 'note-photo-caption';
    caption.contentEditable = !note.isLocked;
    caption.textContent = note.body || '';
    caption.addEventListener('input', () => {
      note.body = caption.textContent;
    });
    caption.addEventListener('blur', () => {
      NoteWallState.updateNote(note.id, { body: caption.textContent }, true);
    });
    container.appendChild(caption);
  }

  // --- Drag and Drop with Smart Snapping ---

  function startDrag(e, noteId) {
    isDragging = true;
    activeDragNoteId = noteId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    initialPositions.clear();
    const selected = NoteWallState.getSelectedNotes();
    selected.forEach(n => {
      initialPositions.set(n.id, { x: n.x, y: n.y });
    });
  }

  function handleDrag(e) {
    if (!isDragging || !activeDragNoteId) return;

    const scale = NoteWallCanvas.getScale();
    const dx = (e.clientX - dragStartX) / scale;
    const dy = (e.clientY - dragStartY) / scale;

    const proj = NoteWallState.getProject();
    const primaryNote = proj.notes.find(n => n.id === activeDragNoteId);
    if (!primaryNote) return;

    const initialPos = initialPositions.get(activeDragNoteId);
    let targetX = initialPos.x + dx;
    let targetY = initialPos.y + dy;

    // Smart Snapping & Guides
    const guides = [];
    const snapThreshold = 6;
    const otherNotes = proj.notes.filter(n => !initialPositions.has(n.id) && n.isVisible !== false);

    if (NoteWallState.settings.smartGuides) {
      const pLeft = targetX;
      const pRight = targetX + primaryNote.width;
      const pCenterX = targetX + primaryNote.width / 2;

      const pTop = targetY;
      const pBottom = targetY + primaryNote.height;
      const pCenterY = targetY + primaryNote.height / 2;

      // Snap to canvas center
      const canvasCenterX = proj.width / 2;
      const canvasCenterY = proj.height / 2;

      if (Math.abs(pCenterX - canvasCenterX) < snapThreshold) {
        targetX = canvasCenterX - primaryNote.width / 2;
        guides.push({ type: 'v', pos: canvasCenterX });
      }
      if (Math.abs(pCenterY - canvasCenterY) < snapThreshold) {
        targetY = canvasCenterY - primaryNote.height / 2;
        guides.push({ type: 'h', pos: canvasCenterY });
      }

      // Check alignment against other notes
      otherNotes.forEach(other => {
        const oLeft = other.x;
        const oRight = other.x + other.width;
        const oCenterX = other.x + other.width / 2;

        const oTop = other.y;
        const oBottom = other.y + other.height;
        const oCenterY = other.y + other.height / 2;

        // Vertical alignments (left to left, center to center, right to right)
        if (Math.abs(pLeft - oLeft) < snapThreshold) {
          targetX = oLeft;
          guides.push({ type: 'v', pos: oLeft });
        } else if (Math.abs(pCenterX - oCenterX) < snapThreshold) {
          targetX = oCenterX - primaryNote.width / 2;
          guides.push({ type: 'v', pos: oCenterX });
        } else if (Math.abs(pRight - oRight) < snapThreshold) {
          targetX = oRight - primaryNote.width;
          guides.push({ type: 'v', pos: oRight });
        }

        // Horizontal alignments (top to top, center to center, bottom to bottom)
        if (Math.abs(pTop - oTop) < snapThreshold) {
          targetY = oTop;
          guides.push({ type: 'h', pos: oTop });
        } else if (Math.abs(pCenterY - oCenterY) < snapThreshold) {
          targetY = oCenterY - primaryNote.height / 2;
          guides.push({ type: 'h', pos: oCenterY });
        } else if (Math.abs(pBottom - oBottom) < snapThreshold) {
          targetY = oBottom - primaryNote.height;
          guides.push({ type: 'h', pos: oBottom });
        }
      });
    }

    // Grid snap if enabled
    if (NoteWallState.settings.snapGrid) {
      const g = NoteWallState.settings.gridSize || 8;
      targetX = Math.round(targetX / g) * g;
      targetY = Math.round(targetY / g) * g;
    }

    NoteWallCanvas.showGuides(primaryNote, guides);

    // Apply movement delta to all selected notes
    const actualDx = targetX - initialPos.x;
    const actualDy = targetY - initialPos.y;

    initialPositions.forEach((pos, id) => {
      const note = proj.notes.find(n => n.id === id);
      if (note) {
        note.x = pos.x + actualDx;
        note.y = pos.y + actualDy;

        const el = document.getElementById(`note-${note.id}`);
        if (el) {
          el.style.left = `${note.x}px`;
          el.style.top = `${note.y}px`;
        }
      }
    });
  }

  function endDrag() {
    if (isDragging) {
      isDragging = false;
      activeDragNoteId = null;
      initialPositions.clear();
      NoteWallCanvas.clearGuides();
      NoteWallState.pushHistory('Move Notes');
      NoteWallState.notify('selection_changed');
    }
  }

  // --- Resizing ---

  function startResize(e, handle, noteId) {
    e.stopPropagation();
    isResizing = true;
    activeResizeHandle = handle;
    const proj = NoteWallState.getProject();
    resizeNote = proj.notes.find(n => n.id === noteId);
    if (!resizeNote) return;

    initialBounds = {
      x: resizeNote.x,
      y: resizeNote.y,
      w: resizeNote.width,
      h: resizeNote.height,
      clientX: e.clientX,
      clientY: e.clientY
    };
  }

  function handleResize(e) {
    if (!isResizing || !resizeNote || !initialBounds) return;

    const scale = NoteWallCanvas.getScale();
    const dx = (e.clientX - initialBounds.clientX) / scale;
    const dy = (e.clientY - initialBounds.clientY) / scale;

    let newX = initialBounds.x;
    let newY = initialBounds.y;
    let newW = initialBounds.w;
    let newH = initialBounds.h;

    const minW = 140;
    const minH = 90;

    if (activeResizeHandle.includes('e')) newW = Math.max(minW, initialBounds.w + dx);
    if (activeResizeHandle.includes('s')) newH = Math.max(minH, initialBounds.h + dy);

    if (activeResizeHandle.includes('w')) {
      const diff = Math.min(dx, initialBounds.w - minW);
      newX = initialBounds.x + diff;
      newW = initialBounds.w - diff;
    }

    if (activeResizeHandle.includes('n')) {
      const diff = Math.min(dy, initialBounds.h - minH);
      newY = initialBounds.y + diff;
      newH = initialBounds.h - diff;
    }

    resizeNote.x = Math.round(newX);
    resizeNote.y = Math.round(newY);
    resizeNote.width = Math.round(newW);
    resizeNote.height = Math.round(newH);

    const el = document.getElementById(`note-${resizeNote.id}`);
    if (el) {
      el.style.left = `${resizeNote.x}px`;
      el.style.top = `${resizeNote.y}px`;
      el.style.width = `${resizeNote.width}px`;
      el.style.height = `${resizeNote.height}px`;
    }
  }

  function endResize() {
    if (isResizing) {
      isResizing = false;
      activeResizeHandle = null;
      resizeNote = null;
      initialBounds = null;
      NoteWallState.pushHistory('Resize Note');
      NoteWallState.notify('selection_changed');
    }
  }

  // --- Rotation ---

  function startRotate(e, noteId) {
    e.stopPropagation();
    isRotating = true;
    const proj = NoteWallState.getProject();
    rotateNote = proj.notes.find(n => n.id === noteId);
    if (!rotateNote) return;

    const card = document.getElementById(`note-${noteId}`);
    const rect = card.getBoundingClientRect();
    rotateCenter = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function handleRotate(e) {
    if (!isRotating || !rotateNote || !rotateCenter) return;

    const rad = Math.atan2(e.clientY - rotateCenter.y, e.clientX - rotateCenter.x);
    let deg = Math.round(rad * (180 / Math.PI)) + 90;

    // Normalize
    if (deg > 180) deg -= 360;
    if (deg < -180) deg += 360;

    // Snap to 0, 45, 90
    if (Math.abs(deg) < 4) deg = 0;
    if (Math.abs(deg - 45) < 3) deg = 45;
    if (Math.abs(deg + 45) < 3) deg = -45;

    rotateNote.rotation = deg;

    const el = document.getElementById(`note-${rotateNote.id}`);
    if (el) {
      el.style.transform = `rotate(${deg}deg)`;
    }
  }

  function endRotate() {
    if (isRotating) {
      isRotating = false;
      rotateNote = null;
      rotateCenter = null;
      NoteWallState.pushHistory('Rotate Note');
      NoteWallState.notify('selection_changed');
    }
  }

  // Global mouse handlers for Drag, Resize, and Rotate
  function setupGlobalEvents() {
    window.addEventListener('mousemove', (e) => {
      if (isDragging) handleDrag(e);
      else if (isResizing) handleResize(e);
      else if (isRotating) handleRotate(e);
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) endDrag();
      if (isResizing) endResize();
      if (isRotating) endRotate();
    });

    // Delegate resize and rotate handle clicks
    notesLayer.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.resize-handle');
      if (handle) {
        const card = handle.closest('.note-item');
        if (card) {
          startResize(e, handle.dataset.handle, card.dataset.id);
        }
        return;
      }

      const rot = e.target.closest('.rotate-handle');
      if (rot) {
        const card = rot.closest('.note-item');
        if (card) {
          startRotate(e, card.dataset.id);
        }
      }
    });
  }

  return {
    init,
    renderAllNotes,
    pickPhotoForNote
  };
})();
