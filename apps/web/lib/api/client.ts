import { apiUrl, getApiBaseUrl } from "@/lib/env";
import type {
  CapabilitiesResponse,
  LiveHealthResponse,
  ReadyHealthResponse,
} from "@/lib/api/types";

export class ApiError extends Error {
  readonly status: number | null;
  readonly url: string;
  /**
   * The parsed error payload, when the API sent one. The API returns problem
   * details with its failures; dropping them turns an actionable message into
   * a bare status code.
   */
  readonly body: unknown;

  constructor(
    message: string,
    options: { status?: number | null; url: string; body?: unknown },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? null;
    this.url = options.url;
    this.body = options.body ?? null;
  }
}

export type ApiClientOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
};

async function readJsonOrNull(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function getJson<T>(
  path: string,
  options: ApiClientOptions = {},
  /**
   * Statuses whose body is a real answer rather than a failure, and so should
   * be returned instead of thrown. Readiness replies 503 when degraded, and
   * that response carries the diagnosis.
   */
  alsoAccept: readonly number[] = [],
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

  if (!response.ok && !alsoAccept.includes(response.status)) {
    throw new ApiError(
      `API request failed with HTTP ${response.status}`,
      { url, status: response.status, body: await readJsonOrNull(response) },
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
  // A degraded API answers 503 and names the failing check in the body. That
  // is the diagnosis we want to show, so it is parsed rather than thrown.
  return getJson<ReadyHealthResponse>("/health/ready", options, [503]);
}

export function getCapabilities(
  options?: ApiClientOptions,
): Promise<CapabilitiesResponse> {
  return getJson<CapabilitiesResponse>("/api/v1/config/capabilities", options);
}
