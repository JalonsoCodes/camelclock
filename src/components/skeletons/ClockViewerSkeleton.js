import ClockSkeleton from "./ClockSkeleton";

export default function ClockViewerSkeleton() {
    return (
        <div className="clock-viewer clock-viewer-skeleton">
            <div className="viewer-stage viewer-stage-skeleton">
                <div className="viewer-info viewer-info-skeleton">
                    <div className="community-stats-skeleton">
                        <div className="stat-block" />
                        <div className="stat-block" />
                    </div>
                    <div className="share-buttons-skeleton">
                        <div className="share-btn-block" />
                        <div className="share-btn-block" />
                        <div className="share-btn-block" />
                        <div className="share-btn-block" />
                    </div>
                </div>
                <div className="viewer-center viewer-center-skeleton">
                    <ClockSkeleton />
                </div>
                <div className="viewer-rail viewer-rail-skeleton">
                    <div className="poll-banner-skeleton" />
                    <div className="boost-panel-skeleton">
                        <div className="boost-category-skeleton" />
                        <div className="boost-category-skeleton" />
                        <div className="boost-category-skeleton" />
                    </div>
                </div>
            </div>
        </div>
    );
}