import "server-only";

const DEFAULT_SUPABASE_URL = "https://uwfpjwlkypryqhfmbybj.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_V0f2QVxSxgU9ZGb5W5xBcg_bd0VSKEK";

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  DEFAULT_SUPABASE_URL;
const supabaseApiKey =
  process.env.SUPABASE_API_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  DEFAULT_SUPABASE_PUBLISHABLE_KEY;
const supabaseIngestToken = process.env.SUPABASE_INGEST_TOKEN;

function assertAdminEnv() {
  if (!supabaseUrl || !supabaseApiKey || !supabaseIngestToken) {
    throw new Error(
      "Supabase admin REST environment variables are not configured.",
    );
  }
}

function buildUrl(path: string, params?: Record<string, string>) {
  assertAdminEnv();
  const url = new URL(`/rest/v1/${path}`, supabaseUrl);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }
  return url;
}

function buildHeaders(prefer?: string) {
  assertAdminEnv();
  return {
    apikey: supabaseApiKey!,
    Authorization: `Bearer ${supabaseApiKey!}`,
    "Content-Type": "application/json",
    "x-ingest-token": supabaseIngestToken!,
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

export async function patchSupabaseAdminRow<T>(
  path: string,
  params: Record<string, string>,
  payload: Record<string, unknown>,
) {
  const response = await fetch(buildUrl(path, params), {
    method: "PATCH",
    headers: buildHeaders("return=representation"),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Supabase admin PATCH failed: ${response.status} ${await response.text()}`,
    );
  }

  return (await response.json()) as T[];
}
