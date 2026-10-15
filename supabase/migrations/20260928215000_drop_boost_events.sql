-- boost_events was created as a per-boost receipt book to feed the w48/w72 inputs of the
-- multi-signal quest_level overload. The old follow-based boost path wrote to it; the
-- boost_clock RPC that replaced it never did, so it has been frozen since. The quest ladder
-- is count-driven, so it serves no purpose. Dropping the table takes its two indexes, its
-- foreign keys and its identity sequence with it.
--
-- For the record: the one historical row it held was a visitor boost, not an owner claim, so
-- nothing is lost that clocks.boost_count / owner_boost_count do not already carry.

DROP TABLE IF EXISTS "public"."boost_events";
