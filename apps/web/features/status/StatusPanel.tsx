"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  getCapabilities,
  getLive,
  getReady,
} from "@/lib/api/client";
import type {
  CapabilitiesResponse,
  LiveHealthResponse,
  ReadyHealthResponse,
} from "@/lib/api/types";
import { getApiBaseUrl } from "@/lib/env";
import styles from "./StatusPanel.module.css";

type CheckState<T> =
  | { state: "loading" }
  | { state: "ok"; data: T }
  | { state: "error"; message: string };

async function loadCheck<T>(
  loader: () => Promise<T>,
): Promise<CheckState<T>> {
  try {
    const data = await loader();
    return { state: "ok", data };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown error";
    return { state: "error", message };
  }
}

function CheckBlock<T>({
  title,
  result,
}: {
  title: string;
  result: CheckState<T>;
}) {
  if (result.state === "loading") {
    return (
      <section className={styles.block}>
        <h2>{title}</h2>
        <p className={styles.muted}>Loading…</p>
      </section>
    );
  }

  if (result.state === "error") {
    return (
      <section className={`${styles.block} ${styles.error}`}>
        <h2>{title}</h2>
        <p>
          <strong>Unreachable / failed.</strong> {result.message}
        </p>
      </section>
    );
  }

  return (
    <section className={`${styles.block} ${styles.ok}`}>
      <h2>{title}</h2>
      <pre className={styles.payload}>
        {JSON.stringify(result.data, null, 2)}
      </pre>
    </section>
  );
}

export function StatusPanel() {
  const baseUrl = getApiBaseUrl();
  const [live, setLive] = useState<CheckState<LiveHealthResponse>>({
    state: "loading",
  });
  const [ready, setReady] = useState<CheckState<ReadyHealthResponse>>({
    state: "loading",
  });
  const [capabilities, setCapabilities] = useState<
    CheckState<CapabilitiesResponse>
  >({ state: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const [liveResult, readyResult, capsResult] = await Promise.all([
        loadCheck(getLive),
        loadCheck(getReady),
        loadCheck(getCapabilities),
      ]);
      if (cancelled) return;
      setLive(liveResult);
      setReady(readyResult);
      setCapabilities(capsResult);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.panel}>
      <p className={styles.meta}>
        API base URL: <code>{baseUrl}</code>
      </p>
      <p className={styles.muted}>
        Until FastAPI is running, these checks will show as unreachable. That is
        expected in Phase 0 frontend-only setup.
      </p>
      <CheckBlock title="GET /health/live" result={live} />
      <CheckBlock title="GET /health/ready" result={ready} />
      <CheckBlock
        title="GET /api/v1/config/capabilities"
        result={capabilities}
      />
    </div>
  );
}
