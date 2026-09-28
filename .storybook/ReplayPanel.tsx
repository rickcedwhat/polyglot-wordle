import React, { useEffect, useState } from 'react';
import { AddonPanel, IconButton } from '@storybook/components';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayBackIcon,
  PlayIcon,
  StopAltIcon,
  UndoIcon,
} from '@storybook/icons';
import { useArgs, useChannel, useStorybookState } from '@storybook/manager-api';
import { useTheme } from '@storybook/theming';
import {
  REPLAY_REQUEST_EVENT,
  REPLAY_RESET_EVENT,
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

  const pill = (active: boolean): React.CSSProperties => ({
    padding: '2px 10px',
    borderRadius: 999,
    border: `1px solid ${active ? accent : theme.appBorderColor}`,
    background: active ? accent : 'transparent',
    color: active ? theme.color.inverseText : theme.color.defaultText,
    fontSize: 12,
    cursor: 'pointer',
  });

  const row = (active: boolean, played: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '6px 10px',
    borderRadius: 6,
    border: `1px solid ${active ? accent : 'transparent'}`,
    background: active ? accent : 'transparent',
    color: active ? theme.color.inverseText : theme.color.defaultText,
    opacity: played || active ? 1 : 0.45,
    fontFamily: theme.typography.fonts.mono,
    fontSize: 13,
    letterSpacing: 1,
    textAlign: 'left',
    cursor: 'pointer',
  });

  const rows = [
    { at: 0, label: 'Start', solved: false },
    ...timeline.map((word, index) => ({
      at: index + 1,
      label: word.toUpperCase(),
      solved: solvedSteps.includes(index + 1),
    })),
  ];

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <IconButton title="Start" onClick={() => goTo(0)} disabled={step === 0}>
          <PlayBackIcon />
        </IconButton>
        <IconButton title="Previous guess" onClick={() => goTo(step - 1)} disabled={step === 0}>
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          title={playing ? 'Stop' : 'Play'}
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
        <IconButton
          title="Reset: restore the saved guesses and go back to the start"
          onClick={() => emit(REPLAY_RESET_EVENT)}
        >
          <UndoIcon />
        </IconButton>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700 }}>
          Guess {step} of {total}
        </span>
        <span style={{ opacity: 0.6 }}>· score {state.score}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {REPLAY_SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              title={`Play speed ${value}×`}
              onClick={() => updateArgs({ speed: value })}
              style={pill(speed === value)}
            >
              {value}×
            </button>
          ))}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map(({ at, label, solved }) => (
          <button
            key={`${label}-${at}`}
            type="button"
            title={
              at === step + 1 ? 'Play this guess' : `Jump to ${at === 0 ? 'start' : `guess ${at}`}`
            }
            style={row(step === at, at <= step)}
            onClick={() => goTo(at)}
          >
            <span style={{ width: 18, opacity: 0.6, textAlign: 'right' }}>{at || ''}</span>
            <span style={{ fontWeight: solved ? 700 : 500 }}>{label}</span>
            {solved && <span style={{ marginLeft: 'auto' }}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export const ReplayPanel = ({ active }: { active?: boolean }) => (
  <AddonPanel active={Boolean(active)}>
    <ReplayControls />
  </AddonPanel>
);
