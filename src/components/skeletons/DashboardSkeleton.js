import StatsRowSkeleton from "./StatsRowSkeleton";
import ClockCardSkeleton from "./ClockCardSkeleton";

export default function DashboardSkeleton() {
    return (
        <main className="dashboard dashboard-skeleton">
            <StatsRowSkeleton />
            <div className="dashboard-skeleton-sections">
                <section className="dashboard-skeleton-section">
                    <div className="dashboard-skeleton-section-header" />
                    <div className="clocks-grid clocks-grid-skeleton">
                        {[...Array(3)].map((_, i) => (
                            <ClockCardSkeleton key={i} />
                        ))}
                    </div>
                </section>
                <section className="dashboard-skeleton-section">
                    <div className="dashboard-skeleton-section-header" />
                    <div className="clocks-grid clocks-grid-skeleton">
                        {[...Array(3)].map((_, i) => (
                            <ClockCardSkeleton key={i + 3} />
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}