/** 与后端 src/app/response.ts 保持一致的统一响应结构。 */
export interface ApiSuccess<T> {
  success: true;
  code: number;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  code: number;
  message: string;
  error?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

const jsonHeaders = {
  'Content-Type': 'application/json'
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    let message = `请求失败 (${response.status})`;
    try {
      const body = (await response.json()) as ApiError;
      if (body && body.message) {
        message = body.message;
      }
    } catch {
      const text = await response.text().catch(() => '');
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = (await response.json()) as ApiSuccess<T>;
  return body.data;
}

export async function getData<T>(url: string) {
  return request<T>(url);
}

export async function postData<TResponse, TPayload>(url: string, payload: TPayload) {
  return request<TResponse>(url, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
}

export async function patchData<TResponse, TPayload>(url: string, payload: TPayload) {
  return request<TResponse>(url, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
}

export async function putData<TResponse, TPayload>(url: string, payload: TPayload) {
  return request<TResponse>(url, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
}

export async function postFormData<TResponse>(url: string, payload: FormData) {
  return request<TResponse>(url, {
    method: 'POST',
    body: payload
  });
}

export async function deleteData(url: string) {
  await request<void>(url, {
    method: 'DELETE'
  });
}
