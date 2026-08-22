import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import AdminTemplates from "@/components/AdminTemplates";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/admin/templates");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (profileError) {
        console.error("Failed to load admin profile:", profileError.message);
    }

    if (!profile?.is_admin) {
        redirect("/dashboard");
    }

    const { data: templates = [], error: templatesError } = await supabase
        .from("templates")
        .select("*")
        .order("template_sort_order");

    if (templatesError) {
        console.error("Failed to load admin templates:", templatesError.message);
    }

    return (
        <>
            <Navbar />
            <AdminTemplates templates={templates} />
        </>
    );
}
