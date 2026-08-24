"use client";

import CamelClock from "./CamelClock";

export default function ShowcaseCard({ showcase }) {
    const target = new Date(showcase.target_at);

    return (
        <div className="solutions-cell nbtc">
            <CamelClock
                title={showcase.title}
                month={target.getMonth()}
                day={target.getDate()}
                time={`${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`}
                introText={showcase.intro_text}
                celebrationMessage={showcase.celebration_message}
                primaryColour={showcase.primary_colour}
                secondaryColour={showcase.secondary_colour}
                celebrationType={showcase.celebration_type}
                boosts={showcase.wearables ?? []}
                showWatermark
                watermarkExternal
                showCta
                ctaHref={`/clock/${showcase.clock_id}`}
            />
        </div>
    );
}
