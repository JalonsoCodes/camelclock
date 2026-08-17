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

export default function ClockCard({ clock, onDeleted }) {
    const [deleting, setDeleting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const target = new Date(clock.target_at);
    const live = target > new Date();
    const time = `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;

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
        <div className={`clock-card nbtc ${deleting ? "clock-card-deleting" : ""}`}>
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
                />

                <div className="card-meta">
                    <span className="card-date">{formatTarget(clock.target_at)}</span>
                    <span className={`status-badge ${live ? "live" : "expired"}`}>
                        {live ? "LIVE" : "EXPIRED"}
                    </span>
                </div>
            </Link>

            <div className="card-actions">
                <Link href={`/clock/${clock.id}`} className="card-action-btn">EDIT</Link>
                <button
                    className="card-action-btn delete-button"
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={deleting}
                >
                    {deleting ? "..." : "DELETE"}
                </button>
            </div>

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
