import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://camelclock.com";

export default async function sitemap() {
    const entries = [
        { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
        { url: `${siteUrl}/faq`, changeFrequency: "monthly", priority: 0.5 },
        { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
        { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
    ];

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        const { data, error } = await supabase
            .from("clocks")
            .select("id, updated_at")
            .eq("status", "live")
            .eq("is_showcase", true)
            .gt("target_at", new Date().toISOString())
            .order("showcase_order", { ascending: true })
            .limit(5000);
        if (error) {
            throw new Error(error.message);
        }
        for (const clock of data ?? []) {
            entries.push({
                url: `${siteUrl}/clock/${clock.id}`,
                lastModified: clock.updated_at ? new Date(clock.updated_at) : undefined,
                changeFrequency: "daily",
                priority: 0.7,
            });
        }
    } catch (error) {
        console.error("sitemap:", error?.message ?? error);
    }

    return entries;
}
