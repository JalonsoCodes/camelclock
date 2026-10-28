export default function ClockSkeleton() {
    return (
        <div className="public-clock-card nbtc clock-skeleton">
            <div className="clock-skeleton-canvas" />
            <div className="clock-skeleton-digital">
                <div className="clock-skeleton-unit" />
                <div className="clock-skeleton-unit" />
                <div className="clock-skeleton-unit" />
                <div className="clock-skeleton-unit" />
                <div className="clock-skeleton-unit" />
            </div>
            <div className="clock-skeleton-banner" />
        </div>
    );
}