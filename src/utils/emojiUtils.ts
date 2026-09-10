/**
 * Utility functions for validating and extracting single emoji graphemes.
 */

export const extractSingleEmoji = (input: string): string | null => {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Split string into Unicode grapheme clusters
  let clusters: string[] = [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    clusters = Array.from(segmenter.segment(trimmed), (s) => s.segment);
  } else {
    // Basic fallback grapheme cluster splitting
    clusters = Array.from(trimmed);
  }

  // Regex matching valid emoji graphemes:
  // - Regional Indicator Symbol pairs (Country flags: 🇬🇧, 🇪🇸, 🇲🇽)
  // - Emoji Tag Sequences (Subdivision flags: 🏴󠁧󠁢󠁥󠁮󠁧󠁿)
  // - Extended Pictographic / Emoji Presentation / Miscellaneous Symbols
  const emojiRegex =
    /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u{1F1E6}-\u{1F1FF}]{2}|\u{1F3F4}[\u{E0020}-\u{E007E}]+\u{E007F}|[\u{2600}-\u{27BF}]\u{FE0F}?)$/u;

  // Filter clusters that match the emoji regex
  const emojiClusters = clusters.filter((c) => emojiRegex.test(c));

  if (emojiClusters.length > 0) {
    // Return the last entered valid emoji cluster
    return emojiClusters[emojiClusters.length - 1];
  }

  return null;
};

export const isValidEmoji = (input: string): boolean => {
  if (!input) {
    return false;
  }
  return extractSingleEmoji(input) !== null;
};
