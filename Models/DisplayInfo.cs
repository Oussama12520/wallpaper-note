namespace NoteWall.Models
{
    public class DisplayInfo
    {
        public int Index { get; set; }
        public string DeviceName { get; set; } = string.Empty;
        public string DeviceId { get; set; } = string.Empty;
        public int Width { get; set; }
        public int Height { get; set; }
        public bool IsPrimary { get; set; }
        public int BoundsX { get; set; }
        public int BoundsY { get; set; }
        public double ScaleFactor { get; set; } = 1.0;
        public string DisplayLabel => $"Monitor {Index + 1} ({Width}x{Height}){(IsPrimary ? " - Primary" : "")}";
    }
}
