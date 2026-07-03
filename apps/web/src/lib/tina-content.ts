import fs from 'node:fs/promises';
import path from 'node:path';

type TinaPayload<T> = {
  data: T;
  query: string;
  variables: { relativePath: string };
};

async function readJsonFallback<T>(filename: string, key: string): Promise<TinaPayload<T>> {
  const relativePath = filename;
  const filePath = path.join(process.cwd(), 'content/marketing', filename);
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as T;
  return {
    data: { [key]: parsed } as T,
    query: '',
    variables: { relativePath },
  };
}

export async function loadHomeContent() {
  try {
    const { client } = await import('../../tina/__generated__/client');
    return client.queries.home({ relativePath: 'home.json' });
  } catch {
    return readJsonFallback<{ home: Record<string, unknown> }>('home.json', 'home');
  }
}

export async function loadPricingContent() {
  try {
    const { client } = await import('../../tina/__generated__/client');
    return client.queries.pricing({ relativePath: 'pricing.json' });
  } catch {
    return readJsonFallback<{ pricing: Record<string, unknown> }>('pricing.json', 'pricing');
  }
}
