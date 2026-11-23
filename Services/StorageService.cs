using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace NoteWall.Services
{
    public class WallpaperHistoryItem
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string ProjectName { get; set; } = "Untitled Project";
        public string ImagePath { get; set; } = string.Empty;
        public string ThumbnailBase64 { get; set; } = string.Empty;
        public string AppliedAt { get; set; } = DateTime.Now.ToString("g");
        public string MonitorName { get; set; } = "All Monitors";
        public int Width { get; set; } = 1920;
        public int Height { get; set; } = 1080;
    }

    public class RecentProjectItem
    {
        public string Name { get; set; } = "Workspace";
        public string FilePath { get; set; } = string.Empty;
        public string LastModified { get; set; } = DateTime.Now.ToString("g");
    }

    public static class StorageService
    {
        private static readonly string AppDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "NoteWall");
        private static readonly string ProjectsFolder = Path.Combine(AppDataFolder, "projects");
        private static readonly string HistoryFile = Path.Combine(AppDataFolder, "wallpaper_history.json");
        private static readonly string RecentFile = Path.Combine(AppDataFolder, "recent_projects.json");
        private static readonly string AutosaveFile = Path.Combine(AppDataFolder, "autosave.notewall");

        static StorageService()
        {
            if (!Directory.Exists(AppDataFolder)) Directory.CreateDirectory(AppDataFolder);
            if (!Directory.Exists(ProjectsFolder)) Directory.CreateDirectory(ProjectsFolder);
        }

        public static string GetProjectsFolder() => ProjectsFolder;
        public static string GetAppDataFolder() => AppDataFolder;

        public static void SaveAutosave(string projectJson)
        {
            try
            {
                File.WriteAllText(AutosaveFile, projectJson);
            }
            catch { }
        }

        public static string? LoadAutosave()
        {
            try
            {
                if (File.Exists(AutosaveFile))
                    return File.ReadAllText(AutosaveFile);
            }
            catch { }
            return null;
        }

        public static void AddRecentProject(string name, string filePath)
        {
            try
            {
                var list = GetRecentProjects();
                list.RemoveAll(x => x.FilePath.Equals(filePath, StringComparison.OrdinalIgnoreCase));
                list.Insert(0, new RecentProjectItem
                {
                    Name = name,
                    FilePath = filePath,
                    LastModified = DateTime.Now.ToString("g")
                });
                if (list.Count > 10) list = list.GetRange(0, 10);
                File.WriteAllText(RecentFile, JsonSerializer.Serialize(list));
            }
            catch { }
        }

        public static List<RecentProjectItem> GetRecentProjects()
        {
            try
            {
                if (File.Exists(RecentFile))
                {
                    string json = File.ReadAllText(RecentFile);
                    return JsonSerializer.Deserialize<List<RecentProjectItem>>(json) ?? new List<RecentProjectItem>();
                }
            }
            catch { }
            return new List<RecentProjectItem>();
        }

        public static void AddWallpaperHistory(WallpaperHistoryItem item)
        {
            try
            {
                var history = GetWallpaperHistory();
                history.Insert(0, item);
                if (history.Count > 20) history = history.GetRange(0, 20);
                File.WriteAllText(HistoryFile, JsonSerializer.Serialize(history));
            }
            catch { }
        }

        public static List<WallpaperHistoryItem> GetWallpaperHistory()
        {
            try
            {
                if (File.Exists(HistoryFile))
                {
                    string json = File.ReadAllText(HistoryFile);
                    return JsonSerializer.Deserialize<List<WallpaperHistoryItem>>(json) ?? new List<WallpaperHistoryItem>();
                }
            }
            catch { }
            return new List<WallpaperHistoryItem>();
        }
    }
}
