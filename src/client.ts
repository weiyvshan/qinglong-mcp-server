/**
 * Qinglong MCP Server - API Client
 */

import axios, { AxiosError, AxiosInstance } from "axios";
import {
  API_BASE_URL,
  API_BASE_PATH,
  API_TIMEOUT,
  CLIENT_ID,
  CLIENT_SECRET,
  TOKEN
} from "./constants.js";

// Store the access token after OAuth flow
let accessToken: string | null = null;
let tokenExpiration: number = 0;

/**
 * Get access token using client credentials (GET /open/auth/token)
 */
async function getAccessToken(): Promise<string> {
  // Check if token is still valid
  const now = Math.floor(Date.now() / 1000);
  if (accessToken && tokenExpiration > now) {
    return accessToken;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("请设置 QL_CLIENT_ID 和 QL_CLIENT_SECRET 环境变量");
  }

  try {
    const response = await axios.get(`${API_BASE_URL}${API_BASE_PATH}/auth/token`, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      }
    });

    // 青龙面板返回格式: {code: 200, data: {token: xxx, token_type: "Bearer", expiration: xxx}}
    const data = response.data;
    if (data.code !== 200) {
      throw new Error(`获取 token 失败: ${data.message || JSON.stringify(data)}`);
    }

    const tokenData = data.data;
    if (!tokenData?.token) {
      throw new Error(`获取 token 失败: ${JSON.stringify(data)}`);
    }

    accessToken = tokenData.token;
    tokenExpiration = tokenData.expiration || 0;

    return accessToken as string;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      throw new Error(`认证失败: ${error.response?.data?.message || error.message}`);
    }
    throw error;
  }
}

/**
 * Get authentication headers for API requests
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  if (TOKEN) {
    // Direct token usage
    headers["Authorization"] = `Bearer ${TOKEN}`;
  } else if (CLIENT_ID && CLIENT_SECRET) {
    // Use OAuth access token
    const token = await getAccessToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Create axios instance for Qinglong API
 */
async function createApiClient(): Promise<AxiosInstance> {
  const client = axios.create({
    baseURL: `${API_BASE_URL}${API_BASE_PATH}`,
    timeout: API_TIMEOUT,
    headers: await getAuthHeaders()
  });

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response) {
        const status = error.response.status;
        const message = (error.response.data as any)?.message || error.message;

        switch (status) {
          case 401:
            throw new Error(
              "认证失败：请检查 QL_TOKEN、QL_CLIENT_ID 和 QL_CLIENT_SECRET 环境变量是否正确"
            );
          case 403:
            throw new Error("权限不足：您没有访问此资源的权限");
          case 404:
            throw new Error("资源不存在：请检查请求的 ID 或路径是否正确");
          case 429:
            throw new Error("请求过于频繁：请稍后再试");
          default:
            throw new Error(`API 请求失败 (${status}): ${message}`);
        }
      } else if (error.code === "ECONNABORTED") {
        throw new Error("请求超时：请检查青龙面板服务是否正常运行");
      } else if (error.code === "ECONNREFUSED") {
        throw new Error("连接失败：请检查 QL_URL 环境变量指向的青龙面板地址是否正确");
      }

      throw new Error(`网络错误: ${error.message}`);
    }
  );

  return client;
}

// Singleton API client
let apiClient: AxiosInstance | null = null;

export async function getApiClient(): Promise<AxiosInstance> {
  if (!apiClient) {
    apiClient = await createApiClient();
  }
  return apiClient;
}

/**
 * Make API request with error handling
 */
export async function apiRequest<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  params?: any
): Promise<T> {
  const client = await getApiClient();
  const response = await client.request<T>({
    method,
    url: endpoint,
    data,
    params
  });
  const payload: any = response.data;
  if (payload && typeof payload === "object" && "code" in payload) {
    if (payload.code !== 200) {
      throw new Error(payload.message || `API 请求失败 (${payload.code})`);
    }
    return payload.data as T;
  }
  return payload as T;
}

/**
 * Handle API error and return user-friendly message
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      const status = axiosError.response.status;
      return `API 请求失败 (${status})`;
    }
  }

  return `未知错误: ${String(error)}`;
}
