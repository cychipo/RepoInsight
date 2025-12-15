# Git Repository Knowledge Graph Desktop App

## 1. Mục tiêu dự án

Xây dựng một **ứng dụng desktop** sử dụng **Electron + Vue 3 + Vite** nhằm **phân tích Git repository local (offline)** để trích xuất tri thức về:

* Lịch sử thay đổi mã nguồn
* Cấu trúc code
* Mối quan hệ giữa commit – file – function

Kết quả phân tích được biểu diễn dưới dạng **Knowledge Graph**, giúp người dùng hiểu rõ hơn về codebase và các điểm nóng (hotspot) trong quá trình phát triển phần mềm.

> Dự án tập trung vào **phân tích dữ liệu và kiến trúc hệ thống**, không phải GitHub client hay CRUD application.

---

## 2. Phạm vi & định hướng

### Trong phạm vi

* Phân tích **Git repository local** (đã clone sẵn)
* Hoạt động **offline**, không cần GitHub API
* Phân tích tĩnh (static analysis)
* Trực quan hóa dữ liệu bằng đồ thị

### Ngoài phạm vi

* Không cần đăng nhập GitHub
* Không cần backend server
* Không cần machine learning hoặc AI cloud

---

## 3. Chức năng chính

### 3.1. Chọn và tải Git repository

* Người dùng chọn thư mục local
* Kiểm tra thư mục có chứa `.git`

### 3.2. Trích xuất dữ liệu Git

* Lấy danh sách commit
* Lấy thông tin:

  * Commit hash
  * Author
  * Thời gian
  * Danh sách file thay đổi

### 3.3. Phân tích mã nguồn (Static Analysis)

* Phân tích file source code
* Trích xuất:

  * File
  * Function / Class (ở mức cơ bản)
  * Quan hệ gọi hàm (function call)

### 3.4. Xây dựng Knowledge Graph

* Các loại node:

  * Commit
  * File
  * Function
* Các loại quan hệ:

  * Commit → File (MODIFIES)
  * File → Function (CONTAINS)
  * Function → Function (CALLS)

### 3.5. Query & phân tích

* File bị sửa nhiều nhất
* Function “hotspot” (hay thay đổi)
* Các file thường bị sửa cùng nhau (co-change)

### 3.6. Trực quan hóa

* Hiển thị knowledge graph
* Cho phép:

  * Zoom / pan
  * Click node để xem metadata
* Timeline commit để quan sát sự thay đổi theo thời gian

---

## 4. Kiến trúc tổng thể

```
Electron Application
│
├─ Main Process
│  ├─ Gọi Git CLI
│  ├─ Parse dữ liệu Git
│  ├─ Điều phối phân tích
│
├─ Worker Thread
│  ├─ Static code analysis
│  ├─ Xây dựng knowledge graph
│
├─ Preload
│  └─ Expose IPC API an toàn
│
└─ Renderer (Vue 3)
   ├─ UI điều khiển
   ├─ Visualization
   └─ Query & filter
```

---

## 5. Tech Stack

### Core

* **Electron** – Desktop application framework
* **Vue 3** – Frontend framework
* **Vite** – Build tool
* **TypeScript** – Ngôn ngữ chính

### Data & Processing

* **Node.js** (fs, child_process)
* **Git CLI** – Lấy dữ liệu repository

### Visualization

* **Cytoscape.js** hoặc **D3.js** – Vẽ đồ thị

---

## 6. Thư viện đề xuất theo chức năng

### 6.1. Giao tiếp hệ thống

* `child_process` – chạy lệnh Git
* `fs`, `path` – đọc file hệ thống

### 6.2. Phân tích code

* JavaScript / TypeScript:

  * `esprima` hoặc `@typescript-eslint/parser`
* Các ngôn ngữ khác (tuỳ chọn):

  * Regex đơn giản ở mức function-level

### 6.3. Xử lý song song

* `worker_threads` – chạy phân tích nặng

### 6.4. Visualization

* `cytoscape`
* `d3`

### 6.5. UI

* `vue-router`
* `pinia` (state management)

---

## 7. Lộ trình triển khai đề xuất

### Giai đoạn 1

* Setup Electron + Vue + Vite
* Chọn repo local
* Lấy dữ liệu Git cơ bản

### Giai đoạn 2

* Static code analysis
* Xây dựng graph data structure

### Giai đoạn 3

* Query engine
* Visualization
* Hoàn thiện UI

---

## 8. Giá trị học thuật của dự án

* Áp dụng kiến thức:

  * Software Engineering
  * Static Analysis
  * Graph Data Structure
* Phân tích lịch sử và cấu trúc phần mềm
* Không phụ thuộc nền tảng bên thứ ba

---

## 9. Ghi chú

* Dự án ưu tiên **chiều sâu kỹ thuật** hơn số lượng chức năng
* Có thể mở rộng trong tương lai:

  * Phân tích nhiều repo
  * Thêm developer metrics
  * Import repo từ GitHub (optional)
