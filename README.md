# RepoInsight

Git Repository Knowledge Graph Desktop App - Analyze Git repositories and visualize as Knowledge Graph.

## Features

- **Knowledge Graph**: Visualize relationships between commits, files, and functions
- **Static Code Analysis**: Extract functions, classes, and call relationships
- **Hotspot Detection**: Find frequently modified files and functions
- **Co-Change Patterns**: Discover files that are often modified together
- **Timeline View**: Explore commit history with detailed file changes

## Tech Stack

- **Electron** - Desktop application framework
- **Vue 3** - Frontend framework
- **Vite** - Build tool
- **TypeScript** - Language
- **Cytoscape.js** - Graph visualization
- **Pinia** - State management

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Usage

1. Open the application
2. Click "Open Repository" to select a local Git repository
3. View commits, analyze code, and explore the knowledge graph
4. Use the Analysis page to find hotspots and co-change patterns

## Project Structure

```
RepoInsight/
├── electron/           # Electron main process
│   ├── main.ts        # Main entry point
│   ├── preload.ts     # Preload script
│   └── ipc/           # IPC handlers
├── src/               # Vue 3 renderer
│   ├── views/         # Page views
│   ├── components/    # Reusable components
│   ├── stores/        # Pinia stores
│   └── types/         # TypeScript types
├── public/            # Static assets
└── package.json
```

## License

MIT
