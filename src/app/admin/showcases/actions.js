"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateClock } from "@/utils/validation";

const SHOWCASE_FIELDS = [
    "title",
    "target_at",
    "intro_text",
    "celebration_message",
    "primary_colour",
    "secondary_colour",
    "celebration_type",
    "wearables",
    "sort_order",
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

    return { supabase };
}

export async function createShowcase(values) {
    try {
        const { supabase } = await requireAdmin();

        const validationError = validateShowcasePayload(values);
        if (validationError) {
            return { error: validationError };
        }

        const { data: maxRow } = await supabase
            .from("showcases")
            .select("sort_order")
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle();

        const nextOrder = (maxRow?.sort_order ?? -1) + 1;

        const { data, error } = await supabase
            .from("showcases")
            .insert([{ ...pickFields(values), sort_order: nextOrder }])
            .select()
            .single();
        if (error) {
            console.error("createShowcase insert:", error);
            return { error: "Failed to create showcase." };
        }
        revalidatePath("/admin/showcases");
        revalidatePath("/");
        return { data };
    } catch (error) {
        console.error("createShowcase:", error);
        return { error: "You are not authorized to do that." };
    }
}

export async function updateShowcase(id, values) {
    try {
        const { supabase } = await requireAdmin();

        const validationError = validateShowcasePayload(values);
        if (validationError) {
            return { error: validationError };
        }

        const { data, error } = await supabase
            .from("showcases")
            .update(pickFields(values))
            .eq("id", id)
            .select()
            .single();
        if (error) {
            return { error: "Failed to save." };
        }

        revalidatePath("/admin/showcases");
        revalidatePath("/");
        return { data };
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

export async function reorderShowcases(orderedIds) {
    try {
        const { supabase } = await requireAdmin();

        if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== "string")) {
            return { error: "Invalid order." };
        }

        for (let i = 0; i < orderedIds.length; i++) {
            const { error } = await supabase
                .from("showcases")
                .update({ sort_order: i })
                .eq("id", orderedIds[i]);
            if (error) {
                console.error("reorderShowcases update:", error);
                return { error: "Failed to reorder." };
            }
        }

        revalidatePath("/admin/showcases");
        revalidatePath("/");
        return { ok: true };
    } catch (error) {
        console.error("reorderShowcases:", error);
        const message = error?.message ?? "";
        if (message === "Unauthorized" || message === "Forbidden") {
            return { error: "You are not authorized to do that." };
        }
        return { error: "Failed to reorder. Please try again." };
    }
}
