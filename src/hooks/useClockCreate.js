"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getConfiguredTarget } from "@/utils/time";
import { validateClock } from "@/utils/validation";
import { shuffleBoostOrder } from "@/utils/boost";

export const PENDING_KEY = "camelClock.pending";

// Creates are always drafts — publishing only ever happens through the
// checkLiveLimit() gate. Edits drop the key so they can never change status.
export function buildClockPayload(values) {
    const now = new Date();
    const currentYear = now.getFullYear();
    let targetDate = getConfiguredTarget(values.month, values.day, values.time, currentYear);

    if (targetDate <= now) {
        targetDate.setFullYear(currentYear + 1);
    }

    return {
        title: values.title,
        target_at: targetDate.toISOString(),
        intro_text: values.introText,
        celebration_message: values.celebrationMessage,
        primary_colour: values.primaryColour,
        secondary_colour: values.secondaryColour,
        celebration_type: "spit",
        wearables: values.wearables ?? [],
        boosts: values.boosts ?? [],
        // Drawn once, here, so the reveal ladder is this clock's own for life. Carried through
        // the pending stash so re-using a confirmation link cannot deal a different one.
        boost_order: values.boostOrder ?? shuffleBoostOrder(),
        // ON unless a caller explicitly turns it off. The builder no longer carries a toggle,
        // so an `=== true` test here would silently save every new clock with viewer hydrations disabled.
        viewer_hydrates: values.viewerHydrates !== false,
        status: "draft",
    };
}

function stashPending(values) {
    try {
        localStorage.setItem(PENDING_KEY, JSON.stringify({ ...values, payload: buildClockPayload(values) }));
    } catch {
        // ignore
    }
}

function clearPending() {
    try {
        localStorage.removeItem(PENDING_KEY);
    } catch {
        // ignore
    }
}

/**
 * The one create/save path shared by the full editor and the landing quick-start:
 * validate -> stash for anonymous visitors -> insert as draft.
 */
export default function useClockCreate({ clockId = null } = {}) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [authOpen, setAuthOpen] = useState(false);
    const [createdId, setCreatedId] = useState(null);

    const effectiveId = clockId ?? createdId;

    const submit = useCallback(async (values) => {
        setIsSaving(true);
        setStatusMessage("");

        const validation = validateClock(values);
        if (!validation.valid) {
            setStatusMessage(validation.errors[0]);
            setIsSaving(false);
            return false;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            stashPending(values);
            setAuthOpen(true);
            setStatusMessage("Sign in to save and manage your clocks.");
            setIsSaving(false);
            return false;
        }

        const isNew = !clockId;
        const payload = { ...buildClockPayload(values), user_id: user.id };
        if (!isNew) {
            delete payload.status;
            // An edit must never re-deal the ladder: boost_order is written once at creation and
            // stays put, so unlocking order never shifts under an owner who has built around it.
            delete payload.boost_order;
            // Nor does it carry a hydrates toggle, so writing the build default here would silently
            // force hydrations back on for a clock whose owner deliberately turned them off. That
            // choice belongs to the creation wizard and the share dialog's go-live control.
            delete payload.viewer_hydrates;
        }

        try {
            const { data, error } = isNew
                ? await supabase.from("clocks").insert([payload]).select()
                : await supabase.from("clocks").update(payload).eq("id", clockId).select();

            if (error) {
                throw error;
            }

            clearPending();
            const savedId = data?.[0]?.id ?? clockId;
            if (savedId) {
                setCreatedId(savedId);
            }

            router.push(`/clock/${savedId}?created=1`);
        } catch {
            setStatusMessage("Failed to save. Please try again.");
            return false;
        } finally {
            setIsSaving(false);
        }

        return true;
    }, [clockId, router]);

    const closeAuth = useCallback(() => setAuthOpen(false), []);

    return {
        isSaving,
        statusMessage,
        authOpen,
        closeAuth,
        submit,
        effectiveId,
    };
}
