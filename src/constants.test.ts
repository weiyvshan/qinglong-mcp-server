/**
 * Qinglong MCP Server - Constants Tests
 * 
 * 常量配置单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  SERVER_NAME,
  SERVER_VERSION,
  API_BASE_URL,
  API_BASE_PATH,
  API_TIMEOUT,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  CHARACTER_LIMIT,
  ResponseFormat
} from '../constants.js';

describe('constants', () => {
  it('should have correct server configuration', () => {
    expect(SERVER_NAME).toBe('qinglong-mcp-server');
    expect(SERVER_VERSION).toBe('1.0.14');
  });

  it('should have correct API configuration', () => {
    expect(API_BASE_PATH).toBe('/open');
    expect(API_TIMEOUT).toBe(30000);
  });

  it('should use environment variable or default for API_BASE_URL', () => {
    // Should use default if env var not set
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
  });

  it('should have correct pagination limits', () => {
    expect(DEFAULT_LIMIT).toBe(20);
    expect(MAX_LIMIT).toBe(100);
    expect(CHARACTER_LIMIT).toBe(25000);
  });

  it('should have correct ResponseFormat enum values', () => {
    expect(ResponseFormat.MARKDOWN).toBe('markdown');
    expect(ResponseFormat.JSON).toBe('json');
  });
});
