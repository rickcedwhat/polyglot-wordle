import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Container,
  Grid,
  Header,
  Heading,
  PageShell,
  PipelineGraph,
  Select,
  Stack,
  Text,
  useTheme,
  type StepGraphConfig,
} from '@scaffold/ui';
import { fetchSnapshot, postJson, type Snapshot } from './api';

const LANGS = ['pt', 'en', 'es', 'fr', 'it', 'de'] as const;
const STEPS = ['wave', 'remediate', 'enrich', 'eval', 'filter', 'ingest', 'seed', 'test'] as const;

const STEP_TO_PIPELINE: Record<string, string> = {
  seed: 'seed',
  ingest: 'ingest',
  filter: 'filter',
  enrich: 'enrich',
  eval: 'eval',
  remediate: 'remediate',
  wave: 'enrich',
};

const EMPTY_STEP: StepGraphConfig = {
  stageId: 'idle',
  stageName: 'Waiting for data',
  stageType: 'transform',
  source: { label: 'No pipeline payload yet', count: 0 },
  questionNodes: [],
  destinationBuckets: [],
};

export function App() {
  const { mode, toggleMode } = useTheme();
  const [lang, setLang] = useState<string>('en');
  const [step, setStep] = useState<string>('wave');
  const [rewriteLimit, setRewriteLimit] = useState(80);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStageId, setActiveStageId] = useState<string>('filter');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchSnapshot(lang, 50);
      setSnap(next);
      setError(null);
      if (next.status?.running && next.status.step && STEP_TO_PIPELINE[next.status.step]) {
        setActiveStageId(STEP_TO_PIPELINE[next.status.step]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [lang]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 1500);
    return () => window.clearInterval(id);
  }, [refresh]);

  const stages = snap?.pipeline?.stages ?? [];
  const stepGraphs = snap?.pipeline?.stepGraphs ?? {};
  const stepGraphConfig =
    stepGraphs[activeStageId] || (stages[0] ? stepGraphs[stages[0].id] : undefined) || EMPTY_STEP;

  const status = snap?.status;
  const phaseLabel = status?.paused
    ? 'paused'
    : status?.running
      ? 'running'
      : status?.phase || 'idle';

  const phaseIntent = useMemo(() => {
    if (status?.paused) {
      return 'secondary' as const;
    }
    if (status?.phase === 'error') {
      return 'danger' as const;
    }
    if (status?.running) {
      return 'primary' as const;
    }
    return 'neutral' as const;
  }, [status]);

  async function runPipeline() {
    setBusy(true);
    setError(null);
    try {
      await postJson('/api/run', { lang, step, rewriteLimit });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <Header sticky>
        <Stack direction="row" justify="between" align="center" gap={4} wrap>
          <Stack gap={1}>
            <Heading level={1} size="lg">
              Dictionary Console
            </Heading>
            <Text size="sm" color="secondary">
              Scaffold PipelineGraph · linked @scaffold/ui source · port 4091
            </Text>
          </Stack>
          <Stack direction="row" gap={2} align="center">
            <Button variant="ghost" size="sm" intent="neutral" onClick={toggleMode}>
              {mode === 'dark' ? 'Light' : 'Dark'}
            </Button>
            <Badge intent={phaseIntent}>{phaseLabel}</Badge>
          </Stack>
        </Stack>
      </Header>

      <Container maxWidth="xl">
        <Stack gap={5}>
          <Card padding="normal">
            <Stack direction="row" gap={3} wrap align="end">
              <Select
                label="Lang"
                value={lang}
                onChange={(e) => setLang(String(e.target.value))}
                options={LANGS.map((l) => ({ value: l, label: l }))}
              />
              <Select
                label="Step"
                value={step}
                onChange={(e) => {
                  const v = String(e.target.value);
                  setStep(v);
                  if (STEP_TO_PIPELINE[v]) {
                    setActiveStageId(STEP_TO_PIPELINE[v]);
                  }
                }}
                options={STEPS.map((s) => ({ value: s, label: s }))}
              />
              <Select
                label="Wave"
                value={rewriteLimit}
                onChange={(e) => setRewriteLimit(Number(e.target.value) || 80)}
                options={[40, 80, 120, 200].map((n) => ({ value: n, label: String(n) }))}
              />
              <Button intent="primary" onClick={() => void runPipeline()} loading={busy}>
                Run
              </Button>
              <Button
                intent="secondary"
                variant="outline"
                onClick={() => void postJson('/api/pause', { lang }).then(refresh)}
              >
                Pause
              </Button>
              <Button
                intent="neutral"
                variant="outline"
                onClick={() => void postJson('/api/resume', { lang }).then(refresh)}
              >
                Resume
              </Button>
            </Stack>
            {error ? (
              <Text size="sm" color="danger">
                {error}
              </Text>
            ) : null}
          </Card>

          {stages.length > 0 ? (
            <PipelineGraph
              stages={stages}
              activeStageId={activeStageId}
              onSelectStage={(id) => {
                setActiveStageId(id);
                if ((STEPS as readonly string[]).includes(id)) {
                  setStep(id);
                }
              }}
              stepGraphConfig={stepGraphConfig}
              slices={snap?.pipeline?.slices ?? {}}
              defaultZoomLevel="macro"
            />
          ) : (
            <Card padding="spacious">
              <Heading level={3} size="md">
                Waiting for pipeline data
              </Heading>
              <Text size="sm" color="secondary">
                Ensure the API is up and dictionaries/artifacts exist for {lang}.
              </Text>
            </Card>
          )}

          <Grid minItemWidth={280} gap={4}>
            <Card padding="normal">
              <Stack gap={2}>
                <Heading level={4} size="sm">
                  Status
                </Heading>
                <Text size="sm">
                  Step:{' '}
                  <Text as="span" weight="semibold">
                    {status?.step || '—'}
                  </Text>
                </Text>
                <Text size="sm">
                  Queue:{' '}
                  <Text as="span" weight="semibold">
                    {status?.counters?.queueSize ?? '—'}
                  </Text>
                </Text>
                <Text size="sm">
                  Batch:{' '}
                  <Text as="span" weight="semibold">
                    {status?.counters?.batchIndex && status?.counters?.batchTotal
                      ? `${status.counters.batchIndex}/${status.counters.batchTotal}`
                      : '—'}
                  </Text>
                </Text>
                <Text size="sm" color="secondary">
                  {(snap?.scorecard as { summary?: string } | null)?.summary || ''}
                </Text>
              </Stack>
            </Card>

            <Card padding="normal">
              <Stack gap={2}>
                <Heading level={4} size="sm">
                  Latest batch
                </Heading>
                {!snap?.latestBatch ? (
                  <Text size="sm" color="secondary">
                    No batch yet.
                  </Text>
                ) : (
                  <>
                    <Text size="xs" color="secondary">
                      {snap.latestBatch.step} · {snap.latestBatch.batchIndex}/
                      {snap.latestBatch.batchTotal} · {snap.latestBatch.items?.length || 0} words
                    </Text>
                    {(snap.latestBatch.items || []).slice(0, 8).map((item) => (
                      <Text key={item.key} size="sm">
                        <Text as="span" weight="semibold">
                          {item.key}
                        </Text>{' '}
                        · {item.after?.pos || item.before?.pos || ''}
                      </Text>
                    ))}
                  </>
                )}
              </Stack>
            </Card>
          </Grid>

          <Card padding="normal">
            <Stack gap={2}>
              <Heading level={4} size="sm">
                Events
              </Heading>
              {(snap?.events || [])
                .slice()
                .reverse()
                .slice(0, 30)
                .map((e, i) => (
                  <Text key={`${e.ts}-${i}`} size="xs" color="muted">
                    {e.ts} · {e.type} — {e.message}
                  </Text>
                ))}
            </Stack>
          </Card>
        </Stack>
      </Container>
    </PageShell>
  );
}
