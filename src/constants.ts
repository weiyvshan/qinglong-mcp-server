/**
 * Qinglong MCP Server - Constants and Configuration
 */

// Server configuration
export const SERVER_NAME = 'qinglong-mcp-server';
export const SERVER_VERSION = '1.0.14';

// API configuration
export const API_BASE_URL = process.env.QL_URL || 'http://localhost:5700';
export const API_BASE_PATH = '/open';
export const API_TIMEOUT = 30000;

// Authentication
export const CLIENT_ID = process.env.QL_CLIENT_ID || '';
export const CLIENT_SECRET = process.env.QL_CLIENT_SECRET || '';
export const TOKEN = process.env.QL_TOKEN || '';

// Response limits
export const CHARACTER_LIMIT = 25000;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Pagination defaults
export const PAGINATION = {
  defaultLimit: DEFAULT_LIMIT,
  maxLimit: MAX_LIMIT
};

// Response format enum
export enum ResponseFormat {
  MARKDOWN = 'markdown',
  JSON = 'json'
}
