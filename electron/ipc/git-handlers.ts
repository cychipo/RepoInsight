import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from "electron";
import { exec } from "child_process";
import { promisify } from "util";
import { join, basename, extname } from "path";
import { readFile } from "fs/promises";

// Type definitions (matching src/types)
interface Commit {
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

interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed";
  insertions: number;
  deletions: number;
  previousPath?: string;
}

interface RepositoryInfo {
  name: string;
  path: string;
  currentBranch: string;
  totalCommits: number;
  totalContributors: number;
  firstCommitDate: Date;
  lastCommitDate: Date;
}

interface GraphNode {
  id: string;
  type: "commit" | "file" | "function";
  label: string;
  metadata: Record<string, any>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "MODIFIES" | "CONTAINS" | "CALLS";
  metadata?: Record<string, any>;
}

const execAsync = promisify(exec);

// Utility to run git commands
async function runGitCommand(
  repoPath: string,
  command: string
): Promise<string> {
  const { stdout } = await execAsync(`git ${command}`, {
    cwd: repoPath,
    maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large repos
  });
  return stdout.trim();
}

// Register all Git-related IPC handlers
export function registerGitHandlers() {
  // Get repository information
  ipcMain.handle(
    "git:getRepositoryInfo",
    async (_, repoPath: string): Promise<RepositoryInfo> => {
      try {
        // Get current branch
        const currentBranch = await runGitCommand(
          repoPath,
          "rev-parse --abbrev-ref HEAD"
        );

        // Get total commits
        const commitCountStr = await runGitCommand(
          repoPath,
          "rev-list --count HEAD"
        );
        const totalCommits = parseInt(commitCountStr, 10);

        // Get contributors
        const contributorsOutput = await runGitCommand(
          repoPath,
          "shortlog -sn HEAD"
        );
        const totalContributors = contributorsOutput
          .split("\n")
          .filter((l) => l.trim()).length;

        // Get first and last commit dates
        const firstCommitDate = await runGitCommand(
          repoPath,
          "log --reverse --format=%aI | head -1"
        );
        const lastCommitDate = await runGitCommand(
          repoPath,
          "log -1 --format=%aI"
        );

        return {
          name: basename(repoPath),
          path: repoPath,
          currentBranch,
          totalCommits,
          totalContributors,
          firstCommitDate: new Date(firstCommitDate),
          lastCommitDate: new Date(lastCommitDate),
        };
      } catch (error) {
        console.error("Failed to get repository info:", error);
        throw error;
      }
    }
  );

  // Get commits
  ipcMain.handle(
    "git:getCommits",
    async (_, repoPath: string, limit = 500): Promise<Commit[]> => {
      try {
        // Format: hash|short_hash|author|email|date|message|files|insertions|deletions
        const format = "%H|%h|%an|%ae|%aI|%s";
        const output = await runGitCommand(
          repoPath,
          `log --format="${format}" --shortstat -n ${limit}`
        );

        const commits: Commit[] = [];
        const lines = output.split("\n");
        let i = 0;

        while (i < lines.length) {
          const line = lines[i].trim();
          if (!line) {
            i++;
            continue;
          }

          // Skip if this is a stats line
          if (
            line.includes("insertion") ||
            line.includes("deletion") ||
            line.includes("file changed") ||
            line.includes("files changed")
          ) {
            i++;
            continue;
          }

          const parts = line.split("|");
          if (parts.length >= 6) {
            const commit: Commit = {
              hash: parts[0],
              shortHash: parts[1],
              author: parts[2],
              authorEmail: parts[3],
              date: new Date(parts[4]),
              message: parts[5],
              filesChanged: 0,
              insertions: 0,
              deletions: 0,
            };

            // Look for stats in next line
            if (i + 1 < lines.length) {
              const statsLine = lines[i + 1].trim();
              if (statsLine) {
                const filesMatch = statsLine.match(/(\d+) files? changed/);
                const insertMatch = statsLine.match(/(\d+) insertions?\(\+\)/);
                const deleteMatch = statsLine.match(/(\d+) deletions?\(-\)/);

                if (filesMatch)
                  commit.filesChanged = parseInt(filesMatch[1], 10);
                if (insertMatch)
                  commit.insertions = parseInt(insertMatch[1], 10);
                if (deleteMatch)
                  commit.deletions = parseInt(deleteMatch[1], 10);
              }
            }

            commits.push(commit);
          }
          i++;
        }

        return commits;
      } catch (error) {
        console.error("Failed to get commits:", error);
        throw error;
      }
    }
  );

  // Get file changes for a specific commit
  ipcMain.handle(
    "git:getFileChanges",
    async (_, repoPath: string, commitHash: string): Promise<FileChange[]> => {
      try {
        const output = await runGitCommand(
          repoPath,
          `diff-tree --no-commit-id --name-status -r ${commitHash}`
        );

        const changes: FileChange[] = [];
        const lines = output.split("\n").filter((l) => l.trim());

        for (const line of lines) {
          const [statusCode, ...pathParts] = line.split("\t");
          const path = pathParts.join("\t");

          let status: FileChange["status"] = "modified";
          let previousPath: string | undefined;

          if (statusCode.startsWith("R")) {
            status = "renamed";
            previousPath = path;
          } else if (statusCode === "A") {
            status = "added";
          } else if (statusCode === "D") {
            status = "deleted";
          } else if (statusCode === "M") {
            status = "modified";
          }

          // Get numstat for insertions/deletions
          let insertions = 0;
          let deletions = 0;

          try {
            const numstatOutput = await runGitCommand(
              repoPath,
              `diff-tree --no-commit-id --numstat -r ${commitHash} -- "${path}"`
            );
            const numstatLine = numstatOutput.split("\n")[0];
            if (numstatLine) {
              const [ins, del] = numstatLine.split("\t");
              insertions = ins === "-" ? 0 : parseInt(ins, 10) || 0;
              deletions = del === "-" ? 0 : parseInt(del, 10) || 0;
            }
          } catch (e) {
            // Ignore numstat errors for binary files
          }

          changes.push({
            path,
            status,
            insertions,
            deletions,
            previousPath,
          });
        }

        return changes;
      } catch (error) {
        console.error("Failed to get file changes:", error);
        throw error;
      }
    }
  );

  // Full repository analysis
  ipcMain.handle(
    "analysis:analyzeRepository",
    async (event, repoPath: string) => {
      const mainWindow = BrowserWindow.fromWebContents(event.sender);
      if (!mainWindow) throw new Error("No main window found");

      const sendProgress = (
        stage: string,
        current: number,
        total: number,
        message: string
      ) => {
        mainWindow.webContents.send("analysis:progress", {
          stage,
          current,
          total,
          message,
        });
      };

      try {
        // Step 1: Get all commits
        sendProgress("commits", 0, 100, "Loading commits...");
        const commitsOutput = await runGitCommand(
          repoPath,
          'log --format="%H|%h|%an|%aI|%s" --all'
        );
        const commitLines = commitsOutput.split("\n").filter((l) => l.trim());

        const nodes: GraphNode[] = [];
        const edges: GraphEdge[] = [];
        const fileModifyCount = new Map<string, number>();
        const functionModifyCount = new Map<string, number>();

        // Create commit nodes
        for (let i = 0; i < commitLines.length; i++) {
          const parts = commitLines[i].split("|");
          if (parts.length >= 5) {
            const commitNode: GraphNode = {
              id: `commit:${parts[0]}`,
              type: "commit",
              label: parts[1],
              metadata: {
                hash: parts[0],
                author: parts[2],
                date: new Date(parts[3]),
                message: parts[4],
              },
            };
            nodes.push(commitNode);
          }

          if (i % 100 === 0) {
            sendProgress(
              "commits",
              i,
              commitLines.length,
              `Processing commit ${i}/${commitLines.length}`
            );
          }
        }

        // Step 2: Get file changes for each commit (limited to recent commits for performance)
        sendProgress("files", 0, 100, "Analyzing file changes...");
        const recentCommits = commitLines.slice(
          0,
          Math.min(commitLines.length, 200)
        );

        for (let i = 0; i < recentCommits.length; i++) {
          const hash = recentCommits[i].split("|")[0];

          try {
            const filesOutput = await runGitCommand(
              repoPath,
              `diff-tree --no-commit-id --name-only -r ${hash}`
            );
            const files = filesOutput.split("\n").filter((f) => f.trim());

            for (const filePath of files) {
              const fileId = `file:${filePath}`;

              // Create file node if doesn't exist
              if (!nodes.find((n) => n.id === fileId)) {
                const ext = extname(filePath).slice(1);
                const language = getLanguageFromExtension(ext);

                nodes.push({
                  id: fileId,
                  type: "file",
                  label: basename(filePath),
                  metadata: {
                    path: filePath,
                    extension: ext,
                    language,
                    modifyCount: 0,
                  },
                });
              }

              // Track modify count
              fileModifyCount.set(
                fileId,
                (fileModifyCount.get(fileId) || 0) + 1
              );

              // Create MODIFIES edge
              edges.push({
                id: `edge:${hash}-${filePath}`,
                source: `commit:${hash}`,
                target: fileId,
                type: "MODIFIES",
              });
            }
          } catch (e) {
            // Skip commits that fail (e.g., initial commit)
          }

          if (i % 20 === 0) {
            sendProgress(
              "files",
              i,
              recentCommits.length,
              `Analyzing commit ${i}/${recentCommits.length}`
            );
          }
        }

        // Update file modify counts
        for (const node of nodes) {
          if (node.type === "file") {
            (node.metadata as any).modifyCount =
              fileModifyCount.get(node.id) || 0;
          }
        }

        // Step 3: Analyze JavaScript/TypeScript files for functions
        sendProgress("analysis", 0, 100, "Analyzing code structure...");
        const codeFiles = nodes.filter(
          (n) =>
            n.type === "file" &&
            ["js", "ts", "jsx", "tsx"].includes((n.metadata as any).extension)
        );

        for (let i = 0; i < codeFiles.length; i++) {
          const fileNode = codeFiles[i];
          const filePath = (fileNode.metadata as any).path;
          const fullPath = join(repoPath, filePath);

          try {
            const content = await readFile(fullPath, "utf-8");
            const functions = extractFunctions(content);

            for (const func of functions) {
              const funcId = `function:${filePath}:${func.name}`;

              nodes.push({
                id: funcId,
                type: "function",
                label: func.name,
                metadata: {
                  name: func.name,
                  filePath,
                  startLine: func.startLine,
                  endLine: func.endLine,
                  parameters: func.parameters,
                  modifyCount: 0,
                },
              });

              // Create CONTAINS edge
              edges.push({
                id: `edge:${fileNode.id}-${funcId}`,
                source: fileNode.id,
                target: funcId,
                type: "CONTAINS",
              });
            }
          } catch (e) {
            // Skip files that can't be read
          }

          if (i % 10 === 0) {
            sendProgress(
              "analysis",
              i,
              codeFiles.length,
              `Analyzing ${i}/${codeFiles.length} files`
            );
          }
        }

        sendProgress("complete", 100, 100, "Analysis complete!");

        return {
          success: true,
          graph: { nodes, edges },
          stats: {
            totalCommits: nodes.filter((n) => n.type === "commit").length,
            totalFiles: nodes.filter((n) => n.type === "file").length,
            totalFunctions: nodes.filter((n) => n.type === "function").length,
            totalRelationships: edges.length,
            analysisTime: 0,
          },
        };
      } catch (error) {
        console.error("Analysis failed:", error);
        return {
          success: false,
          graph: { nodes: [], edges: [] },
          stats: {
            totalCommits: 0,
            totalFiles: 0,
            totalFunctions: 0,
            totalRelationships: 0,
            analysisTime: 0,
          },
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  );
}

// Helper function to get language from file extension
function getLanguageFromExtension(ext: string): string {
  const languageMap: Record<string, string> = {
    js: "JavaScript",
    jsx: "JavaScript (JSX)",
    ts: "TypeScript",
    tsx: "TypeScript (TSX)",
    vue: "Vue",
    py: "Python",
    rb: "Ruby",
    java: "Java",
    cpp: "C++",
    c: "C",
    go: "Go",
    rs: "Rust",
    php: "PHP",
    swift: "Swift",
    kt: "Kotlin",
    cs: "C#",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    less: "LESS",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    md: "Markdown",
    sh: "Shell",
    bash: "Bash",
  };
  return languageMap[ext.toLowerCase()] || ext.toUpperCase();
}

// Simple function extraction using regex (for basic analysis)
function extractFunctions(content: string): Array<{
  name: string;
  startLine: number;
  endLine: number;
  parameters: string[];
}> {
  const functions: Array<{
    name: string;
    startLine: number;
    endLine: number;
    parameters: string[];
  }> = [];

  const lines = content.split("\n");

  // Patterns for different function declarations
  const patterns = [
    // function declarations: function name(params)
    /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    // arrow functions: const name = (params) =>
    /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/,
    // method declarations: name(params) {
    /^\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/,
    // class methods: methodName(params) {
    /^\s*(?:public|private|protected|static|async)?\s*(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*\{/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (
        match &&
        match[1] &&
        !["if", "for", "while", "switch", "catch", "constructor"].includes(
          match[1]
        )
      ) {
        const params = match[2]
          ? match[2]
              .split(",")
              .map((p) => p.trim().split(":")[0].trim())
              .filter((p) => p)
          : [];

        // Simple heuristic to find end line (count braces)
        let endLine = i;
        let braceCount = 0;
        let started = false;

        for (let j = i; j < Math.min(i + 100, lines.length); j++) {
          for (const char of lines[j]) {
            if (char === "{") {
              braceCount++;
              started = true;
            } else if (char === "}") {
              braceCount--;
            }
          }
          if (started && braceCount === 0) {
            endLine = j;
            break;
          }
        }

        functions.push({
          name: match[1],
          startLine: i + 1,
          endLine: endLine + 1,
          parameters: params,
        });
        break;
      }
    }
  }

  return functions;
}
