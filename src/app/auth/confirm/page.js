import { Suspense } from "react";
import ConfirmForm from "@/components/auth/ConfirmForm";

export const dynamic = "force-dynamic";

export default function ConfirmPage() {
    return (
        <Suspense>
            <ConfirmForm />
        </Suspense>
    );
}
