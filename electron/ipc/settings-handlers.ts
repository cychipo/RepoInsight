import { ipcMain, app } from "electron";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";

const execAsync = promisify(exec);

export function registerSettingsHandlers() {
  const userDataPath = app.getPath("userData");
  const configPath = join(userDataPath, "config.json");

  // Get Git Config (Global or Local)
  ipcMain.handle("settings:getGitConfig", async (_, key: string, repoPath?: string) => {
    try {
      // If repoPath is provided, try to read local config first (implicitly)
      // git config <key> reads local then global.
      // If we want strictly local, we'd use --local, but usually we want "effective" config for the repo.
      // However, the user specifically asked for "repo specific config".
      // Let's use `git config <key>` inside the repo directory.
      const cmd = repoPath ? `git config ${key}` : `git config --global ${key}`;
      const cwd = repoPath ? repoPath : undefined;

      const { stdout } = await execAsync(cmd, { cwd });
      return stdout.trim();
    } catch (e) {
      return "";
    }
  });

  // Set Git Config (Global or Local)
  ipcMain.handle("settings:setGitConfig", async (_, key: string, value: string, repoPath?: string) => {
    try {
      const cmd = repoPath
        ? `git config --local ${key} "${value}"` // Enforce local config if inside repo
        : `git config --global ${key} "${value}"`;
      const cwd = repoPath ? repoPath : undefined;

      await execAsync(cmd, { cwd });
      return true;
    } catch (e) {
      console.error(`Failed to set git config ${key}:`, e);
      throw e;
    }
  });

  // Get API Key
  ipcMain.handle("settings:getApiKey", async () => {
    try {
      if (!existsSync(configPath)) return "";
      const content = await readFile(configPath, "utf-8");
      const config = JSON.parse(content);
      return config.geminiApiKey || "";
    } catch (e) {
      console.error("Failed to read config:", e);
      return "";
    }
  });

  // Set API Key
  ipcMain.handle("settings:setApiKey", async (_, apiKey: string) => {
    try {
      let config: any = {};
      if (existsSync(configPath)) {
        const content = await readFile(configPath, "utf-8");
        try {
          config = JSON.parse(content);
        } catch {}
      }
      config.geminiApiKey = apiKey;
      await writeFile(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (e) {
      console.error("Failed to save config:", e);
      throw e;
    }
  });
}
