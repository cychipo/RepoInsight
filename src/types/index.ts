// Type definitions for Electron API exposed via preload
export interface ElectronAPI {
  // Repository operations
  selectRepository: () => Promise<{
    success: boolean;
    path: string | null;
    error?: string;
  }>;
  selectDirectory: () => Promise<{
    success: boolean;
    path: string | null;
  }>;
  validateRepository: (path: string) => Promise<boolean>;

  // Git operations
  getCommits: (
    repoPath: string,
    limit?: number,
    offset?: number,
    branch?: string
  ) => Promise<Commit[]>;
  getFileChanges: (
    repoPath: string,
    commitHash: string
  ) => Promise<FileChange[]>;
  getRepositoryInfo: (repoPath: string) => Promise<RepositoryInfo>;
  getGitGraph: (repoPath: string, limit?: number) => Promise<GitGraphCommit[]>;
  cloneRepository: (
    url: string,
    destPath: string
  ) => Promise<{ success: boolean; path: string; error?: string }>;
  getBranches: (repoPath: string) => Promise<Branch[]>;
  getStatus: (repoPath: string) => Promise<GitStatusEntry[]>;
  checkoutBranch: (
    repoPath: string,
    branchName: string
  ) => Promise<{ success: boolean; error?: string }>;
  rebase: (
    repoPath: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  stageFile: (
    repoPath: string,
    filePath: string
  ) => Promise<{ success: boolean; error?: string }>;
  unstageFile: (
    repoPath: string,
    filePath: string
  ) => Promise<{ success: boolean; error?: string }>;
  stageAll: (repoPath: string) => Promise<{ success: boolean; error?: string }>;
  unstageAll: (
    repoPath: string
  ) => Promise<{ success: boolean; error?: string }>;
  discardFile: (
    repoPath: string,
    filePath: string
  ) => Promise<{ success: boolean; error?: string }>;
  discardAll: (
    repoPath: string
  ) => Promise<{ success: boolean; error?: string }>;
  commit: (
    repoPath: string,
    message: string
  ) => Promise<{ success: boolean; error?: string }>;
  push: (repoPath: string) => Promise<{ success: boolean; error?: string }>;
  getStagedDiff: (repoPath: string) => Promise<string>;
  getUnstagedDiff: (repoPath: string) => Promise<string>;
  getFileDiff: (
    repoPath: string,
    filePath: string,
    staged: boolean
  ) => Promise<string>;
  getAheadBehind: (
    repoPath: string
  ) => Promise<{ ahead: number; behind: number }>;

  // Analysis operations
  analyzeRepository: (repoPath: string) => Promise<AnalysisResult>;
  getAnalysisProgress: () => Promise<AnalysisProgress>;
  getFileOwnership: (
    repoPath: string,
    filePath: string
  ) => Promise<FileOwnership>;
  getEvolutionData: (
    repoPath: string,
    months?: number
  ) => Promise<EvolutionData>;

  // Event listeners
  onAnalysisProgress: (callback: (progress: AnalysisProgress) => void) => void;
  removeAnalysisProgressListener: () => void;
  onCloneProgress: (callback: (progress: CloneProgress) => void) => void;
  removeCloneProgressListener: () => void;

  // Settings
  getGitConfig: (key: string, repoPath?: string) => Promise<string>;
  setGitConfig: (
    key: string,
    value: string,
    repoPath?: string
  ) => Promise<boolean>;
  getApiKey: () => Promise<string>;
  setApiKey: (key: string) => Promise<boolean>;
}

// Branch type
export interface Branch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
}

// Git status entry type
export interface GitStatusEntry {
  path: string;
  status: string;
  staged: boolean;
}

// Clone progress type
export interface CloneProgress {
  stage: string;
  percent: number;
  message: string;
}

// Git types
export interface Commit {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: Date;
  message: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  insertions: number;
  deletions: number;
  previousPath?: string; // For renamed files
}

export interface RepositoryInfo {
  name: string;
  path: string;
  currentBranch: string;
  totalCommits: number;
  totalContributors: number;
  firstCommitDate: Date;
  lastCommitDate: Date;
}

// Git Graph types for branch visualization
export interface GitGraphCommit {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: Date;
  message: string;
  parentHashes: string[];
  refs: string[]; // branch names, tags, etc.
}

// Analysis types
export interface AnalysisResult {
  success: boolean;
  graph: KnowledgeGraph;
  stats: AnalysisStats;
  error?: string;
}

export interface AnalysisProgress {
  stage: "commits" | "files" | "analysis" | "graph" | "complete";
  current: number;
  total: number;
  message: string;
}

export interface AnalysisStats {
  totalCommits: number;
  totalFiles: number;
  totalFunctions: number;
  totalRelationships: number;
  analysisTime: number;
}

// Knowledge Graph types
export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type GraphNode =
  | {
      id: string;
      type: "commit";
      label: string;
      metadata: CommitMetadata;
    }
  | {
      id: string;
      type: "file";
      label: string;
      metadata: FileMetadata;
    }
  | {
      id: string;
      type: "function";
      label: string;
      metadata: FunctionMetadata;
    };

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "MODIFIES" | "CONTAINS" | "CALLS";
  metadata?: Record<string, any>;
}

export interface CommitMetadata {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

export interface FileMetadata {
  path: string;
  extension: string;
  language: string;
  size?: number;
  modifyCount: number;
}

export interface FunctionMetadata {
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  parameters: string[];
  modifyCount: number;
}

// Code Ownership types
export interface FileOwnership {
  filePath: string;
  owners: OwnerInfo[];
  totalCommits: number;
  lastModified: Date;
}

export interface OwnerInfo {
  author: string;
  authorEmail: string;
  commits: number;
  percentage: number;
  linesAdded: number;
  linesDeleted: number;
}

// Repository Evolution types
export interface EvolutionData {
  timeline: EvolutionPoint[];
  authors: AuthorEvolution[];
  fileTypes: FileTypeEvolution[];
  codeChurn: ChurnData[];
}

export interface EvolutionPoint {
  date: Date;
  commits: number;
  files: number;
  linesAdded: number;
  linesDeleted: number;
  contributors: number;
}

export interface AuthorEvolution {
  author: string;
  authorEmail: string;
  firstCommit: Date;
  lastCommit: Date;
  totalCommits: number;
  linesAdded: number;
  linesDeleted: number;
}

export interface FileTypeEvolution {
  extension: string;
  count: number;
  linesAdded: number;
  linesDeleted: number;
}

export interface ChurnData {
  date: Date;
  additions: number;
  deletions: number;
  netChange: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
