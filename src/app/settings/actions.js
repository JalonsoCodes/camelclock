"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePassword } from "@/utils/passwordValidation";
import { normalizeUsername, validateUsername } from "@/utils/usernameValidation";

const PASSWORD_MESSAGES = {
    "New password should be different from the old password.": "Choose a password you haven't used before.",
    "Password should be at least 6 characters.": "Password must be at least 8 characters.",
};

export async function changePassword(password) {
    const passwordError = validatePassword(password);
    if (passwordError) {
        return { error: passwordError };
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

export async function updateUsername(input) {
    const usernameError = validateUsername(input);
    if (usernameError) {
        return { error: usernameError };
    }

    const username = normalizeUsername(input);

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return { error: "You are not signed in." };
    }

    const { error } = await supabase.from("profiles").update({ username }).eq("id", user.id);
    if (error) {
        if (error.code === "23505") {
            return { error: "That handle is taken." };
        }
        console.error("updateUsername:", error.message);
        return { error: "Could not update your handle. Please try again." };
    }

    return { ok: true, username };
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

    const { error: followsError } = await admin.from("follows").delete().eq("user_id", user.id);
    if (followsError) {
        console.error("deleteAccount: failed to delete follows:", followsError.message);
        return { error: "Failed to clean up your data (follows). Please try again." };
    }

    const { error: clocksError } = await admin.from("clocks").delete().eq("user_id", user.id);
    if (clocksError) {
        console.error("deleteAccount: failed to delete clocks:", clocksError.message);
        return { error: "Failed to delete your clocks. Please try again." };
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
        console.error("deleteAccount:", error.message);
        return { error: "Failed to delete your account. Please try again." };
    }

    await supabase.auth.signOut();
    redirect("/");
}
