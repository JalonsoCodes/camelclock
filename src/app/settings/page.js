import { redirect } from "next/navigation";
import SettingsView from "@/components/SettingsView";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Settings | CamelClocks",
};

export default async function SettingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/settings");
    }

    return <SettingsView email={user.email ?? ""} />;
}
