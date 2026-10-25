-- Revert the waitlist interest signal.
--
-- waitlist.feature was added in 20261018120000 to record which Pro feature drove a signup, but it
-- turned out to add no actionable signal (the waitlist has no read path and is a single funnel),
-- so it is dropped and the three entry points no longer send it. waitlist stays INSERT-only for
-- clients — no SELECT policy is added.

alter table public.waitlist
  drop column if exists feature;
