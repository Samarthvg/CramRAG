import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, getCapabilities, getLive, getReady } from "@/lib/api/client";
import { apiUrl, getApiBaseUrl } from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getApiBaseUrl", () => {
  it("defaults to localhost:8000 when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(getApiBaseUrl()).toBe("http://localhost:8000");
  });

  it("strips trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8000/");
    expect(getApiBaseUrl()).toBe("http://localhost:8000");
  });

  it("rejects invalid URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "not-a-url");
    expect(() => getApiBaseUrl()).toThrow(/Invalid NEXT_PUBLIC_API_BASE_URL/);
  });
});

describe("apiUrl", () => {
  it("joins base and path", () => {
    expect(apiUrl("/health/live", "http://localhost:8000")).toBe(
      "http://localhost:8000/health/live",
    );
  });

  it("requires a leading slash on the path", () => {
    expect(() => apiUrl("health/live", "http://localhost:8000")).toThrow(
      /must start with "\/"/,
    );
  });
});

describe("api client", () => {
  it("calls the live health endpoint with the correct URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getLive({
      baseUrl: "http://api.test",
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/health/live",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toEqual({ status: "ok" });
  });

  it("calls ready and capabilities endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            document_types: ["application/pdf"],
            features: { chat: true },
          }),
          { status: 200 },
        ),
      );

    await getReady({
      baseUrl: "http://api.test",
      fetch: fetchMock as unknown as typeof fetch,
    });
    await getCapabilities({
      baseUrl: "http://api.test",
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/health/ready");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://api.test/api/v1/config/capabilities",
    );
  });

  it("wraps network failures as ApiError", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      getLive({
        baseUrl: "http://api.test",
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(ApiError);

    await expect(
      getLive({
        baseUrl: "http://api.test",
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("API unreachable"),
      status: null,
      url: "http://api.test/health/live",
    });
  });

  it("wraps non-OK responses as ApiError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("nope", { status: 503 }),
    );

    await expect(
      getLive({
        baseUrl: "http://api.test",
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 503,
      url: "http://api.test/health/live",
    });
  });

  it("keeps the error payload on ApiError instead of discarding it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "boom" }), { status: 500 }),
    );

    await expect(
      getLive({
        baseUrl: "http://api.test",
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ status: 500, body: { detail: "boom" } });
  });

  it("returns the degraded readiness body instead of throwing on 503", async () => {
    const degraded = {
      status: "degraded",
      checks: { database: "unreachable (OperationalError)" },
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(degraded), { status: 503 }),
    );

    const result = await getReady({
      baseUrl: "http://api.test",
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(result).toEqual(degraded);
  });

  it("still throws when readiness fails in a way it cannot explain", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<html>gateway timeout</html>", { status: 504 }),
    );

    await expect(
      getReady({
        baseUrl: "http://api.test",
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ name: "ApiError", status: 504 });
  });

  it("does not accept 503 on endpoints that have no degraded state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "degraded" }), { status: 503 }),
    );

    await expect(
      getCapabilities({
        baseUrl: "http://api.test",
        fetch: fetchMock as unknown as typeof fetch,
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
