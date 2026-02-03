# Qinglong MCP Server

[![CI](https://github.com/weiyvshan/qinglong-mcp-server/workflows/CI/badge.svg)](https://github.com/weiyvshan/qinglong-mcp-server/actions)
[![Version](https://img.shields.io/npm/v/qinglong-mcp-server.svg)](https://www.npmjs.com/package/qinglong-mcp-server)
[![License](https://img.shields.io/github/license/weiyvshan/qinglong-mcp-server.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue.svg)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.6.1-green.svg)](https://modelcontextprotocol.io/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

基于 MCP (Model Context Protocol) 的青龙面板管理服务器，提供 35 个工具用于管理定时任务、环境变量、订阅、依赖、脚本和系统配置。

## 特性

- **完整 API 覆盖** - 35 个工具覆盖青龙面板核心功能
- **类型安全** - TypeScript + Zod 双重类型保障
- **本地运行** - 基于 stdio 标准输入输出，与 Claude Code 无缝集成
- **双格式输出** - Markdown (人类可读) 和 JSON (机器可读)
- **自动认证** - 使用 Client Credentials 自动获取 Token
- **批量操作** - 支持批量管理任务和环境变量

## 快速开始

### 方式 A：直接使用 npm（推荐）

```bash
npm install -g qinglong-mcp-server
```

### 方式 B：使用 npx（无需全局安装）

```bash
npx qinglong-mcp-server
```

### 配置环境变量（两种方式都需要）

在青龙面板中创建 Client Credentials，得到 `client_id` 和 `client_secret`，并配置以下环境变量：

```bash
export QL_URL="http://localhost:5700"
export QL_CLIENT_ID="your_client_id"
export QL_CLIENT_SECRET="your_client_secret"
```

### 与 Claude Code 集成

编辑 `~/.claude/mcp.json`（全局安装时）：

```json
{
  "mcpServers": {
    "qinglong": {
      "command": "qinglong-mcp",
      "env": {
        "QL_URL": "http://your-qinglong:5700",
        "QL_CLIENT_ID": "your_client_id",
        "QL_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

如果你用的是源码方式（开发者/贡献者），请改用：

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

### 源码运行（开发者）

```bash
git clone https://github.com/weiyvshan/qinglong-mcp-server.git
cd qinglong-mcp-server
npm install
npm run build
npm start
```

## 功能模块

### 定时任务管理 (9 个工具)

| 工具 | 功能 | 类型 |
|------|------|------|
| `qinglong_list_crons` | 列出定时任务 | 只读 |
| `qinglong_create_cron` | 创建定时任务 | 写入 |
| `qinglong_update_cron` | 更新定时任务 | 写入 |
| `qinglong_delete_crons` | 删除定时任务 | 破坏性 |
| `qinglong_run_crons` | 运行定时任务 | 写入 |
| `qinglong_stop_crons` | 停止定时任务 | 写入 |
| `qinglong_enable_crons` | 启用定时任务 | 写入 |
| `qinglong_disable_crons` | 禁用定时任务 | 写入 |
| `qinglong_get_cron_log` | 查看任务日志 | 只读 |

### 环境变量管理 (6 个工具)

| 工具 | 功能 | 类型 |
|------|------|------|
| `qinglong_list_envs` | 列出环境变量 | 只读 |
| `qinglong_create_envs` | 创建环境变量（支持批量） | 写入 |
| `qinglong_update_env` | 更新环境变量 | 写入 |
| `qinglong_delete_envs` | 删除环境变量 | 破坏性 |
| `qinglong_enable_envs` | 启用环境变量 | 写入 |
| `qinglong_disable_envs` | 禁用环境变量 | 写入 |

### 订阅管理 (7 个工具)

| 工具 | 功能 | 类型 |
|------|------|------|
| `qinglong_list_subscriptions` | 列出订阅 | 只读 |
| `qinglong_create_subscription` | 创建订阅 | 写入 |
| `qinglong_update_subscription` | 更新订阅 | 写入 |
| `qinglong_delete_subscriptions` | 删除订阅 | 破坏性 |
| `qinglong_run_subscriptions` | 运行订阅 | 写入 |
| `qinglong_enable_subscriptions` | 启用订阅 | 写入 |
| `qinglong_disable_subscriptions` | 禁用订阅 | 写入 |

### 依赖管理 (4 个工具)

| 工具 | 功能 | 类型 |
|------|------|------|
| `qinglong_list_dependencies` | 列出依赖 | 只读 |
| `qinglong_create_dependencies` | 创建依赖 | 写入 |
| `qinglong_delete_dependencies` | 删除依赖 | 破坏性 |
| `qinglong_reinstall_dependencies` | 重装依赖 | 写入 |

### 脚本管理 (7 个工具)

| 工具 | 功能 | 类型 |
|------|------|------|
| `qinglong_list_scripts` | 列出脚本文件 | 只读 |
| `qinglong_get_script` | 获取脚本内容 | 只读 |
| `qinglong_create_script` | 创建脚本 | 写入 |
| `qinglong_update_script` | 更新脚本 | 写入 |
| `qinglong_delete_script` | 删除脚本 | 破坏性 |
| `qinglong_run_script` | 运行脚本 | 写入 |
| `qinglong_stop_script` | 停止脚本 | 写入 |

### 系统管理 (2 个工具)

| 工具 | 功能 | 类型 |
|------|------|------|
| `qinglong_get_system_info` | 获取系统信息 | 只读 |
| `qinglong_send_notification` | 发送系统通知 | 写入 |

## 配置说明

### 环境变量

| 变量 | 描述 | 必需 | 默认值 |
|------|------|------|--------|
| `QL_URL` | 青龙面板地址 | 否 | `http://localhost:5700` |
| `QL_CLIENT_ID` | Client ID | 是 | - |
| `QL_CLIENT_SECRET` | Client Secret | 是 | - |

### 获取认证信息

1. 登录青龙面板
2. 进入 `系统设置` -> `开放设置`
3. 创建应用并获取 `Client ID` 和 `Client Secret`
4. 设置环境变量 `QL_CLIENT_ID` 和 `QL_CLIENT_SECRET`

## 项目结构

```
qinglong-mcp-server/
├── src/
│   ├── index.ts              # 主入口文件
│   ├── constants.ts          # 常量定义
│   ├── types.ts              # 类型定义
│   ├── schemas/              # Zod 验证模式
│   ├── services/             # 服务层
│   └── tools/                # 工具实现
├── dist/                     # 编译输出
├── package.json
├── tsconfig.json
├── README.md
├── EXAMPLES.md              # 使用示例
├── DEVELOPMENT.md           # 开发文档
└── CLAUDE.md                # AI 上下文文档
```

## 相关链接

- [使用示例](EXAMPLES.md) - 详细的使用场景和示例
- [开发文档](DEVELOPMENT.md) - 架构设计和开发指南
- [青龙面板](https://github.com/whyour/qinglong)
- [MCP 协议](https://modelcontextprotocol.io/)

## 贡献

欢迎提交 Issue 和 Pull Request！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何参与贡献。

## 安全

发现安全问题？请查看 [SECURITY.md](SECURITY.md) 了解如何报告。

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## 许可证

[MIT License](LICENSE)
