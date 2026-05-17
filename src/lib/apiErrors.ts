// Centralized API error types and parsers used by both apiClient and
// higher-level action wrappers. Keeps error parsing consistent.

export class ApiError extends Error {
  status: number;
  response?: any;
  errors?: any;

  constructor(message: string, status: number = 500, response?: any, errors?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.response = response;
    this.errors = errors;
  }
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return data?.message || data?.error || data?.detail || JSON.stringify(data) || text;
    } catch {
      return text || `HTTP error ${response.status}`;
    }
  } catch (e) {
    return `HTTP error ${response.status}`;
  }
}

export default {
  ApiError,
  parseApiError,
};
