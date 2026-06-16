# Proxmox VE UI – Phân tích giao diện (Design Reference)

> Dùng tài liệu này làm prompt khi muốn clone, chỉnh sửa hoặc lấy cảm hứng từ giao diện Proxmox VE.

---

## 1. Tổng quan bố cục (Layout Overview)

Giao diện Proxmox VE theo kiểu **3-column admin dashboard** cổ điển:

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER / TOPBAR                                            │
├────────────┬───────────────────┬────────────────────────────┤
│            │                   │                            │
│  LEFT NAV  │  CONTENT PANEL    │  (không có right panel     │
│  (Sidebar) │  (Main Area)      │   riêng – content chiếm    │
│            │                   │   phần còn lại)            │
│            │                   │                            │
├────────────┴───────────────────┴────────────────────────────┤
│  STATUS BAR / TASK LOG (bottom strip)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Màu sắc (Color Palette)

| Vai trò               | Màu (hex gần đúng) | Ghi chú                          |
|-----------------------|--------------------|----------------------------------|
| Nền tổng              | `#1a1a2e` → `#2b2b3b` | Gradient xám đậm, gần đen       |
| Sidebar background    | `#2d2d3d`          | Tối hơn nền một chút             |
| Header background     | `#1c1c2a`          | Thanh trên cùng rất tối          |
| Content background    | `#f0f0f0`          | Vùng nội dung chính màu xám nhạt |
| Card / Panel bg       | `#ffffff`          | Trắng thuần                      |
| Accent chính          | `#e67e22` / `#f39c12` | Cam Proxmox – dùng cho icon, badge active |
| Text trên dark bg     | `#d0d0d0`          | Xám nhạt, không trắng tinh       |
| Text trên light bg    | `#333333`          | Xám đậm, dễ đọc                  |
| Success / Online      | `#27ae60`          | Xanh lá – trạng thái chạy tốt   |
| Warning               | `#f39c12`          | Vàng cam – cảnh báo              |
| Error / Offline       | `#e74c3c`          | Đỏ – lỗi, offline                |
| Border / Divider      | `#cccccc` / `#444` | Tùy vùng sáng/tối                |

---

## 3. Typography

- **Font chính:** Sans-serif hệ thống — `Helvetica Neue`, `Arial`, hoặc `Tahoma`
- **Font size body:** 12–13px (compact, dense information)
- **Font size tiêu đề panel:** 13–14px, `font-weight: bold`
- **Font size số liệu lớn (metric):** 24–32px, bold
- **Icon font:** Sử dụng icon sprite/img (không dùng FontAwesome chuẩn)
- **Casing:** Sentence case cho label, UPPERCASE cho tab active

---

## 4. Topbar (Header)

```
[ PROXMOX Logo ] [ Breadcrumb / Node Name ]    [ Username ▼ ] [ ? ] [ ⚡ ]
```

