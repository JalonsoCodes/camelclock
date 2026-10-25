// Presentation mirror of the poll-window rules enforced in SQL. KEEP IN SYNC with
// poll_quorum() / poll_min_open_secs() in supabase/migrations (20261011130000_poll_quorum.sql).
// These are used only for copy and progress meters; the server is the source of truth.
export const POLL_QUORUM = 10;
export const POLL_MIN_OPEN_MS = 30 * 60 * 1000;
export const POLL_WINDOW_MS = 24 * 60 * 60 * 1000;
export const POLL_TUTORIAL_WINDOW_MS = 24 * 60 * 60 * 1000;
export const POLL_TUTORIAL_QUORUM = 2;
export const POLL_TUTORIAL_MIN_OPEN_MS = 0;
