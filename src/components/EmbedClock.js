"use client";

import CamelClock from "./CamelClock";
import { formatClockTime, formatFinishRow } from "@/utils/clockValues";
import { track } from "@/utils/analytics";

// An embed is a pure timer and a doorway. It cannot hydrate: the embed lives in a cross-origin
// iframe where the Supabase session cookie is not reliably sent, so tapping the camel could only
// ever produce a sign-in wall at the moment of peak intent. Instead a tap navigates out to the
// clock's own page (target="_top"), where hydration works properly and the signup flow lives.
export default function EmbedClock({ clock, id, showWatermark = true, titleHref, titleExternal = true }) {
    const target = new Date(clock.target_at);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://camelclock.com";
    // The title links out to the clock's own page; the embed passes an absolute href with
    // target="_top" so it breaks out of the iframe. A caller with no such page passes null.
    const resolvedTitleHref = titleHref === undefined ? `${siteUrl}/clock/${id}` : titleHref;
    const clockUrl = `${siteUrl}/clock/${id}`;

    const handleCamelTap = () => {
        track("embed_tapped");
        window.open(clockUrl, "_top");
    };

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
            wearables={clock.wearables || []}
            boosts={clock.boosts || []}
            showWatermark={showWatermark}
            watermarkExternal
            watermarkHref={siteUrl}
            titleHref={resolvedTitleHref}
            titleExternal={titleExternal}
            finishRowText={formatFinishRow(target)}
            hideLevelBanner
            {...(clock.viewer_hydrates === true
                ? { viewerHydrates: true, onHydrateClick: handleCamelTap }
                : {})}
        />
    );
}
