import React, { useEffect, useState } from 'react';
import { AddonPanel, IconButton } from '@storybook/components';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayBackIcon,
  PlayIcon,
  PlayNextIcon,
  StopAltIcon,
} from '@storybook/icons';
import { useArgs, useChannel, useStorybookState } from '@storybook/manager-api';
import { useTheme } from '@storybook/theming';
import {
  REPLAY_REQUEST_EVENT,
  REPLAY_SPEEDS,
  REPLAY_STATE_EVENT,
  type ReplayState,
} from '../src/storybook/replayEvents';

const ReplayControls = () => {
  const theme = useTheme();
  const [args, updateArgs] = useArgs();
  const { storyId } = useStorybookState();
  const [state, setState] = useState<ReplayState | null>(null);
  const emit = useChannel({ [REPLAY_STATE_EVENT]: (next: ReplayState) => setState(next) });

  useEffect(() => {
    setState(null);
    emit(REPLAY_REQUEST_EVENT);
  }, [storyId, emit]);

  if (!state) {
    return <div style={{ padding: 16, opacity: 0.6 }}>Waiting for the story to load…</div>;
  }

  const { step, timeline, solvedSteps } = state;
  const total = timeline.length;
  const playing = Boolean(args.autoplay);
  const speed = Number(args.speed ?? 1);
  const goTo = (next: number) =>
    updateArgs({ step: Math.max(0, Math.min(total, next)), autoplay: false });

  const accent = theme.color.secondary;
  const chip = (active: boolean, played: boolean, solved: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: 999,
    border: `1px solid ${active ? accent : theme.appBorderColor}`,
    background: active ? accent : 'transparent',
    color: active ? theme.color.inverseText : theme.color.defaultText,
    opacity: played || active ? 1 : 0.45,
    fontFamily: theme.typography.fonts.mono,
    fontSize: 12,
    fontWeight: solved ? 700 : 500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    cursor: 'pointer',
  });

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <IconButton title="Back to start" onClick={() => goTo(0)} disabled={step === 0}>
          <PlayBackIcon />
        </IconButton>
        <IconButton title="Previous guess" onClick={() => goTo(step - 1)} disabled={step === 0}>
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          title={playing ? 'Stop' : 'Play from here'}
          active={playing}
          onClick={() =>
            playing
              ? updateArgs({ autoplay: false })
              : updateArgs({ autoplay: true, step: step >= total ? 0 : step })
          }
          disabled={total === 0}
        >
          {playing ? <StopAltIcon /> : <PlayIcon />}
        </IconButton>
        <IconButton
          title="Next guess (plays its animations)"
          onClick={() => goTo(step + 1)}
          disabled={step >= total}
        >
          <ChevronRightIcon />
        </IconButton>
        <IconButton title="Jump to end" onClick={() => goTo(total)} disabled={step >= total}>
          <PlayNextIcon />
        </IconButton>

        <span style={{ marginLeft: 8, fontWeight: 700 }}>
          Guess {step} of {total}
        </span>
        <span style={{ opacity: 0.6 }}>· score {state.score}</span>

        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ opacity: 0.6, marginRight: 4 }}>Speed</span>
          {REPLAY_SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => updateArgs({ speed: value })}
              style={chip(speed === value, true, false)}
            >
              {value}×
            </button>
          ))}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={total}
        step={1}
        value={step}
        onChange={(event) => goTo(Number(event.target.value))}
        style={{ width: '100%', accentColor: accent }}
        aria-label="Replay step"
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" style={chip(step === 0, true, false)} onClick={() => goTo(0)}>
          Start
        </button>
        {timeline.map((word, index) => {
          const at = index + 1;
          return (
            <button
              key={`${word}-${at}`}
              type="button"
              title={at === step + 1 ? 'Play this guess' : `Jump to guess ${at}`}
              style={chip(step === at, at <= step, solvedSteps.includes(at))}
              onClick={() => goTo(at)}
            >
              {at}. {word}
              {solvedSteps.includes(at) ? ' ✓' : ''}
            </button>
          );
        })}
      </div>

      <div style={{ opacity: 0.6, fontSize: 12 }}>
        Stepping forward one guess plays its animations; bigger jumps don&apos;t. Type in the
        preview to branch from the current step.
      </div>
    </div>
  );
};

export const ReplayPanel = ({ active }: { active?: boolean }) => (
  <AddonPanel active={Boolean(active)}>
    <ReplayControls />
  </AddonPanel>
);
