/**
 * Lightweight offline mutation queue for crew mobile.
 * Uses SecureStore so no extra native dependency is required.
 */

import * as SecureStore from 'expo-secure-store';
import { trpcMutation } from './api';

const QUEUE_KEY = 'crew-offline-queue-v1';
const LAST_SYNC_KEY = 'crew-last-sync-at';

export type QueuedMutation = {
  id: string;
  procedure: string;
  input: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

async function readQueue(): Promise<QueuedMutation[]> {
  const raw = await SecureStore.getItemAsync(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QueuedMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedMutation[]) {
  await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(items.slice(0, 100)));
}

export async function getOfflineQueue(): Promise<QueuedMutation[]> {
  return readQueue();
}

export async function getLastSyncAt(): Promise<string | null> {
  return SecureStore.getItemAsync(LAST_SYNC_KEY);
}

export async function enqueueMutation(procedure: string, input: unknown) {
  const queue = await readQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    procedure,
    input,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  await writeQueue(queue);
  return queue.length;
}

/** Try online first; on network failure, queue for later flush. */
export async function mutateWithOfflineFallback(procedure: string, input: unknown) {
  try {
    const result = await trpcMutation(procedure, input);
    await SecureStore.setItemAsync(LAST_SYNC_KEY, new Date().toISOString());
    return { queued: false as const, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    const offlineLikely =
      message.includes('Network') ||
      message.includes('fetch') ||
      message.includes('Failed to fetch') ||
      message.includes('timeout');
    if (!offlineLikely) throw err;
    await enqueueMutation(procedure, input);
    return { queued: true as const, result: null };
  }
}

export async function flushOfflineQueue(): Promise<{ sent: number; remaining: number; errors: string[] }> {
  const queue = await readQueue();
  const remaining: QueuedMutation[] = [];
  const errors: string[] = [];
  let sent = 0;

  for (const item of queue) {
    try {
      await trpcMutation(item.procedure, item.input);
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Flush failed';
      errors.push(`${item.procedure}: ${message}`);
      remaining.push({ ...item, attempts: item.attempts + 1, lastError: message });
    }
  }

  await writeQueue(remaining);
  if (sent > 0) {
    await SecureStore.setItemAsync(LAST_SYNC_KEY, new Date().toISOString());
  }
  return { sent, remaining: remaining.length, errors };
}
