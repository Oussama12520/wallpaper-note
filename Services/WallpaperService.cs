using System;
using System.IO;
using System.Runtime.InteropServices;

namespace NoteWall.Services
{
    public static class WallpaperService
    {
        private const int SPI_SETDESKWALLPAPER = 0x0014;
        private const int SPIF_UPDATEINIFILE = 0x01;
        private const int SPIF_SENDCHANGE = 0x02;

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);

        [ComImport]
        [Guid("B92CAFC8-0377-4369-BE5E-07D2C04D4E81")]
        [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IDesktopWallpaper
        {
            void SetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string? monitorID, [MarshalAs(UnmanagedType.LPWStr)] string wallpaper);
            [return: MarshalAs(UnmanagedType.LPWStr)]
            string GetWallpaper([MarshalAs(UnmanagedType.LPWStr)] string? monitorID);
            [return: MarshalAs(UnmanagedType.LPWStr)]
            string GetMonitorDevicePathAt(uint monitorIndex);
            uint GetMonitorDevicePathCount();
            void GetMonitorRECT([MarshalAs(UnmanagedType.LPWStr)] string monitorID, out RECT displayRect);
            void SetBackgroundColor(uint color);
            uint GetBackgroundColor();
            void SetPosition(DesktopWallpaperPosition position);
            DesktopWallpaperPosition GetPosition();
            void SetSlideshow(IntPtr items);
            IntPtr GetSlideshow();
            void SetSlideshowOptions(DesktopSlideshowDirection direction, uint slideshowTick);
            void GetSlideshowOptions(out DesktopSlideshowDirection direction, out uint slideshowTick);
            void AdvanceSlideshow([MarshalAs(UnmanagedType.LPWStr)] string monitorID, DesktopSlideshowDirection direction);
            DesktopSlideshowStatus GetStatus();
            bool Enable();
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }

        private enum DesktopWallpaperPosition
        {
            Center = 0,
            Tile = 1,
            Stretch = 2,
            Fit = 3,
            Fill = 4,
            Span = 5
        }

        private enum DesktopSlideshowDirection
        {
            Forward = 0,
            Backward = 1
        }

        private enum DesktopSlideshowStatus
        {
            Enabled = 0x01,
            Slideshow = 0x02,
            DisabledByRemoteSession = 0x04
        }

        [ComImport]
        [Guid("C2CF3110-460E-48D1-B9D0-85A60FA772C6")]
        private class DesktopWallpaperClass
        {
        }

        /// <summary>
        /// Sets wallpaper to the specified image path.
        /// If monitorIndex >= 0, attempts to set per-monitor using IDesktopWallpaper.
        /// Otherwise applies to all monitors.
        /// </summary>
        public static bool ApplyWallpaper(string imagePath, int monitorIndex = -1)
        {
            if (!File.Exists(imagePath))
                throw new FileNotFoundException("Wallpaper image file not found", imagePath);

            bool success = false;

            // Attempt per-monitor or global COM interface first (Windows 8/10/11)
            try
            {
                var desktopWallpaper = (IDesktopWallpaper)new DesktopWallpaperClass();
                if (monitorIndex >= 0)
                {
                    uint count = desktopWallpaper.GetMonitorDevicePathCount();
                    if (monitorIndex < count)
                    {
                        string monitorId = desktopWallpaper.GetMonitorDevicePathAt((uint)monitorIndex);
                        desktopWallpaper.SetWallpaper(monitorId, imagePath);
                        success = true;
                    }
                    else
                    {
                        // Fall back to all monitors
                        desktopWallpaper.SetWallpaper(null, imagePath);
                        success = true;
                    }
                }
                else
                {
                    desktopWallpaper.SetWallpaper(null, imagePath);
                    success = true;
                }
            }
            catch (Exception)
            {
                // Fall back to classic Win32 SystemParametersInfo
                int result = SystemParametersInfo(SPI_SETDESKWALLPAPER, 0, imagePath, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE);
                success = result != 0;
            }

            return success;
        }

        /// <summary>
        /// Saves base64 PNG data into NoteWall wallpapers directory and sets it as wallpaper.
        /// </summary>
        public static (bool Success, string SavedPath, string Error) ApplyWallpaperFromBase64(string base64Png, int monitorIndex = -1)
        {
            try
            {
                if (base64Png.Contains(","))
                {
                    base64Png = base64Png.Substring(base64Png.IndexOf(",") + 1);
                }

                byte[] imageBytes = Convert.FromBase64String(base64Png);
                string wallDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "NoteWall", "wallpapers");
                if (!Directory.Exists(wallDir))
                {
                    Directory.CreateDirectory(wallDir);
                }

                string fileName = $"wallpaper_{DateTime.Now:yyyyMMdd_HHmmss}_{Guid.NewGuid().ToString().Substring(0, 6)}.png";
                string fullPath = Path.Combine(wallDir, fileName);
                File.WriteAllBytes(fullPath, imageBytes);

                bool result = ApplyWallpaper(fullPath, monitorIndex);
                if (result)
                {
                    return (true, fullPath, string.Empty);
                }
                return (false, fullPath, "Windows SystemParametersInfo reported non-zero error.");
            }
            catch (Exception ex)
            {
                return (false, string.Empty, ex.Message);
            }
        }
    }
}
