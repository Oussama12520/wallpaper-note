using System;
using System.Runtime.InteropServices;
using System.Windows.Interop;

namespace NoteWall.Services
{
    public class HotKeyService : IDisposable
    {
        private const int WM_HOTKEY = 0x0312;
        private const uint MOD_CONTROL = 0x0002;
        private const uint MOD_SHIFT = 0x0004;
        private const uint VK_N = 0x4E;
        private const int HOTKEY_ID = 9001;

        [DllImport("user32.dll")]
        private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

        [DllImport("user32.dll")]
        private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        private IntPtr _hWnd;
        private HwndSource? _source;
        public event Action? QuickNoteTriggered;

        public void Register(IntPtr hWnd)
        {
            _hWnd = hWnd;
            _source = HwndSource.FromHwnd(hWnd);
            _source?.AddHook(HwndHook);

            // Register Ctrl + Shift + N
            RegisterHotKey(_hWnd, HOTKEY_ID, MOD_CONTROL | MOD_SHIFT, VK_N);
        }

        private IntPtr HwndHook(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            if (msg == WM_HOTKEY && wParam.ToInt32() == HOTKEY_ID)
            {
                QuickNoteTriggered?.Invoke();
                handled = true;
            }
            return IntPtr.Zero;
        }

        public void Dispose()
        {
            if (_hWnd != IntPtr.Zero)
            {
                UnregisterHotKey(_hWnd, HOTKEY_ID);
                _source?.RemoveHook(HwndHook);
                _hWnd = IntPtr.Zero;
            }
        }
    }
}
