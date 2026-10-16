-- Tier 4: drop two indexes that are fully covered by another index.
--
-- idx_clocks_user_id duplicates clocks_user_id_idx exactly (both USING btree (user_id)); keep the
-- conventionally named one.
-- clock_polls_clock_idx (clock_id) is a prefix of the unique constraint index
-- clock_polls_clock_level_key (clock_id, level), so lookups by clock_id use the latter.

drop index if exists public.idx_clocks_user_id;

drop index if exists public.clock_polls_clock_idx;
