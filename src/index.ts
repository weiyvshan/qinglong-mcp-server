#!/usr/bin/env node
/**
 * Qinglong MCP Server
 *
 * 基于青龙面板 OpenAPI 的完整功能实现
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { apiRequest, handleApiError } from "./client.js";
import {
	ResponseFormat,
	Crontab,
	Env,
	Subscription,
	Script,
	ScriptDetail,
	Dependence,
	DependenceType,
	Log,
	SystemInfo,
	NotificationMode
} from "./types.js";
import {
	SERVER_NAME,
	SERVER_VERSION,
	PAGINATION
} from "./constants.js";

/**
 * 验证配置
 */
function validateConfig(): void {
	const API_BASE_URL = process.env.QL_URL || "http://localhost:5700";
	const TOKEN = process.env.QL_TOKEN || "";
	const CLIENT_ID = process.env.QL_CLIENT_ID || "";
	const CLIENT_SECRET = process.env.QL_CLIENT_SECRET || "";

	if (!TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
		console.error("错误：必须设置 QL_TOKEN 或 (QL_CLIENT_ID + QL_CLIENT_SECRET)");
		process.exit(1);
	}

	console.error(`青龙面板地址: ${API_BASE_URL}`);
	console.error(`认证方式: ${TOKEN ? "JWT Token" : "Client Credentials"}`);
}

// ============================================================================
// 通用响应处理函数
// ============================================================================

function formatListResponse<T extends Record<string, unknown>>(
	items: T[],
	total: number,
	params: { offset: number; limit: number },
	formatFn: (item: T) => string,
	title: string
): { text: string; output: { [x: string]: unknown } } {
	const start = params.offset;
	const end = start + params.limit;
	const paginatedItems = items.slice(start, end);

	const output: { [x: string]: unknown } = {
		total,
		count: paginatedItems.length,
		offset: params.offset,
		items: paginatedItems,
		has_more: total > end,
		next_offset: total > end ? end : undefined
	};

	let text = `# ${title}\n\n共 ${total} 个（显示 ${paginatedItems.length} 个）\n\n`;
	for (const item of paginatedItems) {
		text += formatFn(item);
	}

	return { text, output };
}

function extractList<T>(response: any): { items: T[]; total: number } {
	if (Array.isArray(response)) {
		return { items: response, total: response.length };
	}

	const items = Array.isArray(response?.data) ? response.data : [];
	const total =
		typeof response?.total === "number"
			? response.total
			: typeof response?.count === "number"
				? response.count
				: items.length;

	return { items, total };
}

// ============================================================================
// 创建 MCP 服务器
// ============================================================================

