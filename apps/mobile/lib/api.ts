import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://yuletide-lighting.web.app';
const TOKEN_KEY = 'firebase-id-token';

export function getApiUrl() {
  return API_URL.replace(/\/$/, '');
}

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAuthToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await getAuthToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('authorization', `Bearer ${token}`);
  if (!headers.has('content-type') && init.body && !(init.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }
  return fetch(`${getApiUrl()}${path}`, { ...init, headers });
}

export async function trpcMutation(procedure: string, input: unknown) {
  const res = await apiFetch(`/api/trpc/${procedure}`, {
    method: 'POST',
    body: JSON.stringify({ json: input }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? 'Request failed');
  return data.result?.data?.json;
}

export async function trpcQuery(procedure: string, input?: unknown) {
  const query =
    input === undefined
      ? ''
      : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const res = await apiFetch(`/api/trpc/${procedure}${query}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? 'Request failed');
  return data.result?.data?.json;
}
