# RepoInsight

<p align="center">
  <img src="./public/logo.png" alt="RepoInsight Logo" width="120" />
</p>

**RepoInsight** là một ứng dụng desktop được xây dựng với Electron + Vue 3, giúp bạn phân tích và trực quan hóa Git repository dưới dạng Knowledge Graph.

## ✨ Tính năng

- 📊 **Biểu đồ Git Graph** - Trực quan hóa lịch sử commit dạng đồ thị
- 🔍 **Phân tích Repository** - Quét và phân tích cấu trúc code
- ⚡ **Smart Commit** - Tạo commit message tự động với AI (Gemini)
- 📝 **Changes View** - Xem và quản lý thay đổi (stage/unstage/commit/push)
- 🔄 **Rebase Code** - Đồng bộ code từ remote một cách an toàn
- 📅 **Timeline View** - Xem lịch sử commit theo dạng timeline
- 🎨 **Neo-Brutalism UI** - Giao diện hiện đại, độc đáo

## 🚀 Cài đặt

### Yêu cầu

- [Node.js](https://nodejs.org/) >= 18.x
- [Git](https://git-scm.com/)
- [pnpm](https://pnpm.io/) >= 8.x

### Clone và cài đặt dependencies

```bash
# Clone repository
git clone https://github.com/your-username/RepoInsight.git
cd RepoInsight

# Cài đặt dependencies
pnpm install
```

## 💻 Chạy Development

```bash
pnpm run dev
```

Ứng dụng sẽ khởi chạy ở chế độ development với hot-reload.

## 🔧 Build Production

### Build cho hệ điều hành hiện tại

```bash
pnpm run build
```

### Build cho từng hệ điều hành

```bash
# Windows (.exe)
pnpm run build:windows

# Linux (.AppImage, .deb)
pnpm run build:linux

# macOS (.dmg)
pnpm run build:macos

# Tất cả các hệ điều hành
pnpm run build:all
```

> **⚠️ Lưu ý Cross-Platform Build:**
> - Build Windows từ Linux cần cài [Wine](https://www.winehq.org/)
> - Build macOS từ Linux/Windows không được khuyến khích (cần macOS)

### Output

Sau khi build, file cài đặt sẽ nằm trong thư mục `release/`.

## 🔑 Cấu hình API Key (Tùy chọn)

Để sử dụng tính năng **Smart Commit** (tạo commit message tự động với AI), bạn cần:

1. Lấy API Key từ [Google AI Studio](https://aistudio.google.com/apikey)
2. Mở ứng dụng → Cài đặt (⚙️) → Nhập API Key

## 📁 Cấu trúc dự án

```
RepoInsight/
├── electron/           # Electron main process
│   ├── main.ts         # Entry point
│   ├── preload.ts      # Preload script
│   └── ipc/            # IPC handlers
├── src/                # Vue frontend
│   ├── components/     # Vue components
│   ├── views/          # Page views
│   ├── stores/         # Pinia stores
│   └── types/          # TypeScript types
├── public/             # Static assets
└── dist/               # Build output
```

## 🛠️ Scripts

| Lệnh | Mô tả |
|------|-------|
| `pnpm run dev` | Chạy development server |
| `pnpm run build` | Build cho platform hiện tại |
| `pnpm run build:windows` | Build cho Windows |
| `pnpm run build:linux` | Build cho Linux |
| `pnpm run build:macos` | Build cho macOS |
| `pnpm run build:all` | Build cho tất cả platforms |
| `pnpm run type-check` | Kiểm tra TypeScript types |

## 🧰 Tech Stack

- **Frontend:** Vue 3, TypeScript, Pinia, Vue Router
- **Styling:** Tailwind CSS 4, Neo-Brutalism Design
- **Desktop:** Electron 28
- **Build:** Vite, electron-builder
- **Icons:** Lucide Vue
- **Graph:** Cytoscape.js
- **AI:** Google Gemini API

## 📝 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

<p align="center">
  Made with ❤️ by Tobi
</p>
