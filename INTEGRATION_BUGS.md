# 联调缺陷与环境问题记录

> 最后更新：2026-07-16
>
> 范围：本地 Docker 开发栈（`oidc-op`、PostgreSQL、Redis）及 React 管理后台。
> 本文不记录会话 Cookie、CSRF token、账号、密码、客户端密钥或邮件通道密钥。

## 状态一览

| 编号    | 类型          | 状态       | 摘要                                                              |
| ------- | ------------- | ---------- | ----------------------------------------------------------------- |
| INT-001 | 前端缺陷      | 已修复     | 管理台登录出现 `CSRF validation failed`。                         |
| INT-002 | 开发栈缺陷    | 待修复     | 管理端“重启服务”会使 `pnpm dev` 容器中的 API 子进程停止且不恢复。 |
| INT-003 | 配置状态      | 已验证     | 邮件未配置时 readiness degraded，配置并重启后恢复 ready。         |
| INT-004 | 交接信息问题  | 已澄清     | 交接文本中的资源 ID 与数据库实际 ID 不一致。                      |
| INT-005 | 本机环境问题  | 有替代方案 | 宿主 Windows 不能直接执行 `vitest`，容器内可正常执行。            |
| INT-006 | OIDC 流程缺陷 | 已修复     | 未请求 `email` scope 仍强制进入邮箱补充流程。                     |
| INT-007 | 静态资源缺陷  | 已修复     | Vite 未将 favicon 复制到管理台构建目录。                          |
| INT-008 | 测试环境问题  | 有替代方案 | 容器联调环境变量污染默认测试运行。                                |

## INT-001：管理台登录 CSRF 校验失败

- **现象**：登录页提交账号密码后显示 `ApiError: CSRF validation failed`。
- **影响**：管理后台无法建立会话，阻断客户端创建、Revision 审核和系统设置操作。
- **根因**：
  1. `access-control-provider` 请求 `/auth/context` 后未调用 `setCsrfToken`；
  2. `authProvider.login` 直接提交 `/auth/login`，没有保证当前内存中的 token 与匿名 CSRF nonce Cookie 对应。

服务端登录接口要求双提交校验：匿名请求先由 `/auth/context` 设置
`cqut_manage_csrf` Cookie 并返回同一 nonce 绑定的 token，随后登录请求必须在
`X-CSRF-Token` 请求头中携带该 token。

### 修复

- `web/src/app/providers/access-control-provider.ts`：读取认证上下文后同步 CSRF token。
- `web/src/app/providers/auth-provider.ts`：登录提交前强制刷新认证上下文并同步 token。
- `web/src/app/providers/auth-provider.test.ts`：新增回归测试，断言请求顺序为
  `/auth/context` → 设置 token → `/auth/login`。

### 验证证据

- 正确 Cookie + `X-CSRF-Token` 的空凭据请求返回 `401`，而非 CSRF `400`，证明服务端握手有效。
- 容器内 `pnpm test:ui`：10/10 通过。
- 容器内 `pnpm lint`：通过。

### 复测步骤

1. 对 `http://127.0.0.1:3003` 执行硬刷新（Ctrl+F5）。
2. 使用管理台登录页提交有效学校账号。
3. 预期不再出现 CSRF 错误；若浏览器仍缓存旧前端资源，删除该站点的
   `cqut_manage_csrf` Cookie 后刷新再试。

## INT-002：开发模式下应用内重启使 API 不可用

- **现象**：`POST /api/management/settings/runtime-policy/restart` 返回 `202` 后，
  3003 端口拒绝连接，`/health/live` 长时间无法恢复。
- **影响**：运行策略写入后，在 Docker 开发栈中无法依赖管理端按钮使新策略加载；
  此后所有 API 联调中断。
- **复现条件**：Compose 服务以 `pnpm dev` 启动，内部使用
  `tsx watch --env-file=deploy/.env src/main.ts`。
- **已观察证据**：重启回调对服务子进程发送 `SIGTERM`；`tsx watch` 进程及
  `concurrently` 父进程仍在，但不再存在实际监听 3003 的应用进程。

### 当前规避措施

使用 Compose 管理的重启恢复服务：

```powershell
docker compose -f deploy/docker-compose.yml restart oidc-op
```

### 建议修复方向

在开发模式中禁用该应用内重启入口并提示使用 Compose 重启，或调整进程拓扑，
确保退出服务进程会使容器主进程退出并由 Docker 的 `restart: unless-stopped`
重新创建服务。修复后需验证 `202` 返回后 `/health/live` 自动恢复。

