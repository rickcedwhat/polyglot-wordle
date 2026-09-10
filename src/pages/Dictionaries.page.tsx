import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  IconArrowLeft,
  IconBooks,
  IconCheck,
  IconCode,
  IconCopy,
  IconFlag,
  IconFlagFilled,
  IconLanguage,
  IconMessageDots,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  Pagination,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useClipboard, useDisclosure } from '@mantine/hooks';
import { useFlaggedWords } from '@/hooks/useFlaggedWords';
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
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);

  const {
    flaggedWords,
    isFlagged,
    toggleFlag,
    updateNote,
    clearAllFlagged,
    generateMarkdownSummary,
  } = useFlaggedWords();

  const clipboard = useClipboard({ timeout: 2500 });

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
  }, [
    activeLang,
    searchQuery,
    selectedLetter,
    selectedDifficulty,
    selectedPos,
    multilingualOnly,
    flaggedOnly,
  ]);

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

        // Flagged only filter
        if (flaggedOnly && !isFlagged(activeLang, wordKey)) {
          return false;
        }

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
    flaggedOnly,
    activeLang,
    dictionaries,
    isFlagged,
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

  const flaggedCountForActiveLang = flaggedWords.filter((w) => w.lang === activeLang).length;

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
            <Button
              variant={flaggedWords.length > 0 ? 'filled' : 'light'}
              color="red"
              size="xs"
              leftSection={<IconFlag size={14} />}
              onClick={openModal}
            >
              Flagged Words ({flaggedWords.length})
            </Button>
            {flaggedWords.length > 0 && (
              <Button
                variant="light"
                color={clipboard.copied ? 'teal' : 'violet'}
                size="xs"
                leftSection={clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                onClick={() => clipboard.copy(generateMarkdownSummary())}
              >
                {clipboard.copied ? 'Copied for Chat!' : 'Copy Flagged for AI'}
              </Button>
            )}
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

            <Button
              variant={flaggedOnly ? 'filled' : 'outline'}
              color="red"
              leftSection={flaggedOnly ? <IconFlagFilled size={16} /> : <IconFlag size={16} />}
              onClick={() => setFlaggedOnly((prev) => !prev)}
              style={{ alignSelf: 'flex-end' }}
            >
              {flaggedOnly ? `Flagged Only (${flaggedCountForActiveLang}) ✓` : `Flagged Only (${flaggedCountForActiveLang})`}
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
              multilingualOnly ||
              flaggedOnly) && (
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
                  setFlaggedOnly(false);
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
              const flagged = isFlagged(activeLang, item.key);
              const flaggedItem = flaggedWords.find((w) => w.id === `${activeLang}:${item.key.toLowerCase()}`);

              return (
                <Card
                  key={item.key}
                  withBorder
                  p="sm"
                  radius="md"
                  bg={flagged ? 'var(--mantine-color-red-9)' : 'var(--mantine-color-dark-8)'}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderColor: flagged ? 'var(--mantine-color-red-6)' : undefined,
                    transition: 'all 0.15s ease',
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

                      <Group gap={6}>
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

                        <Tooltip label={flagged ? 'Unflag word' : 'Flag word for discussion'}>
                          <ActionIcon
                            variant={flagged ? 'filled' : 'light'}
                            color="red"
                            size="sm"
                            onClick={() =>
                              toggleFlag({
                                lang: activeLang,
                                wordKey: item.key,
                                display: item.display || item.key,
                                pos: item.pos,
                                d: item.d,
                                def: item.def,
                              })
                            }
                          >
                            {flagged ? <IconFlagFilled size={14} /> : <IconFlag size={14} />}
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>

                    <Text size="sm" c="gray.2" style={{ lineHeight: 1.4 }}>
                      • {formatDefinition(item.def)}
                    </Text>

                    {flagged && (
                      <Stack gap={4} mt="xs">
                        <TextInput
                          size="xs"
                          placeholder="Add discussion note (e.g., definition unclear, wrong difficulty)..."
                          leftSection={<IconMessageDots size={14} />}
                          value={flaggedItem?.note || ''}
                          onChange={(e) => updateNote(activeLang, item.key, e.currentTarget.value)}
                        />
                      </Stack>
                    )}
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

      {/* Flagged Words Discussion Modal */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={
          <Group gap="xs">
            <ThemeIcon color="red" variant="light" radius="xl" size="sm">
              <IconFlagFilled size={14} />
            </ThemeIcon>
            <Text fw={700} size="md">
              Flagged Words for Discussion ({flaggedWords.length})
            </Text>
          </Group>
        }
        size="lg"
      >
        <Stack gap="md">
          <Text size="xs" c="dimmed">
            Here are all the words you flagged across all dictionaries. You can edit notes for each
            word, unflag them, or copy the formatted summary to paste into chat with your AI assistant.
          </Text>

          {flaggedWords.length === 0 ? (
            <Paper p="lg" withBorder radius="md" bg="var(--mantine-color-dark-8)">
              <Center>
                <Text size="sm" c="dimmed">
                  No words flagged yet! Click the flag icon on any word card to add it here.
                </Text>
              </Center>
            </Paper>
          ) : (
            <Stack gap="sm" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {flaggedWords.map((item) => {
                const flagEmoji = item.lang === 'en' ? '🇬🇧' : item.lang === 'es' ? '🇪🇸' : '🇫🇷';
                return (
                  <Paper key={item.id} p="xs" withBorder radius="md" bg="var(--mantine-color-dark-8)">
                    <Stack gap={4}>
                      <Group justify="space-between" align="center">
                        <Group gap={6}>
                          <Text size="sm" fw={700} c="blue.3">
                            {item.display || item.wordKey}
                          </Text>
                          <Badge size="xs" color="gray" variant="light">
                            {flagEmoji} {item.lang.toUpperCase()}
                          </Badge>
                          {item.pos && (
                            <Badge size="xs" color="dark" variant="filled">
                              {item.pos}
                            </Badge>
                          )}
                          {item.d !== undefined && (
                            <Badge size="xs" color="teal" variant="outline">
                              d: {item.d}
                            </Badge>
                          )}
                        </Group>
                        <ActionIcon
                          size="xs"
                          color="red"
                          variant="subtle"
                          onClick={() =>
                            toggleFlag({
                              lang: item.lang,
                              wordKey: item.wordKey,
                            })
                          }
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                      {item.def && (
                        <Text size="xs" c="gray.3">
                          • {formatDefinition(item.def)}
                        </Text>
                      )}
                      <TextInput
                        size="xs"
                        placeholder="Discussion note (optional)..."
                        value={item.note || ''}
                        onChange={(e) => updateNote(item.lang, item.wordKey, e.currentTarget.value)}
                      />
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}

          <Divider />

          <Group justify="space-between" align="center">
            {flaggedWords.length > 0 ? (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconTrash size={14} />}
                onClick={clearAllFlagged}
              >
                Clear All Flagged
              </Button>
            ) : <div />}

            <Group gap="xs">
              <Button variant="default" size="xs" onClick={closeModal}>
                Close
              </Button>
              {flaggedWords.length > 0 && (
                <Button
                  color={clipboard.copied ? 'teal' : 'violet'}
                  size="xs"
                  leftSection={clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  onClick={() => clipboard.copy(generateMarkdownSummary())}
                >
                  {clipboard.copied ? 'Copied to Clipboard!' : 'Copy Summary for AI Chat'}
                </Button>
              )}
            </Group>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};
