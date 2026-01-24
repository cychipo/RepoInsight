import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Repository operations
  selectRepository: () => ipcRenderer.invoke("dialog:selectRepository"),
  validateRepository: (path: string) =>
    ipcRenderer.invoke("git:validateRepository", path),

  // Git operations
  getCommits: (repoPath: string, limit?: number) =>
    ipcRenderer.invoke("git:getCommits", repoPath, limit),
  getFileChanges: (repoPath: string, commitHash: string) =>
    ipcRenderer.invoke("git:getFileChanges", repoPath, commitHash),
  getRepositoryInfo: (repoPath: string) =>
    ipcRenderer.invoke("git:getRepositoryInfo", repoPath),
  getGitGraph: (repoPath: string, limit?: number) =>
    ipcRenderer.invoke("git:getGitGraph", repoPath, limit),

  // Analysis operations
  analyzeRepository: (repoPath: string) =>
    ipcRenderer.invoke("analysis:analyzeRepository", repoPath),
  getAnalysisProgress: () => ipcRenderer.invoke("analysis:getProgress"),

  // Event listeners for progress updates
  onAnalysisProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on("analysis:progress", (_, progress) => callback(progress));
  },
  removeAnalysisProgressListener: () => {
    ipcRenderer.removeAllListeners("analysis:progress");
  },
});
