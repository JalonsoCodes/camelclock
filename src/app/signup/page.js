import AuthModal from "@/components/auth/AuthModal";
import { sanitizeNext } from "@/utils/redirect";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }) {
    const { next } = await searchParams;

    return <AuthModal mode="signup" next={sanitizeNext(next)} />;
}
