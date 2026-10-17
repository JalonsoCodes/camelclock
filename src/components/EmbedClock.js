"use client";

import { useState } from "react";
import CamelClock from "./CamelClock";
import AuthModal from "./auth/AuthModal";
import ShareDialog from "./ShareDialog";
import { formatClockTime, formatFinishRow } from "@/utils/clockValues";
import useHydrateInteraction from "@/hooks/useHydrate";
import useHydrateStats from "@/hooks/useHydrateStats";
import { computeDropLeft } from "@/utils/boost";

export default function EmbedClock({ clock, id, showWatermark = true, titleHref, titleExternal = true, entitlements = {} }) {
    const target = new Date(clock.target_at);
    const viewerHydrates = clock.viewer_hydrates === true;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://camelclock.com";
    const [capOpen, setCapOpen] = useState(false);
    // The title links out to the clock's own page; the embed passes an absolute
    // href with target="_top" so it breaks out of the iframe, while the landing's
    // showcase examples link relatively in the same tab. A caller with no such
    // page (the landing's empty-state fallbacks) passes null.
    const resolvedTitleHref = titleHref === undefined ? `${siteUrl}/clock/${id}` : titleHref;
    const {
        camelRef,
        hydrateCount,
        serverCount,
        level,
        beginHydrate,
        applyServer,
        hydratePromptOpen,
        setHydratePromptOpen,
    } = useHydrateInteraction(clock, viewerHydrates, {
        isOwner: false,
        drop: entitlements.drop ?? 0,
        onBlocked: () => setCapOpen(true),
    });

    useHydrateStats(clock.id, serverCount, (data) => {
        applyServer({
            drop: computeDropLeft(data?.drop_day, data?.drop_used),
        });
    });

    return (
        <>
            <CamelClock
                ref={camelRef}
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
                hydrateCount={hydrateCount}
                level={level}
                finishRowText={formatFinishRow(target)}
                hideLevelBanner
                {...(viewerHydrates
                    ? { viewerHydrates: true, onHydrateClick: beginHydrate }
                    : {})}
            />
            {hydratePromptOpen && (
                <AuthModal
                    mode="signup"
                    next={`/clock/${id}`}
                    onClose={() => setHydratePromptOpen(false)}
                    onSuccess={() => setHydratePromptOpen(false)}
                />
            )}
            {capOpen && (
                <ShareDialog
                    clockId={clock.id}
                    title={clock.title}
                    mode="saved"
                    heading="THAT'S TODAY'S HYDRATIONS"
                    subline="You've used your daily hydrations for this CamelClock. Come back tomorrow to keep it climbing."
                    onClose={() => setCapOpen(false)}
                />
            )}
        </>
    );
}
