import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { existsSync } from "fs";
import { registerGitHandlers } from "./ipc/git-handlers";
import { registerSettingsHandlers } from "./ipc/settings-handlers";

let mainWindow: BrowserWindow | null = null;


function createWindow() {
  // In dev mode, __dirname is dist-electron/, in production it's resources/app/dist-electron/
  const iconPath = process.env.VITE_DEV_SERVER_URL
    ? join(__dirname, "../../public/icon.png")
    : join(__dirname, "../dist/icon.png");

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: "#0f172a",
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Register IPC handlers
  registerGitHandlers();
  registerSettingsHandlers();

  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ==========================================
// IPC Handlers
// ==========================================

// Select repository folder dialog
ipcMain.handle("dialog:selectRepository", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openDirectory"],
    title: "Select Git Repository",
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, path: null };
  }

  const selectedPath = result.filePaths[0];
  const gitPath = join(selectedPath, ".git");
  const isValidRepo = existsSync(gitPath);

  return {
    success: isValidRepo,
    path: selectedPath,
    error: isValidRepo
      ? null
      : "Selected folder is not a Git repository (.git folder not found)",
  };
});

// Select directory for clone destination
ipcMain.handle("dialog:selectDirectory", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openDirectory", "createDirectory"],
    title: "Select Clone Destination",
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, path: null };
  }

  return { success: true, path: result.filePaths[0] };
});
