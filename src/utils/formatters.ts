/**
 * Qinglong MCP Server - Utils - Response Formatters
 * 
 * 通用响应格式化工具
 */

import { ResponseFormat } from '../types.js';

/**
 * Format list response with pagination support
 */
export function formatListResponse<T extends Record<string, unknown>>(
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

/**
 * Extract list data from API response
 */
export function extractList<T>(response: any): { items: T[]; total: number } {
  if (Array.isArray(response)) {
    return { items: response, total: response.length };
  }

  const items = Array.isArray(response?.data) ? response.data : [];
  const total =
    typeof response?.total === 'number'
      ? response.total
      : typeof response?.count === 'number'
        ? response.count
        : items.length;

  return { items, total };
}

/**
 * Format response content based on format type
 */
export function formatResponse(
  text: string,
  output: object,
  format: ResponseFormat
): { type: 'text'; text: string } {
  return {
    type: 'text',
    text: format === ResponseFormat.MARKDOWN ? text : JSON.stringify(output, null, 2)
  };
}
