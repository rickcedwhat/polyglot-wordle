# Mixed activity feed

Every entry uses the same bordered card. Certification cards have a subtle accent; routine games and milestone updates stay compact. A player’s games from the same local calendar day become one summary across all loaded pages. Expanding the summary shows compact game rows; expanding a row mounts the existing game card with its played/not-played actions and spoiler treatment.

The summary count is the number of games loaded so far. Load more can extend a day's group. A lone standout game is reachable through its milestone card instead of appearing twice as an ordinary game. Multiple-game summaries contain the day's loaded games, including games that also earned milestones.

## Data

- Existing completed game documents remain the game feed source. New completions save an `activity` snapshot: earned feats, first-game status, personal-best status, and a newly reached best streak at 3, 7, 14, 30, 60, or 100 wins.
- Completion retries do not update stats or republish milestones for an already-finished game.
- A new `activityEvents` document records a certification once, using an ID containing player, language, and tier. Its fields are player ID, language, tier index, threshold word count, and server timestamp. It is written in the transaction that crosses the vocabulary threshold. Existing history is not backfilled with invented dates.
- Malformed stored vocabulary is cleaned in a separate transaction before publishing a threshold crossing, so the client and rules count the same stored map. If a certification operation is permission-denied, the word is retried without the event; vocabulary progress takes priority over the feed announcement. Map writes replace the complete `words` field so removed invalid records do not survive a recursive merge.
- The timeline merges completed games and certifications using separate cursors and buffers. Buffered records are consumed before older records can be emitted, keeping Load more chronological.
- A new `reactions` document identifies a source game/certification, milestone kind, owner, reacting player, one of five fixed emoji IDs, and server timestamp. The document ID is deterministic per target/player/emoji. Writes set a desired selected state, so retrying does not toggle twice. Different milestones on one game and reactions on that game have distinct targets. Aggregated summaries have no separate reactions.

## Access rules

The user approved this scope for the PR. Rules apply through the normal deployment after merge.

- Only signed-in players can read activity events and reaction records. This is the same audience as the existing public game/profile feed. No emails, private challenge participants/results, or raw vocabulary words are added to these collections.
- A player can create only their own certification event, with a deterministic ID, a supported language/tier, a server timestamp, and a threshold crossed by their vocabulary transaction. Clients cannot update or delete those events.
- A player can create only their own reaction, with one of the fixed emoji IDs, a matching existing finished game/certification and owner, a deterministic target/player/emoji ID, and a server timestamp. Clients cannot update reactions. Only the reacting player can delete their reaction.
- This feature needs no new composite indexes. Certification events sort by one timestamp; reactions query a single target key. The existing completed-games index is reused.

Creating this branch or PR does not grant live access. Run `npm run test:rules` with Java 21 installed to verify the policy in the local Firestore emulator; PR CI runs the same checks against the demo-only project.

## Incoming reaction notifications

The app uses one authenticated pair of Firestore listeners for incoming reactions and private read receipts. The incoming query uses `ownerId` and `createdAt desc` (with the checked-in composite index) and is bounded to the latest 100 reaction documents. Self-reactions are omitted, and the remaining documents are grouped by exact activity target. The inbox initially shows 20 groups and offers more; its badge counts unread groups across the loaded window, not individual emoji. This is a recent-activity inbox, not a permanent notification archive. Removed reactions disappear; re-adding one with a newer timestamp makes the activity unread again.

Read markers live at `users/{uid}/reactionReceipts/{targetKey}` and store the latest reaction timestamp actually read. They are owner-only, monotonic, and use timestamp precision, so a slow tab cannot clear a newer reaction. Mark all read captures only the current loaded items, and later arrivals remain unread. Failed writes show a retryable error and do not clear the badge.

Notification links use `/feed?activity={targetKey}` and fetch the exact saved game or certification independently of feed pagination. Game details still use the existing spoiler-aware timeline. Missing or invalid targets show an unavailable message.

Toasts are limited to an actively playing own game session. Initial data, offline/reconnection snapshots, read-marker changes, and arrivals outside gameplay do not replay. One grouped toast is shown per incoming snapshot and it is dismissed when gameplay ends. The inbox remains available on every signed-in page.

Storybook covers the inbox, empty state and gameplay toast with local-only fixture data. The old Mantine starter Welcome story was removed; the shipped navigation story is named Navigation/Sidebar.
