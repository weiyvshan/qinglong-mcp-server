/**
 * Qinglong MCP Server - Tools - Subscription Management
 * 
 * 订阅管理工具 (7个)
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest, handleApiError } from '../client.js';
import { 
  Subscription, 
  ResponseFormat 
} from '../types.js';
import { PAGINATION } from '../constants.js';
import { formatListResponse, extractList, formatResponse } from '../utils/formatters.js';

export function registerSubscriptionTools(server: McpServer): void {
  // 1. List subscriptions
  server.registerTool(
    'qinglong_list_subscriptions',
    {
      title: '列出订阅',
      description: '列出青龙面板中的所有订阅',
      inputSchema: z.object({
        searchValue: z.string().optional().describe('搜索关键词'),
        limit: z.number().int().min(1).max(100).default(PAGINATION.defaultLimit).describe('返回数量'),
        offset: z.number().int().min(0).default(0).describe('偏移量'),
        response_format: z.nativeEnum(ResponseFormat).default(ResponseFormat.MARKDOWN)
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: any) => {
      try {
        const response = await apiRequest<{ data: Subscription[]; count?: number; total?: number }>(
          '/subscriptions',
          'GET',
          undefined,
          { searchValue: params.searchValue, t: Date.now() }
        );

        const { items: subs, total } = extractList<Subscription>(response);

        if (subs.length === 0) {
          return { content: [{ type: 'text' as const, text: '暂无订阅' }] };
        }

        const formatFn = (sub: Subscription & Record<string, unknown>) => {
          let text = `## ${sub.alias || sub.name} (ID: ${sub.id})\n`;
          text += `- **类型**: ${sub.type}\n`;
          text += `- **地址**: ${sub.url}\n`;
          text += `- **状态**: ${sub.isDisabled ? '已禁用' : '正常'}\n\n`;
          return text;
        };

        const { text, output } = formatListResponse(subs, total, params, formatFn, '订阅列表');

        return {
          content: [formatResponse(text, output, params.response_format)],
          structuredContent: output
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 2. Create subscription
  server.registerTool(
    'qinglong_create_subscription',
    {
      title: '创建订阅',
      description: '创建新的订阅',
      inputSchema: z.object({
        alias: z.string().min(1).describe('订阅别名'),
        type: z.string().describe('订阅类型，如：public|private'),
        url: z.string().url().describe('订阅地址'),
        schedule_type: z.string().describe('计划类型，如：crontab|interval'),
        schedule: z.string().optional().describe('定时计划（cron表达式）'),
        branch: z.string().optional().describe('分支'),
        whitelist: z.string().optional().describe('白名单'),
        blacklist: z.string().optional().describe('黑名单'),
        autoAddCron: z.boolean().optional().describe('自动添加定时任务'),
        autoDelCron: z.boolean().optional().describe('自动删除定时任务')
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
        const response = await apiRequest<Subscription>('/subscriptions', 'POST', params);
        return {
          content: [{ type: 'text' as const, text: `✅ 订阅创建成功\n\nID: ${response.id}\n别名: ${response.alias}` }],
          structuredContent: { subscription: response }
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 3. Update subscription
  server.registerTool(
    'qinglong_update_subscription',
    {
      title: '更新订阅',
      description: '更新已有的订阅',
      inputSchema: z.object({
        id: z.number().int().positive().describe('订阅ID'),
        alias: z.string().min(1).describe('订阅别名'),
        type: z.string().describe('订阅类型'),
        url: z.string().url().describe('订阅地址'),
        schedule_type: z.string().describe('计划类型'),
        schedule: z.string().optional().describe('定时计划'),
        branch: z.string().optional().describe('分支'),
        whitelist: z.string().optional().describe('白名单'),
        blacklist: z.string().optional().describe('黑名单')
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: any) => {
      try {
        const response = await apiRequest<Subscription>('/subscriptions', 'PUT', params);
        return {
          content: [{ type: 'text' as const, text: `✅ 订阅更新成功\n\nID: ${response.id}\n别名: ${response.alias}` }],
          structuredContent: { subscription: response }
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 4. Delete subscriptions
  server.registerTool(
    'qinglong_delete_subscriptions',
    {
      title: '删除订阅',
      description: '删除一个或多个订阅',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('订阅ID数组')
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (params: any) => {
      try {
        await apiRequest('/subscriptions', 'DELETE', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功删除 ${params.ids.length} 个订阅` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 5. Run subscriptions
  server.registerTool(
    'qinglong_run_subscriptions',
    {
      title: '运行订阅',
      description: '立即运行一个或多个订阅',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('订阅ID数组')
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
        await apiRequest('/subscriptions/run', 'PUT', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功启动 ${params.ids.length} 个订阅` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 6. Enable subscriptions
  server.registerTool(
    'qinglong_enable_subscriptions',
    {
      title: '启用订阅',
      description: '启用一个或多个订阅',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('订阅ID数组')
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: any) => {
      try {
        await apiRequest('/subscriptions/enable', 'PUT', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功启用 ${params.ids.length} 个订阅` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 7. Disable subscriptions
  server.registerTool(
    'qinglong_disable_subscriptions',
    {
      title: '禁用订阅',
      description: '禁用一个或多个订阅',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('订阅ID数组')
      }).strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: any) => {
      try {
        await apiRequest('/subscriptions/disable', 'PUT', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功禁用 ${params.ids.length} 个订阅` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );
}
