import { supabase } from "@/lib/supabase/client";

export const MAX_LIVE_CLOCKS = 3;

export const LIVE_LIMIT_MESSAGE = `You've hit the limit of ${MAX_LIVE_CLOCKS} live Camel Clocks. Unpublish one to make this live.`;

export async function checkLiveLimit() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { ok: false, reason: "auth", error: "You need to be signed in." };
    }

    // Pro (and admin) lift the cap entirely. profiles is owner-read-only, so this read only ever
    // resolves for the signed-in owner — which is the only caller that matters here. The trigger
    // enforce_live_clock_limit() is the hard backstop; this is just so Pro users never see the cap.
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, is_pro")
        .eq("id", user.id)
        .single();

    if (profile?.is_admin || profile?.is_pro) {
        return { ok: true };
    }

    let { data: count, error } = await supabase.rpc("count_my_live_clocks");

    if (error && /jwt.*future/i.test(error.message)) {
        await supabase.auth.getSession();
        ({ data: count, error } = await supabase.rpc("count_my_live_clocks"));
    }

    if (error) {
        return { ok: false, reason: "error", error: "Couldn't check your live clock count. Please try again." };
    }

    if ((count ?? 0) >= MAX_LIVE_CLOCKS) {
        return { ok: false, reason: "limit", error: LIVE_LIMIT_MESSAGE };
    }

    return { ok: true };
}
