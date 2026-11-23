using System;
using System.Collections.Generic;
using System.Windows.Forms;
using NoteWall.Models;

namespace NoteWall.Services
{
    public static class DisplayService
    {
        public static List<DisplayInfo> GetDisplays()
        {
            var list = new List<DisplayInfo>();
            var screens = Screen.AllScreens;

            for (int i = 0; i < screens.Length; i++)
            {
                var s = screens[i];
                list.Add(new DisplayInfo
                {
                    Index = i,
                    DeviceName = s.DeviceName,
                    DeviceId = s.DeviceName.Replace(@"\\.\", ""),
                    Width = s.Bounds.Width,
                    Height = s.Bounds.Height,
                    IsPrimary = s.Primary,
                    BoundsX = s.Bounds.X,
                    BoundsY = s.Bounds.Y,
                    ScaleFactor = 1.0 // In standard scaling
                });
            }

            return list;
        }

        public static DisplayInfo GetPrimaryDisplay()
        {
            var primary = Screen.PrimaryScreen ?? Screen.AllScreens[0];
            return new DisplayInfo
            {
                Index = 0,
                DeviceName = primary.DeviceName,
                DeviceId = primary.DeviceName.Replace(@"\\.\", ""),
                Width = primary.Bounds.Width,
                Height = primary.Bounds.Height,
                IsPrimary = true,
                BoundsX = primary.Bounds.X,
                BoundsY = primary.Bounds.Y
            };
        }
    }
}
