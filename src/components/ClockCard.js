"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeOff, Pencil, Rocket, Share2, Trash2 } from "lucide-react";
import CamelClock from "./CamelClock";
import ConfirmDialog from "./ConfirmDialog";
import ShareDialog from "./ShareDialog";
import LevelChip from "./LevelChip";
import LoadingSpinner from "./LoadingSpinner";
import { refreshLiveCount } from "@/utils/liveCountEvents";
import { levelFromCount } from "@/utils/boost";
import { checkLiveLimit } from "@/utils/liveLimit";
import { supabase } from "@/lib/supabase/client";
import { track } from "@/utils/analytics";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatTarget(targetAt) {
    const d = new Date(targetAt);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
}

function getStatus(clock) {
    if (clock.status === "draft") return "draft";
    if (new Date(clock.target_at) <= new Date()) return "expired";
    return "live";
}

export default function ClockCard({ clock, onDeleted, owned = true, hydrated = false }) {
    const [deleting, setDeleting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [toggling, setToggling] = useState(false);
    const [toggleError, setToggleError] = useState("");
    const [shareOpen, setShareOpen] = useState(false);

    const target = new Date(clock.target_at);
    const status = getStatus(clock);
    const time = `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;

    // Unpublish needs no limit gate — it only ever removes a live row. Going live is a direct
    // write through checkLiveLimit() (same gate the viewer uses); the simplified live dialog then
    // opens so the owner can share or embed straight away.
    const publishClock = async () => {
        if (toggling) return;
        setToggleError("");
        setToggling(true);

        const check = await checkLiveLimit();
        if (!check.ok) {
            setToggling(false);
            if (check.reason === "limit") {
                setToggleError("Live clock limit reached (3). Unpublish one first.");
            } else {
                setToggleError(check.error);
            }
            return;
        }

        const { error } = await supabase
            .from("clocks")
            .update({ status: "live" })
            .eq("id", clock.id);
        setToggling(false);

        if (error) {
            console.error("Error updating clock status:", error);
            setToggleError("Failed to publish. Please try again.");
        } else {
            refreshLiveCount();
            onDeleted();
            setShareOpen(true);
            track("clock_published", { source: "dashboard" });
        }
    };

    const handleUnpublish = async () => {
        setToggleError("");
        setToggling(true);

        const { error } = await supabase
            .from("clocks")
            .update({ status: "draft" })
            .eq("id", clock.id);
        setToggling(false);

        if (error) {
            console.error("Error updating clock status:", error);
            setToggleError("Failed to unpublish. Please try again.");
        } else {
            refreshLiveCount();
            onDeleted();
        }
    };

    const handleDelete = async () => {
        setDeleteError("");
        setDeleting(true);
        const { error } = await supabase.from("clocks").delete().eq("id", clock.id);
        setDeleting(false);

        if (error) {
            console.error("Error deleting clock:", error);
            setDeleteError("Failed to delete. Please try again.");
        } else {
            setConfirmOpen(false);
            refreshLiveCount();
            onDeleted();
        }
    };

    return (
        <div className={`clock-card nbtc status-${status}${hydrated && !owned ? " hydrated-card" : ""}${deleting ? " clock-card-deleting" : ""}`}>
            <Link href={`/clock/${clock.id}`} className="clock-card-link">
                <CamelClock
                    title={clock.title}
                    month={target.getMonth()}
                    day={target.getDate()}
                    time={time}
                    targetAt={clock.target_at}
                    introText={clock.intro_text}
                    celebrationMessage={clock.celebration_message}
                    primaryColour={clock.primary_colour}
                    secondaryColour={clock.secondary_colour}
                    celebrationType={clock.celebration_type}
                    wearables={clock.wearables || []}
                    boosts={clock.boosts || []}
                    hydrateCount={clock.hydrate_count ?? 0}
                    level={levelFromCount(clock.hydrate_count ?? 0)}
                    hideLevelBanner
                    viewerHydrates={status === "live" && clock.viewer_hydrates === true}
                />

                <div className="card-meta">
                    <span className="card-date">{formatTarget(clock.target_at)}</span>
                    {clock.hydrate_count > 0 && (
                        <span className="card-hydrate-row">
                            <LevelChip hydrateCount={clock.hydrate_count} />
                            <span className="card-hydrators">
                                {clock.hydrate_count} HYDRATIONS · {clock.hydrator_count ?? 0} HYDRATORS
                                {owned && clock.owner_hydrate_count > 0 && ` · ${clock.owner_hydrate_count} FROM YOU`}
                            </span>
                        </span>
                    )}
                    <span className={`status-badge ${status}`}>
                        {status === "draft" ? "DRAFT" : status === "live" ? "LIVE" : "EXPIRED"}
                    </span>
                </div>
            </Link>

            {owned && (
                <div className="card-actions">
                    <Link href={`/edit/${clock.id}`} className="card-action-btn edit-button" title="Edit this clock's design and settings" aria-label="Edit">
                        <Pencil className="button-icon" aria-hidden="true" />
                        <span className="card-action-label">EDIT</span>
                    </Link>
                    {status === "draft" ? (
                        <button
                            className="card-action-btn publish-button"
                            type="button"
                            title="Make this clock publicly visible"
                            onClick={publishClock}
                            disabled={toggling}
                        >
                            {toggling ? <LoadingSpinner size="sm" inline /> : <Rocket className="button-icon" />}
                            {toggling ? "PUBLISHING..." : "PUBLISH"}
                        </button>
                    ) : (
                        <>
                            <button
                                className="card-action-btn"
                                type="button"
                                title="Copy the link, embed it, or share it"
                                onClick={() => setShareOpen(true)}
                            >
                                <Share2 className="button-icon" />SHARE
                            </button>
                            <button
                                className="card-action-btn unpublish-button"
                                type="button"
                                title="Move this clock back to drafts"
                                onClick={handleUnpublish}
                                disabled={toggling}
                                aria-label="Unpublish"
                            >
                                {toggling ? <LoadingSpinner size="sm" inline /> : <EyeOff className="button-icon" aria-hidden="true" />}
                                <span className="card-action-label">{toggling ? "UNPUBLISHING..." : "UNPUBLISH"}</span>
                            </button>
                        </>
                    )}
                    <button
                        className="card-action-btn delete-button"
                        type="button"
                        title="Permanently delete this clock"
                        onClick={() => setConfirmOpen(true)}
                        disabled={deleting}
                        aria-label="Delete"
                    >
                        {deleting ? <LoadingSpinner size="sm" inline /> : <Trash2 className="button-icon" aria-hidden="true" />}
                        <span className="card-action-label">{deleting ? "DELETING..." : "DELETE"}</span>
                    </button>
                </div>
            )}

            {toggleError && <p className="card-error">{toggleError}</p>}

            {confirmOpen && (
                <ConfirmDialog
                    message={deleteError || `Delete "${clock.title}"? This cannot be undone.`}
                    onConfirm={deleteError ? () => { setConfirmOpen(false); setDeleteError(""); } : handleDelete}
                    onCancel={() => { setConfirmOpen(false); setDeleteError(""); }}
                />
            )}

            {shareOpen && (
                <ShareDialog
                    clockId={clock.id}
                    title={clock.title}
                    onClose={() => setShareOpen(false)}
                    heading="YOUR CLOCK IS LIVE"
                    subline={`\u201C${clock.title}\u201D is now publicly visible. Share a link or embed it anywhere.`}
                />
            )}
        </div>
    );
}
