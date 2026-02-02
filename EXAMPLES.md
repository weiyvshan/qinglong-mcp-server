# Qinglong MCP Server 使用示例

## 快速开始

### 1. 配置环境变量

```bash
export QL_URL="http://your-qinglong:5700"
export QL_CLIENT_ID="your-client-id"
export QL_CLIENT_SECRET="your-client-secret"
```

### 2. 与 Claude Code 集成

编辑 `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "qinglong": {
      "command": "node",
      "args": ["/absolute/path/to/qinglong-mcp-server/dist/index.js"],
      "env": {
        "QL_URL": "http://your-qinglong:5700",
        "QL_CLIENT_ID": "your_client_id",
        "QL_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

## 使用示例

### 场景 1: 创建每日签到任务

```
请帮我在青龙面板创建一个每日凌晨 0 点执行的签到任务：
- 任务名称：newapi 每日签到
- 执行命令：python /ql/data/scripts/newapi_checkin.py
- 标签：签到、自动化
```

Claude 会调用：
```typescript
qinglong_create_cron({
  name: "newapi 每日签到",
  command: "python /ql/data/scripts/newapi_checkin.py",
  schedule: "0 0 * * *",
  labels: ["签到", "自动化"]
})
```

### 场景 2: 批量管理环境变量

```
请帮我批量创建以下环境变量：
1. API_KEY_1 = abc123 (备注：账号1)
2. API_KEY_2 = def456 (备注：账号2)
3. API_KEY_3 = ghi789 (备注：账号3)
```

Claude 会调用：
```typescript
qinglong_create_envs({
  envs: [
    { name: "API_KEY_1", value: "abc123", remarks: "账号1" },
    { name: "API_KEY_2", value: "def456", remarks: "账号2" },
    { name: "API_KEY_3", value: "ghi789", remarks: "账号3" }
  ]
})
```

### 场景 3: 查看任务执行情况

```
请帮我查看所有签到相关的定时任务
```

Claude 会调用：
```typescript
qinglong_list_crons({
  searchValue: "签到",
  response_format: "markdown"
})
```

### 场景 4: 查看任务日志

```
请帮我查看任务 ID 为 1 的执行日志
```

Claude 会调用：
```typescript
qinglong_get_cron_log({
  cron_id: 1,
  response_format: "markdown"
})
```

### 场景 5: 批量启用/禁用任务

```
请帮我禁用 ID 为 1、2、3 的定时任务
```

Claude 会调用：
```typescript
qinglong_disable_crons({
  cron_ids: [1, 2, 3]
})
```

## 高级用法

### 使用 JSON 格式输出

```
请以 JSON 格式列出所有定时任务
```

```typescript
qinglong_list_crons({
  response_format: "json"
})
```

### 分页查询

```
请列出第 2 页的定时任务，每页显示 10 个
```

```typescript
qinglong_list_crons({
  page: 2,
  size: 10
})
```

### 创建带前置/后置脚本的任务

```
请创建一个任务，执行前先备份数据，执行后发送通知
```

```typescript
qinglong_create_cron({
  name: "数据同步任务",
  command: "python /ql/data/scripts/sync.py",
  schedule: "0 2 * * *",
  task_before: "bash /ql/data/scripts/backup.sh",
  task_after: "bash /ql/data/scripts/notify.sh"
})
```

### 脚本管理

```
请帮我创建一个 Python 脚本 /test.py，内容是打印 Hello World
```

```typescript
qinglong_create_script({
  path: "/test.py",
  content: "#!/usr/bin/env python3\nprint('Hello World')"
})
```

### 系统管理

```
请帮我重载青龙面板的定时任务配置
```

```typescript
qinglong_reload_system({
  type: "crontab"
})
```

## 性能优化建议

### 1. 使用批量操作

```typescript
// 推荐：批量操作
qinglong_delete_crons({ cron_ids: [1, 2, 3, 4, 5] })

// 不推荐：多次单独操作
qinglong_delete_crons({ cron_ids: [1] })
qinglong_delete_crons({ cron_ids: [2] })
```

### 2. 使用搜索过滤

```typescript
// 只获取签到相关的任务
qinglong_list_crons({ searchValue: "签到" })
```

### 3. 合理设置分页

```typescript
// 只需要少量数据
qinglong_list_crons({ size: 10 })

// 需要更多数据
qinglong_list_crons({ size: 50 })
```

## 故障排查

### 认证失败

**错误信息**: `认证失败，请检查 QL_CLIENT_ID 和 QL_CLIENT_SECRET 是否正确`

**解决方案**:
1. 检查环境变量是否正确设置
2. 确认 Client ID 和 Secret 是否有效
3. 尝试重新生成认证信息

### 无法连接到青龙面板

**错误信息**: `无法连接到青龙面板，请检查 QL_URL 是否正确`

**解决方案**:
1. 检查 `QL_URL` 是否正确
2. 确认青龙面板是否正在运行
3. 检查网络连接和防火墙设置

### 权限不足

**错误信息**: `权限不足，无法访问此资源`

**解决方案**:
1. 检查 API 应用的权限范围
2. 确认当前用户是否有足够的权限
3. 尝试使用管理员账号重新生成认证信息

## 调试工具

### 使用 MCP Inspector

```bash
# 启动 Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

### 查看日志

```bash
# 查看日志
npm start 2>&1 | tee server.log
```

### 开发模式

```bash
# 热重载开发
npm run dev
```
