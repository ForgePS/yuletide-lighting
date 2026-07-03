type TinaGraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export function hasTinaCloudCredentials() {
  const clientId = process.env.NEXT_PUBLIC_TINA_CLIENT_ID;
  const token = process.env.TINA_TOKEN;
  return Boolean(
    clientId &&
      token &&
      clientId !== 'local' &&
      token !== 'local' &&
      !clientId.startsWith('your_') &&
      !token.startsWith('your_'),
  );
}

function tinaBranch() {
  return (
    process.env.NEXT_PUBLIC_TINA_BRANCH ||
    process.env.GITHUB_BRANCH ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.HEAD ||
    'main'
  );
}

function tinaContentUrl() {
  if (process.env.TINA_LOCAL_URL) return process.env.TINA_LOCAL_URL;
  const clientId = process.env.NEXT_PUBLIC_TINA_CLIENT_ID!;
  return `https://content.tinajs.io/2.4/content/${clientId}/github/${tinaBranch()}`;
}

export async function fetchTinaQuery<TData>(
  query: string,
  variables: Record<string, unknown>,
): Promise<{ data: TData; query: string; variables: Record<string, unknown> }> {
  const token = process.env.TINA_TOKEN;
  if (!token) throw new Error('TINA_TOKEN is not configured');

  const res = await fetch(tinaContentUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': token,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Tina Cloud responded with ${res.status}`);
  }

  const json = (await res.json()) as TinaGraphqlResponse<TData>;
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  if (!json.data) {
    throw new Error('Tina Cloud returned no data');
  }

  return { data: json.data, query, variables };
}
