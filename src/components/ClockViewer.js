"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Pencil, Rocket, Check, Lock, Unlock, HelpCircle, CircleMinus, CirclePlus, Trash2, User, Flame, Users, Sun, Share2, TriangleAlert, ChevronDown } from "lucide-react";
import CamelClock from "./CamelClock";
import ShareDialog from "./ShareDialog";
import ConfirmDialog from "./ConfirmDialog";
import ReportClockDialog from "./ReportClockDialog";
import SocialShareRow from "./SocialShareRow";
import EmbedHelpModal from "./EmbedHelpModal";
import EmbedSiteModal from "./EmbedSiteModal";
import AuthModal from "./auth/AuthModal";
import LoadingSpinner from "./LoadingSpinner";
import { formatClockTime, formatFinishRow } from "@/utils/clockValues";
import { MAX_LIVE_CLOCKS, checkLiveLimit } from "@/utils/liveLimit";
import WaitlistModal from "./WaitlistModal";
import { supabase } from "@/lib/supabase/client";
import { refreshLiveCount } from "@/utils/liveCountEvents";
import useHydrateInteraction from "@/hooks/useHydrate";
import useHydrateStats from "@/hooks/useHydrateStats";
import useClockPoll from "@/hooks/useClockPoll";
import LevelPollBanner from "@/components/LevelPollBanner";
import ClockTour from "@/components/ClockTour";
import { BOOSTS } from "@/utils/grids";
import { boostDefsByCategory, categoryProgress, questState, unlockedBoostIdsFor, computeDropLeft, hydrateNoteText, levelFromCount } from "@/utils/boost";
import { track } from "@/utils/analytics";

const CATEGORY_LABEL = { exercise: "EXERCISE", aura: "AURA", weather: "WEATHER" };

