// ==============================================================================
// Forenlytics Desktop Standalone - Electron Main Process
// ==============================================================================

const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn, exec } = require("child_process");
const treeKill = require("tree-kill");

let splashWindow = null;
let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;
let isQuitting = false;

const DEFAULT_BACKEND_PORT = 8000;
const DEFAULT_FRONTEND_PORT = 3000;
let backendPort = DEFAULT_BACKEND_PORT;
let frontendPort = DEFAULT_FRONTEND_PORT;

const isDev = !app.isPackaged && process.env.NODE_ENV === "development";

// ── Path Resolvers ────────────────────────────────────────────────────────────

function getAppRootDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app");
  }
  return path.resolve(__dirname, "..");
}

function getBackendExecutable() {
  const rootDir = getAppRootDir();
  const isWin = process.platform === "win32";

  if (app.isPackaged) {
    // Check for PyInstaller standalone binary in resources
    const binExt = isWin ? ".exe" : "";
    const standaloneBinary = path.join(process.resourcesPath, "backend", `forenlytics-backend${binExt}`);
    if (fs.existsSync(standaloneBinary)) {
      return { type: "binary", path: standaloneBinary, args: [] };
    }
  }

  // Fallback to python script
  const venvPython = isWin
    ? path.join(rootDir, "backend", "venv", "Scripts", "python.exe")
    : path.join(rootDir, "backend", "venv", "bin", "python");

  if (fs.existsSync(venvPython)) {
    return {
      type: "python",
      path: venvPython,
      args: ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", String(backendPort)],
      cwd: path.join(rootDir, "backend")
    };
  }

  // System python fallback
  return {
    type: "python",
    path: isWin ? "python" : "python3",
    args: ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", String(backendPort)],
    cwd: path.join(rootDir, "backend")
  };
}

// ── Backend Process Manager ───────────────────────────────────────────────────

function startBackend() {
  return new Promise((resolve, reject) => {
    const rootDir = getAppRootDir();
    const backendConfig = getBackendExecutable();

    const env = {
      ...process.env,
      PORT: String(backendPort),
      PYTHONUNBUFFERED: "1",
      PYTHONDONTWRITEBYTECODE: "1",
      HF_HUB_OFFLINE: "1",
      TRANSFORMERS_OFFLINE: "1",
      TORCH_HOME: path.join(rootDir, "models", "torch"),
      HF_HOME: path.join(rootDir, "models", "huggingface"),
      TRANSFORMERS_CACHE: path.join(rootDir, "models", "huggingface", "hub"),
      SPEECHBRAIN_CACHE_DIR: path.join(rootDir, "models", "speechbrain"),
    };

    console.log(`[Desktop Main] Starting Forensic Backend via: ${backendConfig.path}`);

    if (backendConfig.type === "binary") {
      backendProcess = spawn(backendConfig.path, backendConfig.args, {
        env,
        cwd: path.dirname(backendConfig.path),
        stdio: ["ignore", "pipe", "pipe"],
      });
    } else {
      backendProcess = spawn(backendConfig.path, backendConfig.args, {
        env,
        cwd: backendConfig.cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });
    }

    backendProcess.stdout.on("data", (data) => {
      console.log(`[Backend stdout] ${data.toString().trim()}`);
    });

    backendProcess.stderr.on("data", (data) => {
      console.error(`[Backend stderr] ${data.toString().trim()}`);
    });

    backendProcess.on("error", (err) => {
      console.error("[Backend Process Error]", err);
      reject(err);
    });

    backendProcess.on("exit", (code, signal) => {
      console.log(`[Backend Process Exited] Code: ${code}, Signal: ${signal}`);
      if (!isQuitting && code !== 0 && code !== null) {
        dialog.showErrorBox(
          "Forenlytics Forensic Engine Error",
          `The backend analysis process terminated unexpectedly (Code: ${code}).\nPlease restart the application.`
        );
      }
    });

    // Poll Health Endpoint
    pollBackendHealth(backendPort, 60, resolve, reject);
  });
}

function pollBackendHealth(port, maxAttempts, resolve, reject) {
  let attempts = 0;
  const url = `http://127.0.0.1:${port}/health`;

  const interval = setInterval(() => {
    attempts++;
    console.log(`[Desktop Main] Checking Backend Health (${attempts}/${maxAttempts})...`);

    const req = http.get(url, { timeout: 1500 }, (res) => {
      if (res.statusCode === 200) {
        clearInterval(interval);
        console.log("[Desktop Main] Backend is HEALTHY and READY!");
        resolve();
      }
    });

    req.on("error", () => {
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        reject(new Error("Forenlytics backend failed to start or timed out."));
      }
    });

    req.on("timeout", () => {
      req.destroy();
    });
  }, 1000);
}

// ── Standalone Frontend Manager (Production) ──────────────────────────────────

