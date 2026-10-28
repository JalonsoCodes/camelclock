import ClockSkeleton from "@/components/skeletons/ClockSkeleton";

export default function EditLoading() {
    return (
        <div className="camel-builder camel-builder-skeleton">
            <div className="canvas-wrapper canvas-wrapper-skeleton nbtc">
                <ClockSkeleton />
            </div>
            <div className="camel-builder-form camel-builder-form-skeleton">
                <div className="form-group-skeleton">
                    <div className="skeleton-field" />
                    <div className="skeleton-field" />
                </div>
                <div className="form-group-skeleton">
                    <div className="skeleton-field" />
                    <div className="skeleton-field" />
                </div>
                <div className="form-group-skeleton">
                    <div className="skeleton-field" />
                    <div className="skeleton-field" />
                </div>
                <div className="form-group-skeleton">
                    <div className="skeleton-field" />
                    <div className="skeleton-field" />
                </div>
                <div className="skeleton-btn skeleton-btn-wide" />
            </div>
        </div>
    );
}