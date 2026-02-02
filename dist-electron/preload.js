"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Repository operations
  selectRepository: () => electron.ipcRenderer.invoke("dialog:selectRepository"),
  selectDirectory: () => electron.ipcRenderer.invoke("dialog:selectDirectory"),
  validateRepository: (path) => electron.ipcRenderer.invoke("git:validateRepository", path),
  // Git operations
  getCommits: (repoPath, limit, offset, branch) => electron.ipcRenderer.invoke("git:getCommits", repoPath, limit, offset, branch),
  getFileChanges: (repoPath, commitHash) => electron.ipcRenderer.invoke("git:getFileChanges", repoPath, commitHash),
  getRepositoryInfo: (repoPath) => electron.ipcRenderer.invoke("git:getRepositoryInfo", repoPath),
  getGitGraph: (repoPath, limit) => electron.ipcRenderer.invoke("git:getGitGraph", repoPath, limit),
  cloneRepository: (url, destPath) => electron.ipcRenderer.invoke("git:cloneRepository", url, destPath),
  getBranches: (repoPath) => electron.ipcRenderer.invoke("git:getBranches", repoPath),
  getStatus: (repoPath) => electron.ipcRenderer.invoke("git:getStatus", repoPath),
  checkoutBranch: (repoPath, branchName) => electron.ipcRenderer.invoke("git:checkoutBranch", repoPath, branchName),
  rebase: (repoPath) => electron.ipcRenderer.invoke("git:rebase", repoPath),
  // Analysis operations
  analyzeRepository: (repoPath) => electron.ipcRenderer.invoke("analysis:analyzeRepository", repoPath),
  getAnalysisProgress: () => electron.ipcRenderer.invoke("analysis:getProgress"),
  // Event listeners for progress updates
  onAnalysisProgress: (callback) => {
    electron.ipcRenderer.on("analysis:progress", (_, progress) => callback(progress));
  },
  removeAnalysisProgressListener: () => {
    electron.ipcRenderer.removeAllListeners("analysis:progress");
  },
  onCloneProgress: (callback) => {
    electron.ipcRenderer.on("clone-progress", (_, progress) => callback(progress));
  },
  removeCloneProgressListener: () => {
    electron.ipcRenderer.removeAllListeners("clone-progress");
  }
});
