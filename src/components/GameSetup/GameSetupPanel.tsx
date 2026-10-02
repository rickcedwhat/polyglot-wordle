import { FC, useEffect, useRef, useState } from 'react';
import { IconCheck } from '@tabler/icons-react';
import {
  Box,
  Button,
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core';
import { useLanguageFlags } from '@/hooks/useLanguageFlags';
import type { Difficulty, DifficultyPrefs, Language, LanguageCombo } from '@/types/firestore';
import {
  ALL_LANGUAGES,
  BOARD_COUNT,
  DEFAULT_LANGUAGES,
  isNewGameCombo,
  labelFor,
} from '@/utils/languages';

export type GameSetupMode = 'newGame' | 'settings' | 'challenge';

export interface GameSetupValue {
  languages: LanguageCombo;
  difficulties: DifficultyPrefs;
  skipPicker: boolean;
}

interface GameSetupPanelProps {
  mode: GameSetupMode;
  initialLanguages?: Language[] | null;
  initialDifficulties?: Partial<DifficultyPrefs> | null;
  initialSkipPicker?: boolean;
  /** Re-seed untouched selections when fetched initial values become available. */
  resetKey?: unknown;
  submitLabel?: string;
  loading?: boolean;
  error?: string | null;
  onSubmit: (value: GameSetupValue) => void;
}

const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
  { value: 'basic', label: 'Basic', color: 'teal' },
  { value: 'intermediate', label: 'Intermediate', color: 'yellow' },
  { value: 'advanced', label: 'Advanced', color: 'red' },
];

const difficultyMeta = (d: Difficulty) => DIFFICULTIES.find((x) => x.value === d)!;

const DEFAULT_LABELS: Record<GameSetupMode, string> = {
  newGame: 'Start game',
  settings: 'Save',
  challenge: 'Send challenge & play',
};

const seedDifficulties = (prefs?: Partial<DifficultyPrefs> | null): DifficultyPrefs =>
  Object.fromEntries(
    ALL_LANGUAGES.map((lang) => [lang, prefs?.[lang] ?? 'basic'])
  ) as DifficultyPrefs;

export const GameSetupPanel: FC<GameSetupPanelProps> = ({
  mode,
  initialLanguages,
  initialDifficulties,
  initialSkipPicker = false,
  resetKey,
  submitLabel,
  loading = false,
  error,
  onSubmit,
}) => {
  const [selected, setSelected] = useState<Language[]>(() =>
    isNewGameCombo(initialLanguages) ? [...initialLanguages] : [...DEFAULT_LANGUAGES]
  );
  const [difficulties, setDifficulties] = useState(() => seedDifficulties(initialDifficulties));
  const [skipPicker, setSkipPicker] = useState(initialSkipPicker);

  const touched = useRef(false);

  useEffect(() => {
    if (touched.current) {
      return;
    }
    setSelected(isNewGameCombo(initialLanguages) ? [...initialLanguages] : [...DEFAULT_LANGUAGES]);
    setDifficulties(seedDifficulties(initialDifficulties));
    setSkipPicker(initialSkipPicker);
  }, [resetKey]);

  const { flags } = useLanguageFlags();
  const full = selected.length >= BOARD_COUNT;
  const ready = isNewGameCombo(selected);

  const toggle = (lang: Language) => {
    touched.current = true;
    setSelected((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : full ? prev : [...prev, lang]
    );
  };

  const ordered = ALL_LANGUAGES.filter((lang) => selected.includes(lang));

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {mode === 'challenge'
          ? 'Pick three languages and a difficulty for each. You both get the same boards.'
          : 'Pick three languages, then a difficulty for each board.'}
      </Text>

      <Stack gap="xs">
        {ALL_LANGUAGES.map((lang) => (
          <LanguageRow
            key={lang}
            lang={lang}
            flag={flags[lang]}
            selected={selected.includes(lang)}
            disabled={!selected.includes(lang) && full}
            difficulty={difficulties[lang]}
            onToggle={() => toggle(lang)}
            onDifficulty={(d) => {
              touched.current = true;
              setDifficulties((prev) => ({ ...prev, [lang]: d }));
            }}
          />
        ))}
      </Stack>

      {!ready && (
        <Text size="xs" c="orange" ta="center">
          {selected.length} of {BOARD_COUNT} selected
        </Text>
      )}

      {mode !== 'challenge' && (
        <Switch
          label="Use this setup every time"
          description="New Game starts right away. Change it from Game setup in the menu."
          checked={skipPicker}
          onChange={(e) => {
            touched.current = true;
            setSkipPicker(e.currentTarget.checked);
          }}
        />
      )}

      {error && (
        <Text size="sm" c="red" role="alert">
          {error}
        </Text>
      )}

      <Button
        size="md"
        disabled={!ready}
        loading={loading}
        onClick={() =>
          isNewGameCombo(selected) &&
          onSubmit({ languages: ordered as LanguageCombo, difficulties, skipPicker })
        }
      >
        {submitLabel ?? DEFAULT_LABELS[mode]}
      </Button>
    </Stack>
  );
};

const LanguageRow: FC<{
  lang: Language;
  flag: string;
  selected: boolean;
  disabled: boolean;
  difficulty: Difficulty;
  onToggle: () => void;
  onDifficulty: (d: Difficulty) => void;
}> = ({ lang, flag, selected, disabled, difficulty, onToggle, onDifficulty }) => (
  <Box
    style={{
      borderRadius: 'var(--mantine-radius-md)',
      border: `1px solid ${selected ? 'var(--mantine-color-blue-filled)' : 'var(--mantine-color-default-border)'}`,
      background: selected ? 'var(--mantine-color-blue-light)' : 'transparent',
      opacity: disabled ? 0.45 : 1,
      transition: 'background 120ms ease, border-color 120ms ease',
    }}
  >
    <UnstyledButton
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      w="100%"
      px="md"
      py={10}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Text fz={26} lh={1} aria-hidden>
            {flag}
          </Text>
          <Text fw={600}>{labelFor(lang)}</Text>
        </Group>
        <ThemeIcon
          size={22}
          radius="xl"
          variant={selected ? 'filled' : 'default'}
          color="blue"
          aria-hidden
        >
          {selected && <IconCheck size={14} stroke={3} />}
        </ThemeIcon>
      </Group>
    </UnstyledButton>
    {selected && (
      <Box px="md" pb="sm">
        <SegmentedControl
          fullWidth
          size="xs"
          value={difficulty}
          color={difficultyMeta(difficulty).color}
          onChange={(v) => onDifficulty(v as Difficulty)}
          data={DIFFICULTIES.map(({ value, label }) => ({ value, label }))}
          aria-label={`${labelFor(lang)} difficulty`}
        />
      </Box>
    )}
  </Box>
);
