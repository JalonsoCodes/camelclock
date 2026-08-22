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
        wearables: clock.wearables || [],
    };
}

export default function ClockViewer({ clock, isOwner: initialOwner }) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [isOwner, setIsOwner] = useState(initialOwner);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_OUT") {
                setIsOwner(false);
                setEditing(false);
            } else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
                setIsOwner(!!session?.user && session.user.id === clock.user_id);
            }
        });

        return () => subscription.unsubscribe();
    }, [clock.user_id]);

    const target = new Date(clock.target_at);

    return (
        <div className="clock-viewer">
            {clock.status === "draft" && isOwner && (
                <div className="draft-banner nbtc">
                    This CamelClock is in your Drafts &mdash; only you can see it.
                </div>
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
                <>
                    <div className="public-clock-card nbtc">
                        {isOwner && (
                            <button className="edit-fab nbtc" type="button" onClick={() => setEditing(true)}>
                                EDIT
                            </button>
                        )}
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
                            boosts={clock.wearables || []}
                            showWatermark
                        />
                    </div>
                </>
            )}
        </div>
    );
}
