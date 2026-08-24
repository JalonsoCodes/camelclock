const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://camelclock.com";

export default function robots() {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/admin",
                    "/dashboard",
                    "/settings",
                    "/new",
                    "/edit",
                    "/login",
                    "/signup",
                    "/forgot-password",
                    "/reset-password",
                    "/auth",
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
