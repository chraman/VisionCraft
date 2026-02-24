export interface APIResponse<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface APIErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
}

export type APIResult<T> = APIResponse<T> | APIErrorResponse;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

export interface CursorPaginationParams {
  limit?: number;
  cursor?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export type PaginatedAPIResponse<T> = APIResponse<PaginatedResponse<T>>;
