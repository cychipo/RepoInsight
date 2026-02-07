import { ipcMain, BrowserWindow } from "electron";
import { exec, spawn } from "child_process";
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

// Git Graph types for branch visualization
interface GitGraphCommit {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: Date;
  message: string;
  parentHashes: string[];
  refs: string[]; // branch names, tags, etc.
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

  // Get commits with pagination support
  ipcMain.handle(
    "git:getCommits",
    async (
      _,
      repoPath: string,
      limit = 10,
      offset = 0,
      branch?: string
    ): Promise<Commit[]> => {
      try {
        // Format: hash|short_hash|author|email|date|message
        const format = "%H|%h|%an|%ae|%aI|%s";
        // If branch specified, get commits for that branch, otherwise current HEAD
        const branchArg = branch ? branch : "HEAD";
        // limit=0 means no limit (get all commits)
        const limitArg = limit > 0 ? `-n ${limit}` : "";
        const skipArg = offset > 0 ? `--skip=${offset}` : "";
        const output = await runGitCommand(
          repoPath,
          `log ${branchArg} --format="${format}" --shortstat ${limitArg} ${skipArg}`
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

          // Check if this is a stats line (contains "file" or "files" changed)
          const isStatsLine =
            line.includes("file changed") || line.includes("files changed");

          if (isStatsLine) {
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

            // Look for stats in following lines (may have empty line between)
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
              const statsLine = lines[j].trim();
              if (!statsLine) continue;

              // Check if this line contains stats
              if (
                statsLine.includes("file changed") ||
                statsLine.includes("files changed")
              ) {
                // Fixed regex patterns to match git output format
                // Git outputs: "X files changed, Y insertions(+), Z deletions(-)"
                // or: "X files changed, Y insertions(+)"
                // or: "X files changed, Z deletions(-)"
                const filesMatch = statsLine.match(/(\d+) files? changed/);
                const insertMatch = statsLine.match(
                  /(\d+) insertions?\s*\(\+\)/
                );
                const deleteMatch = statsLine.match(/(\d+) deletions?\s*\(-\)/);

                if (filesMatch) {
                  commit.filesChanged = parseInt(filesMatch[1], 10);
                }
                if (insertMatch) {
                  commit.insertions = parseInt(insertMatch[1], 10);
                }
                if (deleteMatch) {
                  commit.deletions = parseInt(deleteMatch[1], 10);
                }
                break;
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
            // const functions = extractFunctions(content); - Removed duplicate

            const functions = extractFunctions(content);

            // Process functions in parallel (limited by file scope)
            await Promise.all(
              functions.map(async (func) => {
                const funcId = `function:${filePath}:${func.name}`;
                let modifyCount = 0;

                try {
                  // Calculate modification count using git log -L
                  // This tracks the history of the lines that make up the function
                  const logOutput = await runGitCommand(
                    repoPath,
                    `log -L ${func.startLine},${func.endLine}:"${filePath}" --format="COMMIT:%H"`
                  );
                  // Count unique commits that touched these lines
                  modifyCount = (logOutput.match(/COMMIT:[a-f0-9]+/g) || [])
                    .length;
                } catch (e) {
                  // If detailed history fails (e.g. invalid range),
                  // we'll leave modifyCount at 0 or minimal fallback
                }

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
                    modifyCount,
                  },
                });

                // Create CONTAINS edge
                edges.push({
                  id: `edge:${fileNode.id}-${funcId}`,
                  source: fileNode.id,
                  target: funcId,
                  type: "CONTAINS",
                });
              })
            );
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

  // Get Git Graph data with parent hashes and branch refs for visualization
  ipcMain.handle(
    "git:getGitGraph",
    async (_, repoPath: string, limit = 500): Promise<GitGraphCommit[]> => {
      try {
        // Get all branches for ref lookup
        const branchOutput = await runGitCommand(
          repoPath,
          "branch -a --format='%(refname:short)'"
        );
        const branches = branchOutput.split("\n").filter((b) => b.trim());

        // Get branch head commits
        const branchHeads = new Map<string, string[]>();
        for (const branch of branches) {
          try {
            const hash = await runGitCommand(
              repoPath,
              `rev-parse "${branch.replace(/'/g, "")}"`
            );
            const cleanHash = hash.trim();
            const cleanBranch = branch.replace(/'/g, "");
            if (!branchHeads.has(cleanHash)) {
              branchHeads.set(cleanHash, []);
            }
            branchHeads.get(cleanHash)!.push(cleanBranch);
          } catch {
            // Skip invalid branch refs
          }
        }

        // Get commit data with parent hashes and decorations
        // Format: hash|short_hash|parent_hashes|author|email|date|decorations|message
        const format = "%H|%h|%P|%an|%ae|%aI|%D|%s";
        // limit=0 means no limit
        const limitArg = limit > 0 ? `-n ${limit}` : "";
        const output = await runGitCommand(
          repoPath,
          `log --all --format="${format}" ${limitArg}`
        );

        const commits: GitGraphCommit[] = [];
        const lines = output.split("\n").filter((l) => l.trim());

        for (const line of lines) {
          const parts = line.split("|");
          if (parts.length >= 8) {
            const hash = parts[0];
            const parentHashes = parts[2]
              ? parts[2].split(" ").filter((p) => p)
              : [];

            // Parse refs from decorations (e.g., "HEAD -> main, origin/main, tag: v1.0")
            let refs: string[] = [];
            const decorations = parts[6];
            if (decorations) {
              refs = decorations
                .split(",")
                .map((d) => d.trim())
                .map((d) => d.replace(/^HEAD -> /, ""))
                .filter((d) => d && d !== "HEAD");
            }

            // Also add branches that point to this commit
            const branchRefs = branchHeads.get(hash) || [];
            for (const br of branchRefs) {
              if (!refs.includes(br)) {
                refs.push(br);
              }
            }

            commits.push({
              hash,
              shortHash: parts[1],
              author: parts[3],
              authorEmail: parts[4],
              date: new Date(parts[5]),
              message: parts[7],
              parentHashes,
              refs,
            });
          }
        }

        return commits;
      } catch (error) {
        console.error("Failed to get git graph:", error);
        throw error;
      }
    }
  );

  // Clone a remote repository with progress
  ipcMain.handle(
    "git:cloneRepository",
    async (
      _,
      url: string,
      destPath: string
    ): Promise<{ success: boolean; path: string; error?: string }> => {
      return new Promise((resolve) => {
        const repoName = url.split("/").pop()?.replace(".git", "") || "repo";
        const fullPath = join(destPath, repoName);

        const cloneProcess = spawn("git", [
          "clone",
          "--progress",
          url,
          fullPath,
        ]);

        let errorOutput = "";

        cloneProcess.stderr.on("data", (data: Buffer) => {
          const message = data.toString();
          errorOutput += message;

          // Parse git clone progress
          // Examples:
          // "Cloning into 'repo'..."
          // "remote: Counting objects: 100, done."
          // "Receiving objects:  45% (450/1000)"
          // "Resolving deltas: 100% (500/500), done."
          let percent = 0;
          let stage = "cloning";

          if (message.includes("Counting objects")) {
            stage = "counting";
          } else if (message.includes("Compressing objects")) {
            stage = "compressing";
            const match = message.match(/Compressing objects:\s*(\d+)%/);
            if (match) percent = parseInt(match[1], 10);
          } else if (message.includes("Receiving objects")) {
            stage = "receiving";
            const match = message.match(/Receiving objects:\s*(\d+)%/);
            if (match) percent = parseInt(match[1], 10);
          } else if (message.includes("Resolving deltas")) {
            stage = "resolving";
            const match = message.match(/Resolving deltas:\s*(\d+)%/);
            if (match) percent = parseInt(match[1], 10);
          }

          // Send progress to renderer
          const windows = BrowserWindow.getAllWindows();
          windows.forEach((win) => {
            win.webContents.send("clone-progress", {
              stage,
              percent,
              message: message.trim(),
            });
          });
        });

        cloneProcess.on("close", (code) => {
          if (code === 0) {
            resolve({ success: true, path: fullPath });
          } else {
            resolve({
              success: false,
              path: "",
              error: errorOutput || `Clone failed with code ${code}`,
            });
          }
        });

        cloneProcess.on("error", (err) => {
          resolve({
            success: false,
            path: "",
            error: err.message,
          });
        });
      });
    }
  );

  // Get list of branches
  ipcMain.handle(
    "git:getBranches",
    async (
      _,
      repoPath: string
    ): Promise<{ name: string; isCurrent: boolean; isRemote: boolean }[]> => {
      try {
        // Get all branches with current marker
        const output = await runGitCommand(
          repoPath,
          "branch -a --format='%(refname:short)|%(HEAD)'"
        );

        const branches: {
          name: string;
          isCurrent: boolean;
          isRemote: boolean;
        }[] = [];
        const lines = output.split("\n").filter((l) => l.trim());

        for (const line of lines) {
          const [name, head] = line.replace(/'/g, "").split("|");
          if (!name || name.includes("HEAD")) continue;

          const isRemote =
            name.startsWith("remotes/") || name.startsWith("origin/");
          const cleanName = name.replace(/^remotes\//, "");

          // Avoid duplicates (same branch local and remote)
          if (!branches.find((b) => b.name === cleanName)) {
            branches.push({
              name: cleanName,
              isCurrent: head === "*",
              isRemote,
            });
          }
        }

        return branches;
      } catch (error) {
        console.error("Failed to get branches:", error);
        throw error;
      }
    }
  );

  // Get uncommitted changes (git status)
  ipcMain.handle(
    "git:getStatus",
    async (
      _,
      repoPath: string
    ): Promise<{ path: string; status: string; staged: boolean }[]> => {
      try {
        // git status --porcelain gives us: XY filename
        // X = staged status, Y = unstaged status
        // Examples:
        //   M  file.txt - staged modification
        //   _M file.txt - unstaged modification (where _ is space)
        //   MM file.txt - both staged and unstaged modifications
        //   A  file.txt - staged new file
        //   ?? file.txt - untracked file
        //   D  file.txt - staged deletion
        //   _D file.txt - unstaged deletion

        // IMPORTANT: Use execAsync directly instead of runGitCommand
        // because we need to preserve leading spaces in each line
        const { stdout } = await execAsync("git status --porcelain", {
          cwd: repoPath,
          maxBuffer: 50 * 1024 * 1024,
        });

        const changes: { path: string; status: string; staged: boolean }[] = [];
        // Split by newline but DON'T trim individual lines - we need the leading space
        const lines = stdout.split("\n").filter((l) => l.length > 0);

        console.log("[git:getStatus] Raw output:", JSON.stringify(stdout));
        console.log("[git:getStatus] Parsed lines:", lines);

        for (const line of lines) {
          if (line.length < 3) continue;

          const stagedStatus = line[0];
          const unstagedStatus = line[1];
          const filePath = line.substring(3).trim();

          console.log(
            `[git:getStatus] Line: "${line}" | stagedStatus: "${stagedStatus}" | unstagedStatus: "${unstagedStatus}" | path: "${filePath}"`
          );

          // Handle untracked files (both X and Y are ?)
          if (stagedStatus === "?" && unstagedStatus === "?") {
            changes.push({
              path: filePath,
              status: "untracked",
              staged: false,
            });
            continue;
          }

          // If there's a staged change (X is not space and not ?)
          if (stagedStatus !== " " && stagedStatus !== "?") {
            console.log(`[git:getStatus] Adding as STAGED: ${filePath}`);
            changes.push({
              path: filePath,
              status: getStatusLabel(stagedStatus),
              staged: true,
            });
          }

          // If there's an unstaged change (Y is not space and not ? since we handled untracked above)
          if (unstagedStatus !== " " && unstagedStatus !== "?") {
            console.log(`[git:getStatus] Adding as UNSTAGED: ${filePath}`);
            changes.push({
              path: filePath,
              status: getStatusLabel(unstagedStatus),
              staged: false,
            });
          }
        }

        console.log("[git:getStatus] Final changes:", changes);
        return changes;
      } catch (error) {
        console.error("Failed to get status:", error);
        throw error;
      }
    }
  );

  // Get ahead/behind count relative to remote
  ipcMain.handle(
    "git:getAheadBehind",
    async (_, repoPath: string): Promise<{ ahead: number; behind: number }> => {
      try {
        // Get current branch
        const currentBranch = await runGitCommand(
          repoPath,
          "rev-parse --abbrev-ref HEAD"
        );
        const branch = currentBranch.trim();

        // Check if remote tracking branch exists
        try {
          await runGitCommand(repoPath, `rev-parse --verify origin/${branch}`);
        } catch {
          // No remote tracking branch, return 0
          return { ahead: 0, behind: 0 };
        }

        // Get ahead/behind count
        const output = await runGitCommand(
          repoPath,
          `rev-list --left-right --count ${branch}...origin/${branch}`
        );

        const parts = output.trim().split(/\s+/);
        const ahead = parseInt(parts[0] || "0", 10);
        const behind = parseInt(parts[1] || "0", 10);

        return { ahead, behind };
      } catch (error) {
        console.error("Failed to get ahead/behind:", error);
        return { ahead: 0, behind: 0 };
      }
    }
  );

  // Rebase code from origin (Pull --rebase)
  ipcMain.handle(
    "git:rebase",
    async (
      _,
      repoPath: string
    ): Promise<{
      success: boolean;
      message: string;
      stashed: boolean;
      conflict?: boolean;
    }> => {
      let stashed = false;
      try {
        // 1. Check for uncommitted changes
        const statusOutput = await runGitCommand(
          repoPath,
          "status --porcelain"
        );
        const isDirty = statusOutput.trim().length > 0;

        // 2. Auto-stash if dirty
        if (isDirty) {
          // -u to include untracked files
          await runGitCommand(
            repoPath,
            'stash push -u -m "Auto stash by RepoInsight"'
          );
          stashed = true;
        }

        // 3. Get current branch
        const currentBranch = await runGitCommand(
          repoPath,
          "rev-parse --abbrev-ref HEAD"
        );

        // 4. Use spawn for pull --rebase to avoid EPIPE crashes
        await new Promise<void>((resolve, reject) => {
          const args = ["pull", "--rebase", "origin", currentBranch.trim()];
          const gitProcess = spawn("git", args, {
            cwd: repoPath,
            stdio: ["ignore", "pipe", "pipe"],
          });

          let stderr = "";

          gitProcess.stderr.on("data", (data: Buffer) => {
            stderr += data.toString();
          });

          gitProcess.on("close", (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(
                new Error(
                  stderr || `git pull --rebase failed with code ${code}`
                )
              );
            }
          });

          gitProcess.on("error", (err) => {
            reject(err);
          });
        });

        // 6. Pop stash if we stashed
        if (stashed) {
          try {
            await runGitCommand(repoPath, "stash pop");
          } catch (e) {
            console.warn("Stash pop conflict:", e);
            return {
              success: true,
              message:
                "Đã rebase thành công, nhưng có xung đột khi khôi phục stash. Vui lòng kiểm tra và giải quyết xung đột.",
              stashed: true,
              conflict: true,
            };
          }
        }

        return {
          success: true,
          message: stashed
            ? "Đã rebase và khôi phục thay đổi thành công!"
            : "Đã rebase thành công!",
          stashed,
        };
      } catch (error: any) {
        console.error("Rebase failed:", error);

        // If we stashed but rebase failed, try to pop stash back
        if (stashed) {
          try {
            await runGitCommand(repoPath, "stash pop");
          } catch (popError) {
            console.error("Failed to pop stash after rebase error:", popError);
          }
        }

        return {
          success: false,
          message: error.message || "Rebase thất bại. Vui lòng kiểm tra log.",
          stashed,
        };
      }
    }
  );

  // Switch to a different branch
  ipcMain.handle(
    "git:checkoutBranch",
    async (
      _,
      repoPath: string,
      branchName: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await runGitCommand(repoPath, `checkout ${branchName}`);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to switch branch",
        };
      }
    }
  );

  // Stage a single file
  ipcMain.handle(
    "git:stageFile",
    async (
      _,
      repoPath: string,
      filePath: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await runGitCommand(repoPath, `add "${filePath}"`);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Stage failed",
        };
      }
    }
  );

  // Unstage a single file
  ipcMain.handle(
    "git:unstageFile",
    async (
      _,
      repoPath: string,
      filePath: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await runGitCommand(repoPath, `reset HEAD "${filePath}"`);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unstage failed",
        };
      }
    }
  );

  // Stage all files
  ipcMain.handle(
    "git:stageAll",
    async (
      _,
      repoPath: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await runGitCommand(repoPath, "add -A");
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Stage all failed",
        };
      }
    }
  );

  // Unstage all files
  ipcMain.handle(
    "git:unstageAll",
    async (
      _,
      repoPath: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await runGitCommand(repoPath, "reset HEAD");
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unstage all failed",
        };
      }
    }
  );

  // Discard changes for a single file
  ipcMain.handle(
    "git:discardFile",
    async (
      _,
      repoPath: string,
      filePath: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        // For tracked files, checkout the file
        // For untracked files, we need to remove them
        const statusOutput = await runGitCommand(
          repoPath,
          `status --porcelain "${filePath}"`
        );
        if (statusOutput.startsWith("??")) {
          // Untracked file - delete it
          const fullPath = join(repoPath, filePath);
          const fs = await import("fs/promises");
          await fs.unlink(fullPath);
        } else {
          // Tracked file - checkout
          await runGitCommand(repoPath, `checkout -- "${filePath}"`);
        }
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Discard failed",
        };
      }
    }
  );

  // Discard all unstaged changes
  ipcMain.handle(
    "git:discardAll",
    async (
      _,
      repoPath: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        // Checkout all tracked files
        await runGitCommand(repoPath, "checkout -- .");
        // Clean untracked files
        await runGitCommand(repoPath, "clean -fd");
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Discard all failed",
        };
      }
    }
  );

  // Commit staged changes
  ipcMain.handle(
    "git:commit",
    async (
      _,
      repoPath: string,
      message: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const escapedMessage = message.replace(/"/g, '\\"');
        await runGitCommand(repoPath, `commit -m "${escapedMessage}"`);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Commit failed",
        };
      }
    }
  );

  // Push to remote
  ipcMain.handle(
    "git:push",
    async (
      _,
      repoPath: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await runGitCommand(repoPath, "push");
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Push failed",
        };
      }
    }
  );

  // Get diff for staged files
  ipcMain.handle(
    "git:getStagedDiff",
    async (_, repoPath: string): Promise<string> => {
      try {
        return await runGitCommand(repoPath, "diff --cached");
      } catch (error) {
        console.error("Failed to get staged diff:", error);
        return "";
      }
    }
  );

  // Get diff for unstaged files
  ipcMain.handle(
    "git:getUnstagedDiff",
    async (_, repoPath: string): Promise<string> => {
      try {
        return await runGitCommand(repoPath, "diff");
      } catch (error) {
        console.error("Failed to get unstaged diff:", error);
        return "";
      }
    }
  );

  // Get diff for a single file (staged or unstaged)
  ipcMain.handle(
    "git:getFileDiff",
    async (
      _,
      repoPath: string,
      filePath: string,
      staged: boolean
    ): Promise<string> => {
      try {
        const stagedFlag = staged ? "--cached" : "";
        return await runGitCommand(
          repoPath,
          `diff ${stagedFlag} -- "${filePath}"`
        );
      } catch (error) {
        console.error("Failed to get file diff:", error);
        return "";
      }
    }
  );
}

function getStatusLabel(code: string): string {
  const statusMap: Record<string, string> = {
    M: "modified",
    A: "added",
    D: "deleted",
    R: "renamed",
    C: "copied",
    U: "unmerged",
    "?": "untracked",
    "!": "ignored",
  };
  return statusMap[code] || "unknown";
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
