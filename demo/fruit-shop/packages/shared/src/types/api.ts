export interface ApiResponse<T = unknown> {
  code: number;
  data?: T;
  message: string;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
