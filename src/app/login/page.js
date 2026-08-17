import AuthModal from "@/components/auth/AuthModal";

export const dynamic = "force-dynamic";

function sanitizeNext(next) {
    if (!next || !next.startsWith("/") || next.includes("://")) {
        return "/dashboard";
    }
    return next;
}

export default async function LoginPage({ searchParams }) {
    const { next } = await searchParams;

    return <AuthModal mode="login" next={sanitizeNext(next)} />;
}
