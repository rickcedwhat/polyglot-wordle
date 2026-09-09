import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  IconArrowLeft,
  IconBooks,
  IconCode,
  IconLanguage,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { formatDefinition, normalizeWord, WordEntry } from '@/utils/wordUtils';

type LanguageKey = 'en' | 'es' | 'fr';

const ITEMS_PER_PAGE = 40;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const DictionariesPage: FC = () => {
  const [activeLang, setActiveLang] = useState<LanguageKey>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedPos, setSelectedPos] = useState<string>('all');
  const [multilingualOnly, setMultilingualOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [dictionaries, setDictionaries] = useState<
    Record<LanguageKey, Record<string, WordEntry> | null>
  >({
    en: null,
    es: null,
    fr: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/en.json').then((r) => r.json()),
      fetch('/es.json').then((r) => r.json()),
      fetch('/fr.json').then((r) => r.json()),
    ])
      .then(([en, es, fr]) => {
        setDictionaries({ en, es, fr });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Reset page when any filter changes
  useEffect(() => {
    setPage(1);
  }, [activeLang, searchQuery, selectedLetter, selectedDifficulty, selectedPos, multilingualOnly]);

  const activeDict = dictionaries[activeLang];

  // Distinct POS options for current language
  const availablePosList = useMemo(() => {
    if (!activeDict) {
      return [];
    }
    const set = new Set<string>();
    Object.values(activeDict).forEach((entry) => {
      if (entry.pos) {
        set.add(entry.pos);
      }
    });
    return Array.from(set).sort();
  }, [activeDict]);

  // Filtered & Strictly Alphabetized Entries
  const filteredWords = useMemo(() => {
    if (!activeDict) {
      return [];
    }

    const normQuery = normalizeWord(searchQuery.trim());
    const textQuery = searchQuery.trim().toLowerCase();

    const filtered = Object.entries(activeDict)
      .filter(([key, entry]) => {
        const wordKey = key.toLowerCase();
        const displayWord = (entry.display || key).toLowerCase();

        // Letter filter (A-Z)
        if (selectedLetter !== 'all') {
          const firstChar = normalizeWord(wordKey).charAt(0).toUpperCase();
          if (firstChar !== selectedLetter) {
            return false;
          }
        }

        // Difficulty Tier filter
        if (selectedDifficulty === 'basic' && entry.d > 0.4) {
          return false;
        }
        if (selectedDifficulty === 'intermediate' && (entry.d <= 0.4 || entry.d > 0.65)) {
          return false;
        }
        if (selectedDifficulty === 'advanced' && entry.d <= 0.65) {
          return false;
        }

        // POS filter
        if (selectedPos !== 'all' && entry.pos !== selectedPos) {
          return false;
        }

        // Multilingual filter
        if (multilingualOnly) {
          const inOtherLanguages = (['en', 'es', 'fr'] as LanguageKey[])
            .filter((l) => l !== activeLang)
            .some((l) => Boolean(dictionaries[l]?.[key]));
          if (!inOtherLanguages) {
            return false;
          }
        }

        // Search query filter
        if (textQuery) {
          const matchKey = wordKey.includes(normQuery);
          const matchDisplay = displayWord.includes(textQuery);
          const matchDef = (entry.def || '').toLowerCase().includes(textQuery);
          return matchKey || matchDisplay || matchDef;
        }

        return true;
      })
      .map(([key, entry]) => ({ key, ...entry }));

    // Strictly sort alphabetically A-Z
    return filtered.sort((a, b) =>
      (a.display || a.key).localeCompare(b.display || b.key, activeLang, {
        sensitivity: 'base',
      })
    );
  }, [
    activeDict,
    searchQuery,
    selectedLetter,
    selectedDifficulty,
    selectedPos,
    multilingualOnly,
    activeLang,
    dictionaries,
  ]);

  const totalPages = Math.ceil(filteredWords.length / ITEMS_PER_PAGE);
  const paginatedWords = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredWords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWords, page]);

  // Real Difficulty Statistics for active language
  const stats = useMemo(() => {
    if (!activeDict) {
      return null;
    }
    const entries = Object.values(activeDict);
    const total = entries.length;
    let basicCount = 0;
    let intermediateCount = 0;
    let advancedCount = 0;

    entries.forEach((e) => {
      if (e.d <= 0.4) {
        basicCount += 1;
      } else if (e.d <= 0.65) {
        intermediateCount += 1;
      } else {
        advancedCount += 1;
      }
    });

    return { total, basicCount, intermediateCount, advancedCount };
  }, [activeDict]);

  const getDifficultyBadge = (d: number) => {
    if (d <= 0.4) {
      return { label: `Basic (d: ${d})`, color: 'teal' };
    }
    if (d <= 0.65) {
      return { label: `Intermediate (d: ${d})`, color: 'blue' };
    }
    return { label: `Advanced (d: ${d})`, color: 'orange' };
  };

  const getLanguageMeta = (lang: LanguageKey) => {
    switch (lang) {
      case 'en':
        return {
          flag: '🇬🇧',
          name: 'English',
          total: dictionaries.en ? Object.keys(dictionaries.en).length : 0,
        };
      case 'es':
        return {
          flag: '🇪🇸',
          name: 'Spanish',
          total: dictionaries.es ? Object.keys(dictionaries.es).length : 0,
        };
      case 'fr':
        return {
          flag: '🇫🇷',
          name: 'French',
          total: dictionaries.fr ? Object.keys(dictionaries.fr).length : 0,
        };
    }
  };

  if (loading) {
    return (
      <Container size="lg" py="xl">
        <Center h={300}>
          <Stack align="center" gap="sm">
            <Loader size="lg" color="blue" />
            <Text size="sm" c="dimmed">
              Loading dictionary corpora...
            </Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  const enMeta = getLanguageMeta('en');
  const esMeta = getLanguageMeta('es');
  const frMeta = getLanguageMeta('fr');

  return (
    <Container size="lg" py="lg">
      {/* Top Header Bar */}
      <Paper p="sm" withBorder radius="md" mb="md" bg="var(--mantine-color-dark-7)">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Button
              component={Link}
              to="/sandbox"
              variant="light"
              color="gray"
              size="xs"
              leftSection={<IconArrowLeft size={14} />}
            >
              Back to Sandbox
            </Button>
            <Group gap={6}>
              <ThemeIcon size="sm" radius="xl" color="blue" variant="light">
                <IconBooks size={14} />
              </ThemeIcon>
              <Text size="sm" fw={700}>
                Polyglot Wordle Dictionary Explorer
              </Text>
              <Badge size="xs" color="yellow" variant="light">
                Dev Portal
              </Badge>
            </Group>
          </Group>

          <Group gap="xs">
            <Button component={Link} to="/" variant="subtle" size="xs" color="dimmed">
              Home
            </Button>
            <Button
              component={Link}
              to="/sandbox"
              variant="filled"
              size="xs"
              color="blue"
              leftSection={<IconCode size={14} />}
            >
              Open Live Inspector
            </Button>
          </Group>
        </Group>
      </Paper>

      {/* Language Tabs & Difficulty Summary */}
      <Paper p="sm" withBorder radius="md" mb="md" bg="var(--mantine-color-dark-7)">
        <Stack gap="sm">
          <Group justify="space-between" align="center" wrap="wrap">
            <Tabs
              value={activeLang}
              onChange={(val) => val && setActiveLang(val as LanguageKey)}
              variant="pills"
              radius="sm"
            >
              <Tabs.List>
                <Tabs.Tab value="en" px="md">
                  <Group gap={6} wrap="nowrap">
                    <Text span size="sm">
                      {enMeta.flag}
                    </Text>
                    <Text span fw={600} size="sm">
                      English
                    </Text>
                    <Badge size="xs" variant="filled" color="dark">
                      {enMeta.total.toLocaleString()}
                    </Badge>
                  </Group>
                </Tabs.Tab>

                <Tabs.Tab value="es" px="md">
                  <Group gap={6} wrap="nowrap">
                    <Text span size="sm">
                      {esMeta.flag}
                    </Text>
                    <Text span fw={600} size="sm">
                      Spanish
                    </Text>
                    <Badge size="xs" variant="filled" color="dark">
                      {esMeta.total.toLocaleString()}
                    </Badge>
                  </Group>
                </Tabs.Tab>

                <Tabs.Tab value="fr" px="md">
                  <Group gap={6} wrap="nowrap">
                    <Text span size="sm">
                      {frMeta.flag}
                    </Text>
                    <Text span fw={600} size="sm">
                      French
                    </Text>
                    <Badge size="xs" variant="filled" color="dark">
                      {frMeta.total.toLocaleString()}
                    </Badge>
                  </Group>
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>

            {stats && (
              <Group gap="xs">
                <Badge
                  size="sm"
                  variant={selectedDifficulty === 'basic' ? 'filled' : 'outline'}
                  color="teal"
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    setSelectedDifficulty((prev) => (prev === 'basic' ? 'all' : 'basic'))
                  }
                >
                  Basic (≤0.4): {stats.basicCount.toLocaleString()}
                </Badge>
                <Badge
                  size="sm"
                  variant={selectedDifficulty === 'intermediate' ? 'filled' : 'outline'}
                  color="blue"
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    setSelectedDifficulty((prev) =>
                      prev === 'intermediate' ? 'all' : 'intermediate'
                    )
                  }
                >
                  Intermediate (≤0.65): {stats.intermediateCount.toLocaleString()}
                </Badge>
                <Badge
                  size="sm"
                  variant={selectedDifficulty === 'advanced' ? 'filled' : 'outline'}
                  color="orange"
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    setSelectedDifficulty((prev) => (prev === 'advanced' ? 'all' : 'advanced'))
                  }
                >
                  Advanced (&gt;0.65): {stats.advancedCount.toLocaleString()}
                </Badge>
              </Group>
            )}
          </Group>

          {/* Quick Alphabet A-Z Bar */}
          <Divider my={2} />
          <Group gap={4} justify="center" wrap="wrap">
            <Button
              size="compact-xs"
              variant={selectedLetter === 'all' ? 'filled' : 'subtle'}
              color={selectedLetter === 'all' ? 'blue' : 'gray'}
              onClick={() => setSelectedLetter('all')}
            >
              ALL
            </Button>
            {ALPHABET.map((char) => (
              <Button
                key={char}
                size="compact-xs"
                variant={selectedLetter === char ? 'filled' : 'subtle'}
                color={selectedLetter === char ? 'blue' : 'gray'}
                onClick={() => setSelectedLetter((prev) => (prev === char ? 'all' : char))}
              >
                {char}
              </Button>
            ))}
          </Group>
        </Stack>
      </Paper>

      {/* Filter and Search Controls */}
      <Paper p="md" withBorder radius="md" mb="md" bg="var(--mantine-color-dark-8)">
        <Stack gap="sm">
          <Group align="flex-end" grow wrap="wrap">
            <TextInput
              style={{ flex: 2, minWidth: 220 }}
              label="Search Words or Definitions (Alphabetical A-Z)"
              placeholder="Type word, meaning, or root..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
            />

            <Select
              style={{ flex: 1, minWidth: 140 }}
              label="Difficulty Tier"
              value={selectedDifficulty}
              onChange={(val) => setSelectedDifficulty(val || 'all')}
              data={[
                { value: 'all', label: 'All Difficulties' },
                { value: 'basic', label: 'Basic (d ≤ 0.40)' },
                { value: 'intermediate', label: 'Intermediate (0.40 < d ≤ 0.65)' },
                { value: 'advanced', label: 'Advanced (d > 0.65)' },
              ]}
            />

            <Select
              style={{ flex: 1, minWidth: 140 }}
              label="Part of Speech"
              value={selectedPos}
              onChange={(val) => setSelectedPos(val || 'all')}
              data={[
                { value: 'all', label: 'All Parts of Speech' },
                ...availablePosList.map((p) => ({ value: p, label: p })),
              ]}
            />

            <Button
              variant={multilingualOnly ? 'filled' : 'outline'}
              color="violet"
              leftSection={<IconLanguage size={16} />}
              onClick={() => setMultilingualOnly((prev) => !prev)}
              style={{ alignSelf: 'flex-end' }}
            >
              {multilingualOnly ? 'Shared Words ✓' : 'Shared in Other Langs'}
            </Button>
          </Group>

          <Group justify="space-between" align="center">
            <Text size="xs" c="dimmed">
              Showing <strong>{filteredWords.length.toLocaleString()}</strong> of{' '}
              <strong>{activeDict ? Object.keys(activeDict).length.toLocaleString() : 0}</strong>{' '}
              entries in <strong>{getLanguageMeta(activeLang).name}</strong> (Sorted Alphabetically
              A-Z)
            </Text>

            {(searchQuery ||
              selectedLetter !== 'all' ||
              selectedDifficulty !== 'all' ||
              selectedPos !== 'all' ||
              multilingualOnly) && (
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconX size={14} />}
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLetter('all');
                  setSelectedDifficulty('all');
                  setSelectedPos('all');
                  setMultilingualOnly(false);
                }}
              >
                Clear all filters
              </Button>
            )}
          </Group>
        </Stack>
      </Paper>

      {/* Word Cards Grid */}
      {paginatedWords.length === 0 ? (
        <Paper p="xl" withBorder radius="md" bg="var(--mantine-color-dark-8)">
          <Center>
            <Stack align="center" gap="xs">
              <Text size="md" fw={600} c="dimmed">
                No entries match your search criteria.
              </Text>
              <Text size="xs" c="dimmed">
                Try clearing filters or selecting another letter.
              </Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <Stack gap="xs">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {paginatedWords.map((item) => {
              const otherPresence: LanguageKey[] = (['en', 'es', 'fr'] as LanguageKey[]).filter(
                (l) => l !== activeLang && Boolean(dictionaries[l]?.[item.key])
              );
              const diffBadge = getDifficultyBadge(item.d);

              return (
                <Card
                  key={item.key}
                  withBorder
                  p="sm"
                  radius="md"
                  bg="var(--mantine-color-dark-8)"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack gap={4}>
                    <Group justify="space-between" align="center">
                      <Group gap={8} align="center">
                        <Text size="md" fw={700} c="blue.3">
                          {item.display || item.key}
                        </Text>
                        <Badge size="xs" variant="light" color="gray">
                          {item.pos}
                        </Badge>
                        <Badge size="xs" color={diffBadge.color} variant="filled">
                          {diffBadge.label}
                        </Badge>
                      </Group>

                      {otherPresence.length > 0 && (
                        <Group gap={4}>
                          {otherPresence.map((lang) => (
                            <Tooltip
                              key={lang}
                              label={`Also in ${getLanguageMeta(lang).name}: "${dictionaries[lang]![item.key].def}"`}
                            >
                              <Badge size="xs" color="violet" variant="outline">
                                {getLanguageMeta(lang).flag} {lang.toUpperCase()}
                              </Badge>
                            </Tooltip>
                          ))}
                        </Group>
                      )}
                    </Group>

                    <Text size="sm" c="gray.2" style={{ lineHeight: 1.4 }}>
                      • {formatDefinition(item.def)}
                    </Text>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Center mt="md">
              <Pagination
                total={totalPages}
                value={page}
                onChange={setPage}
                color="blue"
                size="sm"
              />
            </Center>
          )}
        </Stack>
      )}
    </Container>
  );
};
