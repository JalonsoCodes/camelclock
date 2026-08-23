"use client";

import { useState } from "react";
import Link from "next/link";
import { EyeOff, Pencil, Rocket, Share2, Trash2, X } from "lucide-react";
import CamelClock from "./CamelClock";
import ConfirmDialog from "./ConfirmDialog";
import ShareDialog from "./ShareDialog";
import { supabase } from "@/lib/supabase/client";

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

export default function ClockCard({ clock, onDeleted, owned = true, followed = false, onUnfollow = null }) {
    const [deleting, setDeleting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [toggling, setToggling] = useState(false);
    const [toggleError, setToggleError] = useState("");
    const [shareOpen, setShareOpen] = useState(false);

    const target = new Date(clock.target_at);
    const status = getStatus(clock);
    const time = `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;

    const handleTogglePublish = async () => {
        setToggleError("");
        setToggling(true);
        const newStatus = status === "draft" ? "live" : "draft";
        const { error } = await supabase
            .from("clocks")
            .update({ status: newStatus })
            .eq("id", clock.id);
        setToggling(false);

        if (error) {
            console.error("Error updating clock status:", error);
            setToggleError(`Failed to ${newStatus === "live" ? "publish" : "unpublish"}. Please try again.`);
        } else {
            if (newStatus === "live") {
                setShareOpen(true);
            }
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
            onDeleted();
        }
    };

    return (
        <div className={`clock-card nbtc status-${status}${followed ? " followed-card" : ""}${deleting ? " clock-card-deleting" : ""}`}>
            {followed && (
                <button
                    className="followed-unfollow nbtc"
                    type="button"
                    title="Stop following this clock"
                    aria-label={`Stop following ${clock.title}`}
                    onClick={onUnfollow}
                >
                    <X size={16} aria-hidden="true" />
                </button>
            )}
            <Link href={`/clock/${clock.id}`} className="clock-card-link">
                <CamelClock
                    title={clock.title}
                    month={target.getMonth()}
                    day={target.getDate()}
                    time={time}
                    introText={clock.intro_text}
                    celebrationMessage={clock.celebration_message}
                    primaryColour={clock.primary_colour}
                    secondaryColour={clock.secondary_colour}
                    celebrationType={clock.celebration_type}
                    boosts={clock.wearables || []}
                />

                <div className="card-meta">
                    <span className="card-date">{formatTarget(clock.target_at)}</span>
                    <span className={`status-badge ${status}`}>
                        {status === "draft" ? "DRAFT" : status === "live" ? "LIVE" : "EXPIRED"}
                    </span>
                </div>
            </Link>

            {owned && (
                <div className="card-actions">
                    <Link href={`/edit/${clock.id}`} className="card-action-btn edit-button" title="Edit this clock's design and settings" aria-label="Edit">
                        <Pencil className="button-icon" aria-hidden="true" />
                    </Link>
                    {status === "draft" ? (
                        <button
                            className="card-action-btn publish-button"
                            type="button"
                            title="Make this clock publicly visible"
                            onClick={handleTogglePublish}
                            disabled={toggling}
                        >
                            {toggling ? "..." : <><Rocket className="button-icon" />PUBLISH</>}
                        </button>
                    ) : (
                        <>
                            <button
                                className="card-action-btn"
                                type="button"
                                title="Copy the link or grab the embed code"
                                onClick={() => setShareOpen(true)}
                            >
                                <Share2 className="button-icon" />SHARE
                            </button>
                            <button
                                className="card-action-btn unpublish-button"
                                type="button"
                                title="Move this clock back to drafts"
                                onClick={handleTogglePublish}
                                disabled={toggling}
                                aria-label="Unpublish"
                            >
                                {toggling ? "..." : <EyeOff className="button-icon" aria-hidden="true" />}
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
                        {deleting ? "..." : <Trash2 className="button-icon" aria-hidden="true" />}
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
                    isOwner
                    allowEmbed={clock.allow_embed}
                    onClose={() => setShareOpen(false)}
                    heading="YOUR CLOCK IS LIVE"
                    subline={`\u201C${clock.title}\u201D is now publicly visible. Share a link or embed it anywhere.`}
                />
            )}
        </div>
    );
}
