-- Hydration is permanent. The dashboard's UNHYDRATE button (a direct client DELETE of a follows
-- row) is gone, but the RLS policies that permitted it still existed, so a follows row could still
-- be removed through the Data API. Deleting a row reset that user's lifetime self-hydrate cap and
-- dropped them from the clock's hydrator counts, so the write path is closed here too.
--
-- follows stays readable by its owner (the dashboard's SUPPORTED section and per-hydrator counts
-- read it) and stays writable by hydrate_clock() (SECURITY DEFINER, bypasses RLS). deleteAccount
-- uses the service role, which also bypasses RLS, so account cleanup is unaffected. The
-- `Users manage their own follows` FOR ALL policy granted INSERT/UPDATE/DELETE/SELECT as well as
-- follows_insert_own / follows_delete_own, so all three are dropped and the write grants revoked.
-- follows_select_own is left in place.

drop policy if exists "Users manage their own follows" on public.follows;
drop policy if exists "follows_delete_own" on public.follows;
drop policy if exists "follows_insert_own" on public.follows;

revoke insert, update, delete on public.follows from authenticated;
