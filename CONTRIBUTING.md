# 贡献指南

感谢你对 qinglong-mcp-server 项目的关注！我们欢迎所有形式的贡献。

## 开始之前

- 确保你已阅读 [README.md](README.md) 了解项目基本信息
- 查看 [EXAMPLES.md](EXAMPLES.md) 了解使用示例
- 查看 [DEVELOPMENT.md](DEVELOPMENT.md) 了解开发细节

## 如何贡献

### 报告 Bug

1. 首先搜索现有 issues，确认问题未被报告
2. 使用 [Bug Report 模板](../../issues/new?template=bug_report.yml) 创建新 issue
3. 提供尽可能详细的信息：复现步骤、环境信息、错误日志等

### 提出新功能

1. 搜索现有 issues，确认功能未被提议
2. 使用 [Feature Request 模板](../../issues/new?template=feature_request.yml) 创建新 issue
3. 描述清楚功能的用途和使用场景

### 提交代码

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature-name`
3. 进行代码修改
4. 确保代码通过 lint 检查：`npm run lint`（如果有）
5. 提交更改：`git commit -m "feat: 描述你的改动"`
6. 推送到你的 Fork：`git push origin feature/your-feature-name`
7. 创建 Pull Request

## 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/weiyvshan/qinglong-mcp-server.git
cd qinglong-mcp-server

# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 构建
npm run build

# 运行
npm start
```

## 代码规范

### TypeScript 规范

- 使用 TypeScript 严格模式
- 所有函数和类必须有明确的类型注解
- 避免使用 `any` 类型
- 使用单引号字符串
- 缩进使用 2 个空格

### 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**类型 (type):**

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 仅文档更改
- `style`: 不影响代码含义的格式更改
- `refactor`: 既不修复 bug 也不添加功能的代码更改
- `perf`: 性能优化
- `test`: 添加或修正测试
- `chore`: 构建过程或辅助工具的变动

**示例:**

```
feat(cron): 添加批量启用/禁用定时任务功能

fix(auth): 修复 token 过期后无法自动刷新的问题

docs(readme): 更新环境变量配置说明
```

### 代码审查流程

1. 所有 Pull Request 都需要至少一个审查者的批准
2. CI 检查必须通过
3. 审查者可能会提出修改建议，请积极响应

## 项目结构

```
qinglong-mcp-server/
├── src/
│   ├── index.ts              # MCP 服务器主入口
│   ├── constants.ts          # 常量定义
│   ├── types.ts              # TypeScript 类型定义
│   ├── schemas/              # Zod 验证模式
│   ├── services/             # API 客户端服务
│   ├── tools/                # 工具实现
│   └── utils/                # 工具函数
├── dist/                     # 编译输出（自动生成）
├── package.json
├── tsconfig.json
└── README.md
```

## 添加新工具

如果你想添加新的 MCP 工具，请遵循以下步骤：

1. 在 `src/schemas/` 中定义 Zod 验证模式
2. 在 `src/tools/` 中实现工具逻辑
3. 在 `src/index.ts` 中注册工具
4. 更新 README.md 添加工具文档
5. 添加使用示例到 EXAMPLES.md

## 问题反馈

如有任何问题，欢迎通过以下方式联系：

- 创建 GitHub Issue
- 发送邮件到 [你的邮箱]

## 许可

通过贡献代码，你同意你的贡献将在 [MIT 许可证](LICENSE) 下发布。
