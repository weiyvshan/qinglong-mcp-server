/**
 * Qinglong MCP Server - Tools - System Management
 * 
 * 系统管理工具 (2个)
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest, handleApiError } from '../client.js';
import { SystemInfo } from '../types.js';

export function registerSystemTools(server: McpServer): void {
  // 1. Get system info
  server.registerTool(
    'qinglong_get_system_info',
    {
      title: '获取系统信息',
      description: '获取青龙面板的系统信息和版本',
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (_params: any) => {
      try {
        const info = await apiRequest<SystemInfo>('/system', 'GET');
        const text = `# 系统信息

- **版本**: ${info.version}
- **分支**: ${info.branch}
- **初始化状态**: ${info.isInitialized ? '已初始化' : '未初始化'}
- **发布时间**: ${new Date(info.publishTime).toLocaleString()}
`;
        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: info
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 2. Send notification
  server.registerTool(
    'qinglong_send_notification',
    {
      title: '发送通知',
      description: '发送系统通知',
      inputSchema: z.object({
        title: z.string().min(1).describe('通知标题'),
        content: z.string().min(1).describe('通知内容')
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: any) => {
      try {
        const body: any = {
          title: params.title,
          content: params.content
        };
        await apiRequest('/system/notify', 'PUT', body);
        return {
          content: [{ type: 'text' as const, text: '✅ 通知发送成功' }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );
}
