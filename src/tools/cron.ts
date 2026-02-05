/**
 * Qinglong MCP Server - Tools - Cron Management
 * 
 * 定时任务管理工具 (10个)
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest, handleApiError } from '../client.js';
import { 
  Crontab, 
  ResponseFormat 
} from '../types.js';
import { PAGINATION } from '../constants.js';
import { formatListResponse, extractList, formatResponse } from '../utils/formatters.js';

export function registerCronTools(server: McpServer): void {
  // 1. List crons
  server.registerTool(
    'qinglong_list_crons',
    {
      title: '列出定时任务',
      description: '列出青龙面板中的所有定时任务，支持搜索和分页',
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
        const response = await apiRequest<{ data: Crontab[]; count?: number; total?: number }>(
          '/crons',
          'GET',
          undefined,
          { searchValue: params.searchValue, t: Date.now() }
        );

        const { items: crons, total } = extractList<Crontab>(response);

        if (crons.length === 0) {
          return { content: [{ type: 'text' as const, text: '暂无定时任务' }] };
        }

        const formatFn = (cron: Crontab & Record<string, unknown>) => {
          let text = `## ${cron.name} (ID: ${cron.id})\n`;
          text += `- **命令**: \`${cron.command}\`\n`;
          text += `- **Cron**: \`${cron.schedule}\`\n`;
          text += `- **状态**: ${cron.isDisabled ? '已禁用' : '正常'}\n\n`;
          return text;
        };

        const { text, output } = formatListResponse(crons, total, params, formatFn, '定时任务列表');

        return {
          content: [formatResponse(text, output, params.response_format)],
          structuredContent: output
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 2. Create cron
  server.registerTool(
    'qinglong_create_cron',
    {
      title: '创建定时任务',
      description: '创建新的定时任务',
      inputSchema: z.object({
        name: z.string().min(1).describe('任务名称'),
        command: z.string().min(1).describe('执行命令'),
        schedule: z.string().min(1).describe('Cron 表达式，如：0 0 * * *')
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
        const response = await apiRequest<Crontab>('/crons', 'POST', params);
        return {
          content: [{ type: 'text' as const, text: `✅ 定时任务创建成功\n\nID: ${response.id}\n名称: ${response.name}` }],
          structuredContent: { cron: response }
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 3. Update cron
  server.registerTool(
    'qinglong_update_cron',
    {
      title: '更新定时任务',
      description: '更新已有的定时任务',
      inputSchema: z.object({
        id: z.number().int().positive().describe('任务ID'),
        name: z.string().min(1).describe('任务名称'),
        command: z.string().min(1).describe('执行命令'),
        schedule: z.string().min(1).describe('Cron 表达式')
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
        const response = await apiRequest<Crontab>('/crons', 'PUT', params);
        return {
          content: [{ type: 'text' as const, text: `✅ 定时任务更新成功\n\nID: ${response.id}\n名称: ${response.name}` }],
          structuredContent: { cron: response }
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 4. Delete crons
  server.registerTool(
    'qinglong_delete_crons',
    {
      title: '删除定时任务',
      description: '删除一个或多个定时任务',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('任务ID数组')
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
        await apiRequest('/crons', 'DELETE', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功删除 ${params.ids.length} 个定时任务` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 5. Run crons
  server.registerTool(
    'qinglong_run_crons',
    {
      title: '运行定时任务',
      description: '立即运行一个或多个定时任务',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('任务ID数组')
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
        await apiRequest('/crons/run', 'PUT', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功启动 ${params.ids.length} 个任务` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 6. Stop crons
  server.registerTool(
    'qinglong_stop_crons',
    {
      title: '停止定时任务',
      description: '停止正在运行的一个或多个定时任务',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('任务ID数组')
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
        await apiRequest('/crons/stop', 'PUT', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功停止 ${params.ids.length} 个任务` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 7. Enable crons
  server.registerTool(
    'qinglong_enable_crons',
    {
      title: '启用定时任务',
      description: '启用一个或多个定时任务',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('任务ID数组')
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
        await apiRequest('/crons/enable', 'PUT', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功启用 ${params.ids.length} 个任务` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 8. Disable crons
  server.registerTool(
    'qinglong_disable_crons',
    {
      title: '禁用定时任务',
      description: '禁用一个或多个定时任务',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('任务ID数组')
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
        await apiRequest('/crons/disable', 'PUT', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功禁用 ${params.ids.length} 个任务` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 9. Get cron log
  server.registerTool(
    'qinglong_get_cron_log',
    {
      title: '获取定时任务日志',
      description: '获取指定定时任务的执行日志',
      inputSchema: z.object({
        id: z.number().int().positive().describe('任务ID')
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
        const response = await apiRequest<{ log: string }>(`/crons/${params.id}/log`, 'GET');
        return {
          content: [{ type: 'text' as const, text: response.log || '暂无日志' }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 10. Get cron logs
  server.registerTool(
    'qinglong_get_cron_logs',
    {
      title: '获取任务日志列表',
      description: '获取指定定时任务的所有日志记录',
      inputSchema: z.object({
        id: z.number().int().positive().describe('任务ID')
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
        const response = await apiRequest<any>(`/crons/${params.id}/logs`, 'GET');
        const text = response ? JSON.stringify(response, null, 2) : '暂无日志记录';
        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: { logs: response }
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );
}
