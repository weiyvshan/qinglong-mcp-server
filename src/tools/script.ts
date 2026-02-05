/**
 * Qinglong MCP Server - Tools - Script Management
 * 
 * 脚本管理工具 (7个)
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest, handleApiError } from '../client.js';
import { 
  Script, 
  ScriptDetail,
  Log,
  ResponseFormat 
} from '../types.js';
import { extractList, formatListResponse, formatResponse } from '../utils/formatters.js';

export function registerScriptTools(server: McpServer): void {
  // 1. List scripts
  server.registerTool(
    'qinglong_list_scripts',
    {
      title: '列出脚本',
      description: '列出青龙面板中的所有脚本文件和目录',
      inputSchema: z.object({
        path: z.string().optional().describe('脚本路径，如：/scripts'),
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
        const response = await apiRequest<{ data: Script[] }>(
          '/scripts',
          'GET',
          undefined,
          { path: params.path }
        );

        const { items: scripts } = extractList<Script>(response);

        if (scripts.length === 0) {
          return { content: [{ type: 'text' as const, text: '暂无脚本文件' }] };
        }

        function formatScriptTree(scripts: Script[], level: number = 0): string {
          let text = '';
          for (const script of scripts) {
            const indent = '  '.repeat(level);
            const icon = script.isDir ? '📁' : '📄';
            text += `${indent}${icon} ${script.title}\n`;
            if (script.children && script.children.length > 0) {
              text += formatScriptTree(script.children, level + 1);
            }
          }
          return text;
        }

        const text = `# 脚本列表\n\n${formatScriptTree(scripts)}`;

        return {
          content: [{ type: 'text' as const, text: params.response_format === ResponseFormat.MARKDOWN ? text : JSON.stringify(scripts, null, 2) }],
          structuredContent: { scripts }
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 2. List logs
  server.registerTool(
    'qinglong_list_logs',
    {
      title: '列出日志文件',
      description: '列出青龙面板可访问的日志文件列表',
      inputSchema: z.object({
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
        const response = await apiRequest<any>('/logs', 'GET');
        const { items: logs } = extractList<Log>(response);

        if (logs.length === 0) {
          return { content: [{ type: 'text' as const, text: '暂无日志文件' }] };
        }

        const formatFn = (log: Log & Record<string, unknown>) => {
          const title = typeof log.title === 'string' ? log.title : '日志';
          return `- ${title}\n`;
        };

        const { text, output } = formatListResponse(
          logs,
          logs.length,
          { offset: 0, limit: logs.length },
          formatFn,
          '日志文件列表'
        );

        return {
          content: [formatResponse(text, output, params.response_format)],
          structuredContent: output
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 3. Get log detail
  server.registerTool(
    'qinglong_get_log_detail',
    {
      title: '获取日志详情',
      description: '获取指定日志文件的内容',
      inputSchema: z.object({
        path: z.string().optional().describe('日志路径'),
        file: z.string().optional().describe('日志文件名'),
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
        const response = await apiRequest<string>('/logs/detail', 'GET', undefined, {
          path: params.path,
          file: params.file
        });

        const text = response || '暂无日志内容';
        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: { log: text }
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 4. Get script
  server.registerTool(
    'qinglong_get_script',
    {
      title: '获取脚本内容',
      description: '获取指定脚本的详细内容和文件信息',
      inputSchema: z.object({
        file: z.string().min(1).describe('文件名'),
        path: z.string().optional().describe('文件路径')
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
        const response = await apiRequest<ScriptDetail | string>(
          '/scripts/detail',
          'GET',
          undefined,
          { file: params.file, path: params.path }
        );

        const detail =
          typeof response === 'string'
            ? { filename: params.file, path: params.path, content: response }
            : response;

        const text = `# ${detail.filename}\n\n\`\`\`\n${detail.content}\n\`\`\``;

        return {
          content: [{ type: 'text' as const, text }],
          structuredContent: { script: detail }
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 5. Create script
  server.registerTool(
    'qinglong_create_script',
    {
      title: '创建脚本',
      description: '创建新的脚本文件或目录',
      inputSchema: z.object({
        filename: z.string().min(1).describe('文件名'),
        path: z.string().optional().describe('文件路径'),
        content: z.string().describe('文件内容'),
        directory: z.string().optional().describe('目录名（创建目录时使用）')
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
        const response = await apiRequest<Script>('/scripts', 'POST', {
          filename: params.filename,
          path: params.path,
          content: params.content,
          directory: params.directory
        });
        return {
          content: [{ type: 'text' as const, text: `✅ 脚本创建成功\n\n文件名: ${params.filename}` }],
          structuredContent: response
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 6. Update script
  server.registerTool(
    'qinglong_update_script',
    {
      title: '更新脚本',
      description: '更新已有的脚本文件内容',
      inputSchema: z.object({
        filename: z.string().min(1).describe('文件名'),
        path: z.string().optional().describe('文件路径'),
        content: z.string().describe('新的文件内容')
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
        const response = await apiRequest<Script>('/scripts', 'PUT', {
          filename: params.filename,
          path: params.path,
          content: params.content
        });
        return {
          content: [{ type: 'text' as const, text: `✅ 脚本更新成功\n\n文件名: ${params.filename}` }],
          structuredContent: response
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 7. Delete script
  server.registerTool(
    'qinglong_delete_script',
    {
      title: '删除脚本',
      description: '删除指定的脚本文件或目录',
      inputSchema: z.object({
        filename: z.string().min(1).describe('文件名'),
        path: z.string().optional().describe('文件路径'),
        type: z.string().optional().describe('类型')
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
        await apiRequest('/scripts', 'DELETE', {
          filename: params.filename,
          path: params.path,
          type: params.type
        });
        return {
          content: [{ type: 'text' as const, text: `✅ 脚本删除成功\n\n文件名: ${params.filename}` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 8. Run script
  server.registerTool(
    'qinglong_run_script',
    {
      title: '运行脚本',
      description: '立即运行指定的脚本',
      inputSchema: z.object({
        filename: z.string().min(1).describe('文件名'),
        path: z.string().optional().describe('文件路径'),
        content: z.string().optional().describe('文件内容（可选）')
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
        await apiRequest('/scripts/run', 'PUT', {
          filename: params.filename,
          path: params.path,
          content: params.content
        });
        return {
          content: [{ type: 'text' as const, text: `✅ 脚本启动成功\n\n文件名: ${params.filename}` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );

  // 9. Stop script
  server.registerTool(
    'qinglong_stop_script',
    {
      title: '停止脚本',
      description: '停止正在运行的脚本',
      inputSchema: z.object({
        filename: z.string().min(1).describe('文件名'),
        path: z.string().optional().describe('文件路径'),
        pid: z.number().optional().describe('进程ID（可选）')
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
        await apiRequest('/scripts/stop', 'PUT', {
          filename: params.filename,
          path: params.path,
          pid: params.pid
        });
        return {
          content: [{ type: 'text' as const, text: `✅ 脚本停止成功\n\n文件名: ${params.filename}` }]
        };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: handleApiError(error) }] };
      }
    }
  );
}
