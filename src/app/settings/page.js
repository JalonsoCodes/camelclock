import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import SettingsView from "@/components/SettingsView";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Settings | CamelClock",
};

export default async function SettingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/settings");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

    return (
        <>
            <Navbar />
            <main>
                <SettingsView
                    email={user.email ?? ""}
                    emailConfirmed={Boolean(user.email_confirmed_at)}
                    username={profile?.username ?? null}
                />
            </main>
        </>
    );
}
