/** Minimal health / capabilities shapes from design §11. */

export type LiveHealthResponse = {
  status: "ok" | string;
};

export type ReadyHealthResponse = {
  status: "ok" | "degraded" | string;
  checks?: Record<string, string | boolean>;
};

export type CapabilitiesResponse = {
  document_types: string[];
  features: Record<string, boolean>;
};
