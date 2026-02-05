/**
 * Qinglong MCP Server - Tools - Dependence Management
 * 
 * 依赖管理工具 (4个)
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest, handleApiError } from '../client.js';
import { 
  Dependence, 
  DependenceType,
  ResponseFormat 
} from '../types.js';
import { PAGINATION } from '../constants.js';
import { formatListResponse, extractList, formatResponse } from '../utils/formatters.js';

const typeMap: Record<number, string> = { 1: 'NodeJS', 2: 'Python3', 3: 'Linux' };

export function registerDependenceTools(server: McpServer): void {
  // 1. List dependencies
  server.registerTool(
    'qinglong_list_dependencies',
    {
      title: '列出依赖',
      description: '列出青龙面板中的所有依赖',
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
        const deps: Dependence[] = [];
        const response = await apiRequest<{ data: Dependence[]; count?: number; total?: number }>(
          '/dependencies',
          'GET',
          undefined,
          params.searchValue ? { searchValue: params.searchValue } : undefined
        );

        const { items, total } = extractList<Dependence>(response);
        deps.push(...items);

        if (deps.length === 0) {
          return { content: [{ type: 'text' as const, text: '暂无依赖' }] };
        }

        const formatFn = (dep: Dependence & Record<string, unknown>) => {
          let text = `## ${dep.name} (ID: ${dep.id})\n`;
          text += `- **类型**: ${typeMap[dep.type] || dep.type}\n`;
          if (dep.remark) text += `- **备注**: ${dep.remark}\n`;
          text += `\n`;
          return text;
        };

        const { text, output } = formatListResponse(deps, total, params, formatFn, '依赖列表');

        return {
          content: [formatResponse(text, output, params.response_format)],
          structuredContent: output
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 2. Create dependencies
  server.registerTool(
    'qinglong_create_dependencies',
    {
      title: '创建依赖',
      description: '创建一个或多个依赖',
      inputSchema: z.object({
        dependencies: z.array(z.object({
          name: z.string().min(1).describe('依赖名称'),
          type: z.nativeEnum(DependenceType).describe('依赖类型：1=NodeJS, 2=Python3, 3=Linux'),
          remark: z.string().optional().describe('备注')
        })).min(1).describe('依赖列表')
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
        const response = await apiRequest<Dependence[]>('/dependencies', 'POST', params.dependencies);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功创建 ${response.length} 个依赖` }],
          structuredContent: { dependencies: response }
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 3. Delete dependencies
  server.registerTool(
    'qinglong_delete_dependencies',
    {
      title: '删除依赖',
      description: '删除一个或多个依赖',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('依赖ID数组')
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
        await apiRequest('/dependencies', 'DELETE', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功删除 ${params.ids.length} 个依赖` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 4. Reinstall dependencies
  server.registerTool(
    'qinglong_reinstall_dependencies',
    {
      title: '重装依赖',
      description: '重新安装一个或多个依赖',
      inputSchema: z.object({
        ids: z.array(z.number().int().positive()).min(1).describe('依赖ID数组')
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
        await apiRequest('/dependencies/reinstall', 'PUT', params.ids);
        return {
          content: [{ type: 'text' as const, text: `✅ 成功重装 ${params.ids.length} 个依赖` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );
}
