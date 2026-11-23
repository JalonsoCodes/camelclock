import { cache } from "react";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ClockViewer from "@/components/ClockViewer";
import { createClient } from "@/lib/supabase/server";
import { dailyDropQuota, computeDropLeft } from "@/utils/boost";

export const dynamic = "force-dynamic";

const getClock = cache(async (id) => {
    const supabase = await createClient();
    const { data: clock, error } = await supabase
        .from("clocks")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error(`Failed to load clock ${id}:`, error.message);
    }

    return clock ?? null;
});

const getCurrentUser = cache(async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
});

const fallbackMetadata = {
    title: "Clock",
    description: "View this countdown clock on CamelClock",
    robots: { index: false, follow: false },
};

export async function generateMetadata({ params }) {
    const { id } = await params;

    try {
        const [clock, user] = await Promise.all([getClock(id), getCurrentUser()]);

        if (!clock) return fallbackMetadata;

        const isOwner = !!user && user.id === clock.user_id;
        if (clock.status === "draft" && !isOwner) return fallbackMetadata;

        return {
            title: clock.title ? `Countdown to ${clock.title} — Live Timer` : "Clock",
            description: clock.title
                ? `An interactive, stylish pixel camel countdown to ${clock.title} — share it or embed it on your site or Notion page, and let visitors tap along. Live to the second.`
                : fallbackMetadata.description,
            alternates: { canonical: `/clock/${id}` },
            robots: clock.is_showcase === true
                ? { index: true, follow: true }
                : { index: false, follow: true },
            openGraph: {
                title: clock.title ? `Countdown to ${clock.title} — Live Timer` : "Clock",
                description: clock.title
                    ? `Watch the CamelClock countdown to ${clock.title} — an interactive pixel camel clock you can share or embed.`
                    : fallbackMetadata.description,
                type: "website",
            },
            twitter: {
                card: "summary_large_image",
                title: clock.title ? `Countdown to ${clock.title} — Live Timer` : "Clock",
                description: clock.title
                    ? `Watch the CamelClock countdown to ${clock.title} — an interactive pixel camel clock you can share or embed.`
                    : fallbackMetadata.description,
            },
        };
    } catch (error) {
        console.error(`Failed to load metadata for clock ${id}:`, error.message);
        return fallbackMetadata;
    }
}

export default async function ClockPage({ params }) {
    const { id } = await params;

    const [clock, user] = await Promise.all([getClock(id), getCurrentUser()]);

    if (!clock) {
        notFound();
    }

    const isOwner = !!user && user.id === clock.user_id;

    if (clock.status === "draft" && !isOwner) {
        notFound();
    }

    const supabase = await createClient();
    const entitlements = user
        ? await (async () => {
              const { data: uh } = await supabase
                  .from("user_hydrates")
                  .select("drop_day, drop_used")
                  .eq("user_id", user.id)
                  .maybeSingle();
              return {
                  drop: computeDropLeft(uh?.drop_day, uh?.drop_used) ?? dailyDropQuota(),
              };
          })()
        : {};

    const { data: creator } = await supabase.rpc("get_clock_creator", { p_clock_id: clock.id });
    const creatorUsername = creator?.[0]?.username ?? null;

    // Fetch is_pro for the clock owner to gate background theming
    const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("id", clock.user_id)
        .maybeSingle();
    const isPro = Boolean(ownerProfile?.is_pro);

    // First-run tour. Shown to the owner of EVERY live clock until THAT clock has been toured.
    // A draft never opens the tour: publishing is explained by the "WHAT HAPPENS WHEN YOU PUBLISH?"
    // note under the draft banner's PUBLISH button instead, so the tour only starts once the clock
    // is live. On a live clock the tour shows while it is still untouched (< 10 hydrations) or
    // carries the tutorial poll that marks a tour already in progress — which is what lets it
    // resume after an abandon.
    let showTour = false;
    if (isOwner && clock.status === "live" && clock.tutorial_completed !== true) {
        if (clock.hydrate_count < 10) {
            showTour = true;
        } else {
            const { data: tp } = await supabase
                .from("clock_polls")
                .select("id")
                .eq("clock_id", clock.id)
                .eq("tutorial", true)
                .limit(1)
                .maybeSingle();
            showTour = !!tp;
        }
    }

    return (
        <>
            <Navbar />
            <main className="live-clock">
                <ClockViewer
                    clock={clock}
                    isOwner={isOwner}
                    creatorUsername={creatorUsername}
                    entitlements={entitlements}
                    showTour={showTour}
                    isPro={isPro}
                />
            </main>
        </>
    );
}
