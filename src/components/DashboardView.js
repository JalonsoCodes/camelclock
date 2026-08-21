"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "./Navbar";
import ClockCard from "./ClockCard";
import EmptyState from "./EmptyState";

function getStatus(clock, now) {
    if (clock.status === "draft") return "draft";
    if (new Date(clock.target_at) <= now) return "expired";
    return "live";
}

function getStats(clocks) {
    const now = new Date();
    let drafts = 0;
    let live = 0;
    let expired = 0;
    for (const clock of clocks) {
        const status = getStatus(clock, now);
        if (status === "draft") drafts++;
        else if (status === "live") live++;
        else expired++;
    }
    return { total: clocks.length, drafts, live, expired };
}

export default function DashboardView({ clocks }) {
    const router = useRouter();
    const [filter, setFilter] = useState(null);
    const [upcomingOpen, setUpcomingOpen] = useState(true);
    const [expiredOpen, setExpiredOpen] = useState(true);
    const { total, drafts, live, expired } = getStats(clocks);

    const now = new Date();
    const upcoming = clocks
        .filter((c) => {
            const s = getStatus(c, now);
            if (s === "expired") return false;
            if (filter && s !== filter) return false;
            return true;
        })
        .sort((a, b) => new Date(a.target_at) - new Date(b.target_at));

    const expiredClocks = clocks
        .filter((c) => {
            const s = getStatus(c, now);
            if (s !== "expired") return false;
            if (filter && s !== filter) return false;
            return true;
        })
        .sort((a, b) => new Date(a.target_at) - new Date(b.target_at));

    return (
        <main className="dashboard">
            <Navbar />

            <div className="stats-row">
                <button
                    className={`stat-card nbtc stat-total${filter === null ? " stat-active" : ""}`}
                    type="button"
                    onClick={() => setFilter(null)}
                >
                    <span className="stat-value stat-value-total">{total}</span>
                    <span className="stat-label">TOTAL</span>
                </button>
                <button
                    className={`stat-card nbtc stat-live${filter === "live" ? " stat-active" : ""}`}
                    type="button"
                    onClick={() => setFilter(filter === "live" ? null : "live")}
                >
                    <span className="stat-value stat-value-live">{live}</span>
                    <span className="stat-label">LIVE</span>
                </button>
                <button
                    className={`stat-card nbtc stat-drafts${filter === "draft" ? " stat-active" : ""}`}
                    type="button"
                    onClick={() => setFilter(filter === "draft" ? null : "draft")}
                >
                    <span className="stat-value stat-value-drafts">{drafts}</span>
                    <span className="stat-label">DRAFTS</span>
                </button>
                <button
                    className={`stat-card nbtc stat-expired${filter === "expired" ? " stat-active" : ""}`}
                    type="button"
                    onClick={() => setFilter(filter === "expired" ? null : "expired")}
                >
                    <span className="stat-value stat-value-expired">{expired}</span>
                    <span className="stat-label">EXPIRED</span>
                </button>
            </div>

            {total === 0 ? (
                <EmptyState />
            ) : (
                <>
                    <button
                        className="section-dropdown"
                        type="button"
                        onClick={() => setUpcomingOpen(!upcomingOpen)}
                    >
                        UPCOMING
                        <svg
                            className={`section-arrow${upcomingOpen ? " section-arrow-open" : ""}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            width="1.8rem"
                            height="1.8rem"
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                    {upcomingOpen && (
                        <div className="clocks-grid">
                            {upcoming.map((clock) => (
                                <ClockCard key={clock.id} clock={clock} onDeleted={() => router.refresh()} />
                            ))}
                            <Link href="/new" className="clock-card new-clock-placeholder nbtc">
                                <span className="new-clock-icon">+</span>
                                <span className="new-clock-text">NEW CLOCK</span>
                            </Link>
                        </div>
                    )}

                    <button
                        className="section-dropdown"
                        type="button"
                        onClick={() => setExpiredOpen(!expiredOpen)}
                    >
                        EXPIRED
                        <svg
                            className={`section-arrow${expiredOpen ? " section-arrow-open" : ""}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            width="1.8rem"
                            height="1.8rem"
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                    {expiredOpen && expiredClocks.length > 0 && (
                        <div className="clocks-grid">
                            {expiredClocks.map((clock) => (
                                <ClockCard key={clock.id} clock={clock} onDeleted={() => router.refresh()} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </main>
    );
}
