using System;
using System.IO;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;
using NoteWall.Services;

namespace NoteWall
{
    public partial class MainWindow : Window
    {
        private SystemTrayService? _trayService;
        private HotKeyService? _hotKeyService;
        private NativeBridge? _nativeBridge;
        private QuickNoteWindow? _quickNoteWindow;

        public MainWindow()
        {
            InitializeComponent();
            Loaded += MainWindow_Loaded;
            Closing += (s, e) => App.Log($"MainWindow Closing called! Cancel={e.Cancel}");
            Closed += (s, e) => App.Log("MainWindow Closed called!");
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            App.Log("MainWindow_Loaded started.");
            try
            {
                // Initialize Tray
                App.Log("Initializing SystemTrayService...");
                _trayService = new SystemTrayService();
                _trayService.Initialize();
                _trayService.OpenRequested += () => Dispatcher.Invoke(RestoreAndFocus);
                _trayService.QuickNoteRequested += () => Dispatcher.Invoke(ShowQuickNote);
                _trayService.ApplyCurrentRequested += () => Dispatcher.Invoke(TriggerApplyCurrent);
                _trayService.SettingsRequested += () => Dispatcher.Invoke(TriggerOpenSettings);
                _trayService.ExitRequested += () => Dispatcher.Invoke(ExitApp);
                App.Log("SystemTrayService initialized.");

                // Initialize Quick Note Window
                App.Log("Initializing QuickNoteWindow...");
                _quickNoteWindow = new QuickNoteWindow();
                _quickNoteWindow.NoteSubmitted += (noteText) =>
                {
                    Dispatcher.Invoke(() =>
                    {
                        _nativeBridge?.SendEvent("quickNoteAdded", new { text = noteText });
                    });
                };
                App.Log("QuickNoteWindow initialized.");

                // Initialize HotKey Service (Ctrl+Shift+N)
                App.Log("Initializing HotKeyService...");
                var helper = new WindowInteropHelper(this);
                _hotKeyService = new HotKeyService();
                _hotKeyService.Register(helper.Handle);
                _hotKeyService.QuickNoteTriggered += () => Dispatcher.Invoke(ShowQuickNote);
                App.Log("HotKeyService registered.");

                // Initialize WebView2
                App.Log("Initializing WebView2 environment...");
                string userDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "NoteWall", "WebViewData");
                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                App.Log("CoreWebView2Environment created. Ensuring CoreWebView2...");
                await WebView.EnsureCoreWebView2Async(env);
                App.Log("CoreWebView2 ensured.");

                // Bridge setup
                _nativeBridge = new NativeBridge(this, WebView, _trayService);
                WebView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
                App.Log("NativeBridge wired up.");

                WebView.CoreWebView2.NavigationCompleted += (s, ev) =>
                {
                    App.Log($"NavigationCompleted: Success={ev.IsSuccess}, ErrorStatus={ev.WebErrorStatus}");
                };
                WebView.CoreWebView2.ProcessFailed += (s, ev) =>
                {
                    App.Log($"ProcessFailed: Kind={ev.ProcessFailedKind}, Reason={ev.Reason}");
                };

                // Load Web content
                string appDir = AppDomain.CurrentDomain.BaseDirectory;
                string htmlPath = Path.Combine(appDir, "Web", "index.html");

                // In case running from output directory or workspace source
                if (!File.Exists(htmlPath))
                {
                    htmlPath = Path.Combine(Directory.GetCurrentDirectory(), "Web", "index.html");
                }
                App.Log($"Resolved htmlPath: {htmlPath}");

                if (File.Exists(htmlPath))
                {
                    WebView.CoreWebView2.SetVirtualHostNameToFolderMapping("notewall.local", Path.GetDirectoryName(htmlPath)!, CoreWebView2HostResourceAccessKind.Allow);
                    WebView.CoreWebView2.Navigate("https://notewall.local/index.html");
                    App.Log("Navigated to https://notewall.local/index.html");
                }
                else
                {
                    App.Log($"File not found: {htmlPath}");
                    System.Windows.MessageBox.Show("Could not find Web/index.html at " + htmlPath, "NoteWall Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
            catch (Exception ex)
            {
                App.Log($"EXCEPTION in MainWindow_Loaded: {ex}");
                System.Windows.MessageBox.Show("Error initializing NoteWall: " + ex.Message, "NoteWall", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string message = e.TryGetWebMessageAsString();
                App.Log($"WebMessageReceived: {message}");
                if (!string.IsNullOrEmpty(message))
                {
                    _nativeBridge?.HandleMessage(message);
                }
            }
            catch (Exception ex)
            {
                App.Log($"Message error: {ex}");
                System.Diagnostics.Debug.WriteLine("Message error: " + ex.Message);
            }
        }

        public void RestoreAndFocus()
        {
            Show();
            if (WindowState == WindowState.Minimized)
            {
                WindowState = WindowState.Normal;
            }
            Activate();
            Focus();
        }

        public void ShowQuickNote()
        {
            _quickNoteWindow?.ShowAndFocus();
        }

        private void TriggerApplyCurrent()
        {
            RestoreAndFocus();
            _nativeBridge?.SendEvent("triggerApplyWallpaper", null);
        }

        private void TriggerOpenSettings()
        {
            RestoreAndFocus();
            _nativeBridge?.SendEvent("openSettings", null);
        }

        private void ExitApp()
        {
            _trayService?.Dispose();
            _hotKeyService?.Dispose();
            System.Windows.Application.Current.Shutdown();
        }

        private void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
        {
            // Clean up tray and hotkey
            _trayService?.Dispose();
            _hotKeyService?.Dispose();
            _quickNoteWindow?.Close();
        }
    }
}