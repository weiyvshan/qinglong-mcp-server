/**
 * Qinglong MCP Server - Utils Tests
 * 
 * 格式化工具单元测试
 */

import { describe, it, expect } from 'vitest';
import { formatListResponse, extractList, formatResponse } from './formatters.js';
import { ResponseFormat } from '../types.js';

describe('formatters', () => {
  describe('extractList', () => {
    it('should handle array response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = extractList(data);
      expect(result.items).toEqual(data);
      expect(result.total).toBe(2);
    });

    it('should handle object response with data array', () => {
      const response = { data: [{ id: 1 }, { id: 2 }], total: 10 };
      const result = extractList(response);
      expect(result.items).toEqual(response.data);
      expect(result.total).toBe(10);
    });

    it('should handle object response with count', () => {
      const response = { data: [{ id: 1 }], count: 5 };
      const result = extractList(response);
      expect(result.total).toBe(5);
    });

    it('should fallback to items length when no total/count', () => {
      const response = { data: [{ id: 1 }, { id: 2 }] };
      const result = extractList(response);
      expect(result.total).toBe(2);
    });
  });

  describe('formatListResponse', () => {
    const items = [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' }
    ];

    const formatFn = (item: any) => `- ${item.name}\n`;

    it('should format list with pagination', () => {
      const result = formatListResponse(
        items,
        10,
        { offset: 0, limit: 2 },
        formatFn,
        'Test List'
      );

      expect(result.text).toContain('# Test List');
      expect(result.text).toContain('共 10 个（显示 2 个）');
      expect(result.text).toContain('- Item 1');
      expect(result.text).toContain('- Item 2');
      expect(result.output.has_more).toBe(true);
      expect(result.output.next_offset).toBe(2);
    });

    it('should indicate no more items when at end', () => {
      const result = formatListResponse(
        items,
        3,
        { offset: 0, limit: 5 },
        formatFn,
        'Test List'
      );

      expect(result.output.has_more).toBe(false);
      expect(result.output.next_offset).toBeUndefined();
    });
  });

  describe('formatResponse', () => {
    it('should return markdown format', () => {
      const result = formatResponse('text content', { data: true }, ResponseFormat.MARKDOWN);
      expect(result.text).toBe('text content');
    });

    it('should return JSON format', () => {
      const output = { data: true, count: 5 };
      const result = formatResponse('text content', output, ResponseFormat.JSON);
      expect(result.text).toBe(JSON.stringify(output, null, 2));
    });
  });
});
