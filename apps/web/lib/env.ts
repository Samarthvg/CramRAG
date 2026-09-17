const DEFAULT_API_BASE_URL = "http://localhost:8000";

/**
 * Resolve the API base URL for browser and server fetch calls.
 * Secrets must never be placed here — only a public base URL.
 */
export function getApiBaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const raw = env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const base = raw && raw.length > 0 ? raw : DEFAULT_API_BASE_URL;

  try {
    // Validate shape; throw if invalid.
    new URL(base);
  } catch {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_BASE_URL: ${JSON.stringify(base)}`,
    );
  }

  return base.replace(/\/+$/, "");
}

/** Join API base URL with a path that starts with `/`. */
export function apiUrl(path: string, baseUrl?: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`API path must start with "/": ${path}`);
  }
  return `${baseUrl ?? getApiBaseUrl()}${path}`;
}