function createServer(): McpServer {
	const server = new McpServer({
		name: SERVER_NAME,
		version: SERVER_VERSION
	});

	// ==========================================================================
	// 定时任务管理 (Crontab)
	// ==========================================================================

	server.registerTool(
		"qinglong_list_crons",
		{
			title: "列出定时任务",
			description: "列出青龙面板中的所有定时任务，支持搜索和分页",
			inputSchema: z.object({
				searchValue: z.string().optional().describe("搜索关键词"),
				limit: z.number().int().min(1).max(100).default(PAGINATION.defaultLimit).describe("返回数量"),
				offset: z.number().int().min(0).default(0).describe("偏移量"),
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
					"/crons",
					"GET",
					undefined,
					{ searchValue: params.searchValue, t: Date.now() }
				);

				const { items: crons, total } = extractList<Crontab>(response);

				if (crons.length === 0) {
					return { content: [{ type: "text" as const, text: "暂无定时任务" }] };
				}

				const formatFn = (cron: Crontab & Record<string, unknown>) => {
					let text = `## ${cron.name} (ID: ${cron.id})\n`;
					text += `- **命令**: \`${cron.command}\`\n`;
					text += `- **Cron**: \`${cron.schedule}\`\n`;
					text += `- **状态**: ${cron.isDisabled ? '已禁用' : '正常'}\n\n`;
					return text;
				};

				const { text, output } = formatListResponse(crons, total, params, formatFn, "定时任务列表");

				return {
					content: [{ type: "text" as const, text: params.response_format === ResponseFormat.MARKDOWN ? text : JSON.stringify(output, null, 2) }],
					structuredContent: output
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_create_cron",
		{
			title: "创建定时任务",
			description: "创建新的定时任务",
			inputSchema: z.object({
				name: z.string().min(1).describe("任务名称"),
				command: z.string().min(1).describe("执行命令"),
				schedule: z.string().min(1).describe("Cron 表达式，如：0 0 * * *")
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
				const response = await apiRequest<Crontab>("/crons", "POST", params);
				return {
					content: [{ type: "text" as const, text: `✅ 定时任务创建成功\n\nID: ${response.id}\n名称: ${response.name}` }],
					structuredContent: { cron: response }
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_update_cron",
		{
			title: "更新定时任务",
			description: "更新已有的定时任务",
			inputSchema: z.object({
				id: z.number().int().positive().describe("任务ID"),
				name: z.string().min(1).describe("任务名称"),
				command: z.string().min(1).describe("执行命令"),
				schedule: z.string().min(1).describe("Cron 表达式")
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
				const response = await apiRequest<Crontab>("/crons", "PUT", params);
				return {
					content: [{ type: "text" as const, text: `✅ 定时任务更新成功\n\nID: ${response.id}\n名称: ${response.name}` }],
					structuredContent: { cron: response }
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_delete_crons",
		{
			title: "删除定时任务",
			description: "删除一个或多个定时任务",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("任务ID数组")
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
				await apiRequest("/crons", "DELETE", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功删除 ${params.ids.length} 个定时任务` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_run_crons",
		{
			title: "运行定时任务",
			description: "立即运行一个或多个定时任务",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("任务ID数组")
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
				await apiRequest("/crons/run", "PUT", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功启动 ${params.ids.length} 个任务` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_stop_crons",
		{
			title: "停止定时任务",
			description: "停止正在运行的一个或多个定时任务",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("任务ID数组")
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
				await apiRequest("/crons/stop", "PUT", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功停止 ${params.ids.length} 个任务` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_enable_crons",
		{
			title: "启用定时任务",
			description: "启用一个或多个定时任务",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("任务ID数组")
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
				await apiRequest("/crons/enable", "PUT", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功启用 ${params.ids.length} 个任务` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_disable_crons",
		{
			title: "禁用定时任务",
			description: "禁用一个或多个定时任务",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("任务ID数组")
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
				await apiRequest("/crons/disable", "PUT", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功禁用 ${params.ids.length} 个任务` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_get_cron_log",
		{
			title: "获取定时任务日志",
			description: "获取指定定时任务的执行日志",
			inputSchema: z.object({
				id: z.number().int().positive().describe("任务ID")
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
				const response = await apiRequest<{ log: string }>(`/crons/${params.id}/log`, "GET");
				return {
					content: [{ type: "text" as const, text: response.log || "暂无日志" }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	// ==========================================================================
	// 环境变量管理 (Env)
	// ==========================================================================

	server.registerTool(
		"qinglong_list_envs",
		{
			title: "列出环境变量",
			description: "列出青龙面板中的所有环境变量",
			inputSchema: z.object({
				searchValue: z.string().optional().describe("搜索关键词"),
				limit: z.number().int().min(1).max(100).default(PAGINATION.defaultLimit).describe("返回数量"),
				offset: z.number().int().min(0).default(0).describe("偏移量"),
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
					"/envs",
					"GET",
					undefined,
					{ searchValue: params.searchValue, t: Date.now() }
				);

				const { items: envs, total } = extractList<Env>(response);

				if (envs.length === 0) {
					return { content: [{ type: "text" as const, text: "暂无环境变量" }] };
				}

				const formatFn = (env: Env & Record<string, unknown>) => {
					let text = `## ${env.name} (ID: ${env.id})\n`;
					text += `- **值**: \`${env.value}\`\n`;
					if (env.remarks) text += `- **备注**: ${env.remarks}\n`;
					text += `- **状态**: ${env.status === 1 ? '已禁用' : '正常'}\n\n`;
					return text;
				};

				const { text, output } = formatListResponse(envs, total, params, formatFn, "环境变量列表");

				return {
					content: [{ type: "text" as const, text: params.response_format === ResponseFormat.MARKDOWN ? text : JSON.stringify(output, null, 2) }],
					structuredContent: output
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_create_envs",
		{
			title: "创建环境变量",
			description: "创建一个或多个环境变量",
			inputSchema: z.object({
				envs: z.array(z.object({
					name: z.string().min(1).describe("变量名"),
					value: z.string().describe("变量值"),
					remarks: z.string().optional().describe("备注")
				})).min(1).describe("环境变量列表")
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
				const response = await apiRequest<Env[]>("/envs", "POST", params.envs);
				return {
					content: [{ type: "text" as const, text: `✅ 成功创建 ${response.length} 个环境变量` }],
					structuredContent: { envs: response }
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_update_env",
		{
			title: "更新环境变量",
			description: "更新已有的环境变量",
			inputSchema: z.object({
				id: z.number().int().positive().describe("环境变量ID"),
				name: z.string().min(1).describe("变量名"),
				value: z.string().describe("变量值"),
				remarks: z.string().optional().describe("备注")
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
				const response = await apiRequest<Env>("/envs", "PUT", params);
				return {
					content: [{ type: "text" as const, text: `✅ 环境变量更新成功\n\nID: ${response.id}\n名称: ${response.name}` }],
					structuredContent: { env: response }
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_delete_envs",
		{
			title: "删除环境变量",
			description: "删除一个或多个环境变量",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("环境变量ID数组")
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
				await apiRequest("/envs", "DELETE", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功删除 ${params.ids.length} 个环境变量` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_enable_envs",
		{
			title: "启用环境变量",
			description: "启用一个或多个环境变量",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("环境变量ID数组")
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
				await apiRequest("/envs/enable", "PUT", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功启用 ${params.ids.length} 个环境变量` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_disable_envs",
		{
			title: "禁用环境变量",
			description: "禁用一个或多个环境变量",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("环境变量ID数组")
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
				await apiRequest("/envs/disable", "PUT", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功禁用 ${params.ids.length} 个环境变量` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	// ==========================================================================
	// 订阅管理 (Subscription)
	// ==========================================================================

	server.registerTool(
		"qinglong_list_subscriptions",
		{
			title: "列出订阅",
			description: "列出青龙面板中的所有订阅",
			inputSchema: z.object({
				searchValue: z.string().optional().describe("搜索关键词"),
				limit: z.number().int().min(1).max(100).default(PAGINATION.defaultLimit).describe("返回数量"),
				offset: z.number().int().min(0).default(0).describe("偏移量"),
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
					"/subscriptions",
					"GET",
					undefined,
					{ searchValue: params.searchValue, t: Date.now() }
				);

				const { items: subs, total } = extractList<Subscription>(response);

				if (subs.length === 0) {
					return { content: [{ type: "text" as const, text: "暂无订阅" }] };
				}

				const formatFn = (sub: Subscription & Record<string, unknown>) => {
					let text = `## ${sub.alias || sub.name} (ID: ${sub.id})\n`;
					text += `- **类型**: ${sub.type}\n`;
					text += `- **地址**: ${sub.url}\n`;
					text += `- **状态**: ${sub.isDisabled ? '已禁用' : '正常'}\n\n`;
					return text;
				};

				const { text, output } = formatListResponse(subs, total, params, formatFn, "订阅列表");

				return {
					content: [{ type: "text" as const, text: params.response_format === ResponseFormat.MARKDOWN ? text : JSON.stringify(output, null, 2) }],
					structuredContent: output
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_create_subscription",
		{
			title: "创建订阅",
			description: "创建新的订阅",
			inputSchema: z.object({
				alias: z.string().min(1).describe("订阅别名"),
				type: z.string().describe("订阅类型，如：public|private"),
				url: z.string().url().describe("订阅地址"),
				schedule_type: z.string().describe("计划类型，如：crontab|interval"),
				schedule: z.string().optional().describe("定时计划（cron表达式）"),
				branch: z.string().optional().describe("分支"),
				whitelist: z.string().optional().describe("白名单"),
				blacklist: z.string().optional().describe("黑名单"),
				autoAddCron: z.boolean().optional().describe("自动添加定时任务"),
				autoDelCron: z.boolean().optional().describe("自动删除定时任务")
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
				const response = await apiRequest<Subscription>("/subscriptions", "POST", params);
				return {
					content: [{ type: "text" as const, text: `✅ 订阅创建成功\n\nID: ${response.id}\n别名: ${response.alias}` }],
					structuredContent: { subscription: response }
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_update_subscription",
		{
			title: "更新订阅",
			description: "更新已有的订阅",
			inputSchema: z.object({
				id: z.number().int().positive().describe("订阅ID"),
				alias: z.string().min(1).describe("订阅别名"),
				type: z.string().describe("订阅类型"),
				url: z.string().url().describe("订阅地址"),
				schedule_type: z.string().describe("计划类型"),
				schedule: z.string().optional().describe("定时计划"),
				branch: z.string().optional().describe("分支"),
				whitelist: z.string().optional().describe("白名单"),
				blacklist: z.string().optional().describe("黑名单")
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
				const response = await apiRequest<Subscription>("/subscriptions", "PUT", params);
				return {
					content: [{ type: "text" as const, text: `✅ 订阅更新成功\n\nID: ${response.id}\n别名: ${response.alias}` }],
					structuredContent: { subscription: response }
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_delete_subscriptions",
		{
			title: "删除订阅",
			description: "删除一个或多个订阅",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("订阅ID数组")
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
				await apiRequest("/subscriptions", "DELETE", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功删除 ${params.ids.length} 个订阅` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_run_subscriptions",
		{
			title: "运行订阅",
			description: "立即运行一个或多个订阅",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("订阅ID数组")
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
				await apiRequest("/subscriptions/run", "PUT", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功启动 ${params.ids.length} 个订阅` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_enable_subscriptions",
		{
			title: "启用订阅",
			description: "启用一个或多个订阅",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("订阅ID数组")
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
				await apiRequest("/subscriptions/enable", "PUT", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功启用 ${params.ids.length} 个订阅` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_disable_subscriptions",
		{
			title: "禁用订阅",
			description: "禁用一个或多个订阅",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("订阅ID数组")
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
				await apiRequest("/subscriptions/disable", "PUT", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功禁用 ${params.ids.length} 个订阅` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	// ==========================================================================
	// 依赖管理 (Dependence)
	// ==========================================================================

	server.registerTool(
		"qinglong_list_dependencies",
		{
			title: "列出依赖",
			description: "列出青龙面板中的所有依赖",
			inputSchema: z.object({
				searchValue: z.string().optional().describe("搜索关键词"),
				limit: z.number().int().min(1).max(100).default(PAGINATION.defaultLimit).describe("返回数量"),
				offset: z.number().int().min(0).default(0).describe("偏移量"),
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
					"/dependencies",
					"GET",
					undefined,
					params.searchValue ? { searchValue: params.searchValue } : undefined
				);

				const { items, total } = extractList<Dependence>(response);
				deps.push(...items);

				if (deps.length === 0) {
					return { content: [{ type: "text" as const, text: "暂无依赖" }] };
				}

				const typeMap: Record<number, string> = { 1: "NodeJS", 2: "Python3", 3: "Linux" };
				const formatFn = (dep: Dependence & Record<string, unknown>) => {
					let text = `## ${dep.name} (ID: ${dep.id})\n`;
					text += `- **类型**: ${typeMap[dep.type] || dep.type}\n`;
					if (dep.remark) text += `- **备注**: ${dep.remark}\n`;
					text += `\n`;
					return text;
				};

				const { text, output } = formatListResponse(deps, total, params, formatFn, "依赖列表");

				return {
					content: [{ type: "text" as const, text: params.response_format === ResponseFormat.MARKDOWN ? text : JSON.stringify(output, null, 2) }],
					structuredContent: output
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_create_dependencies",
		{
			title: "创建依赖",
			description: "创建一个或多个依赖",
			inputSchema: z.object({
				dependencies: z.array(z.object({
					name: z.string().min(1).describe("依赖名称"),
					type: z.nativeEnum(DependenceType).describe("依赖类型：1=NodeJS, 2=Python3, 3=Linux"),
					remark: z.string().optional().describe("备注")
				})).min(1).describe("依赖列表")
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
				const response = await apiRequest<Dependence[]>("/dependencies", "POST", params.dependencies);
				return {
					content: [{ type: "text" as const, text: `✅ 成功创建 ${response.length} 个依赖` }],
					structuredContent: { dependencies: response }
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_delete_dependencies",
		{
			title: "删除依赖",
			description: "删除一个或多个依赖",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("依赖ID数组")
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
				await apiRequest("/dependencies", "DELETE", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功删除 ${params.ids.length} 个依赖` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_reinstall_dependencies",
		{
			title: "重装依赖",
			description: "重新安装一个或多个依赖",
			inputSchema: z.object({
				ids: z.array(z.number().int().positive()).min(1).describe("依赖ID数组")
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
				await apiRequest("/dependencies/reinstall", "PUT", params.ids);
				return {
					content: [{ type: "text" as const, text: `✅ 成功重装 ${params.ids.length} 个依赖` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	// ==========================================================================
	// 脚本管理 (Script)
	// ==========================================================================

	server.registerTool(
		"qinglong_list_scripts",
		{
			title: "列出脚本",
			description: "列出青龙面板中的所有脚本文件和目录",
			inputSchema: z.object({
				path: z.string().optional().describe("脚本路径，如：/scripts"),
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
					"/scripts",
					"GET",
					undefined,
					{ path: params.path }
				);

				const { items: scripts } = extractList<Script>(response);

				if (scripts.length === 0) {
					return { content: [{ type: "text" as const, text: "暂无脚本文件" }] };
				}

				function formatScriptTree(scripts: Script[], level: number = 0): string {
					let text = "";
					for (const script of scripts) {
						const indent = "  ".repeat(level);
						const icon = script.isDir ? "📁" : "📄";
						text += `${indent}${icon} ${script.title}\n`;
						if (script.children && script.children.length > 0) {
							text += formatScriptTree(script.children, level + 1);
						}
					}
					return text;
				}

				const text = `# 脚本列表\n\n${formatScriptTree(scripts)}`;

				return {
					content: [{ type: "text" as const, text: params.response_format === ResponseFormat.MARKDOWN ? text : JSON.stringify(scripts, null, 2) }],
					structuredContent: { scripts }
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_get_script",
		{
			title: "获取脚本内容",
			description: "获取指定脚本的详细内容和文件信息",
			inputSchema: z.object({
				file: z.string().min(1).describe("文件名"),
				path: z.string().optional().describe("文件路径")
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
					"/scripts/detail",
					"GET",
					undefined,
					{ file: params.file, path: params.path }
				);

				const detail =
					typeof response === "string"
						? { filename: params.file, path: params.path, content: response }
						: response;

				const text = `# ${detail.filename}\n\n\`\`\`\n${detail.content}\n\`\`\``;

				return {
					content: [{ type: "text" as const, text }],
					structuredContent: { script: detail }
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_create_script",
		{
			title: "创建脚本",
			description: "创建新的脚本文件或目录",
			inputSchema: z.object({
				filename: z.string().min(1).describe("文件名"),
				path: z.string().optional().describe("文件路径"),
				content: z.string().describe("文件内容"),
				directory: z.string().optional().describe("目录名（创建目录时使用）")
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
				const response = await apiRequest<Script>("/scripts", "POST", {
					filename: params.filename,
					path: params.path,
					content: params.content,
					directory: params.directory
				});
				return {
					content: [{ type: "text" as const, text: `✅ 脚本创建成功\n\n文件名: ${params.filename}` }],
					structuredContent: response
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_update_script",
		{
			title: "更新脚本",
			description: "更新已有的脚本文件内容",
			inputSchema: z.object({
				filename: z.string().min(1).describe("文件名"),
				path: z.string().optional().describe("文件路径"),
				content: z.string().describe("新的文件内容")
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
				const response = await apiRequest<Script>("/scripts", "PUT", {
					filename: params.filename,
					path: params.path,
					content: params.content
				});
				return {
					content: [{ type: "text" as const, text: `✅ 脚本更新成功\n\n文件名: ${params.filename}` }],
					structuredContent: response
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_delete_script",
		{
			title: "删除脚本",
			description: "删除指定的脚本文件或目录",
			inputSchema: z.object({
				filename: z.string().min(1).describe("文件名"),
				path: z.string().optional().describe("文件路径"),
				type: z.string().optional().describe("类型")
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
				await apiRequest("/scripts", "DELETE", {
					filename: params.filename,
					path: params.path,
					type: params.type
				});
				return {
					content: [{ type: "text" as const, text: `✅ 脚本删除成功\n\n文件名: ${params.filename}` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_run_script",
		{
			title: "运行脚本",
			description: "立即运行指定的脚本",
			inputSchema: z.object({
				filename: z.string().min(1).describe("文件名"),
				path: z.string().optional().describe("文件路径"),
				content: z.string().optional().describe("文件内容（可选）")
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
				await apiRequest("/scripts/run", "PUT", {
					filename: params.filename,
					path: params.path,
					content: params.content
				});
				return {
					content: [{ type: "text" as const, text: `✅ 脚本启动成功\n\n文件名: ${params.filename}` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_stop_script",
		{
			title: "停止脚本",
			description: "停止正在运行的脚本",
			inputSchema: z.object({
				filename: z.string().min(1).describe("文件名"),
				path: z.string().optional().describe("文件路径"),
				pid: z.number().optional().describe("进程ID（可选）")
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
				await apiRequest("/scripts/stop", "PUT", {
					filename: params.filename,
					path: params.path,
					pid: params.pid
				});
				return {
					content: [{ type: "text" as const, text: `✅ 脚本停止成功\n\n文件名: ${params.filename}` }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	// ==========================================================================
	// 系统设置 (System)
	// ==========================================================================

	server.registerTool(
		"qinglong_get_system_info",
		{
			title: "获取系统信息",
			description: "获取青龙面板的系统信息和版本",
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
				const info = await apiRequest<SystemInfo>("/system", "GET");
				const text = `# 系统信息

- **版本**: ${info.version}
- **分支**: ${info.branch}
- **初始化状态**: ${info.isInitialized ? '已初始化' : '未初始化'}
- **发布时间**: ${new Date(info.publishTime).toLocaleString()}
`;
				return {
					content: [{ type: "text" as const, text }],
					structuredContent: info
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

	server.registerTool(
		"qinglong_send_notification",
		{
			title: "发送通知",
			description: "发送系统通知",
			inputSchema: z.object({
				title: z.string().min(1).describe("通知标题"),
				content: z.string().min(1).describe("通知内容"),
				notification_type: z.nativeEnum(NotificationMode).optional().describe("通知方式类型")
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
				if (params.notification_type) {
					body.notificationInfo = { type: params.notification_type };
				}
				await apiRequest("/system/notify", "PUT", body);
				return {
					content: [{ type: "text" as const, text: "✅ 通知发送成功" }]
				};
			} catch (error) {
				return { content: [{ type: "text" as const, text: handleApiError(error) }] };
			}
		}
	);

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

		console.error("Qinglong MCP Server 运行中 (stdio)");
		console.error("服务器已启动，等待客户端连接...");
	} catch (error) {
		console.error("服务器启动失败:", error);
		process.exit(1);
	}
}

main();
