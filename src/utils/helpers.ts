/**
 * Utility helpers
 */

import { ApiResponse } from "../types";

/**
 * Create success API response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create error API response
 */
export function createErrorResponse(error: string): ApiResponse {
  return {
    success: false,
    data: null,
    error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry utility with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await delay(delayMs * Math.pow(2, attempt));
      }
    }
  }

  throw lastError!;
}