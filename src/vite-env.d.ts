/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }

  interface IElectronAPI {
    selectRepository: () => Promise<any>;
    selectDirectory: () => Promise<any>;
    validateRepository: (path: string) => Promise<any>;
    getCommits: (repoPath: string, limit?: number, offset?: number, branch?: string) => Promise<any>;
    getFileChanges: (repoPath: string, commitHash: string) => Promise<any>;
    getRepositoryInfo: (repoPath: string) => Promise<any>;
    getGitGraph: (repoPath: string, limit?: number) => Promise<any>;
    cloneRepository: (url: string, destPath: string) => Promise<any>;
    getBranches: (repoPath: string) => Promise<any>;
    getStatus: (repoPath: string) => Promise<any>;
    checkoutBranch: (repoPath: string, branchName: string) => Promise<any>;
    rebase: (repoPath: string) => Promise<any>;

    analyzeRepository: (repoPath: string) => Promise<any>;
    getAnalysisProgress: () => Promise<any>;
    onAnalysisProgress: (callback: (progress: any) => void) => void;
    removeAnalysisProgressListener: () => void;
    onCloneProgress: (callback: (progress: any) => void) => void;
    removeCloneProgressListener: () => void;

    // Settings
    getGitConfig: (key: string, repoPath?: string) => Promise<string>;
    setGitConfig: (key: string, value: string, repoPath?: string) => Promise<boolean>;
    getApiKey: () => Promise<string>;
    setApiKey: (key: string) => Promise<boolean>;
  }
}
