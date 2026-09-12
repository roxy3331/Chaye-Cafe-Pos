// Token-based fuzzy search — separator/hyphen/bracket agnostic, word-order agnostic.
// "coca cola" matches "Coca-Cola 300ml", "300 cola" matches it too, "coc" matches "coca".

const normalize = (s: string): string =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ') // non-alphanumeric (incl. hyphens/brackets) → space
    .replace(/\s+/g, ' ')
    .trim();

export const normalizeText = normalize;

// True when EVERY word of the query appears somewhere in the text.
export const fuzzyMatch = (query: string, text: string): boolean => {
  const qTokens = normalize(query).split(' ').filter(Boolean);
  if (qTokens.length === 0) return false;
  const t = normalize(text);
  if (!t) return false;
  return qTokens.every(q => t.includes(q));
};

// Rank: 0 = exact (normalized), 1 = starts-with, 2 = contiguous substring, 3 = fuzzy token match, -1 = no match
export const searchRank = (query: string, text: string): number => {
  const q = normalize(query);
  const t = normalize(text);
  if (!q || !t) return -1;
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;
  if (fuzzyMatch(query, text)) return 3;
  return -1;
};

// Ranked + limited search over a list. getText extracts the searchable string per item.
export const searchList = <T,>(query: string, items: T[], getText: (item: T) => string, limit = 8): T[] =>
  items
    .map(item => ({ item, rank: searchRank(query, getText(item)) }))
    .filter(r => r.rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(r => r.item);
