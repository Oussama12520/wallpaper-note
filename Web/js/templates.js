/**
 * NoteWall - Templates & Default Project Library
 * Provides the pre-designed "My Desktop" default project and pre-made templates.
 */

window.NoteWallTemplates = (function () {
  /**
   * Generates the fully designed "My Desktop" default example project.
   */
  function getDefaultProject() {
    return {
      id: 'proj_default_desktop',
      name: 'My Desktop',
      width: 1920,
      height: 1080,
      background: {
        type: 'solid',
        color: '#000000',
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        vignette: 0
      },
      notes: [
        // 1. MAIN TASK NOTE (Top-left)
        {
          id: 'note_def_today',
          type: 'checklist',
          title: 'TODAY',
          checklist: [
            { text: 'Finish Python API', done: false },
            { text: 'Practice POST requests', done: false },
            { text: 'Work on NoteWall', done: true },
            { text: 'Push project to GitHub', done: false }
          ],
          x: 120,
          y: 110,
          width: 330,
          height: 230,
          color: '#161619',
          textColor: '#f4f4f5',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          tag: '#tasks',
          priority: 'normal',
          borderRadius: 12,
          shadow: 'medium',
          zIndex: 10
        },

        // 2. FOCUS NOTE (Center-left)
        {
          id: 'note_def_focus',
          type: 'quote',
          title: 'FOCUS',
          body: 'Build something worth using.',
          tag: 'One task at a time.',
          x: 120,
          y: 375,
          width: 330,
          height: 165,
          color: '#18181d',
          textColor: '#f4f4f5',
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14,
          textAlign: 'center',
          borderRadius: 12,
          shadow: 'subtle',
          zIndex: 9
        },

        // 3. IDEAS NOTE (Bottom-left)
        {
          id: 'note_def_ideas',
          type: 'standard',
          title: 'IDEAS',
          body: '• Port Controller\n• WiFi CSI project\n• Desktop automation\n• New Python tools',
          x: 120,
          y: 575,
          width: 330,
          height: 220,
          color: '#201938',
          textColor: '#f4f4f5',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          tag: '#concepts',
          borderRadius: 12,
          shadow: 'medium',
          zIndex: 8
        },

        // 4. DATE/TIME ELEMENT (Top-center)
        {
          id: 'note_def_datetime',
          type: 'datetime',
          title: 'CALENDAR',
          x: 820,
          y: 65,
          width: 280,
          height: 95,
          color: 'rgba(24, 24, 27, 0.85)',
          textColor: '#f4f4f5',
          glass: 'blur',
          borderRadius: 14,
          shadow: 'subtle',
          zIndex: 12
        },

        // 5. IMPORTANT NOTE (Top-right)
        {
          id: 'note_def_important',
          type: 'reminder',
          title: 'IMPORTANT',
          body: 'Remember to finish the API project before Friday.',
          date: 'Friday deadline',
          priority: 'critical',
          x: 1470,
          y: 110,
          width: 330,
          height: 160,
          color: '#2a1215',
          textColor: '#fecaca',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          tag: '#urgent',
          borderRadius: 12,
          shadow: 'deep',
          zIndex: 11
        },

        // 6. QUICK LINKS NOTE (Right-middle)
        {
          id: 'note_def_links',
          type: 'link',
          title: 'QUICK LINKS',
          links: [
            { label: 'GitHub', url: 'https://github.com' },
            { label: 'Portfolio', url: 'https://portfolio.dev' },
            { label: 'Projects', url: 'https://projects.internal' }
          ],
          x: 1470,
          y: 300,
          width: 330,
          height: 200,
          color: '#18181c',
          textColor: '#f4f4f5',
          tag: '#bookmarks',
          borderRadius: 12,
          shadow: 'medium',
          zIndex: 10
        },

        // 7. DAILY REMINDER (Bottom-right)
        {
          id: 'note_def_reminder',
          type: 'standard',
          title: 'REMINDER',
          body: '• Drink water\n• Take a break\n• Review today\'s progress',
          x: 1470,
          y: 535,
          width: 330,
          height: 200,
          color: '#182232',
          textColor: '#e2e8f0',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          tag: '#wellness',
          priority: 'low',
          borderRadius: 12,
          shadow: 'subtle',
          zIndex: 7
        }
      ]
    };
  }

  // Pre-made template library
  const templates = [
    {
      id: 'minimal-obsidian',
      name: 'Style A: Pure Black Wallpaper',
      desc: 'Pure Black #000000 desktop with wide negative space. Demonstrates background-first philosophy with TODAY and FOCUS notes.',
      background: {
        type: 'solid',
        color: '#000000',
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        vignette: 0
      },
      notes: [
        {
          id: 'note_sa_today',
          type: 'checklist',
          title: 'TODAY',
          checklist: [
            { text: 'Finish Python API', done: false },
            { text: 'Work on project', done: false }
          ],
          x: 140,
          y: 140,
          width: 330,
          height: 190,
          color: '#161619',
          textColor: '#f4f4f5',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          tag: '#tasks',
          borderRadius: 12,
          shadow: 'subtle',
          zIndex: 10
        },
        {
          id: 'note_sa_focus',
          type: 'quote',
          title: 'FOCUS',
          body: 'Build something worth using.',
          tag: 'Wallpaper Canvas',
          x: 140,
          y: 360,
          width: 330,
          height: 150,
          color: '#18181d',
          textColor: '#f4f4f5',
          fontFamily: "'Outfit', sans-serif",
          fontSize: 14,
          textAlign: 'center',
          borderRadius: 12,
          shadow: 'subtle',
          zIndex: 9
        }
      ]
    },
    {
      id: 'cinematic-nature',
      name: 'Style B: Cinematic Alpine Wallpaper',
      desc: 'High-resolution Alpine Night landscape with vast open sky. Only TODAY and IMPORTANT placed over the wallpaper.',
      background: {
        type: 'builtin',
        style: 'nature-alpine',
        vignette: 25,
        overlayOpacity: 10,
        overlayColor: '#000000'
      },
      notes: [
        {
          id: 'note_sb_today',
          type: 'checklist',
          title: 'TODAY',
          checklist: [
            { text: 'Finish Python API', done: false },
            { text: 'Work on project', done: false }
          ],
          x: 140,
          y: 140,
          width: 330,
          height: 190,
          color: '#101422',
          textColor: '#f4f4f5',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          glass: 'blur',
          borderRadius: 12,
          shadow: 'medium',
          zIndex: 10
        },
        {
          id: 'note_sb_important',
          type: 'reminder',
          title: 'IMPORTANT',
          body: 'Build something worth using.\nLandscape wallpaper remains clear and visible.',
          date: 'Active Focus',
          priority: 'high',
          x: 1450,
          y: 140,
          width: 330,
          height: 160,
          color: '#1a1429',
          textColor: '#f4f4f5',
          fontFamily: "'Inter', sans-serif",
          glass: 'blur',
          borderRadius: 12,
          shadow: 'medium',
          zIndex: 9
        }
      ]
    },
    {
      id: 'developer-desk',
      name: 'Developer Desk',
      desc: 'Active sprint tasks, Current project card, Quick links, and Technical ideas.',
      background: {
        type: 'builtin',
        style: 'dark-solid',
        color: '#09090b'
      },
      notes: [
        {
          type: 'checklist',
          title: 'TODAY',
          checklist: [
            { text: 'Code', done: true },
            { text: 'Debug', done: false },
            { text: 'Test', done: false },
            { text: 'Push', done: false }
          ],
          x: 140,
          y: 120,
          width: 320,
          height: 220,
          color: '#18181b',
          tag: '#dev',
          priority: 'high',
          borderRadius: 12
        },
        {
          type: 'standard',
          title: 'CURRENT PROJECT',
          body: 'NoteWall — Creative Windows Wallpaper Studio.\nVersion: 1.0 Release build.',
          x: 500,
          y: 120,
          width: 320,
          height: 160,
          color: '#1e1b4b',
          fontFamily: "'JetBrains Mono', monospace",
          borderRadius: 12
        },
        {
          type: 'link',
          title: 'QUICK LINKS',
          links: [
            { label: 'GitHub', url: 'https://github.com' },
            { label: 'Portfolio', url: 'https://portfolio.dev' },
            { label: 'Documentation', url: 'https://docs.microsoft.com' }
          ],
          x: 140,
          y: 380,
          width: 320,
          height: 190,
          color: '#18181b',
          borderRadius: 12
        },
        {
          type: 'standard',
          title: 'IDEAS',
          body: 'Project ideas and technical notes:\n- Local AI agent sidecar\n- Windows taskbar live stats widget',
          x: 500,
          y: 310,
          width: 320,
          height: 180,
          color: '#1f1a3a',
          borderRadius: 12
        }
      ]
    },
    {
      id: 'study-desk',
      name: 'Study Desk',
      desc: 'Today\'s study checklist, Deadlines alert, and Important things to remember.',
      background: {
        type: 'builtin',
        style: 'minimal-gradient'
      },
      notes: [
        {
          type: 'checklist',
          title: "TODAY'S STUDY",
          checklist: [
            { text: 'Mathematics', done: true },
            { text: 'Programming', done: false },
            { text: 'Revision', done: false }
          ],
          x: 160,
          y: 130,
          width: 320,
          height: 210,
          color: '#1c1917',
          tag: '#study',
          priority: 'high',
          borderRadius: 12
        },
        {
          type: 'reminder',
          title: 'DEADLINES',
          body: 'Next assignment due Thursday.\nNext exam on Monday 9 AM.',
          date: 'Upcoming Deadlines',
          priority: 'critical',
          x: 520,
          y: 130,
          width: 320,
          height: 160,
          color: '#450a0a',
          borderRadius: 12
        },
        {
          type: 'standard',
          title: 'IMPORTANT',
          body: 'Things to remember:\n- Bring calculator to exam\n- Review chapter 8 flashcards\n- Submit lab code repository',
          x: 160,
          y: 380,
          width: 320,
          height: 180,
          color: '#1e293b',
          borderRadius: 12
        }
      ]
    },
    {
      id: 'weekly-planner',
      name: 'Weekly Planner',
      desc: 'Monday through Weekend boards with actionable daily task cards.',
      background: {
        type: 'builtin',
        style: 'dark-solid',
        color: '#09090b'
      },
      notes: [
        {
          type: 'checklist',
          title: 'MONDAY',
          checklist: [{ text: 'Team sync', done: true }, { text: 'Sprint kick-off', done: false }],
          x: 80,
          y: 120,
          width: 250,
          height: 200,
          color: '#18181b',
          borderRadius: 10
        },
        {
          type: 'checklist',
          title: 'TUESDAY',
          checklist: [{ text: 'Deep coding', done: false }, { text: 'API design review', done: false }],
          x: 360,
          y: 120,
          width: 250,
          height: 200,
          color: '#18181b',
          borderRadius: 10
        },
        {
          type: 'checklist',
          title: 'WEDNESDAY',
          checklist: [{ text: 'Architecture doc', done: false }, { text: '1-on-1 catchup', done: false }],
          x: 640,
          y: 120,
          width: 250,
          height: 200,
          color: '#18181b',
          borderRadius: 10
        },
        {
          type: 'checklist',
          title: 'THURSDAY',
          checklist: [{ text: 'Code reviews', done: false }, { text: 'Staging deployment', done: false }],
          x: 80,
          y: 360,
          width: 250,
          height: 200,
          color: '#18181b',
          borderRadius: 10
        },
        {
          type: 'checklist',
          title: 'FRIDAY',
          checklist: [{ text: 'Weekly retrospective', done: false }, { text: 'Release build', done: false }],
          x: 360,
          y: 360,
          width: 250,
          height: 200,
          color: '#18181b',
          borderRadius: 10
        },
        {
          type: 'checklist',
          title: 'WEEKEND',
          checklist: [{ text: 'Rest & recharge', done: false }, { text: 'Read book chapter', done: false }],
          x: 640,
          y: 360,
          width: 250,
          height: 200,
          color: '#1e1b4b',
          borderRadius: 10
        }
      ]
    },
    {
      id: 'minimal',
      name: 'Minimal',
      desc: 'Only Today, Focus, and Reminder with very minimal styling and lots of empty space.',
      background: {
        type: 'builtin',
        style: 'dark-solid',
        color: '#060608'
      },
      notes: [
        {
          type: 'standard',
          title: 'TODAY',
          body: 'Ship NoteWall.\nOne main outcome.',
          x: 180,
          y: 180,
          width: 320,
          height: 150,
          color: '#121215',
          fontFamily: "'Inter', sans-serif",
          borderRadius: 16,
          shadow: 'subtle'
        },
        {
          type: 'quote',
          title: 'FOCUS',
          body: 'Simplicity is the ultimate sophistication.',
          tag: 'Leonardo da Vinci',
          x: 180,
          y: 370,
          width: 320,
          height: 150,
          color: '#121215',
          fontFamily: "'Playfair Display', serif",
          borderRadius: 16,
          shadow: 'subtle'
        },
        {
          type: 'reminder',
          title: 'REMINDER',
          body: 'Step away from screen every 90 minutes.',
          date: 'Continuous',
          x: 180,
          y: 560,
          width: 320,
          height: 140,
          color: '#121215',
          borderRadius: 16,
          shadow: 'subtle'
        }
      ]
    },
    {
      id: 'dark-workspace',
      name: 'Dark Workspace Studio',
      desc: 'Sleek midnight dark background with radiant modern accents.',
      background: {
        type: 'builtin',
        style: 'abstract-dark'
      },
      notes: [
        {
          type: 'standard',
          title: 'ACTIVE FOCUS',
          body: 'Deep work sprint: No distractions, phone on Do Not Disturb.',
          x: 160,
          y: 130,
          width: 320,
          height: 160,
          color: '#18181b',
          shadow: 'glow',
          tag: '#deepwork',
          priority: 'high',
          glass: 'blur',
          borderRadius: 16
        },
        {
          type: 'checklist',
          title: 'PROJECT MILESTONES',
          checklist: [
            { text: 'Figma UI design tokens approved', done: true },
            { text: 'Native Win32 Wallpaper API bridge', done: true },
            { text: 'Multi-monitor desktop preview test', done: false },
            { text: 'High-res PNG render pipeline', done: false }
          ],
          x: 510,
          y: 130,
          width: 340,
          height: 220,
          color: '#1e1b4b',
          tag: '#milestone',
          shadow: 'deep',
          borderRadius: 16
        }
      ]
    }
  ];

  function init() {
    renderTemplatesModal();
  }

  function renderTemplatesModal() {
    const grid = document.getElementById('templates-grid');
    if (!grid) return;
    grid.innerHTML = '';

    templates.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'template-card';

      card.innerHTML = `
        <div class="template-preview-box" style="display:flex; align-items:center; justify-content:center; background:#121215; border:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:24px;">${getTemplateEmoji(tpl.id)}</div>
        </div>
        <div class="template-name">${tpl.name}</div>
        <div class="template-desc">${tpl.desc}</div>
      `;

      card.addEventListener('click', () => {
        applyTemplate(tpl.id);
        document.getElementById('modal-templates')?.classList.remove('open');
      });

      grid.appendChild(card);
    });
  }

  function getTemplateEmoji(id) {
    switch (id) {
      case 'developer-desk': return '⚡';
      case 'study-desk': return '📚';
      case 'weekly-planner': return '📅';
      case 'minimal': return '✨';
      case 'dark-workspace': return '🌌';
      default: return '📝';
    }
  }

  function applyTemplate(id) {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;

    NoteWallState.pushHistory(`Apply Template: ${tpl.name}`);
    const proj = NoteWallState.getProject();
    proj.name = tpl.name;
    proj.background = JSON.parse(JSON.stringify(tpl.background));

    // Deep copy notes with fresh IDs
    proj.notes = tpl.notes.map((n, i) => ({
      ...n,
      id: 'note_' + Date.now() + '_' + i,
      zIndex: i + 1,
      isVisible: true,
      isLocked: false
    }));

    const nameInput = document.getElementById('project-name-input');
    if (nameInput) nameInput.value = proj.name;

    NoteWallCanvas.renderBackground();
    NoteWallNotes.renderAllNotes();
    NoteWallCanvas.fitToScreen();
    if (window.NoteWallProperties) NoteWallProperties.syncBackgroundControls();
    NoteWallApp.showToast(`Applied "${tpl.name}" template`);
  }

  return {
    init,
    templates,
    applyTemplate,
    getDefaultProject
  };
})();