- Nền: rất tối (#1c1c2a)
- Logo nằm trái, có thể click về dashboard
- Breadcrumb hiển thị path dạng: `Datacenter > pve > VM 100`
- Bên phải: dropdown user, nút help, nút logout/task

---

## 5. Left Sidebar (Tree Navigation)

Cấu trúc cây dạng **tree view** có thể collapse/expand:

```
▼ Datacenter
   ▼ pve (node)
      ├─ 100 (qemu) – VM
      ├─ 101 (qemu) – VM
      ├─ local (storage)
      └─ ...
   └─ pve2 (node)
```

- Nền: xám tối (#2d2d3d)
- Text: xám nhạt (#ccc)
- Item được chọn: highlight bằng màu accent cam hoặc nền sáng hơn
- Icon nhỏ bên trái mỗi node (server, VM, CT, storage)
- Width: ~200–220px, fixed

---

## 6. Content Area (Main Panel)

### 6a. Tab Bar

Nằm ngay trên nội dung chính, dạng tab ngang:

```
[ Summary ] [ Console ] [ Hardware ] [ Network ] [ Snapshots ] [ Backup ] ...
```

- Tab active: nền trắng, border-bottom accent màu cam hoặc blue
- Tab inactive: nền xám nhạt, text xám đậm

### 6b. Summary Panel – Node/VM Status

Bố cục dạng **card grid**, mỗi card là một metric:

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  STATUS        │  │  CPU Usage     │  │  Memory        │
│  ✅ Running    │  │   [donut 5%]   │  │  [donut 6%]    │
│                │  │  0.53 GHz      │  │  1.16 GB used  │
└────────────────┘  └────────────────┘  └────────────────┘

┌────────────────────────────────────┐
│  Virtual Machines                  │
│  Total: 5 | Running: 3 | Stopped:2│
└────────────────────────────────────┘
```

**Donut Chart:**
- Nền donut: xám nhạt (#e0e0e0)
- Phần đã dùng: màu accent (cam hoặc xanh lá tùy metric)
- Số % hiển thị ở giữa
- Label nhỏ bên dưới

### 6c. Resource Table (VM List, Storage List)

Dạng **data grid** với các cột:

| Name | Status | CPU | Memory | Disk | Uptime |
|------|--------|-----|--------|------|--------|

- Header cột: background xám nhạt, border-bottom rõ
- Row zebra-striping: trắng / xám rất nhạt (#f9f9f9)
- Status badge: pill nhỏ (green = running, red = stopped, yellow = paused)
- Hover row: highlight nhạt
- Click row: chọn và highlight rõ hơn

---

## 7. Bottom Status Bar

```
[ Tasks ] [ Logs ]    [ Active task: "vm start 100" – 100% ✓ ]
```

- Nền rất tối, text xanh/xám
- Hiển thị task đang chạy / log gần nhất
- Có thể expand lên thành panel log đầy đủ

---

## 8. Các UI Component đặc trưng

### Donut / Gauge Chart
- SVG vòng tròn, không có needle
- Màu fill: cam cho CPU/disk, xanh lá cho memory, xanh dương cho network
- Số liệu ở giữa, bold, lớn

### Status Indicator
- Icon tròn: ✅ màu xanh lá (online/running), ⛔ đỏ (stopped), 🟡 vàng (warning)
- Kèm text trạng thái nhỏ bên phải

### Button Style
```css
/* Primary */
background: #e67e22;
color: #fff;
border-radius: 3px;
padding: 4px 12px;
font-size: 12px;

/* Secondary */
background: #fff;
border: 1px solid #ccc;
color: #333;
```

### Input / Form
- Border: 1px solid #ccc
- Border-radius: 2–3px (rất nhỏ, gần như vuông)
- Compact padding: 3–4px 6px
- Label đặt trên hoặc trái input

---

## 9. Spacing & Grid

- Padding nội tại card: 12–16px
- Gap giữa card: 8–12px
- Sidebar item height: 24–28px (compact)
- Table row height: 22–26px (dense)
- Border-radius toàn hệ thống: **2–4px** (vuông vắn, không bo tròn nhiều)

---

## 10. Nguyên tắc thiết kế (Design Principles)

1. **Information density cao** – nhét nhiều data vào màn hình, ưu tiên compact hơn spacious
2. **Không dùng shadow nhiều** – flat UI với border thay vì drop-shadow
3. **Màu có nghĩa nghiêm túc** – xanh = tốt, đỏ = lỗi, cam = warning/active, không dùng màu trang trí
4. **Tree navigation là trung tâm** – phần lớn action bắt đầu từ việc chọn node/VM trong cây
5. **Tab-first content switch** – không dùng modal nhiều, nội dung chuyển qua tab trong cùng panel
6. **Compact form** – dialog/form nhỏ gọn, inline khi có thể

---

## 11. Prompt mẫu để tái tạo giao diện

```
Tạo giao diện admin dashboard theo phong cách Proxmox VE với:
- Layout 3 cột: sidebar cây bên trái (220px, nền #2d2d3d), topbar tối (#1c1c2a), 
  content area chính nền xám nhạt (#f0f0f0)
- Color palette: nền tối xám #2b2b3b, accent cam #e67e22, 
  success xanh #27ae60, error đỏ #e74c3c
- Font sans-serif nhỏ 12-13px, compact, dense
- Card metric với donut chart SVG hiển thị CPU/RAM usage
- Data grid có zebra-striping, status badge pill
- Status bar cố định đáy màn hình hiển thị task log
- Border-radius tối đa 4px, ít shadow, dùng border thay thế
- Tab bar chuyển nội dung trong panel, không dùng nhiều modal
```

---

*Tài liệu phân tích từ screenshot Proxmox VE. Dùng làm design reference / prompt engineering.*
