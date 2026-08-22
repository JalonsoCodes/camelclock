"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const TEMPLATE_FIELDS = [
    "title",
    "target_at",
    "intro_text",
    "celebration_message",
    "primary_colour",
    "secondary_colour",
    "template_sort_order",
];

function pickFields(values) {
    const out = {};
    for (const key of TEMPLATE_FIELDS) {
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

    return supabase;
}

export async function createTemplate(values) {
    try {
        const supabase = await requireAdmin();
        const { data, error } = await supabase
            .from("templates")
            .insert([pickFields(values)])
            .select()
            .single();
        if (error) {
            return { error: "Failed to create template." };
        }
        revalidatePath("/admin/templates");
        return { data };
    } catch (error) {
        console.error("createTemplate:", error);
        return { error: "You are not authorized to do that." };
    }
}

export async function updateTemplate(id, values) {
    try {
        const supabase = await requireAdmin();
        const { data, error } = await supabase
            .from("templates")
            .update(pickFields(values))
            .eq("id", id)
            .select()
            .single();
        if (error) {
            return { error: "Failed to save." };
        }
        revalidatePath("/admin/templates");
        return { data };
    } catch (error) {
        console.error("updateTemplate:", error);
        return { error: "You are not authorized to do that." };
    }
}

export async function deleteTemplate(id) {
    try {
        const supabase = await requireAdmin();
        const { error } = await supabase
            .from("templates")
            .delete()
            .eq("id", id);
        if (error) {
            return { error: "Failed to delete." };
        }
        revalidatePath("/admin/templates");
        return { ok: true };
    } catch (error) {
        console.error("deleteTemplate:", error);
        return { error: "You are not authorized to do that." };
    }
}
