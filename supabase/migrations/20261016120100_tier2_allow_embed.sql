-- Tier 2 cleanup.
--
-- 1. clocks.allow_embed is always true: it defaults true, no UI or code ever writes it, and the
--    embed route already gates drafts on status = 'live' before it looks at this flag. The
--    "owner disabled embedding" branch was therefore dead code. Dropping the column does NOT make
--    drafts embeddable — the status gate still stands.
-- 2. FORCE ROW LEVEL SECURITY was set on the hydration table only. It makes RLS apply to the table
--    owner too, which breaks the service-role account cleanup (deleteAccount). Plain RLS stays.
--    This is the only FORCE in the schema.

alter table public.clocks drop column if exists "allow_embed";

alter table public.follows no force row level security;
