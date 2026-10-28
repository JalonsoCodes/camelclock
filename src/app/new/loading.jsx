import ClockSkeleton from "@/components/skeletons/ClockSkeleton";

export default function NewLoading() {
    return (
        <div className="quick-start quick-start-skeleton">
            <div className="quick-start-form quick-start-form-skeleton">
                <div className="quick-start-stage-skeleton">
                    <div className="quick-start-slide-skeleton" />
                </div>
                <div className="quick-start-actions quick-start-actions-skeleton">
                    <div className="skeleton-btn" />
                    <div className="skeleton-btn" />
                    <div className="skeleton-btn" />
                </div>
            </div>
            <div className="quick-start-preview quick-start-preview-skeleton">
                <ClockSkeleton />
            </div>
        </div>
    );
}