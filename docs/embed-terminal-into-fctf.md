# Nhúng Web Terminal từ KYPO Instance Run vào FCTF

## Kiến trúc tổng quan

Web terminal trong KYPO dùng **Guacamole** (WebSocket). Luồng hoạt động khi nhúng vào FCTF:

```
FCTF App ──iframe──▶ KYPO: /console/sandbox-instance/{sandboxId}/console/{nodeId}
                           ▼
                     ConsoleFullscreenWrapperComponent
                           ▼
                     ConsoleView (Guacamole WebSocket)
                           ▼
                     Guacamole Server (wss://...)
```

**Files liên quan trong KYPO frontend:**
- Component terminal: `libs/components/src/topology-graph/console/console-view.component.ts`
- Fullscreen wrapper: `libs/components/src/topology-graph/console/console-fullscreen-wrapper.component.ts`
- Route đăng ký: `apps/cyberrangecz-platform/src/app/app-routes.ts` (dòng 211)

---

## Route fullscreen console sẵn có

KYPO đã expose route standalone cho terminal:

```
/console/sandbox-instance/:sandboxInstanceId/console/:nodeId
```

**Query parameters:**

| Param | Giá trị | Mô tả |
|-------|---------|-------|
| `inGui` | `false` | Terminal CLI (SSH) |
| `inGui` | `true` | Desktop GUI (VNC) |
| `hideSidebar` | `true` | Ẩn sidebar KYPO — nên dùng khi nhúng |

**Ví dụ URL đầy đủ:**
```
https://<kypo-domain>/console/sandbox-instance/abc-123/console/attacker?inGui=false&hideSidebar=true
```

---

## Cách 1 — Nhúng bằng iframe

Phù hợp khi FCTF và KYPO dùng chung Keycloak realm (SSO).

```html
<iframe
  id="kypo-terminal"
  src="https://<kypo-domain>/console/sandbox-instance/<sandboxInstanceId>/console/<nodeId>?inGui=false&hideSidebar=true"
  width="100%"
  height="600px"
  style="border: none; border-radius: 4px;"
  allow="clipboard-read; clipboard-write"
></iframe>
```

**Tạo iframe động bằng JavaScript:**

```javascript
function embedTerminal(containerId, sandboxInstanceId, nodeId, options = {}) {
  const { inGui = false, height = '600px', kypoBaseUrl } = options;

  const url = new URL(
    `/console/sandbox-instance/${sandboxInstanceId}/console/${nodeId}`,
    kypoBaseUrl
  );
  url.searchParams.set('inGui', String(inGui));
  url.searchParams.set('hideSidebar', 'true');

  const iframe = document.createElement('iframe');
  iframe.src = url.toString();
  iframe.width = '100%';
  iframe.height = height;
  iframe.style.border = 'none';
  iframe.allow = 'clipboard-read; clipboard-write';

  document.getElementById(containerId).appendChild(iframe);
}

// Sử dụng
embedTerminal('terminal-container', 'abc-uuid-123', 'attacker', {
  inGui: false,
  height: '600px',
  kypoBaseUrl: 'https://kypo.example.com',
});
```

---

## Cách 2 — Mở cửa sổ mới (popup)

An toàn hơn với vấn đề cookie `SameSite`. Phù hợp khi không thể cấu hình server.

```javascript
function openTerminalWindow(sandboxInstanceId, nodeId, inGui = false) {
  const kypoBaseUrl = 'https://<kypo-domain>';
  const url = `${kypoBaseUrl}/console/sandbox-instance/${sandboxInstanceId}/console/${nodeId}?inGui=${inGui}&hideSidebar=true`;

  window.open(url, '_blank', 'width=1280,height=800,resizable=yes');
}

// Sử dụng
openTerminalWindow('abc-uuid-123', 'attacker');          // SSH terminal
openTerminalWindow('abc-uuid-123', 'desktop-node', true); // GUI desktop
```

---

## Lấy sandboxInstanceId từ KYPO API

Sau khi user bắt đầu training run, gọi API để lấy `sandboxInstanceId`:

