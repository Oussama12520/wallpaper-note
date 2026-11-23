using System;
using System.Windows;
using System.Windows.Input;

namespace NoteWall
{
    public partial class QuickNoteWindow : Window
    {
        public event Action<string>? NoteSubmitted;

        public QuickNoteWindow()
        {
            InitializeComponent();
            Loaded += (s, e) =>
            {
                NoteInput.Focus();
            };
        }

        private void NoteInput_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                string text = NoteInput.Text.Trim();
                if (!string.IsNullOrEmpty(text))
                {
                    NoteSubmitted?.Invoke(text);
                    NoteInput.Clear();
                    Hide();
                }
            }
            else if (e.Key == Key.Escape)
            {
                NoteInput.Clear();
                Hide();
            }
        }

        private void Cancel_Click(object sender, RoutedEventArgs e)
        {
            NoteInput.Clear();
            Hide();
        }

        public void ShowAndFocus()
        {
            Show();
            Activate();
            NoteInput.Focus();
        }
    }
}
