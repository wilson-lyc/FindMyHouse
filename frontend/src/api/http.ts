interface ApiResponse<T> {
  data: T;
}

const jsonHeaders = {
  'Content-Type': 'application/json'
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getData<T>(url: string) {
  const response = await request<ApiResponse<T>>(url);
  return response.data;
}

export async function postData<TResponse, TPayload>(url: string, payload: TPayload) {
  const response = await request<ApiResponse<TResponse>>(url, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  return response.data;
}

export async function patchData<TResponse, TPayload>(url: string, payload: TPayload) {
  const response = await request<ApiResponse<TResponse>>(url, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
  return response.data;
}

export async function deleteData(url: string) {
  await request<void>(url, {
    method: 'DELETE'
  });
}
