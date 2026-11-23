using System;
using System.IO;
using System.Text.Json;
using System.Windows;
using Microsoft.Web.WebView2.Wpf;

namespace NoteWall.Services
{
    public class BridgeRequest
    {
        public string Action { get; set; } = string.Empty;
        public string? RequestId { get; set; }
        public JsonElement Payload { get; set; }
    }

    public class BridgeResponse
    {
        public string? RequestId { get; set; }
        public bool Success { get; set; }
        public object? Data { get; set; }
        public string? Error { get; set; }
    }

    public class NativeBridge
    {
        private readonly Window _window;
        private readonly WebView2 _webView;
        private readonly SystemTrayService _trayService;

        public NativeBridge(Window window, WebView2 webView, SystemTrayService trayService)
        {
            _window = window;
            _webView = webView;
            _trayService = trayService;
        }

        public void HandleMessage(string messageJson)
        {
            try
            {
                var req = JsonSerializer.Deserialize<BridgeRequest>(messageJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (req == null) return;

                ProcessAction(req);
            }
            catch (Exception ex)
            {
                SendError(null, ex.Message);
            }
        }

        private void ProcessAction(BridgeRequest req)
        {
            switch (req.Action.ToLowerInvariant())
            {
                case "getdisplays":
                    var displays = DisplayService.GetDisplays();
                    SendSuccess(req.RequestId, displays);
                    break;

                case "setwallpaper":
                    try
                    {
                        string base64 = req.Payload.GetProperty("base64").GetString() ?? "";
                        int monitorIndex = -1;
                        if (req.Payload.TryGetProperty("monitorIndex", out var monProp))
                        {
                            monitorIndex = monProp.GetInt32();
                        }
                        string projectName = req.Payload.TryGetProperty("projectName", out var pName) ? pName.GetString() ?? "Workspace" : "Workspace";
                        string monitorName = req.Payload.TryGetProperty("monitorName", out var mName) ? mName.GetString() ?? "All Monitors" : "All Monitors";
                        int width = req.Payload.TryGetProperty("width", out var wProp) ? wProp.GetInt32() : 1920;
                        int height = req.Payload.TryGetProperty("height", out var hProp) ? hProp.GetInt32() : 1080;

                        var result = WallpaperService.ApplyWallpaperFromBase64(base64, monitorIndex);
                        if (result.Success)
                        {
                            // Save into history
                            StorageService.AddWallpaperHistory(new WallpaperHistoryItem
                            {
                                ProjectName = projectName,
                                ImagePath = result.SavedPath,
                                MonitorName = monitorName,
                                Width = width,
                                Height = height,
                                AppliedAt = DateTime.Now.ToString("g")
                            });

                            _trayService.ShowNotification("NoteWall", "✓ Wallpaper applied successfully to your desktop!");
                            SendSuccess(req.RequestId, new { path = result.SavedPath });
                        }
                        else
                        {
                            SendError(req.RequestId, "Unable to apply wallpaper. Please check Windows wallpaper permissions: " + result.Error);
                        }
                    }
                    catch (Exception ex)
                    {
                        SendError(req.RequestId, "Failed to apply wallpaper: " + ex.Message);
                    }
                    break;

                case "exportpng":
                    try
                    {
                        string base64 = req.Payload.GetProperty("base64").GetString() ?? "";
                        string defaultName = req.Payload.TryGetProperty("fileName", out var fProp) ? fProp.GetString() ?? "notewall_wallpaper.png" : "notewall_wallpaper.png";

                        if (base64.Contains(",")) base64 = base64.Substring(base64.IndexOf(",") + 1);
                        byte[] bytes = Convert.FromBase64String(base64);

                        var sfd = new Microsoft.Win32.SaveFileDialog
                        {
                            Filter = "PNG Image (*.png)|*.png",
                            FileName = defaultName,
                            Title = "Export NoteWall Wallpaper"
                        };

                        if (sfd.ShowDialog() == true)
                        {
                            File.WriteAllBytes(sfd.FileName, bytes);
                            _trayService.ShowNotification("NoteWall", $"Wallpaper exported to {Path.GetFileName(sfd.FileName)}");
                            SendSuccess(req.RequestId, new { filePath = sfd.FileName });
                        }
                        else
                        {
                            SendError(req.RequestId, "Export cancelled by user");
                        }
                    }
                    catch (Exception ex)
                    {
                        SendError(req.RequestId, "Export failed: " + ex.Message);
                    }
                    break;

                case "saveproject":
                    try
                    {
                        string json = req.Payload.GetProperty("projectJson").GetString() ?? "";
                        string projName = req.Payload.TryGetProperty("projectName", out var pn) ? pn.GetString() ?? "Workspace" : "Workspace";

                        var sfd = new Microsoft.Win32.SaveFileDialog
                        {
                            Filter = "NoteWall Project (*.notewall)|*.notewall",
                            FileName = $"{projName}.notewall",
                            Title = "Save NoteWall Project"
                        };

                        if (sfd.ShowDialog() == true)
                        {
                            File.WriteAllText(sfd.FileName, json);
                            StorageService.AddRecentProject(projName, sfd.FileName);
                            SendSuccess(req.RequestId, new { filePath = sfd.FileName, name = Path.GetFileNameWithoutExtension(sfd.FileName) });
                        }
                        else
                        {
                            SendError(req.RequestId, "Save cancelled");
                        }
                    }
                    catch (Exception ex)
                    {
                        SendError(req.RequestId, "Unable to save project: " + ex.Message);
                    }
                    break;

                case "loadproject":
                    try
                    {
                        var ofd = new Microsoft.Win32.OpenFileDialog
                        {
                            Filter = "NoteWall Project (*.notewall)|*.notewall|All Files (*.*)|*.*",
                            Title = "Open NoteWall Project"
                        };

                        if (ofd.ShowDialog() == true)
                        {
                            string json = File.ReadAllText(ofd.FileName);
                            string projName = Path.GetFileNameWithoutExtension(ofd.FileName);
                            StorageService.AddRecentProject(projName, ofd.FileName);
                            SendSuccess(req.RequestId, new { json, filePath = ofd.FileName, name = projName });
                        }
                        else
                        {
                            SendError(req.RequestId, "Open cancelled");
                        }
                    }
                    catch (Exception ex)
                    {
                        SendError(req.RequestId, "Failed to load project: " + ex.Message);
                    }
                    break;

                case "loadrecentfile":
                    try
                    {
                        string path = req.Payload.GetProperty("filePath").GetString() ?? "";
                        if (File.Exists(path))
                        {
                            string json = File.ReadAllText(path);
                            string projName = Path.GetFileNameWithoutExtension(path);
                            StorageService.AddRecentProject(projName, path);
                            SendSuccess(req.RequestId, new { json, filePath = path, name = projName });
                        }
                        else
                        {
                            SendError(req.RequestId, "File not found: " + path);
                        }
                    }
                    catch (Exception ex)
                    {
                        SendError(req.RequestId, ex.Message);
                    }
                    break;

                case "autosave":
                    try
                    {
                        string json = "";
                        if (req.Payload.TryGetProperty("projectJson", out var pj) || req.Payload.TryGetProperty("ProjectJson", out pj))
                        {
                            json = pj.GetString() ?? "";
                        }
                        StorageService.SaveAutosave(json);
                        SendSuccess(req.RequestId, new { saved = true });
                    }
                    catch (Exception ex)
                    {
                        SendError(req.RequestId, ex.Message);
                    }
                    break;

                case "loadautosave":
                    try
                    {
                        string? json = StorageService.LoadAutosave();
                        SendSuccess(req.RequestId, new { json });
                    }
                    catch (Exception ex)
                    {
                        SendError(req.RequestId, ex.Message);
                    }
                    break;

                case "getwallpaperhistory":
                    var history = StorageService.GetWallpaperHistory();
                    SendSuccess(req.RequestId, history);
                    break;

                case "getrecentprojects":
                    var recents = StorageService.GetRecentProjects();
                    SendSuccess(req.RequestId, recents);
                    break;

                case "minimizetotray":
                    _window.Dispatcher.Invoke(() => _window.Hide());
                    _trayService.ShowNotification("NoteWall", "NoteWall is running in the background. Double-click tray icon or press Ctrl+Shift+N for Quick Note.");
                    SendSuccess(req.RequestId, true);
                    break;

                case "shownotification":
                    string title = req.Payload.GetProperty("title").GetString() ?? "NoteWall";
                    string msg = req.Payload.GetProperty("message").GetString() ?? "";
                    _trayService.ShowNotification(title, msg);
                    SendSuccess(req.RequestId, true);
                    break;

                default:
                    SendError(req.RequestId, "Unknown action: " + req.Action);
                    break;
            }
        }

        private void SendSuccess(string? requestId, object? data)
        {
            var res = new BridgeResponse
            {
                RequestId = requestId,
                Success = true,
                Data = data
            };
            SendJson(res);
        }

        private void SendError(string? requestId, string error)
        {
            var res = new BridgeResponse
            {
                RequestId = requestId,
                Success = false,
                Error = error
            };
            SendJson(res);
        }

        public void SendEvent(string eventName, object? data)
        {
            var msg = new
            {
                Event = eventName,
                Data = data
            };
            SendJson(msg);
        }

        private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        private void SendJson(object obj)
        {
            string json = JsonSerializer.Serialize(obj, JsonOptions);
            _window.Dispatcher.Invoke(() =>
            {
                _webView.CoreWebView2?.PostWebMessageAsJson(json);
            });
        }
    }
}
