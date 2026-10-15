-- The showcase flag is set directly in the database now, so the admin-facing
-- toggle RPC has no caller. reorder_showcases stays: the admin page still orders.
drop function if exists public.set_clock_showcase(uuid, boolean, integer);
