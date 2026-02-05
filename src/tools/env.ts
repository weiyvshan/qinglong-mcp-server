/**
 * Qinglong MCP Server - Tools - Environment Management
 * 
 * 环境变量管理工具 (6个)
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest, handleApiError } from '../client.js';
import { 
  Env, 
  ResponseFormat 
} from '../types.js';
import { PAGINATION } from '../constants.js';
import { formatListResponse, extractList, formatResponse } from '../utils/formatters.js';

export function registerEnvTools(server: McpServer): void {
  // 1. List envs
  server.registerTool(
    'qinglong_list_envs',
    {
      title: '列出环境变量',
      description: '列出青龙面板中的所有环境变量',
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
        const response = await apiRequest<{ data: Env[]; count?: number; total?: number }>(
          '/envs',
          'GET',
          undefined,
          { searchValue: params.searchValue, t: Date.now() }
        );

        const { items: envs, total } = extractList<Env>(response);

        if (envs.length === 0) {
          return { content: [{ type: 'text' as const, text: '暂无环境变量' }] };
        }

        const formatFn = (env: Env & Record<string, unknown>) => {
          let text = `## ${env.name} (ID: ${env.id})\n`;
          text += `- **值**: \`${env.value}\`\n`;
          if (env.remarks) text += `- **备注**: ${env.remarks}\n`;
          text += `- **状态**: ${env.status === 1 ? '已禁用' : '正常'}\n\n`;
          return text;
        };

        const { text, output } = formatListResponse(envs, total, params, formatFn, '环境变量列表');

        return {
          content: [formatResponse(text, output, params.response_format)],
          structuredContent: output
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 2. Create envs
  server.registerTool(
    'qinglong_create_envs',
    {
      title: '创建环境变量',
      description: '创建一个或多个环境变量',
      inputSchema: z.object({
        envs: z.array(z.object({
          name: z.string().min(1).describe('变量名'),
          value: z.string().describe('变量值'),
          remarks: z.string().optional().describe('备注')
        })).min(1).describe('环境变量列表')
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
        const response = await apiRequest<Env[]>('/envs', 'POST', params.envs);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功创建 ${response.length} 个环境变量` }],
          structuredContent: { envs: response }
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 3. Update env
  server.registerTool(
    'qinglong_update_env',
    {
      title: '更新环境变量',
      description: '更新已有的环境变量',
      inputSchema: z.object({
        id: z.number().int().positive().describe('环境变量ID'),
        name: z.string().min(1).describe('变量名'),
        value: z.string().describe('变量值'),
        remarks: z.string().optional().describe('备注')
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
        const response = await apiRequest<Env>('/envs', 'PUT', params);
        return {
          content: [{ type: 'text' as const, text: `✅ 环境变量更新成功\n\nID: ${response.id}\n名称: ${response.name}` }],
          structuredContent: { env: response }
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 4. Delete envs
  server.registerTool(
    'qinglong_delete_envs',
    {
      title: '删除环境变量',
      description: '删除一个或多个环境变量',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('环境变量ID数组')
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
        await apiRequest('/envs', 'DELETE', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功删除 ${params.ids.length} 个环境变量` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 5. Enable envs
  server.registerTool(
    'qinglong_enable_envs',
    {
      title: '启用环境变量',
      description: '启用一个或多个环境变量',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('环境变量ID数组')
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
        await apiRequest('/envs/enable', 'PUT', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功启用 ${params.ids.length} 个环境变量` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 6. Disable envs
  server.registerTool(
    'qinglong_disable_envs',
    {
      title: '禁用环境变量',
      description: '禁用一个或多个环境变量',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('环境变量ID数组')
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
        await apiRequest('/envs/disable', 'PUT', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功禁用 ${params.ids.length} 个环境变量` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );
}
