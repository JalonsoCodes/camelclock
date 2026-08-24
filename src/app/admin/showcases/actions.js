"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateClock } from "@/utils/validation";
import { wearables } from "@/utils/grids";

const SHOWCASE_FIELDS = [
    "title",
    "target_at",
    "intro_text",
    "celebration_message",
    "primary_colour",
    "secondary_colour",
    "celebration_type",
    "wearables",
];

const CELEBRATION_TYPES = ["spit"];

function validateShowcasePayload(values) {
    const target = values?.target_at ? new Date(values.target_at) : null;
    const targetValid = target && !Number.isNaN(target.getTime());
    if (!targetValid) {
        return "Target date is not a valid date.";
    }

    const pad = (n) => String(n).padStart(2, "0");
    const { valid, errors } = validateClock({
        title: values.title,
        introText: values.intro_text,
        celebrationMessage: values.celebration_message,
        primaryColour: values.primary_colour,
        secondaryColour: values.secondary_colour,
        month: target.getUTCMonth(),
        day: target.getUTCDate(),
        time: `${pad(target.getUTCHours())}:${pad(target.getUTCMinutes())}`,
        wearables: values.wearables,
    });
    if (!valid) {
        return errors[0];
    }

    if (!CELEBRATION_TYPES.includes(values.celebration_type)) {
        return "Unknown celebration type.";
    }

    return null;
}

function pickFields(values) {
    const out = {};
    for (const key of SHOWCASE_FIELDS) {
        if (values?.[key] !== undefined) out[key] = values[key];
    }
    return out;
}

async function requireAdmin() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
    if (!profile?.is_admin) {
        throw new Error("Forbidden");
    }

    return { supabase, userId: user.id };
}

async function upsertShowcaseClock(supabase, userId, clockId, fields) {
    const clockPayload = {
        title: fields.title,
        target_at: fields.target_at,
        intro_text: fields.intro_text,
        celebration_message: fields.celebration_message,
        primary_colour: fields.primary_colour,
        secondary_colour: fields.secondary_colour,
        celebration_type: fields.celebration_type ?? "spit",
        wearables: fields.wearables ?? [],
        status: "live",
    };

    if (clockId) {
        const { data, error } = await supabase
            .from("clocks")
            .update(clockPayload)
            .eq("id", clockId)
            .select()
            .maybeSingle();

        if (!error && data) {
            return data.id;
        }
        console.warn("Showcase clock relink required:", error?.message ?? "linked clock is missing");
    }

    const { data: created, error: insertError } = await supabase
        .from("clocks")
        .insert([{ ...clockPayload, user_id: userId }])
        .select()
        .single();

    if (insertError) {
        throw new Error(insertError.message);
    }

    return created.id;
}

export async function createShowcase(values) {
    try {
        const { supabase } = await requireAdmin();

        const validationError = validateShowcasePayload(values);
        if (validationError) {
            return { error: validationError };
        }

        const { data, error } = await supabase
            .from("showcases")
            .insert([pickFields(values)])
            .select()
            .single();
        if (error) {
            console.error("createShowcase insert:", error);
            return { error: "Failed to create showcase." };
        }
        revalidatePath("/admin/showcases");
        return { data };
    } catch (error) {
        console.error("createShowcase:", error);
        return { error: "You are not authorized to do that." };
    }
}

export async function updateShowcase(id, values) {
    try {
        const { supabase, userId } = await requireAdmin();

        const validationError = validateShowcasePayload(values);
        if (validationError) {
            return { error: validationError };
        }

        const { data: existing, error: fetchError } = await supabase
            .from("showcases")
            .select("clock_id")
            .eq("id", id)
            .maybeSingle();
        if (fetchError || !existing) {
            return { error: "Failed to save." };
        }

        const updates = pickFields(values);
        const { data, error } = await supabase
            .from("showcases")
            .update(updates)
            .eq("id", id)
            .select()
            .single();
        if (error) {
            return { error: "Failed to save." };
        }

        let final = data;
        let createdClock = false;
        const newClockId = await upsertShowcaseClock(supabase, userId, existing.clock_id, updates);
        if (newClockId !== existing.clock_id) {
            createdClock = true;
            const { data: relinked, error: relinkError } = await supabase
                .from("showcases")
                .update({ clock_id: newClockId })
                .eq("id", id)
                .select()
                .single();
            if (!relinkError && relinked) {
                final = relinked;
            }
        }

        revalidatePath("/admin/showcases");
        revalidatePath("/");
        return { data: final, createdClock };
    } catch (error) {
        console.error("updateShowcase:", error);
        const message = error?.message ?? "";
        if (message === "Unauthorized" || message === "Forbidden") {
            return { error: "You are not authorized to do that." };
        }
        return { error: "Failed to save. Please try again." };
    }
}

export async function deleteShowcase(id) {
    try {
        const { supabase } = await requireAdmin();

        const { data: existing } = await supabase
            .from("showcases")
            .select("clock_id")
            .eq("id", id)
            .maybeSingle();

        if (existing?.clock_id) {
            await supabase.from("clocks").delete().eq("id", existing.clock_id);
        }

        const { error } = await supabase.from("showcases").delete().eq("id", id);
        if (error) {
            return { error: "Failed to delete." };
        }
        revalidatePath("/admin/showcases");
        revalidatePath("/");
        return { ok: true };
    } catch (error) {
        console.error("deleteShowcase:", error);
        const message = error?.message ?? "";
        if (message === "Unauthorized" || message === "Forbidden") {
            return { error: "You are not authorized to do that." };
        }
        return { error: "Failed to delete. Please try again." };
    }
}
