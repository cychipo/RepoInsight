// Type definitions for Electron API exposed via preload
export interface ElectronAPI {
  // Repository operations
  selectRepository: () => Promise<{
    success: boolean;
    path: string | null;
    error?: string;
  }>;
  validateRepository: (path: string) => Promise<boolean>;

  // Git operations
  getCommits: (repoPath: string, limit?: number) => Promise<Commit[]>;
  getFileChanges: (
    repoPath: string,
    commitHash: string
  ) => Promise<FileChange[]>;
  getRepositoryInfo: (repoPath: string) => Promise<RepositoryInfo>;

  // Analysis operations
  analyzeRepository: (repoPath: string) => Promise<AnalysisResult>;
  getAnalysisProgress: () => Promise<AnalysisProgress>;

  // Event listeners
  onAnalysisProgress: (callback: (progress: AnalysisProgress) => void) => void;
  removeAnalysisProgressListener: () => void;
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

export interface GraphNode {
  id: string;
  type: "commit" | "file" | "function";
  label: string;
  metadata: CommitMetadata | FileMetadata | FunctionMetadata;
}

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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
