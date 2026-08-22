"use client";

import { useState } from "react";
import Link from "next/link";
import CamelClock from "./CamelClock";
import ConfirmDialog from "./ConfirmDialog";
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

export default function ClockCard({ clock, onDeleted }) {
    const [deleting, setDeleting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const [toggling, setToggling] = useState(false);
    const [toggleError, setToggleError] = useState("");

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
        <div className={`clock-card nbtc status-${status}${deleting ? " clock-card-deleting" : ""}`}>
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

            <div className="card-actions">
                <Link href={`/clock/${clock.id}`} className="card-action-btn">EDIT</Link>
                <button
                    className={`card-action-btn ${status === "draft" ? "publish-button" : "unpublish-button"}`}
                    type="button"
                    onClick={handleTogglePublish}
                    disabled={toggling}
                >
                    {toggling ? "..." : (status === "draft" ? "PUBLISH" : "UNPUBLISH")}
                </button>
                <button
                    className="card-action-btn delete-button"
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={deleting}
                    aria-label="Delete"
                >
                    {deleting ? "..." : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1.4rem" height="1.4rem" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                    )}
                </button>
            </div>

            {toggleError && <p className="card-error">{toggleError}</p>}

            {confirmOpen && (
                <ConfirmDialog
                    message={deleteError || `Delete "${clock.title}"? This cannot be undone.`}
                    onConfirm={deleteError ? () => { setConfirmOpen(false); setDeleteError(""); } : handleDelete}
                    onCancel={() => { setConfirmOpen(false); setDeleteError(""); }}
                />
            )}
        </div>
    );
}
