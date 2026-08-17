"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CamelClock from "./CamelClock";
import CamelClockBuilder from "./CamelClockBuilder";
import { supabase } from "@/lib/supabase/client";

function formatTime(target) {
    return `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`;
}

function getInitialValues(clock) {
    const target = new Date(clock.target_at);
    return {
        title: clock.title,
        month: target.getMonth(),
        day: target.getDate(),
        time: formatTime(target),
        introText: clock.intro_text,
        celebrationMessage: clock.celebration_message,
        primaryColour: clock.primary_colour,
        secondaryColour: clock.secondary_colour,
    };
}

export default function ClockViewer({ clock, isOwner: initialOwner }) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [isOwner, setIsOwner] = useState(initialOwner);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_OUT") {
                setIsOwner(false);
                setEditing(false);
            } else if (event === "SIGNED_IN") {
                setIsOwner(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const target = new Date(clock.target_at);

    return (
        <div className="clock-viewer">
            {isOwner && (
                <button className="edit-toggle nbtc" type="button" onClick={() => setEditing((e) => !e)}>
                    {editing ? "← BACK TO VIEW" : "EDIT CLOCK"}
                </button>
            )}

            {editing && isOwner ? (
                <CamelClockBuilder
                    initialValues={getInitialValues(clock)}
                    clockId={clock.id}
                    onSaved={() => {
                        setEditing(false);
                        router.refresh();
                    }}
                />
            ) : (
                <div className="public-clock-card nbtc">
                    <CamelClock
                        title={clock.title}
                        month={target.getMonth()}
                        day={target.getDate()}
                        time={formatTime(target)}
                        introText={clock.intro_text}
                        celebrationMessage={clock.celebration_message}
                        primaryColour={clock.primary_colour}
                        secondaryColour={clock.secondary_colour}
                        celebrationType={clock.celebration_type}
                    />
                </div>
            )}
        </div>
    );
}
