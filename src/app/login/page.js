import AuthModal from "@/components/auth/AuthModal";
import { sanitizeNext } from "@/utils/redirect";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
    const { next } = await searchParams;

    return <AuthModal mode="login" next={sanitizeNext(next)} />;
}
