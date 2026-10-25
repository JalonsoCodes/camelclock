"use client";

import CamelClock from "./CamelClock";
import { formatClockTime, formatFinishRow } from "@/utils/clockValues";
import { track } from "@/utils/analytics";

// An embed is a pure timer and a doorway. It cannot hydrate: the embed lives in a cross-origin
// iframe where the Supabase session cookie is not reliably sent, so tapping the camel could only
// ever produce a sign-in wall at the moment of peak intent. Instead a tap opens the clock's own
// page in a new tab, where hydration works properly and the signup flow lives.
export default function EmbedClock({ clock, id, showWatermark = true, titleHref, titleExternal, newTab = false }) {
    const target = new Date(clock.target_at);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://camelclock.com";
    // The title links out to the clock's own page. The embed route passes newTab, while the
    // landing's ExampleGrid reuses this component and keeps both the title and the camel in-tab.
    const resolvedTitleHref = titleHref === undefined ? `${siteUrl}/clock/${id}` : titleHref;
    const resolvedTitleExternal = titleExternal === undefined ? newTab : titleExternal;
    const clockUrl = `${siteUrl}/clock/${id}`;

    const handleCamelTap = () => {
        track("embed_tapped");
        window.open(clockUrl, newTab ? "_blank" : "_top", newTab ? "noopener,noreferrer" : undefined);
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
            watermarkExternal={newTab}
            watermarkHref={siteUrl}
            titleHref={resolvedTitleHref}
            titleExternal={resolvedTitleExternal}
            finishRowText={formatFinishRow(target)}
            hideLevelBanner
            {...(clock.viewer_hydrates === true
                ? {
                      viewerHydrates: true,
                      onHydrateClick: handleCamelTap,
                      ctaIcon: "open",
                      ctaLabel: "Open this CamelClock",
                  }
                : {})}
        />
    );
}
