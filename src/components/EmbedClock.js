"use client";

import CamelClock from "./CamelClock";
import { formatClockTime } from "@/utils/clockValues";

export default function EmbedClock({ clock, id }) {
    const target = new Date(clock.target_at);

    return (
        <CamelClock
            title={clock.title}
            month={target.getMonth()}
            day={target.getDate()}
            time={formatClockTime(target)}
            targetAt={clock.target_at}
            introText={clock.intro_text}
            celebrationMessage={clock.celebration_message}
            primaryColour={clock.primary_colour}
            secondaryColour={clock.secondary_colour}
            boosts={clock.wearables || []}
            showWatermark
            watermarkExternal
            showCta
            ctaHref={`/clock/${id}`}
        />
    );
}