## INT-003：邮件未配置导致 readiness 为 degraded（非缺陷）

- **现象**：`/health/live` 返回 `200`，但 `/health/ready` 返回 `503`，响应中包含
  `email: "unconfigured"`。
- **判断**：这是阶段 5 邮件通道尚未配置时的预期就绪检查结果，不是服务存活故障。
- **影响**：Docker 健康检查当前使用 `/health/ready`，因此 `oidc-op` 容器会显示
  `unhealthy`，即使 API 仍可提供服务。
- **阶段 5 结果**：SMTP 配置加密入库并通过测试邮件和验证码验证；Compose
  重启后运行策略 `version=4`、`loadedVersion=4`、`restartRequired=false`，
  `/health/ready` 从 `503` 恢复为 `200`。

## INT-004：交接文本中的联调资源 ID 与数据库不一致

- **现象**：按交接文本中的 `proj_...`、`client_...` 查询时未找到资源，最初误判为
  数据卷缺失。
- **数据库证据**：资源实际存在，真实 ID 为：
  - 项目：`project_17jJ6LJfu8gm6-Mx3hEyAnBX`
  - Web：`client_8rr5uLOjZ9k9b1M43mM_Yrz7`
  - SPA：`client_A6M8Kgg_-C99EdphCvOZUkll`
- **判断**：数据未丢失，问题来自阶段交接文本中的 ID 与数据库不一致。

## INT-005：宿主 Windows 的前端测试可执行文件不可用

- **现象**：宿主执行 `pnpm test:ui` 时提示 `vitest is not recognized`。
- **影响**：不能直接使用宿主的 `node_modules` 执行前端测试。
- **规避措施**：使用运行中的 Linux 开发容器：

```powershell
docker compose -f deploy/docker-compose.yml exec -T oidc-op pnpm test:ui
docker compose -f deploy/docker-compose.yml exec -T oidc-op pnpm lint
```

- **后续动作**：如需恢复宿主验证能力，重新为 Windows 安装匹配平台的依赖；注意不要影响
  Compose 中用于隔离 Linux 原生依赖的 `/app/node_modules` 匿名卷。

## INT-006：未请求 email scope 仍强制补充邮箱

- **现象**：首次登录主体尚无已验证邮箱时，即使授权请求仅包含
  `openid profile student`，登录后仍跳转到邮箱补充和验证码流程。
- **影响**：不需要邮箱声明的客户端也被邮件通道阻断，使阶段 4 OIDC 流程错误依赖阶段 5
  邮件配置。
- **根因**：`src/routes/interactions.ts` 只检查主体邮箱状态，没有检查当前授权请求是否包含
  `email` scope。

### 修复

- 仅当当前请求包含 `email` scope，且主体缺少邮箱或需要验证时，才进入 `/profile`。
- 新增回归测试：首次主体请求 `openid profile` 时，登录后直接继续授权，且不发送验证码。

## INT-007：管理台 favicon 未进入构建目录

- **现象**：访问 `/favicon.svg` 时服务日志出现
  `ENOENT: /app/dist/management/favicon.svg`。
- **根因**：`web/vite.config.ts` 将 `publicDir` 指向 `web/src/assets`，但 favicon 位于
  `web/public/favicon.svg`。
- **修复**：将 Vite `publicDir` 改为 `web/public`，构建后应生成
  `dist/management/favicon.svg`。

## INT-008：容器联调环境变量污染测试运行

- **现象**：直接在 `oidc-op` 容器执行 `pnpm test` 时，测试继承真实
  `DATABASE_URL`、`REDIS_URL` 和 `OIDC_RATE_LIMIT_FAIL_CLOSED=true`：
  - 测试密钥无法解密联调库中的运行策略，产生级联失败；
  - 仅清除数据库和 Redis 地址后，fail-closed 又使大量请求返回 `503`。
- **判断**：这是测试启动环境隔离问题，不是测试用例回归。
- **可靠命令**：

```powershell
docker compose -f deploy/docker-compose.yml exec -T oidc-op sh -lc `
  'unset DATABASE_URL REDIS_URL; export OIDC_RATE_LIMIT_FAIL_CLOSED=false; pnpm test'
```

- **验证结果**：服务端 160 通过、11 跳过、0 失败；前端 10/10 通过。
