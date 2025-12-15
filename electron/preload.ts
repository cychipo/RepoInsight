import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Repository operations
  selectRepository: () => ipcRenderer.invoke("dialog:selectRepository"),
  selectDirectory: () => ipcRenderer.invoke("dialog:selectDirectory"),
  validateRepository: (path: string) =>
    ipcRenderer.invoke("git:validateRepository", path),

  // Git operations
  getCommits: (
    repoPath: string,
    limit?: number,
    offset?: number,
    branch?: string
  ) => ipcRenderer.invoke("git:getCommits", repoPath, limit, offset, branch),
  getFileChanges: (repoPath: string, commitHash: string) =>
    ipcRenderer.invoke("git:getFileChanges", repoPath, commitHash),
  getRepositoryInfo: (repoPath: string) =>
    ipcRenderer.invoke("git:getRepositoryInfo", repoPath),
  getGitGraph: (repoPath: string, limit?: number) =>
    ipcRenderer.invoke("git:getGitGraph", repoPath, limit),
  cloneRepository: (url: string, destPath: string) =>
    ipcRenderer.invoke("git:cloneRepository", url, destPath),
  getBranches: (repoPath: string) =>
    ipcRenderer.invoke("git:getBranches", repoPath),
  getStatus: (repoPath: string) =>
    ipcRenderer.invoke("git:getStatus", repoPath),
  checkoutBranch: (repoPath: string, branchName: string) =>
    ipcRenderer.invoke("git:checkoutBranch", repoPath, branchName),
  rebase: (repoPath: string) => ipcRenderer.invoke("git:rebase", repoPath),
  stageFile: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke("git:stageFile", repoPath, filePath),
  unstageFile: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke("git:unstageFile", repoPath, filePath),
  stageAll: (repoPath: string) => ipcRenderer.invoke("git:stageAll", repoPath),
  unstageAll: (repoPath: string) =>
    ipcRenderer.invoke("git:unstageAll", repoPath),
  discardFile: (repoPath: string, filePath: string) =>
    ipcRenderer.invoke("git:discardFile", repoPath, filePath),
  discardAll: (repoPath: string) =>
    ipcRenderer.invoke("git:discardAll", repoPath),
  commit: (repoPath: string, message: string) =>
    ipcRenderer.invoke("git:commit", repoPath, message),
  push: (repoPath: string) => ipcRenderer.invoke("git:push", repoPath),
  getStagedDiff: (repoPath: string) =>
    ipcRenderer.invoke("git:getStagedDiff", repoPath),
  getUnstagedDiff: (repoPath: string) =>
    ipcRenderer.invoke("git:getUnstagedDiff", repoPath),
  getFileDiff: (repoPath: string, filePath: string, staged: boolean) =>
    ipcRenderer.invoke("git:getFileDiff", repoPath, filePath, staged),

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
  onCloneProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on("clone-progress", (_, progress) => callback(progress));
  },
  removeCloneProgressListener: () => {
    ipcRenderer.removeAllListeners("clone-progress");
  },

  // Settings
  getGitConfig: (key: string, repoPath?: string) =>
    ipcRenderer.invoke("settings:getGitConfig", key, repoPath),
  setGitConfig: (key: string, value: string, repoPath?: string) =>
    ipcRenderer.invoke("settings:setGitConfig", key, value, repoPath),
  getApiKey: () => ipcRenderer.invoke("settings:getApiKey"),
  setApiKey: (key: string) => ipcRenderer.invoke("settings:setApiKey", key),
});
