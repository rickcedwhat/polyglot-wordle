export type Snapshot = {
  lang: string;
  status: {
    phase?: string;
    step?: string | null;
    running?: boolean;
    paused?: boolean;
    error?: string | null;
    counters?: Record<string, number | null | undefined>;
    finishedAt?: string;
  } | null;
  scorecard: Record<string, unknown> | null;
  latestBatch: {
    step?: string;
    batchIndex?: number;
    batchTotal?: number;
    updatedAt?: string;
    items?: Array<{
      key: string;
      changed?: boolean;
      before?: { pos?: string; def?: string };
      after?: { pos?: string; def?: string };
    }>;
  } | null;
  events: Array<{ ts?: string; type?: string; message?: string }>;
  control?: { pause?: boolean };
  funnel?: unknown;
  pipeline?: {
    stages: import('@scaffold/ui').PipelineStageConfig[];
    stepGraphs: Record<string, import('@scaffold/ui').StepGraphConfig>;
    slices?: Record<string, import('@scaffold/ui').OutcomeSlice>;
  };
};

export async function fetchSnapshot(lang: string, tail = 40): Promise<Snapshot> {
  const res = await fetch(`/api/snapshot?lang=${encodeURIComponent(lang)}&tail=${tail}`);
  if (!res.ok) {
    throw new Error(`snapshot failed: ${res.status}`);
  }
  return res.json();
}

export async function postJson(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText);
  }
  return data;
}
