"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import DashboardHeader from "./DashboardHeader";
import ClockCard from "./ClockCard";
import EmptyState from "./EmptyState";

function getStats(clocks) {
    const now = new Date();
    let live = 0;
    for (const clock of clocks) {
        if (new Date(clock.target_at) > now) live++;
    }
    return { total: clocks.length, live, expired: clocks.length - live };
}

export default function DashboardView({ clocks }) {
    const router = useRouter();
    const { total, live, expired } = getStats(clocks);

    return (
        <main className="dashboard">
            <DashboardHeader />

            <div className="stats-row">
                <div className="stat-card nbtc">
                    <span className="stat-value">{total}</span>
                    <span className="stat-label">TOTAL CLOCKS</span>
                </div>
                <div className="stat-card nbtc">
                    <span className="stat-value">{live}</span>
                    <span className="stat-label">LIVE NOW</span>
                </div>
                <div className="stat-card nbtc">
                    <span className="stat-value">{expired}</span>
                    <span className="stat-label">EXPIRED</span>
                </div>
            </div>

            {total === 0 ? (
                <EmptyState />
            ) : (
                <div className="clocks-grid">
                    {clocks.map((clock) => (
                        <ClockCard key={clock.id} clock={clock} onDeleted={() => router.refresh()} />
                    ))}
                    <Link href="/new" className="clock-card new-clock-placeholder nbtc">
                        <span className="new-clock-icon">+</span>
                        <span className="new-clock-text">NEW CLOCK</span>
                    </Link>
                </div>
            )}
        </main>
    );
}
