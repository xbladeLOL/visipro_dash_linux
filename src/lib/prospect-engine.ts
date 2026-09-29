import "server-only";

export type EngineBusiness = {
  id: string; name: string; category?: string; city?: string; address?: string;
  phone?: string; website_url?: string; email?: string; rating?: string | number;
  review_count?: number; status: string; total?: number; tier?: string;
  recommended_offers?: string[];
};
export type EngineStats = { total: number; review: number; approved: number; rejected: number };
export type JobSummary = { pending: number; running: number; completed: number; failed: number; discovering: number; analyzing: number };

function config() {
  const url = process.env.PROSPECT_ENGINE_URL?.replace(/\/$/, "");
  const key = process.env.PROSPECT_ENGINE_API_KEY;
  if (!url || !key) throw new Error("Le moteur de prospection n'est pas configuré.");
  return { url, key };
}

async function engineFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { url, key } = config();
  const response = await fetch(`${url}${path}`, { ...init, cache: "no-store", headers: { "x-api-key": key, "content-type": "application/json", ...init?.headers }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Moteur indisponible (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getDetectionData(filters: { city?: string; minScore?: string }) {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.city) params.set("city", filters.city);
  if (filters.minScore) params.set("minScore", filters.minScore);
  const [stats, jobs, businesses] = await Promise.all([
    engineFetch<EngineStats>("/v1/stats"), engineFetch<JobSummary>("/v1/jobs-summary"),
    engineFetch<{ items: EngineBusiness[] }>(`/v1/businesses?${params}`)
  ]);
  return { stats, jobs, businesses: businesses.items };
}

export async function startEngineScan(input: { query: string; city: string; limit: number }) {
  return engineFetch<{ jobId: string }>("/v1/discovery-runs", { method: "POST", body: JSON.stringify(input) });
}
export async function setEngineBusinessStatus(id: string, status: "APPROVED"|"REJECTED"|"DO_NOT_CONTACT", reason?: string) {
  return engineFetch(`/v1/businesses/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, reason }) });
}