function startFrontendStandalone() {
  return new Promise((resolve) => {
    if (isDev) {
      resolve();
      return;
    }

    const rootDir = getAppRootDir();
    const serverPath = path.join(rootDir, "frontend", "server.js");

    if (fs.existsSync(serverPath)) {
      console.log(`[Desktop Main] Starting Next.js Standalone server: ${serverPath}`);
      const env = {
        ...process.env,
        PORT: String(frontendPort),
        HOSTNAME: "127.0.0.1",
        NODE_ENV: "production",
        BACKEND_URL: `http://127.0.0.1:${backendPort}`,
      };

      frontendProcess = spawn(process.execPath, [serverPath], {
        env,
        cwd: path.dirname(serverPath),
        stdio: ["ignore", "pipe", "pipe"],
      });

      frontendProcess.stdout.on("data", (data) => console.log(`[Next.js] ${data.toString().trim()}`));
      frontendProcess.stderr.on("data", (data) => console.error(`[Next.js err] ${data.toString().trim()}`));

      setTimeout(resolve, 1500);
    } else {
      console.log("[Desktop Main] No standalone Next.js server found, loading directly or relying on external dev server.");
      resolve();
    }
  });
}

// ── Window Management ─────────────────────────────────────────────────────────

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 380,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: true,
    icon: path.join(__dirname, process.platform === "win32" ? "icon.ico" : "icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0B0F19",
    show: false,
    icon: path.join(__dirname, process.platform === "win32" ? "icon.ico" : "icon.png"),
    title: "Forenlytics - Forensic Audio Examination Platform (Standalone Edition)",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const targetUrl = `http://127.0.0.1:${frontendPort}`;
  console.log(`[Desktop Main] Loading frontend UI from: ${targetUrl}`);
  mainWindow.loadURL(targetUrl);

  mainWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  setupMenu();
}

function setupMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow && mainWindow.reload(),
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Developer Tools",
          accelerator: "F12",
          click: () => mainWindow && mainWindow.webContents.toggleDevTools(),
        },
        { type: "separator" },
        { role: "resetZoom", label: "Actual Size" },
        { role: "zoomIn", label: "Zoom In" },
        { role: "zoomOut", label: "Zoom Out" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Toggle Full Screen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation & Repository",
          click: () => shell.openExternal("https://github.com/yusufcalisir/Forenlytics"),
        },
        {
          label: "About Forenlytics",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: "About Forenlytics",
              message: "Forenlytics Forensic Audio Intelligence Platform",
              detail: "Version: 2.0.0 (Standalone Air-Gapped Edition)\nDesigned for Digital Forensic Examiners & Law Enforcement Crime Laboratories.",
              buttons: ["OK"],
              icon: path.join(__dirname, "icon.png"),
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ── Native IPC Handlers ───────────────────────────────────────────────────────

ipcMain.handle("get-backend-port", () => backendPort);
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("get-system-info", () => ({
  platform: process.platform,
  arch: process.arch,
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
}));

ipcMain.handle("open-audio-dialog", async (_, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || "Select Forensic Audio File",
    properties: ["openFile"],
    filters: [
      { name: "Audio Files (*.wav, *.mp3, *.flac, *.ogg)", extensions: ["wav", "mp3", "flac", "ogg"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  return result;
});

ipcMain.handle("save-report-dialog", async (_, { data, defaultName }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Save Forensic Audio Docket (PDF)",
    defaultPath: defaultName || "Forenlytics_Audio_Docket.pdf",
    filters: [{ name: "PDF Document (*.pdf)", extensions: ["pdf"] }],
  });

  if (!result.canceled && result.filePath) {
    try {
      const buffer = Buffer.from(data);
      fs.writeFileSync(result.filePath, buffer);
      return { success: true, path: result.filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, canceled: true };
});

ipcMain.handle("open-external", async (_, url) => {
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    await shell.openExternal(url);
  }
});

// ── Safe Cleanup on Exit ──────────────────────────────────────────────────────

function cleanExit() {
  if (isQuitting) return;
  isQuitting = true;
  console.log("[Desktop Main] Performing clean shutdown of backend & child processes...");

  if (backendProcess && backendProcess.pid) {
    try {
      treeKill(backendProcess.pid, "SIGKILL");
      console.log("[Desktop Main] Backend process terminated.");
    } catch (e) {
      console.error("[Desktop Main] Error killing backend process:", e);
    }
  }

  if (frontendProcess && frontendProcess.pid) {
    try {
      treeKill(frontendProcess.pid, "SIGKILL");
      console.log("[Desktop Main] Frontend process terminated.");
    } catch (e) {
      console.error("[Desktop Main] Error killing frontend process:", e);
    }
  }
}

app.on("before-quit", cleanExit);
app.on("will-quit", cleanExit);
process.on("SIGINT", () => { cleanExit(); process.exit(0); });
process.on("SIGTERM", () => { cleanExit(); process.exit(0); });

// ── App Startup Lifecycle ─────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createSplashWindow();

  try {
    await startBackend();
    await startFrontendStandalone();
    createMainWindow();
  } catch (err) {
    console.error("[Desktop Main] Initialization Failed:", err);
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    dialog.showErrorBox(
      "Forenlytics Initialization Error",
      `An error occurred while starting the application:\n\n${err.message}\n\nPlease check diagnostic logs.`
    );
    cleanExit();
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    cleanExit();
    app.quit();
  }
});
