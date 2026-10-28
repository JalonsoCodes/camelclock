export default function StatsRowSkeleton() {
    return (
        <div className="stats-row stats-row-skeleton">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="stat-card nbtc stat-skeleton">
                    <div className="stat-skeleton-value" />
                    <div className="stat-skeleton-label" />
                </div>
            ))}
        </div>
    );
}