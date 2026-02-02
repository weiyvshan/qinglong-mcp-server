# Qinglong MCP Server 开发文档

## 技术栈

- **语言**: TypeScript 5.7.2
- **框架**: MCP TypeScript SDK 1.6.1
- **HTTP 客户端**: Axios 1.7.9
- **验证库**: Zod 3.23.8
- **传输协议**: stdio / Streamable HTTP
- **Node.js**: >= 18

## 项目结构

```
src/
├── index.ts                    # MCP 服务器主入口
├── constants.ts                # 常量定义
├── types.ts                    # TypeScript 类型定义
├── schemas/                    # Zod 验证模式
│   ├── common.ts              # 通用模式 (分页、响应格式)
│   ├── cron.ts                # 定时任务模式
│   ├── env.ts                 # 环境变量模式
│   ├── script.ts              # 脚本模式
│   └── system.ts              # 系统模式
├── services/                   # 服务层
│   └── qinglong-client.ts     # 青龙 API 客户端
├── tools/                      # 工具实现 (35 个)
│   ├── cron.ts                # 定时任务工具 (9 个)
│   ├── env.ts                 # 环境变量工具 (6 个)
│   ├── subscription.ts        # 订阅管理工具 (7 个)
│   ├── dependence.ts          # 依赖管理工具 (4 个)
│   ├── script.ts              # 脚本管理工具 (7 个)
│   └── system.ts              # 系统管理工具 (2 个)
└── utils/
    └── formatters.ts          # 输出格式化工具
```

## 核心设计

### 1. 认证机制

使用 Client Credentials 认证，自动处理 Token 刷新：

```typescript
const client = new QinglongClient({
  baseUrl: 'http://localhost:5700',
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret'
});
```

### 2. 输出格式

所有工具支持双格式输出：

```typescript
// Markdown 格式 - 人类可读
{
  response_format: 'markdown'
}

// JSON 格式 - 机器可读
{
  response_format: 'json'
}
```

### 3. 分页支持

列表类工具统一分页参数：

```typescript
{
  page: 1,      // 页码，默认 1
  size: 20,     // 每页数量，最大 100
  searchValue: ''  // 搜索关键词
}
```

返回包含分页信息：

```typescript
{
  data: [...],
  pagination: {
    total: 100,
    page: 1,
    size: 20,
    has_more: true,
    next_page: 2
  }
}
```

### 4. 错误处理

统一错误分类和处理：

| 状态码 | 错误类型 | 处理策略 |
|--------|----------|----------|
| 400 | 请求参数错误 | 返回详细错误信息 |
| 401 | 认证失败 | 提示检查凭证 |
| 403 | 权限不足 | 提示检查权限 |
| 404 | 资源不存在 | 提示检查 ID |
| 429 | 请求过频 | 提示稍后重试 |
| 500 | 服务器错误 | 提示检查服务状态 |

### 5. 工具注解

遵循 MCP 最佳实践，为工具添加注解：

```typescript
{
  name: 'qinglong_delete_crons',
  description: '删除定时任务',
  readOnlyHint: false,
  destructiveHint: true,      // 破坏性操作
  idempotentHint: false
}
```

## 开发规范

### 添加新工具

1. 在对应模块的 `tools/*.ts` 中添加工具定义
2. 在 `schemas/*.ts` 中定义参数和响应模式
3. 在 `index.ts` 中注册工具
4. 更新文档

示例：

```typescript
// tools/cron.ts
export const CronTools = {
  async createCron(args: CreateCronArgs) {
    // 实现逻辑
  }
};

// schemas/cron.ts
export const CreateCronSchema = z.object({
  name: z.string().min(1).max(100),
  command: z.string().min(1),
  schedule: z.string().regex(/^([\d*,/-]+\s){4}[\d*,/-]+$/)
});

// index.ts
server.registerTool('qinglong_create_cron', CronTools.createCron, {
  schema: CreateCronSchema
});
```

### 代码质量

- ✅ TypeScript 严格模式
- ✅ Zod 运行时验证
- ✅ 完整的类型定义
- ✅ 错误处理覆盖
- ✅ 代码复用（DRY 原则）

## 构建和测试

```bash
# 开发模式（热重载）
npm run dev

# 构建
npm run build

# 使用 MCP Inspector 测试
npx @modelcontextprotocol/inspector node dist/index.js
```

## 性能优化

- Axios 连接池复用
- 单例 API 客户端
- 30 秒请求超时
- 自动字符截断（25000 字符限制）

## 安全考虑

- 环境变量存储凭证，不硬编码
- 使用 Bearer Token 自动认证
- 请求拦截器统一处理认证
- 破坏性操作添加确认提示
