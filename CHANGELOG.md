# 更新日志

所有重要的更改都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [1.0.14] - 2026-02-06

### Added
- 添加 Vitest 测试框架支持
- 新增测试脚本: `npm test`, `npm run test:coverage`, `npm run test:ui`
- 新增代码检查脚本: `npm run lint`, `npm run typecheck`

### Changed
- **架构重构**: 将 `index.ts` 从 1450 行拆分为 7 个模块
  - `tools/cron.ts` - 定时任务管理 (10个工具)
  - `tools/env.ts` - 环境变量管理 (6个工具)
  - `tools/subscription.ts` - 订阅管理 (7个工具)
  - `tools/dependence.ts` - 依赖管理 (4个工具)
  - `tools/script.ts` - 脚本管理 (9个工具)
  - `tools/system.ts` - 系统管理 (2个工具)
  - `utils/formatters.ts` - 通用格式化工具
- 统一版本号管理 (package.json 和 constants.ts 同步)
- 优化代码结构和可维护性

### Fixed
- 修复版本号不一致问题 (1.0.13 vs 1.0.0)
- 优化类型导入和代码组织

## [1.0.3] - 2025-02-02

### Added
- 添加订阅管理功能（7个工具）
- 添加依赖管理功能（4个工具）
- 完善工具注解（readOnlyHint、destructiveHint、idempotentHint）

## [1.0.2] - 2025-02-01

### Added
- 添加脚本管理功能（7个工具）
- 添加系统管理功能（2个工具）
- 添加详细的使用示例文档

### Changed
- 优化错误处理和提示信息

## [1.0.1] - 2025-02-01

### Added
- 添加定时任务管理功能（10个工具）
- 添加环境变量管理功能（6个工具）

### Fixed
- 修复环境变量批量创建的问题

## [1.0.0] - 2025-02-01

### Added
- 初始版本发布
- MCP 服务器基础架构
- 青龙面板 API 客户端
- 35 个工具实现
- 完整的文档和示例

---

## 版本说明

### 版本号格式

`MAJOR.MINOR.PATCH`

- **MAJOR**：不兼容的 API 更改
- **MINOR**：向后兼容的功能添加
- **PATCH**：向后兼容的问题修复
