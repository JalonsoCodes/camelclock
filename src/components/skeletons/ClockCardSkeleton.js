export default function ClockCardSkeleton() {
    return (
        <div className="clock-card nbtc clock-card-skeleton">
            <div className="clock-skeleton-canvas" />
            <div className="clock-card-skeleton-meta">
                <div className="clock-skeleton-date" />
                <div className="clock-skeleton-badge" />
            </div>
            <div className="clock-card-skeleton-actions">
                <div className="clock-skeleton-btn" />
                <div className="clock-skeleton-btn" />
                <div className="clock-skeleton-btn" />
                <div className="clock-skeleton-btn" />
            </div>
        </div>
    );
}