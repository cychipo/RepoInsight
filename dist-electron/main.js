"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const child_process = require("child_process");
const util = require("util");
const promises = require("fs/promises");
const execAsync = util.promisify(child_process.exec);
async function runGitCommand(repoPath, command) {
  const { stdout } = await execAsync(`git ${command}`, {
    cwd: repoPath,
    maxBuffer: 50 * 1024 * 1024
    // 50MB buffer for large repos
  });
  return stdout.trim();
}
function registerGitHandlers() {
  electron.ipcMain.handle(
    "git:getRepositoryInfo",
    async (_, repoPath) => {
      try {
        const currentBranch = await runGitCommand(
          repoPath,
          "rev-parse --abbrev-ref HEAD"
        );
        const commitCountStr = await runGitCommand(
          repoPath,
          "rev-list --count HEAD"
        );
        const totalCommits = parseInt(commitCountStr, 10);
        const contributorsOutput = await runGitCommand(
          repoPath,
          "shortlog -sn HEAD"
        );
        const totalContributors = contributorsOutput.split("\n").filter((l) => l.trim()).length;
        const firstCommitDate = await runGitCommand(
          repoPath,
          "log --reverse --format=%aI | head -1"
        );
        const lastCommitDate = await runGitCommand(
          repoPath,
          "log -1 --format=%aI"
        );
        return {
          name: path.basename(repoPath),
          path: repoPath,
          currentBranch,
          totalCommits,
          totalContributors,
          firstCommitDate: new Date(firstCommitDate),
          lastCommitDate: new Date(lastCommitDate)
        };
      } catch (error) {
        console.error("Failed to get repository info:", error);
        throw error;
      }
    }
  );
  electron.ipcMain.handle(
    "git:getCommits",
    async (_, repoPath, limit = 10, offset = 0, branch) => {
      try {
        const format = "%H|%h|%an|%ae|%aI|%s";
        const branchArg = branch ? branch : "HEAD";
        const limitArg = limit > 0 ? `-n ${limit}` : "";
        const skipArg = offset > 0 ? `--skip=${offset}` : "";
        const output = await runGitCommand(
          repoPath,
          `log ${branchArg} --format="${format}" --shortstat ${limitArg} ${skipArg}`
        );
        const commits = [];
        const lines = output.split("\n");
        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();
          if (!line) {
            i++;
            continue;
          }
          const isStatsLine = line.includes("file changed") || line.includes("files changed");
          if (isStatsLine) {
            i++;
            continue;
          }
          const parts = line.split("|");
          if (parts.length >= 6) {
            const commit = {
              hash: parts[0],
              shortHash: parts[1],
              author: parts[2],
              authorEmail: parts[3],
              date: new Date(parts[4]),
              message: parts[5],
              filesChanged: 0,
              insertions: 0,
              deletions: 0
            };
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
              const statsLine = lines[j].trim();
              if (!statsLine) continue;
              if (statsLine.includes("file changed") || statsLine.includes("files changed")) {
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
  electron.ipcMain.handle(
    "git:getFileChanges",
    async (_, repoPath, commitHash) => {
      try {
        const output = await runGitCommand(
          repoPath,
          `diff-tree --no-commit-id --name-status -r ${commitHash}`
        );
        const changes = [];
        const lines = output.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          const [statusCode, ...pathParts] = line.split("	");
          const path2 = pathParts.join("	");
          let status = "modified";
          let previousPath;
          if (statusCode.startsWith("R")) {
            status = "renamed";
            previousPath = path2;
          } else if (statusCode === "A") {
            status = "added";
          } else if (statusCode === "D") {
            status = "deleted";
          } else if (statusCode === "M") {
            status = "modified";
          }
          let insertions = 0;
          let deletions = 0;
          try {
            const numstatOutput = await runGitCommand(
              repoPath,
              `diff-tree --no-commit-id --numstat -r ${commitHash} -- "${path2}"`
            );
            const numstatLine = numstatOutput.split("\n")[0];
            if (numstatLine) {
              const [ins, del] = numstatLine.split("	");
              insertions = ins === "-" ? 0 : parseInt(ins, 10) || 0;
              deletions = del === "-" ? 0 : parseInt(del, 10) || 0;
            }
          } catch (e) {
          }
          changes.push({
            path: path2,
            status,
            insertions,
            deletions,
            previousPath
          });
        }
        return changes;
      } catch (error) {
        console.error("Failed to get file changes:", error);
        throw error;
      }
    }
  );
  electron.ipcMain.handle(
    "analysis:analyzeRepository",
    async (event, repoPath) => {
      const mainWindow2 = electron.BrowserWindow.fromWebContents(event.sender);
      if (!mainWindow2) throw new Error("No main window found");
      const sendProgress = (stage, current, total, message) => {
        mainWindow2.webContents.send("analysis:progress", {
          stage,
          current,
          total,
          message
        });
      };
      try {
        sendProgress("commits", 0, 100, "Loading commits...");
        const commitsOutput = await runGitCommand(
          repoPath,
          'log --format="%H|%h|%an|%aI|%s" --all'
        );
        const commitLines = commitsOutput.split("\n").filter((l) => l.trim());
        const nodes = [];
        const edges = [];
        const fileModifyCount = /* @__PURE__ */ new Map();
        for (let i = 0; i < commitLines.length; i++) {
          const parts = commitLines[i].split("|");
          if (parts.length >= 5) {
            const commitNode = {
              id: `commit:${parts[0]}`,
              type: "commit",
              label: parts[1],
              metadata: {
                hash: parts[0],
                author: parts[2],
                date: new Date(parts[3]),
                message: parts[4]
              }
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
              if (!nodes.find((n) => n.id === fileId)) {
                const ext = path.extname(filePath).slice(1);
                const language = getLanguageFromExtension(ext);
                nodes.push({
                  id: fileId,
                  type: "file",
                  label: path.basename(filePath),
                  metadata: {
                    path: filePath,
                    extension: ext,
                    language,
                    modifyCount: 0
                  }
                });
              }
              fileModifyCount.set(
                fileId,
                (fileModifyCount.get(fileId) || 0) + 1
              );
              edges.push({
                id: `edge:${hash}-${filePath}`,
                source: `commit:${hash}`,
                target: fileId,
                type: "MODIFIES"
              });
            }
          } catch (e) {
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
        for (const node of nodes) {
          if (node.type === "file") {
            node.metadata.modifyCount = fileModifyCount.get(node.id) || 0;
          }
        }
        sendProgress("analysis", 0, 100, "Analyzing code structure...");
        const codeFiles = nodes.filter(
          (n) => n.type === "file" && ["js", "ts", "jsx", "tsx"].includes(n.metadata.extension)
        );
        for (let i = 0; i < codeFiles.length; i++) {
          const fileNode = codeFiles[i];
          const filePath = fileNode.metadata.path;
          const fullPath = path.join(repoPath, filePath);
          try {
            const content = await promises.readFile(fullPath, "utf-8");
            const functions = extractFunctions(content);
            await Promise.all(
              functions.map(async (func) => {
                const funcId = `function:${filePath}:${func.name}`;
                let modifyCount = 0;
                try {
                  const logOutput = await runGitCommand(
                    repoPath,
                    `log -L ${func.startLine},${func.endLine}:"${filePath}" --format="COMMIT:%H"`
                  );
                  modifyCount = (logOutput.match(/COMMIT:[a-f0-9]+/g) || []).length;
                } catch (e) {
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
                    modifyCount
                  }
                });
                edges.push({
                  id: `edge:${fileNode.id}-${funcId}`,
                  source: fileNode.id,
                  target: funcId,
                  type: "CONTAINS"
                });
              })
            );
          } catch (e) {
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
            analysisTime: 0
          }
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
            analysisTime: 0
          },
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }
  );
  electron.ipcMain.handle(
    "git:getGitGraph",
    async (_, repoPath, limit = 500) => {
      try {
        const branchOutput = await runGitCommand(
          repoPath,
          "branch -a --format='%(refname:short)'"
        );
        const branches = branchOutput.split("\n").filter((b) => b.trim());
        const branchHeads = /* @__PURE__ */ new Map();
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
            branchHeads.get(cleanHash).push(cleanBranch);
          } catch {
          }
        }
        const format = "%H|%h|%P|%an|%ae|%aI|%D|%s";
        const limitArg = limit > 0 ? `-n ${limit}` : "";
        const output = await runGitCommand(
          repoPath,
          `log --all --format="${format}" ${limitArg}`
        );
        const commits = [];
        const lines = output.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          const parts = line.split("|");
          if (parts.length >= 8) {
            const hash = parts[0];
            const parentHashes = parts[2] ? parts[2].split(" ").filter((p) => p) : [];
            let refs = [];
            const decorations = parts[6];
            if (decorations) {
              refs = decorations.split(",").map((d) => d.trim()).map((d) => d.replace(/^HEAD -> /, "")).filter((d) => d && d !== "HEAD");
            }
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
              refs
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
  electron.ipcMain.handle(
    "git:cloneRepository",
    async (_, url, destPath) => {
      return new Promise((resolve) => {
        var _a;
        const repoName = ((_a = url.split("/").pop()) == null ? void 0 : _a.replace(".git", "")) || "repo";
        const fullPath = path.join(destPath, repoName);
        const cloneProcess = child_process.spawn("git", [
          "clone",
          "--progress",
          url,
          fullPath
        ]);
        let errorOutput = "";
        cloneProcess.stderr.on("data", (data) => {
          const message = data.toString();
          errorOutput += message;
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
          const windows = electron.BrowserWindow.getAllWindows();
          windows.forEach((win) => {
            win.webContents.send("clone-progress", {
              stage,
              percent,
              message: message.trim()
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
              error: errorOutput || `Clone failed with code ${code}`
            });
          }
        });
        cloneProcess.on("error", (err) => {
          resolve({
            success: false,
            path: "",
            error: err.message
          });
        });
      });
    }
  );
  electron.ipcMain.handle(
    "git:getBranches",
    async (_, repoPath) => {
      try {
        const output = await runGitCommand(
          repoPath,
          "branch -a --format='%(refname:short)|%(HEAD)'"
        );
        const branches = [];
        const lines = output.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          const [name, head] = line.replace(/'/g, "").split("|");
          if (!name || name.includes("HEAD")) continue;
          const isRemote = name.startsWith("remotes/") || name.startsWith("origin/");
          const cleanName = name.replace(/^remotes\//, "");
          if (!branches.find((b) => b.name === cleanName)) {
            branches.push({
              name: cleanName,
              isCurrent: head === "*",
              isRemote
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
  electron.ipcMain.handle(
    "git:getStatus",
    async (_, repoPath) => {
      try {
        const output = await runGitCommand(repoPath, "status --porcelain");
        const changes = [];
        const lines = output.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          if (line.length < 3) continue;
          const stagedStatus = line[0];
          const unstagedStatus = line[1];
          const filePath = line.substring(3).trim();
          if (stagedStatus !== " " && stagedStatus !== "?") {
            changes.push({
              path: filePath,
              status: getStatusLabel(stagedStatus),
              staged: true
            });
          }
          if (unstagedStatus !== " ") {
            changes.push({
              path: filePath,
              status: getStatusLabel(unstagedStatus),
              staged: false
            });
          }
        }
        return changes;
      } catch (error) {
        console.error("Failed to get status:", error);
        throw error;
      }
    }
  );
  electron.ipcMain.handle(
    "git:rebase",
    async (_, repoPath) => {
      let stashed = false;
      try {
        const statusOutput = await runGitCommand(repoPath, "status --porcelain");
        const isDirty = statusOutput.trim().length > 0;
        if (isDirty) {
          await runGitCommand(
            repoPath,
            'stash push -u -m "Auto stash by RepoInsight"'
          );
          stashed = true;
        }
        const currentBranch = await runGitCommand(
          repoPath,
          "rev-parse --abbrev-ref HEAD"
        );
        await runGitCommand(
          repoPath,
          `pull --rebase origin ${currentBranch.trim()}`
        );
        if (stashed) {
          try {
            await runGitCommand(repoPath, "stash pop");
          } catch (e) {
            console.warn("Stash pop conflict:", e);
            return {
              success: true,
              message: "Đã rebase thành công, nhưng có xung đột khi khôi phục stash. Vui lòng kiểm tra và giải quyết xung đột.",
              stashed: true,
              conflict: true
            };
          }
        }
        return {
          success: true,
          message: stashed ? "Đã rebase và khôi phục thay đổi thành công!" : "Đã rebase thành công!",
          stashed
        };
      } catch (error) {
        console.error("Rebase failed:", error);
        return {
          success: false,
          message: error.message || "Rebase thất bại. Vui lòng kiểm tra log.",
          stashed
        };
      }
    }
  );
  electron.ipcMain.handle(
    "git:checkoutBranch",
    async (_, repoPath, branchName) => {
      try {
        await runGitCommand(repoPath, `checkout ${branchName}`);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to switch branch"
        };
      }
    }
  );
}
function getStatusLabel(code) {
  const statusMap = {
    M: "modified",
    A: "added",
    D: "deleted",
    R: "renamed",
    C: "copied",
    U: "unmerged",
    "?": "untracked",
    "!": "ignored"
  };
  return statusMap[code] || "unknown";
}
function getLanguageFromExtension(ext) {
  const languageMap = {
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
    bash: "Bash"
  };
  return languageMap[ext.toLowerCase()] || ext.toUpperCase();
}
function extractFunctions(content) {
  const functions = [];
  const lines = content.split("\n");
  const patterns = [
    // function declarations: function name(params)
    /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    // arrow functions: const name = (params) =>
    /^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/,
    // method declarations: name(params) {
    /^\s*(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/,
    // class methods: methodName(params) {
    /^\s*(?:public|private|protected|static|async)?\s*(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*\{/
  ];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1] && !["if", "for", "while", "switch", "catch", "constructor"].includes(
        match[1]
      )) {
        const params = match[2] ? match[2].split(",").map((p) => p.trim().split(":")[0].trim()).filter((p) => p) : [];
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
          parameters: params
        });
        break;
      }
    }
  }
  return functions;
}
let mainWindow = null;
function createWindow() {
  const iconPath = process.env.VITE_DEV_SERVER_URL ? path.join(__dirname, "../../public/icon.png") : path.join(__dirname, "../dist/icon.png");
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1e3,
    minHeight: 700,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    backgroundColor: "#0f172a"
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
electron.app.whenReady().then(() => {
  registerGitHandlers();
  createWindow();
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.ipcMain.handle("dialog:selectRepository", async () => {
  const result = await electron.dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
    title: "Select Git Repository"
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, path: null };
  }
  const selectedPath = result.filePaths[0];
  const gitPath = path.join(selectedPath, ".git");
  const isValidRepo = fs.existsSync(gitPath);
  return {
    success: isValidRepo,
    path: selectedPath,
    error: isValidRepo ? null : "Selected folder is not a Git repository (.git folder not found)"
  };
});
electron.ipcMain.handle("dialog:selectDirectory", async () => {
  const result = await electron.dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
    title: "Select Clone Destination"
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, path: null };
  }
  return { success: true, path: result.filePaths[0] };
});
