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

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_admin) {
        redirect("/dashboard");
    }

    const { data: templates = [] } = await supabase
        .from("clocks")
        .select("*")
        .eq("is_template", true)
        .order("template_sort_order");

    return (
        <>
            <Navbar />
            <AdminTemplates templates={templates} />
        </>
    );
}