export default function ClockViewer({ clock, isOwner: initialOwner, entitlements = {}, creatorUsername = null, showTour = false }) {
    const router = useRouter();
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://camelclock.com").replace(/\/+$/, "");
    const [isOwner, setIsOwner] = useState(initialOwner);
    const [statusOverride, setStatusOverride] = useState(null);
    const [shareOpen, setShareOpen] = useState(false);
    const [shareMode, setShareMode] = useState("live");
    const [savedOpen, setSavedOpen] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishError, setPublishError] = useState("");
    const [proOpen, setProOpen] = useState(false);
    const [embedHelpOpen, setEmbedHelpOpen] = useState(false);
    const [embedSiteOpen, setEmbedSiteOpen] = useState(false);
    const [rackSelection, setRackSelection] = useState(clock.boosts || []);
    // Every boost the owner has ever had equipped in this session, so removing one keeps its
    // re-add control. The DB only stores the current rack, so a removed pre-vote effect (not a
    // startsUnlocked rung or a poll winner) would otherwise have no record of being owned.
    const [everEquipped, setEverEquipped] = useState(
        () => new Set((clock.boosts || []).map((b) => b.id)),
    );
    const [rackSaving, setRackSaving] = useState(false);
    const [signedIn, setSignedIn] = useState(false);
    const [myUsername, setMyUsername] = useState(null);
    const [capNudge, setCapNudge] = useState(false);
    const [capNotice, setCapNotice] = useState(false);
    const [visitorCapOpen, setVisitorCapOpen] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportAuthOpen, setReportAuthOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [tourOpen, setTourOpen] = useState(showTour);
    const [tourDone, setTourDone] = useState(false);
    // True while the camel is playing an animation the reader caused - the hydration splash or a
    // boost they previewed. The tour steps out of the shot while one plays.
    const [camelAnimating, setCamelAnimating] = useState(false);
    const tourCardRef = useRef(null);
    const tourCamelRef = useRef(null);
    const tourPollRef = useRef(null);
    const tourPanelRef = useRef(null);
    const tourLevelRef = useRef(null);
    const tourTitleRef = useRef(null);
    const tourLevelLabelRef = useRef(null);
    const tourDailyRef = useRef(null);
    const tourTopRef = useRef(null);
    const tourShareRef = useRef(null);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            const u = session?.user ?? null;
            setIsOwner(!!u && u.id === clock.user_id);
            setSignedIn(!!u);
            if (!u) {
                setMyUsername(null);
                return;
            }
            supabase.from("profiles").select("username").eq("id", u.id).maybeSingle().then(({ data }) => {
                setMyUsername(data?.username ?? null);
            });
        });

        return () => subscription.unsubscribe();
    }, [clock.user_id]);

    const status = statusOverride ?? clock.status;
    const target = new Date(clock.target_at);
    const viewerHydrates = clock.viewer_hydrates === true && status === "live";
    const {
        camelRef,
        hydrateCount,
        serverCount,
        level,
        dropLeft,
        beginHydrate,
        applyServer,
        hydrateError,
        hydratePromptOpen,
        setHydratePromptOpen,
    } = useHydrateInteraction(clock, viewerHydrates, {
        isOwner,
        drop: entitlements.drop ?? 0,
        onBlocked: () => {
            if (isOwner) {
                setCapNudge(true);
                setShareOpen(true);
            } else {
                setCapNotice(true);
                setVisitorCapOpen(true);
            }
        },
    });

    const stats = useHydrateStats(
        clock.id,
        serverCount,
        useCallback((data) => {
            applyServer({
                drop: computeDropLeft(data?.drop_day, data?.drop_used),
            });
        }, [applyServer]),
    );

    const { polls, now: pollNow, vote: castVote, reload: reloadPolls } = useClockPoll(clock.id, viewerHydrates, {
        onResolve: () => router.refresh(),
    });

    // A level-up opens the poll server-side in the same transaction as the hydration. That INSERT
    // can be missed on Realtime (clock_polls' RLS reads through clocks), so refetch when the level
    // moves - watching both the confirmed level and the optimistic levelFromCount(hydrateCount).
    // The count can cross the threshold before hydrate_clock's debounce + commit creates the poll,
    // so retry once after that.
    const pollLevel = Math.max(level, levelFromCount(hydrateCount));
    const lastPollLevelRef = useRef(pollLevel);
    useEffect(() => {
        if (pollLevel <= lastPollLevelRef.current) {
            lastPollLevelRef.current = pollLevel;
            return;
        }
        lastPollLevelRef.current = pollLevel;
        reloadPolls();
        const id = setTimeout(() => reloadPolls(), 1500);
        return () => clearTimeout(id);
    }, [pollLevel, reloadPolls]);

    // The tour tells the owner they can hydrate by clicking the camel too. The camel and the rail
    // button both call beginHydrate, so wrap the camel's handler to record that this path was used.
    // Both wrappers clear any previous cap notice: beginHydrate re-sets it if the pool is still dry.
    const hydrateFromCamel = useCallback(() => {
        setCapNotice(false);
        beginHydrate();
    }, [beginHydrate]);

    const handleHydrate = useCallback(() => {
        setCapNotice(false);
        beginHydrate();
    }, [beginHydrate]);

    // Publishing writes status directly through the checkLiveLimit() gate - no go-live modal in
    // between. On success the simplified "YOUR CLOCK IS LIVE" dialog opens so the owner can share
    // or embed; on the cap it opens the waitlist modal instead.
    const publishClock = async () => {
        if (publishing) return;
        setPublishError("");
        setPublishing(true);
        const check = await checkLiveLimit();
        if (!check.ok) {
            setPublishing(false);
            if (check.reason === "limit") {
                setProOpen(true);
            } else {
                setPublishError(check.error);
            }
            return;
        }
        const { error } = await supabase
            .from("clocks")
            .update({ status: "live" })
            .eq("id", clock.id);
        setPublishing(false);
        if (error) {
            console.error("Failed to publish:", error.message);
            setPublishError("Failed to publish. Please try again.");
            return;
        }
        refreshLiveCount();
        setStatusOverride("live");
        setCapNudge(false);
        // Publishing is the one moment the welcome belongs to: the share dialog opens in its
        // welcome mode, and the tour starts from there (START TUTORIAL) or on dismissal.
        setShareMode("welcome");
        setShareOpen(true);
        track("clock_published", { source: "viewer" });
        router.refresh();
    };

    // The wizard lands here with ?created=1 right after saving a draft - that is the only moment
    // the "YOUR CLOCK IS SAVED" confirmation may appear. It shows once, then the query param is
    // stripped so a reload or shared link doesn't re-open it.
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const justCreatedRef = useRef(true);
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!justCreatedRef.current) return;
        justCreatedRef.current = false;
        if (searchParams.get("created") === "1" && isOwner) {
            setSavedOpen(true);
            router.replace(pathname, { scroll: false });
        }
    }, [pathname, router, searchParams, isOwner]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Finishing or skipping the tour marks THIS clock toured via the definer RPC; the tour closes
    // immediately and the server write is best-effort. Other clocks keep their own tour.
    const finishTour = useCallback(() => {
        setTourOpen(false);
        setTourDone(true);
        supabase.rpc("complete_tutorial", { p_clock_id: clock.id }).then(({ error }) => {
            if (error) console.error("complete_tutorial failed:", error.message);
        });
    }, [clock.id]);

    // The tour opens by itself once the clock has been published, and again when the level-2 poll
    // lands - the poll is what the boost rungs explain, so it is the moment the tour is worth
    // resuming for. Edge triggered on the tutorial poll appearing so it can't reopen every render.
    const hadTutorialPollRef = useRef(false);
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        const hasTutorialPoll = polls.some((p) => p.tutorial);
        const had = hadTutorialPollRef.current;
        hadTutorialPollRef.current = hasTutorialPoll;
        if (!hasTutorialPoll || had) return;
        if (!isOwner || status !== "live" || tourDone) return;
        if (clock.tutorial_completed === true) return;
        setTourOpen(true);
    }, [polls, isOwner, status, tourDone, clock.tutorial_completed]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleDelete = async () => {
        setDeleteError("");
        setDeleting(true);
        const { error } = await supabase.from("clocks").delete().eq("id", clock.id);
        setDeleting(false);

        if (error) {
            console.error("Error deleting clock:", error);
            setDeleteError("Failed to delete. Please try again.");
            return;
        }
        setConfirmDeleteOpen(false);
        refreshLiveCount();
        router.push("/dashboard");
    };

    const previewRackBoost = useCallback((id) => {
        camelRef.current?.triggerNow(id);
    }, [camelRef]);

    const stopPreviewBoost = useCallback((id) => {
        camelRef.current?.stopNow(id);
    }, [camelRef]);

    const rackIdsRef = useRef(null);
    useEffect(() => {
        const next = new Set(rackSelection.map((b) => b.id));
        const prev = rackIdsRef.current;
        rackIdsRef.current = next;
        if (!prev) return;
        const added = [...next].find((id) => !prev.has(id));
        if (added) previewRackBoost(added);
    }, [rackSelection, previewRackBoost]);

    const quest = questState({
        count: hydrateCount,
        floorLevel: level,
    });
    const revealed = unlockedBoostIdsFor(clock.boost_order, quest.level);
    const rackIds = rackSelection.map((b) => b.id);
    const wonIds = new Set(polls.map((p) => p.winner).filter(Boolean));
    // Strict: a revealed effect is only equippable once the community has voted it in (winner), or
    // it is the always-free rung, or the owner has equipped it at some point (so a deliberate
    // removal can always be undone). An id already in the rack stays equippable so it can be
    // removed. Everything else renders locked, so holding a rack on a not-yet-won id can't render it.
    const equippable = new Set(
        [...revealed].filter(
            (id) => BOOSTS[id]?.startsUnlocked || wonIds.has(id) || everEquipped.has(id),
        ),
    );
    const activeBoosts = rackSelection.filter((b) => equippable.has(b.id));
    const categoryRows = categoryProgress(clock.boost_order, quest.level, equippable);
    const defsByCategory = boostDefsByCategory();

    // A visitor draws on the same shared daily pool, so their claim note is always informative. An
    // owner's is suppressed below L2, where their own hydrations are free - "no claimable" would be
    // misleading during the tutorial.
    const note = viewerHydrates && (isOwner ? (dropLeft > 0 || quest.level >= 2) : true)
        ? hydrateNoteText({ dropLeft })
        : null;
    const noteTone = dropLeft > 0 ? "claim" : "grow";
    const NoteIcon = dropLeft > 0 ? Sun : Share2;

    // Exactly one rack write in flight: the whole jsonb column is overwritten, so two overlapping
    // requests could land out of order and drop the newer selection.
    const rackPendingRef = useRef(false);

    // A won poll is merged into clocks.boosts server-side; router.refresh() re-fetches the clock,
    // so fold the fresh rack back in. Skipped while a write is in flight so an in-flight save (and
    // its optimistic value) can't be overwritten by a stale refresh.
    useEffect(() => {
        if (rackPendingRef.current) return;
        setRackSelection(clock.boosts || []);
    }, [clock.boosts]);

    const toggleRack = async (id) => {
        const def = BOOSTS[id];
        if (!def || !equippable.has(id) || rackPendingRef.current) return;
        const equipped = rackSelection.some((b) => b.id === id);
        const next = equipped ? rackSelection.filter((b) => b.id !== id) : [...rackSelection, { id }];
        if (!equipped) setEverEquipped((prev) => new Set(prev).add(id));
        rackPendingRef.current = true;
        setRackSaving(true);
        setRackSelection(next);
        const { error } = await supabase
            .from("clocks")
            .update({ boosts: next })
            .eq("id", clock.id);
        rackPendingRef.current = false;
        setRackSaving(false);
        if (error) {
            console.error("Failed to save show:", error.message);
            setRackSelection(clock.boosts || []);
            return;
        }
        router.refresh();
    };

    const openReport = () => {
        if (!signedIn) {
            setReportAuthOpen(true);
            return;
        }
        setReportOpen(true);
    };

    const capSubline = `Share \u201C${clock.title}\u201D so others can hydrate it and it keeps levelling up. You\u2019re out of claimable hydrations for today \u2014 your allowance resets tomorrow.`;

    return (
        <div className="clock-viewer">
            {status === "draft" && isOwner && (
                <>
                    <div className="draft-banner-row">
                        <div className="draft-banner nbtc">
                            <span className="draft-banner-note">
                                This CamelClock is in your Drafts &mdash; only you can see it.
                            </span>
                        </div>
                        <button
                            className="draft-publish-button nbtc"
                            type="button"
                            title="Make this clock publicly visible"
                            onClick={publishClock}
                            disabled={publishing}
                        >
                            {publishing ? <LoadingSpinner size="sm" inline /> : <Rocket className="button-icon" />}
                            {publishing ? "PUBLISHING..." : "PUBLISH"}
                        </button>
                    </div>
                    <details className="draft-explain">
                        <summary className="draft-explain-summary">
                            WHAT HAPPENS WHEN YOU PUBLISH?
                            <ChevronDown size={16} strokeWidth={3} aria-hidden="true" />
                        </summary>
                        <div className="draft-explain-body">
                            <p>
                                Publishing makes your clock <strong>live</strong> so anyone
                                with the link can see it and hydrate it. Live clocks also get
                                their own shareable page and can be embedded on a website or
                                in Notion.
                            </p>
                            <p>
                                You can keep editing a live clock, and unpublish it again
                                from your dashboard whenever you like.
                            </p>
                        </div>
                    </details>
                    {publishError && <p className="card-error">{publishError}</p>}
                </>
            )}

            <div className="viewer-stage">
                {status === "live" && (
                    <div className="viewer-info">
                        <div className="community-inline">
                            <div className="community-counts">
                                <span className="community-stat">
                                    <Flame className="community-count-icon" size={16} aria-hidden="true" />
                                    <span className="community-count-value">{hydrateCount}</span>
                                    <span className="community-count-label">HYDRATIONS</span>
                                </span>
                                <span className="community-stat">
                                    <Users className="community-count-icon" size={16} aria-hidden="true" />
                                    <span className="community-count-value">{stats?.distinct_hydrators ?? "\u2026"}</span>
                                    <span className="community-count-label">HYDRATORS</span>
                                </span>
                            </div>
                            {note && (
                                <p ref={tourDailyRef} className={`community-note community-note-${noteTone}`}>
                                    <NoteIcon className="community-note-icon" size={14} strokeWidth={3} aria-hidden="true" />
                                    <span className="community-note-text">{note}</span>
                                </p>
                            )}
                            <div className="community-top" ref={tourTopRef}>
                                <span className="community-detail-label">TOP HYDRATORS</span>
                                {!stats ? (
                                    <span className="viewer-stats-empty">Loading...</span>
                                ) : stats.top?.length ? (
                                    stats.top.map((b, i) => (
                                        <div key={b.username} className="viewer-stats-top-row">
                                            <span className="viewer-stats-rank">{i + 1}</span>
                                            <span className="viewer-stats-top-handle" title={`@${b.username}`}>
                                                {b.is_you ? <span className="viewer-stats-you">YOU</span> : `@${b.username}`}
                                            </span>
                                            <span className="viewer-stats-top-count">×{b.count}</span>
                                        </div>
                                    ))
                                ) : (
                                    <span className="viewer-stats-empty">No hydrators yet.</span>
                                )}
                            </div>
                            {signedIn && !myUsername && (
                                <Link className="viewer-handle-nudge" href="/settings">
                                    SET YOUR HANDLE
                                </Link>
                            )}
                        </div>
                        <SocialShareRow
                            url={`${siteUrl}/clock/${clock.id}`}
                            title={clock.title}
                            targetDate={clock.target_at}
                            showLabel={false}
                            layout="stacked"
                            rootRef={tourShareRef}
                            onNotion={() => setEmbedHelpOpen(true)}
                            onMore={() => setEmbedSiteOpen(true)}
                        />
                        {!isOwner && (
                            <button className="text-link viewer-report-link" type="button" onClick={openReport}>
                                REPORT THIS CLOCK
                            </button>
                        )}
                    </div>
                )}
                <div className="viewer-center">
                    <div className="public-clock-card nbtc" ref={tourCardRef}>
                        {isOwner && (
                            <>
                                <Link href={`/edit/${clock.id}`} className="edit-fab nbtc" title="Edit this clock">
                                    <Pencil className="button-icon" />
                                    EDIT
                                </Link>
                                <button className="clock-delete-fab nbtc" type="button" title="Delete this clock" onClick={() => setConfirmDeleteOpen(true)}>
                                    <Trash2 className="button-icon" />
                                    DELETE
                                </button>
                            </>
                        )}
                        <div className="card-creator">
                            <span className="clock-by-avatar" aria-hidden="true">
                                <User size={16} strokeWidth={3} />
                            </span>
                            <span className="creator-handle">@{creatorUsername ?? "CAMELCLOCK MEMBER"}</span>
                        </div>
                        <CamelClock
                            ref={camelRef}
                            camelArtRef={tourCamelRef}
                            title={clock.title}
                            month={target.getMonth()}
                            day={target.getDate()}
                            time={formatClockTime(target)}
                            targetAt={clock.target_at}
                            introText={clock.intro_text}
                            celebrationMessage={clock.celebration_message}
                            primaryColour={clock.primary_colour}
                            secondaryColour={clock.secondary_colour}
                            celebrationType={clock.celebration_type}
                            wearables={clock.wearables || []}
                            boosts={activeBoosts}
                            showWatermark
                            titleHref={`/clock/${clock.id}`}
                            hydrateCount={hydrateCount}
                            level={level}
                            isOwner={isOwner}
                            dropLeft={dropLeft}
                            hideHydrateNote
                            finishRowText={formatFinishRow(target)}
                            levelBannerRef={tourLevelRef}
                            titleRef={tourTitleRef}
                            levelLabelRef={tourLevelLabelRef}
                            onAnimatingChange={setCamelAnimating}
                            {...(viewerHydrates
                                ? { viewerHydrates: true, onHydrateClick: hydrateFromCamel }
                                : {})}
                        />
                    </div>
                </div>
                <div className="viewer-rail">
                    <div className="clock-post-actions">
                        {viewerHydrates && (
                            <button
                                type="button"
                                className="post-actions-hydrate nbtc"
                                onClick={handleHydrate}
                                title="Hydrate this CamelClock"
                            >
                                <Flame className="button-icon" aria-hidden="true" />
                                <span>HYDRATE</span>
                            </button>
                        )}
                    </div>
                    <div className="viewer-poll">
                        <LevelPollBanner
                            polls={polls}
                            now={pollNow}
                            signedIn={signedIn}
                            onVote={castVote}
                            onPreview={previewRackBoost}
                            onPreviewEnd={stopPreviewBoost}
                            onSignIn={() => setHydratePromptOpen(true)}
                            rootRef={tourPollRef}
                        />
                    </div>
                    {hydrateError && (
                        <p
                            className="hydrate-error"
                            role="alert"
                            title={hydrateError.code ? `hydrate_clock failed: ${hydrateError.code}` : undefined}
                        >
                            <TriangleAlert className="hydrate-error-icon" aria-hidden="true" />
                            <span>COULDN&rsquo;T SAVE THAT HYDRATION &mdash; TRY AGAIN</span>
                        </p>
                    )}
                    {capNotice && (
                        <p className="hydrate-error hydrate-capped" role="status">
                            <TriangleAlert className="hydrate-error-icon" aria-hidden="true" />
                            <span>OUT OF HYDRATIONS TODAY &mdash; COME BACK TOMORROW</span>
                        </p>
                    )}
                    {viewerHydrates && (
                        <div className="level-panel" ref={tourPanelRef}>
                            <span className="boost-panel-title">BOOSTS</span>
                            <div className="boost-list">
                                {categoryRows.map((row) => (
                                    <div key={row.category} className="boost-category">
                                        <div className="boost-category-head">
                                            <span className="boost-category-label">{CATEGORY_LABEL[row.category]}</span>
                                            <span className="boost-category-count">
                                                {row.unlocked}/{row.total}
                                            </span>
                                        </div>
                                        <ul className="boost-list-items">
                                            {(defsByCategory[row.category] ?? []).map((def) => {
                                                const isEquippable = equippable.has(def.id);
                                                const isRevealed = revealed.has(def.id);
                                                const isEquipped = rackIds.includes(def.id);
                                                const isLocked = !isEquipped && !isEquippable;
                                                const isInPoll = !isEquipped && !isLocked && isRevealed;
                                                const isUnlockedAvail = !isEquipped && !isLocked && !isInPoll;

                                                let StatusIcon = null;
                                                if (isInPoll) StatusIcon = HelpCircle;
                                                else if (isLocked) StatusIcon = Lock;
                                                else if (isUnlockedAvail) StatusIcon = Unlock;
                                                else if (isEquipped) StatusIcon = Check;

                                                const title = isEquippable
                                                    ? def.description
                                                    : isRevealed
                                                        ? "Revealed \u2014 waiting on the vote"
                                                        : "Not unlocked yet";

                                                return (
                                                    <li key={def.id} className="boost-list-row">
                                                        <span className="boost-list-icon" aria-hidden="true">
                                                            {StatusIcon && <StatusIcon size={14} />}
                                                        </span>
                                                        <span className="boost-list-name" title={title}>{def.icon} {def.name}</span>
                                                        {isOwner && isEquippable && (
                                                            <button
                                                                type="button"
                                                                className={`boost-list-toggle${isEquipped ? "" : " boost-list-toggle-add"}`}
                                                                title={isEquipped ? "Remove from camel" : "Add to camel"}
                                                                aria-label={isEquipped ? `Remove ${def.name}` : `Add ${def.name}`}
                                                                onClick={() => toggleRack(def.id)}
                                                                disabled={rackSaving}
                                                            >
                                                                {isEquipped ? <CircleMinus size={14} /> : <CirclePlus size={14} />}
                                                            </button>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {tourOpen && isOwner && (
                <ClockTour
                    clockId={clock.id}
                    hydrateCount={hydrateCount}
                    animating={camelAnimating}
                    polls={polls}
                    shareOpen={shareOpen || savedOpen}
                    targets={{
                        card: tourCardRef,
                        camel: tourCamelRef,
                        poll: tourPollRef,
                        panel: tourPanelRef,
                        level: tourLevelRef,
                        title: tourTitleRef,
                        levelLabel: tourLevelLabelRef,
                        daily: tourDailyRef,
                        top: tourTopRef,
                        share: tourShareRef,
                    }}
                    onComplete={finishTour}
                />
            )}

            {shareOpen && (
                <ShareDialog
                    clockId={clock.id}
                    title={clock.title}
                    mode={shareMode}
                    onClose={() => {
                        setShareOpen(false);
                        setCapNudge(false);
                        // Dismissing the post-publish welcome still leads into the tour: the
                        // clock is live and untoured, so the steps are the next thing to show.
                        if (shareMode === "welcome") {
                            setShareMode("live");
                            setTourOpen(true);
                        }
                    }}
                    onTourStart={() => {
                        setShareOpen(false);
                        setShareMode("live");
                        setTourOpen(true);
                    }}
                    onTourSkip={() => {
                        setShareOpen(false);
                        setShareMode("live");
                        finishTour("skipped");
                    }}
                    heading={capNudge ? "SHARE TO KEEP GROWING" : undefined}
                    subline={capNudge ? capSubline : undefined}
                />
            )}

            {savedOpen && (
                <ShareDialog
                    clockId={clock.id}
                    title={clock.title}
                    mode="saved"
                    onClose={() => setSavedOpen(false)}
                />
            )}

            {visitorCapOpen && (
                <ShareDialog
                    clockId={clock.id}
                    title={clock.title}
                    mode="saved"
                    heading="THAT'S TODAY'S HYDRATIONS"
                    subline="You've used your daily hydrations for this CamelClock. Come back tomorrow to keep it climbing."
                    onClose={() => setVisitorCapOpen(false)}
                />
            )}

            {embedHelpOpen && (
                <EmbedHelpModal
                    url={`${siteUrl}/clock/${clock.id}/embed`}
                    onClose={() => setEmbedHelpOpen(false)}
                />
            )}

            {embedSiteOpen && (
                <EmbedSiteModal
                    url={`${siteUrl}/clock/${clock.id}/embed`}
                    title={clock.title}
                    onClose={() => setEmbedSiteOpen(false)}
                />
            )}

            {proOpen && (
                <WaitlistModal
                    heading="YOU'VE HIT THE FREE LIMIT"
                    subline={`Free covers ${MAX_LIVE_CLOCKS} live Camel Clocks. Pro lifts the cap \u2014 join the waitlist for early access.`}
                    onClose={() => setProOpen(false)}
                />
            )}

            {hydratePromptOpen && (
                <AuthModal
                    mode="signup"
                    next={`/clock/${clock.id}`}
                    onClose={() => setHydratePromptOpen(false)}
                    onSuccess={() => setHydratePromptOpen(false)}
                />
            )}

            {reportAuthOpen && (
                <AuthModal
                    mode="login"
                    next={`/clock/${clock.id}`}
                    onClose={() => setReportAuthOpen(false)}
                    onSuccess={() => {
                        setReportAuthOpen(false);
                        setReportOpen(true);
                    }}
                />
            )}

            {reportOpen && (
                <ReportClockDialog
                    clockId={clock.id}
                    clockTitle={clock.title}
                    onClose={() => setReportOpen(false)}
                />
            )}

            {confirmDeleteOpen && (
                <ConfirmDialog
                    message={deleteError || `Delete \u201C${clock.title}\u201D? This cannot be undone.`}
                    onConfirm={deleteError ? () => { setConfirmDeleteOpen(false); setDeleteError(""); } : handleDelete}
                    onCancel={() => { setConfirmDeleteOpen(false); setDeleteError(""); }}
                    confirmLabel="DELETE"
                    danger
                    busy={deleting}
                />
            )}
        </div>
    );
}
