#!/usr/bin/env node
/**
 * Qinglong MCP Server
 * 
 * 基于青龙面板 OpenAPI 的 MCP 服务器实现
 * 提供 38+ 工具用于管理定时任务、环境变量、订阅、依赖、脚本和系统配置
 * 
 * @version 1.0.14
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';

// Tool modules
import { registerCronTools } from './tools/cron.js';
import { registerEnvTools } from './tools/env.js';
import { registerSubscriptionTools } from './tools/subscription.js';
import { registerDependenceTools } from './tools/dependence.js';
import { registerScriptTools } from './tools/script.js';
import { registerSystemTools } from './tools/system.js';

/**
 * 验证配置
 */
function validateConfig(): void {
  const TOKEN = process.env.QL_TOKEN || '';
  const CLIENT_ID = process.env.QL_CLIENT_ID || '';
  const CLIENT_SECRET = process.env.QL_CLIENT_SECRET || '';

  if (!TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
    console.error('错误：必须设置 QL_TOKEN 或 (QL_CLIENT_ID + QL_CLIENT_SECRET)');
    process.exit(1);
  }

  const API_BASE_URL = process.env.QL_URL || 'http://localhost:5700';
  console.error(`青龙面板地址: ${API_BASE_URL}`);
  console.error(`认证方式: ${TOKEN ? 'JWT Token' : 'Client Credentials'}`);
}

/**
 * 创建 MCP 服务器
 */
function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  // 注册所有工具模块
  registerCronTools(server);
  registerEnvTools(server);
  registerSubscriptionTools(server);
  registerDependenceTools(server);
  registerScriptTools(server);
  registerSystemTools(server);

  return server;
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  try {
    validateConfig();

    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('Qinglong MCP Server 运行中 (stdio)');
    console.error(`版本: ${SERVER_VERSION}`);
    console.error('服务器已启动，等待客户端连接...');
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

main();
