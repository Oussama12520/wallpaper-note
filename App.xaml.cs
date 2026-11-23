using System;
using System.IO;
using System.Windows;
using System.Windows.Threading;

namespace NoteWall;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : System.Windows.Application
{
    public static void Log(string msg)
    {
        try
        {
            string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "notewall_app.log");
            File.AppendAllText(logPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {msg}\r\n");
        }
        catch { }
    }

    protected override void OnStartup(StartupEventArgs e)
    {
        Log("Application OnStartup started.");

        AppDomain.CurrentDomain.UnhandledException += (s, args) =>
        {
            Log($"Unhandled AppDomain Exception: {args.ExceptionObject}");
        };

        DispatcherUnhandledException += (s, args) =>
        {
            Log($"Dispatcher Unhandled Exception: {args.Exception}");
            args.Handled = false;
        };

        base.OnStartup(e);
    }
}

