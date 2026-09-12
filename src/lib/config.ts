// ─── Owner identity (single source of truth) ───
// Owner role comes ONLY from this UID list — the Firestore `users` collection
// can never grant owner (rules: employee-only create, updates blocked).
// This list MUST stay in sync with isOwner() in firestore.rules.
//
// If the owner signs in from a fresh device/browser (anonymous auth makes a new
// UID), add that UID here AND in firestore.rules (Firebase Console → Firestore
// → Rules → Publish). Find UIDs any time with: node scripts/list-owner-uids.mjs
export const OWNER_UIDS: readonly string[] = [
  '08VzTr2zwJWlAghuEzejiG2e2wK2',
  'anUHmDl4YRZ0BqFYmrXHHHg8ivR2',
  'LJp1rwKXtPhk0MZkqwEoJ0dQVyi1',
  'JcGOAkD83RdiolyHo6Gy7fKHSy43',
  'CFBJSGYI7UQ992gzETIFfovE7Bn1',
  'LjFMhn9XJsbI50dRpaKb77p2Je53',
  'YTyahU4VQOg0eJvJPcpYrQ0E3kZ2',
  'mwHWaQeK8WOxCi8lBKsS24QMlk03',
  '9E9aRBR2cxTvHfbn0ilL7qbCZnr1',
  '0IakMuSXBuYxTh4fWIfJdjRtesp1',
  'eu0YiCEw4YR6bZSI1pz7B8iVDhf2',
  '52O4IyAdPnUlwO6et9y5CjVQJMH2',
];

export const isOwnerUid = (uid: string | null | undefined): boolean =>
  !!uid && OWNER_UIDS.includes(uid);