```javascript
async function getSandboxInstanceId(trainingRunId, accessToken) {
  const response = await fetch(
    `https://<kypo-domain>/kypo-rest-training/api/v1/training-runs/${trainingRunId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch training run: ${response.status}`);
  }

  const data = await response.json();
  return data.sandbox_instance_id;
}
```

**Lấy danh sách node trong topology (để biết nodeId):**

```javascript
async function getTopologyNodes(sandboxInstanceId, accessToken) {
  const response = await fetch(
    `https://<kypo-domain>/kypo-openstack-2/api/v1/sandbox-instances/${sandboxInstanceId}/topology`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  // Trả về mảng node với field `name` chứa nodeId
  return data.nodes || [];
}
```

---

## Xử lý Authentication

### Trường hợp 1: FCTF và KYPO dùng chung Keycloak realm (khuyến nghị)

User login vào Keycloak một lần → cả FCTF và KYPO iframe đều nhận session tự động.

```javascript
// Trong FCTF app — sau khi user đã login Keycloak
// iframe sẽ tự authenticate qua session cookie của Keycloak
embedTerminal('terminal-container', sandboxInstanceId, 'attacker', { ... });
```

### Trường hợp 2: FCTF có access token, cần pass vào KYPO

Nếu FCTF có thể lấy Keycloak access token, có thể mở URL với token qua silent login:

```javascript
// Mở terminal sau khi đảm bảo user đã authenticated trên Keycloak
async function openAuthenticatedTerminal(sandboxInstanceId, nodeId) {
  // Kiểm tra session Keycloak còn hợp lệ không
  const keycloakUrl = 'https://<keycloak-domain>/auth/realms/<realm>/protocol/openid-connect/userinfo';
  const token = getStoredAccessToken(); // từ FCTF auth store

  const check = await fetch(keycloakUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (check.ok) {
    openTerminalWindow(sandboxInstanceId, nodeId);
  } else {
    // Redirect user đến Keycloak login trước
    redirectToKeycloakLogin();
  }
}
```

---

## Cấu hình server cần thiết

### 1. Cho phép FCTF nhúng KYPO qua iframe

Trong nginx/config của KYPO frontend, thêm header CSP:

```nginx
# nginx.conf — KYPO frontend server
add_header Content-Security-Policy "frame-ancestors 'self' https://fctf.example.com";
# Hoặc dùng X-Frame-Options (cũ hơn, chỉ cho 1 domain):
# add_header X-Frame-Options "ALLOW-FROM https://fctf.example.com";
```

### 2. Fix cookie SameSite cho Keycloak

Trong Keycloak config hoặc nginx proxy trước Keycloak:

```nginx
# Proxy pass để thêm SameSite=None cho cookie Keycloak
proxy_cookie_flags ~ secure samesite=none;
```

### 3. Guacamole WebSocket CORS

Trong config của Guacamole server (guacamole.properties):

```properties
# Cho phép WebSocket từ domain FCTF
allowed-origins: https://fctf.example.com, https://kypo.example.com
```

---

## Ví dụ tích hợp hoàn chỉnh (plain HTML/JS)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>FCTF Terminal</title>
  <style>
    #terminal-wrapper {
      width: 100%;
      height: 600px;
      background: #1a1a1a;
      border-radius: 8px;
      overflow: hidden;
    }
    #terminal-wrapper iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>

  <div id="terminal-wrapper">
    <!-- Terminal được nhúng vào đây -->
  </div>

  <script>
    const KYPO_BASE_URL = 'https://kypo.example.com';

    async function loadTerminal(trainingRunId, accessToken) {
      // 1. Lấy sandboxInstanceId từ KYPO API
      const runRes = await fetch(
        `${KYPO_BASE_URL}/kypo-rest-training/api/v1/training-runs/${trainingRunId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const runData = await runRes.json();
      const sandboxInstanceId = runData.sandbox_instance_id;

      // 2. Lấy danh sách node (tùy chọn — nếu cần chọn node)
      // const nodes = await getTopologyNodes(sandboxInstanceId, accessToken);
      // const targetNode = nodes[0].name;

      const targetNode = 'attacker'; // hoặc chọn từ danh sách nodes

      // 3. Tạo iframe
      const url = new URL(
        `/console/sandbox-instance/${sandboxInstanceId}/console/${targetNode}`,
        KYPO_BASE_URL
      );
      url.searchParams.set('inGui', 'false');
      url.searchParams.set('hideSidebar', 'true');

      const iframe = document.createElement('iframe');
      iframe.src = url.toString();
      iframe.allow = 'clipboard-read; clipboard-write';

      document.getElementById('terminal-wrapper').appendChild(iframe);
    }

    // Gọi sau khi có trainingRunId và accessToken
    // loadTerminal('42', keycloakAccessToken);
  </script>

</body>
</html>
```

---

## Tóm tắt checklist

- [ ] FCTF và KYPO dùng chung Keycloak realm
- [ ] KYPO nginx cho phép `frame-ancestors` domain của FCTF
- [ ] Keycloak cookie cấu hình `SameSite=None; Secure`
- [ ] Guacamole server cho phép WebSocket từ domain FCTF
- [ ] FCTF app có logic gọi KYPO API lấy `sandboxInstanceId`
- [ ] Truyền đúng `nodeId` (tên máy trong topology)
