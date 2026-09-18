import { FC, useEffect, useMemo, useState } from 'react';
import {
  IconBook2,
  IconCheck,
  IconExternalLink,
  IconFilter,
  IconSearch,
  IconSortAscending,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { FormattedDefinition } from '@/components/FormattedDefinition/FormattedDefinition';
import { useVocabulary } from '@/hooks/useVocabulary';
import { Language } from '@/types/firestore';
import { DiscoveredWordEntry } from '@/types/vocabulary';
import { Dictionary } from '@/utils/wordUtils';

interface VocabularyTabProps {
  profileUserId: string;
}

const LANGUAGE_META: Record<
  Language,
  { name: string; flag: string; color: string; hoverBorder: string }
> = {
  es: {
    name: 'Spanish',
    flag: '🇪🇸',
    color: 'orange',
    hoverBorder: '#f59f00',
  },
  fr: {
    name: 'French',
    flag: '🇫🇷',
    color: 'indigo',
    hoverBorder: '#6366f1',
  },
  en: {
    name: 'English',
    flag: '🇬🇧',
    color: 'teal',
    hoverBorder: '#14b8a6',
  },
};

const formatTimeAgo = (isoString: string): string => {
  if (!isoString) {
    return '';
  }
  const now = Date.now();
  const date = new Date(isoString).getTime();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) {
    return 'Just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }
  return new Date(isoString).toLocaleDateString();
};

export const VocabularyTab: FC<VocabularyTabProps> = ({ profileUserId }) => {
  const { vocabulary, counts, isLoading: isVocabLoading } = useVocabulary(profileUserId);

  const [selectedLang, setSelectedLang] = useState<Language>('es');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'freq' | 'recent' | 'alpha' | 'diff'>('freq');
  const [filterType, setFilterType] = useState<'all' | 'verb' | 'noun' | 'adj' | 'solved'>('all');

  const [dictionaries, setDictionaries] = useState<Record<Language, Dictionary | null>>({
    en: null,
    es: null,
    fr: null,
  });
  const [isDictLoading, setIsDictLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/en.json').then((res) => res.json() as Promise<Dictionary>),
      fetch('/es.json').then((res) => res.json() as Promise<Dictionary>),
      fetch('/fr.json').then((res) => res.json() as Promise<Dictionary>),
    ])
      .then(([en, es, fr]) => {
        setDictionaries({ en, es, fr });
        setIsDictLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dictionary files:', err);
        setIsDictLoading(false);
      });
  }, []);

  const currentDict = dictionaries[selectedLang];
  const langVocabRecords = vocabulary[selectedLang] || {};

  // Hydrate discovered records with dictionary definitions, POS, and difficulty
  const enrichedWords = useMemo((): DiscoveredWordEntry[] => {
    if (!currentDict) {
      return [];
    }

    const entries: DiscoveredWordEntry[] = [];
    for (const [key, record] of Object.entries(langVocabRecords)) {
      const dictEntry = currentDict[key];
      entries.push({
        key,
        lang: selectedLang,
        display: dictEntry?.display || key,
        pos: dictEntry?.pos || 'unknown',
        d: dictEntry?.d ?? 0.5,
        def: dictEntry?.def || '',
        timesGuessed: record.timesGuessed,
        firstSeen: record.firstSeen,
        lastSeen: record.lastSeen,
        isSolved: record.isSolved,
      });
    }

    return entries;
  }, [currentDict, langVocabRecords, selectedLang]);

  // Filter and sort words
  const filteredAndSortedWords = useMemo(() => {
    let result = enrichedWords;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (w) =>
          w.key.toLowerCase().includes(q) ||
          w.display.toLowerCase().includes(q) ||
          w.def.toLowerCase().includes(q)
      );
    }

    if (filterType !== 'all') {
      if (filterType === 'solved') {
        result = result.filter((w) => w.isSolved);
      } else {
        result = result.filter((w) => w.pos.toLowerCase() === filterType);
      }
    }

    return [...result].sort((a, b) => {
      switch (sortOption) {
        case 'freq':
          return b.timesGuessed - a.timesGuessed;
        case 'recent':
          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
        case 'alpha':
          return a.display.localeCompare(b.display, selectedLang, { sensitivity: 'base' });
        case 'diff':
          return b.d - a.d;
        default:
          return 0;
      }
    });
  }, [enrichedWords, searchQuery, filterType, sortOption, selectedLang]);

  const discoveredCount = counts[selectedLang];

  if (isVocabLoading || isDictLoading) {
    return (
      <Center py={60}>
        <Stack align="center" gap="sm">
          <Loader size="md" />
          <Text size="sm" c="dimmed">
            Loading your personal vocabulary tracker...
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="lg" mt="md">
      {/* LANGUAGE SELECTOR CARDS WITH PROGRESS */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {(['es', 'fr', 'en'] as Language[]).map((lang) => {
          const isSelected = selectedLang === lang;
          const meta = LANGUAGE_META[lang];
          const langDict = dictionaries[lang];
          const masterCount = langDict ? Object.keys(langDict).length : 0;
          const count = counts[lang];
          const pct = masterCount > 0 ? (count / masterCount) * 100 : 0;

          return (
            <Paper
              key={lang}
              p="md"
              radius="lg"
              withBorder
              onClick={() => setSelectedLang(lang)}
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderColor: isSelected ? meta.hoverBorder : undefined,
                borderWidth: isSelected ? 2 : 1,
                backgroundColor: isSelected
                  ? 'var(--mantine-color-dark-6)'
                  : 'var(--mantine-color-dark-7)',
              }}
            >
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Text size="xl">{meta.flag}</Text>
                  <Text fw={700} size="sm">
                    {meta.name}
                  </Text>
                </Group>
                <Badge variant={isSelected ? 'filled' : 'light'} color={meta.color} size="sm">
                  {count} words
                </Badge>
              </Group>

              <Progress
                value={pct}
                color={meta.color}
                size="sm"
                radius="xl"
                mb="xs"
                animated={isSelected}
              />

              <Group justify="space-between">
                <Text size="xs" c="dimmed">
                  Progress: {pct.toFixed(1)}%
                </Text>
                <Text size="xs" c="dimmed">
                  {count} / {masterCount.toLocaleString()}
                </Text>
              </Group>
            </Paper>
          );
        })}
      </SimpleGrid>

      {/* FILTER & SEARCH BAR */}
      <Paper p="sm" radius="md" withBorder bg="var(--mantine-color-dark-8)">
        <Group justify="space-between" wrap="wrap" gap="sm">
          <TextInput
            placeholder="Search discovered words or meanings..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 220 }}
            size="sm"
          />

          <Group gap="xs">
            <Select
              value={sortOption}
              onChange={(val) => setSortOption((val as any) || 'freq')}
              leftSection={<IconSortAscending size={16} />}
              size="sm"
              style={{ width: 175 }}
              data={[
                { value: 'freq', label: 'Most Guessed' },
                { value: 'recent', label: 'Recently Played' },
                { value: 'alpha', label: 'Alphabetical (A-Z)' },
                { value: 'diff', label: 'Difficulty (Hardest)' },
              ]}
            />

            <Select
              value={filterType}
              onChange={(val) => setFilterType((val as any) || 'all')}
              leftSection={<IconFilter size={16} />}
              size="sm"
              style={{ width: 180 }}
              data={[
                { value: 'all', label: 'All Types' },
                { value: 'verb', label: 'Verbs only' },
                { value: 'noun', label: 'Nouns only' },
                { value: 'adj', label: 'Adjectives only' },
                { value: 'solved', label: 'Game-Winning Words' },
              ]}
            />
          </Group>
        </Group>
      </Paper>

      {/* DISCOVERED WORDS HEADER & COUNT */}
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <Text fw={700} size="md">
            {LANGUAGE_META[selectedLang].flag} {LANGUAGE_META[selectedLang].name} Discoveries
          </Text>
          <Badge variant="outline" color={LANGUAGE_META[selectedLang].color} size="sm">
            {filteredAndSortedWords.length} of {discoveredCount}
          </Badge>
        </Group>

        <Button
          component={Link}
          to="/dictionaries"
          variant="subtle"
          color="gray"
          size="xs"
          rightSection={<IconExternalLink size={14} />}
        >
          Explore Full Dictionary
        </Button>
      </Group>

      {/* WORD CARDS GRID OR EMPTY STATE */}
      {filteredAndSortedWords.length === 0 ? (
        <Paper p="xl" radius="md" withBorder ta="center" bg="var(--mantine-color-dark-8)">
          <Stack align="center" gap="xs">
            <ThemeIcon size={48} radius="xl" variant="light" color="gray">
              <IconBook2 size={24} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              {discoveredCount === 0
                ? `No ${LANGUAGE_META[selectedLang].name} words discovered yet`
                : 'No words match your current filters'}
            </Text>
            <Text size="xs" c="dimmed" maw={400}>
              {discoveredCount === 0
                ? 'Play daily games or practice in Spanish, French, or English to expand your personal vocabulary log!'
                : 'Try clearing your search query or switching the type filter above.'}
            </Text>
            {discoveredCount === 0 && (
              <Button component={Link} to="/" size="xs" variant="light" color="blue" mt="xs">
                Play Today's Wordle
              </Button>
            )}
          </Stack>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
          {filteredAndSortedWords.map((word) => {
            const diffPct = Math.round(word.d * 100);
            const diffColor = word.d <= 0.4 ? 'teal' : word.d <= 0.65 ? 'blue' : 'orange';

            return (
              <Card
                key={word.key}
                p="md"
                radius="md"
                withBorder
                bg="var(--mantine-color-dark-7)"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div>
                  <Group justify="space-between" align="flex-start" mb="xs">
                    <div>
                      <Group gap="xs" align="center">
                        <Text fw={800} size="lg" style={{ letterSpacing: '0.5px' }}>
                          {word.display.toUpperCase()}
                        </Text>
                        <Badge size="xs" variant="light" color="gray">
                          {word.pos}
                        </Badge>
                        {word.isSolved && (
                          <Tooltip label="Game-Winning Target Word" withArrow>
                            <Badge
                              size="xs"
                              variant="filled"
                              color="green"
                              leftSection={<IconCheck size={10} />}
                            >
                              Solved
                            </Badge>
                          </Tooltip>
                        )}
                      </Group>
                    </div>

                    <Badge size="xs" variant="outline" color={diffColor}>
                      d: {word.d.toFixed(2)} ({diffPct}%)
                    </Badge>
                  </Group>

                  {/* High Contrast Option 3 Definition */}
                  <div style={{ minHeight: 44 }}>
                    <FormattedDefinition def={word.def} size="sm" withBullet={false} />
                  </div>
                </div>

                <Divider my="xs" />

                {/* Footer Metadata */}
                <Group justify="space-between" align="center">
                  <Group gap="xs">
                    <Tooltip label="Total times guessed in games" withArrow>
                      <Badge size="xs" variant="dot" color="blue">
                        Guessed {word.timesGuessed} {word.timesGuessed === 1 ? 'time' : 'times'}
                      </Badge>
                    </Tooltip>
                  </Group>

                  <Group gap={8}>
                    {word.lastSeen && (
                      <Text size="xs" c="dimmed">
                        Played {formatTimeAgo(word.lastSeen)}
                      </Text>
                    )}
                  </Group>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );
};
