"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AtSign, ChevronDown, X } from "lucide-react";
import Navbar from "./Navbar";
import ClockCard from "./ClockCard";
import EmptyState from "./EmptyState";
import EmailConfirmBanner from "./EmailConfirmBanner";

const HANDLE_NUDGE_KEY = "camelClock.handleNudgeDismissed";

function isExpired(clock, now) {
    return clock.status !== "draft" && new Date(clock.target_at) <= now;
}

function getStats(clocks) {
    const now = new Date();
    let drafts = 0;
    let live = 0;
    let expired = 0;
    for (const clock of clocks) {
        if (clock.status === "draft") drafts++;
        else if (isExpired(clock, now)) expired++;
        else live++;
    }
    return { total: clocks.length, drafts, live, expired };
}

export default function DashboardView({ clocks, hydratedClocks = [], emailConfirmed = true, userEmail = "", hasHandle = true }) {
    const router = useRouter();
    const [upcomingOpen, setUpcomingOpen] = useState(true);
    const [expiredOpen, setExpiredOpen] = useState(true);
    const [nudgeDismissed, setNudgeDismissed] = useState(false);
    const { total, drafts, live, expired } = getStats(clocks);

    const showHandleNudge = !hasHandle && !nudgeDismissed;

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        try {
            if (localStorage.getItem(HANDLE_NUDGE_KEY) === "1") setNudgeDismissed(true);
        } catch {
            // ignore
        }
    }, []);
    /* eslint-enable react-hooks/set-state-in-effect */

    const dismissHandleNudge = () => {
        setNudgeDismissed(true);
        try {
            localStorage.setItem(HANDLE_NUDGE_KEY, "1");
        } catch {
            // A failed write just means the nudge shows again next time.
        }
    };

    const ownIds = new Set(clocks.map((c) => c.id));
    const hydratedIds = new Set(hydratedClocks.map((c) => c.id));
    const allClocks = [...clocks, ...hydratedClocks.filter((c) => !ownIds.has(c.id))];

    const now = new Date();
    const byDate = (a, b) => new Date(a.target_at) - new Date(b.target_at);
    const upcoming = allClocks.filter((c) => !isExpired(c, now)).sort(byDate);
    const expiredClocks = allClocks.filter((c) => isExpired(c, now)).sort(byDate);

    return (
        <main className="dashboard">
            <Navbar />

            {!emailConfirmed && <EmailConfirmBanner email={userEmail} />}

            {showHandleNudge && (
                <div className="handle-nudge nbtc" role="status">
                    <AtSign className="handle-nudge-icon" aria-hidden="true" />
                    <div className="handle-nudge-body">
                        <span className="handle-nudge-title">PICK A HANDLE</span>
                        <span className="handle-nudge-copy">
                            Show a @name on hydration leaderboards. Optional — set it whenever you like.
                        </span>
                    </div>
                    <Link href="/settings" className="handle-nudge-cta nbtc">SET HANDLE</Link>
                    <button
                        type="button"
                        className="handle-nudge-dismiss"
                        onClick={dismissHandleNudge}
                        title="Dismiss"
                        aria-label="Dismiss this suggestion"
                    >
                        <X size={16} strokeWidth={3} aria-hidden="true" />
                    </button>
                </div>
            )}

            <div className="stats-row">
                <div className="stat-card nbtc stat-total">
                    <span className="stat-value stat-value-total">{total}</span>
                    <span className="stat-label">TOTAL</span>
                </div>
                <div className="stat-card nbtc stat-live">
                    <span className="stat-value stat-value-live">{live}</span>
                    <span className="stat-label">LIVE</span>
                </div>
                <div className="stat-card nbtc stat-drafts">
                    <span className="stat-value stat-value-drafts">{drafts}</span>
                    <span className="stat-label">DRAFTS</span>
                </div>
                <div className="stat-card nbtc stat-hydrated">
                    <span className="stat-value stat-value-hydrated">{hydratedClocks.filter((c) => !ownIds.has(c.id)).length}</span>
                    <span className="stat-label">SUPPORTED</span>
                </div>
                <div className="stat-card nbtc stat-expired">
                    <span className="stat-value stat-value-expired">{expired}</span>
                    <span className="stat-label">EXPIRED</span>
                </div>
            </div>

            {total === 0 && hydratedClocks.length === 0 ? (
                <EmptyState />
            ) : (
                <>
                    <div>
                        <button
                            className="section-dropdown"
                            type="button"
                            onClick={() => setUpcomingOpen(!upcomingOpen)}
                        >
                            UPCOMING
                            <ChevronDown
                                className={`section-arrow${upcomingOpen ? " section-arrow-open" : ""}`}
                                strokeWidth={3}
                                aria-hidden="true"
                            />
                        </button>
                        {upcomingOpen && (
                            upcoming.length > 0 ? (
                                <div className="clocks-grid">
                                    {upcoming.map((clock) => (
                                        <ClockCard
                                            key={clock.id}
                                            clock={clock}
                                            owned={ownIds.has(clock.id)}
                                            hydrated={hydratedIds.has(clock.id)}
                                            onDeleted={() => router.refresh()}
                                        />
                                    ))}
                                    <Link href="/new" className="clock-card new-clock-placeholder nbtc">
                                        <span className="new-clock-icon">+</span>
                                        <span className="new-clock-text">NEW CLOCK</span>
                                    </Link>
                                </div>
                            ) : (
                                <p className="section-empty-note">No upcoming clocks yet.</p>
                            )
                        )}
                    </div>

                    <div>
                        <button
                            className="section-dropdown"
                            type="button"
                            onClick={() => setExpiredOpen(!expiredOpen)}
                        >
                            EXPIRED
                            <ChevronDown
                                className={`section-arrow${expiredOpen ? " section-arrow-open" : ""}`}
                                strokeWidth={3}
                                aria-hidden="true"
                            />
                        </button>
                        {expiredOpen && (
                            expiredClocks.length > 0 ? (
                                <div className="clocks-grid">
                                    {expiredClocks.map((clock) => (
                                        <ClockCard
                                            key={clock.id}
                                            clock={clock}
                                            owned={ownIds.has(clock.id)}
                                            hydrated={hydratedIds.has(clock.id)}
                                            onDeleted={() => router.refresh()}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="section-empty-note">No expired clocks yet.</p>
                            )
                        )}
                    </div>
                </>
            )}
        </main>
    );
}
