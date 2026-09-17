import { apiUrl, getApiBaseUrl } from "@/lib/env";
import type {
  CapabilitiesResponse,
  LiveHealthResponse,
  ReadyHealthResponse,
} from "@/lib/api/types";

export class ApiError extends Error {
  readonly status: number | null;
  readonly url: string;

  constructor(message: string, options: { status?: number | null; url: string }) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? null;
    this.url = options.url;
  }
}

export type ApiClientOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
};

async function getJson<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const baseUrl = options.baseUrl ?? getApiBaseUrl();
  const url = apiUrl(path, baseUrl);
  const fetchFn = options.fetch ?? fetch;

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (cause) {
    const detail =
      cause instanceof Error ? cause.message : "network request failed";
    throw new ApiError(`API unreachable: ${detail}`, { url, status: null });
  }

  if (!response.ok) {
    throw new ApiError(
      `API request failed with HTTP ${response.status}`,
      { url, status: response.status },
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("API returned non-JSON response", {
      url,
      status: response.status,
    });
  }
}

export function getLive(options?: ApiClientOptions): Promise<LiveHealthResponse> {
  return getJson<LiveHealthResponse>("/health/live", options);
}

export function getReady(
  options?: ApiClientOptions,
): Promise<ReadyHealthResponse> {
  return getJson<ReadyHealthResponse>("/health/ready", options);
}

export function getCapabilities(
  options?: ApiClientOptions,
): Promise<CapabilitiesResponse> {
  return getJson<CapabilitiesResponse>("/api/v1/config/capabilities", options);
}
