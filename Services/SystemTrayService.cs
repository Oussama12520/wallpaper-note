using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace NoteWall.Services
{
    public class SystemTrayService : IDisposable
    {
        private NotifyIcon? _notifyIcon;
        public event Action? OpenRequested;
        public event Action? QuickNoteRequested;
        public event Action? ApplyCurrentRequested;
        public event Action? SettingsRequested;
        public event Action? ExitRequested;

        public void Initialize()
        {
            _notifyIcon = new NotifyIcon();
            _notifyIcon.Text = "NoteWall - Creative Desktop Wallpaper";
            _notifyIcon.Visible = true;

            // Create a sleek default tray icon if file not present
            try
            {
                string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Assets", "icon.ico");
                if (File.Exists(iconPath))
                {
                    _notifyIcon.Icon = new Icon(iconPath);
                }
                else
                {
                    // Generate procedural icon
                    using var bmp = new Bitmap(16, 16);
                    using var g = Graphics.FromImage(bmp);
                    g.Clear(Color.FromArgb(99, 102, 241));
                    using var brush = new SolidBrush(Color.White);
                    g.FillRectangle(brush, 3, 3, 10, 10);
                    _notifyIcon.Icon = Icon.FromHandle(bmp.GetHicon());
                }
            }
            catch
            {
                _notifyIcon.Icon = SystemIcons.Application;
            }

            var contextMenu = new ContextMenuStrip();
            
            var itemOpen = new ToolStripMenuItem("Open NoteWall", null, (s, e) => OpenRequested?.Invoke());
            itemOpen.Font = new Font(itemOpen.Font, FontStyle.Bold);
            contextMenu.Items.Add(itemOpen);

            contextMenu.Items.Add(new ToolStripMenuItem("Quick Note (Ctrl+Shift+N)", null, (s, e) => QuickNoteRequested?.Invoke()));
            contextMenu.Items.Add(new ToolStripMenuItem("Apply Current Wallpaper", null, (s, e) => ApplyCurrentRequested?.Invoke()));
            contextMenu.Items.Add(new ToolStripSeparator());
            contextMenu.Items.Add(new ToolStripMenuItem("Settings", null, (s, e) => SettingsRequested?.Invoke()));
            contextMenu.Items.Add(new ToolStripSeparator());
            contextMenu.Items.Add(new ToolStripMenuItem("Exit NoteWall", null, (s, e) => ExitRequested?.Invoke()));

            _notifyIcon.ContextMenuStrip = contextMenu;
            _notifyIcon.DoubleClick += (s, e) => OpenRequested?.Invoke();
        }

        public void ShowNotification(string title, string text)
        {
            _notifyIcon?.ShowBalloonTip(3000, title, text, ToolTipIcon.Info);
        }

        public void Dispose()
        {
            if (_notifyIcon != null)
            {
                _notifyIcon.Visible = false;
                _notifyIcon.Dispose();
                _notifyIcon = null;
            }
        }
    }
}
