# =============================================================
# main.py — NFSU2 Save Data Editor by Piererra
# Entry point — run directly or compile with PyInstaller.
#
# Usage:
#   python main.py
#
# Build (Windows):
#   build.bat
# =============================================================

import tkinter as tk
from nfsu2_editor.app import App


def main():
    root = tk.Tk()
    app  = App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
