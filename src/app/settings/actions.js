"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PASSWORD_MESSAGES = {
    "New password should be different from the old password.": "Choose a password you haven't used before.",
    "Password should be at least 6 characters.": "Password must be at least 8 characters.",
};

export async function changePassword(password) {
    if (typeof password !== "string" || password.length < 8) {
        return { error: "Password must be at least 8 characters." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "You are not signed in." };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
        console.error("changePassword:", error.message);
        return { error: PASSWORD_MESSAGES[error.message] ?? "Could not update your password. Please try again." };
    }

    return { ok: true };
}

export async function deleteAccount(confirmation) {
    if (confirmation !== "DELETE") {
        return { error: 'Type DELETE exactly to confirm.' };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "You are not signed in." };
    }

    const admin = createAdminClient();

    const { data: ownedClocks } = await admin
        .from("clocks")
        .select("id")
        .eq("user_id", user.id);
    const ownedIds = (ownedClocks ?? []).map((clock) => clock.id);

    if (ownedIds.length > 0) {
        const { data: showcased } = await admin
            .from("showcases")
            .select("id")
            .in("clock_id", ownedIds);
        if ((showcased ?? []).length > 0) {
            return { error: "This account manages landing-page showcases. Remove those first." };
        }
    }

    await admin.from("follows").delete().eq("user_id", user.id);
    await admin.from("clocks").delete().eq("user_id", user.id);

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
        console.error("deleteAccount:", error.message);
        return { error: "Failed to delete your account. Please try again." };
    }

    await supabase.auth.signOut();
    redirect("/");
}
