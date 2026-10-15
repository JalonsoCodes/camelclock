"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import Navbar from "./Navbar";
import ClockCard from "./ClockCard";
import EmptyState from "./EmptyState";
import EmailConfirmBanner from "./EmailConfirmBanner";

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

export default function DashboardView({ clocks, followedClocks = [], emailConfirmed = true, userEmail = "" }) {
    const router = useRouter();
    const [upcomingOpen, setUpcomingOpen] = useState(true);
    const [expiredOpen, setExpiredOpen] = useState(true);
    const { total, drafts, live, expired } = getStats(clocks);

    const ownIds = new Set(clocks.map((c) => c.id));
    const followedIds = new Set(followedClocks.map((c) => c.id));
    const allClocks = [...clocks, ...followedClocks.filter((c) => !ownIds.has(c.id))];

    const now = new Date();
    const byDate = (a, b) => new Date(a.target_at) - new Date(b.target_at);
    const upcoming = allClocks.filter((c) => !isExpired(c, now)).sort(byDate);
    const expiredClocks = allClocks.filter((c) => isExpired(c, now)).sort(byDate);

    return (
        <main className="dashboard">
            <Navbar />

            {!emailConfirmed && <EmailConfirmBanner email={userEmail} />}

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
                <div className="stat-card nbtc stat-following">
                    <span className="stat-value stat-value-following">{followedClocks.filter((c) => !ownIds.has(c.id)).length}</span>
                    <span className="stat-label">SUPPORTED</span>
                </div>
                <div className="stat-card nbtc stat-expired">
                    <span className="stat-value stat-value-expired">{expired}</span>
                    <span className="stat-label">EXPIRED</span>
                </div>
            </div>

            {total === 0 && followedClocks.length === 0 ? (
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
                                            followed={followedIds.has(clock.id)}
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
                                            followed={followedIds.has(clock.id)}
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
