"use client";

import { Check } from "lucide-react";
import { PASSWORD_RULES } from "@/utils/passwordValidation";

export default function PasswordRequirements({ password = "" }) {
    const value = typeof password === "string" ? password : "";

    return (
        <ul className="password-reqs">
            {PASSWORD_RULES.map((rule) => {
                const met = rule.test(value);
                return (
                    <li key={rule.label} className={met ? "req-met" : "req-unmet"}>
                        <Check className="req-icon" aria-hidden="true" />
                        {rule.label}
                    </li>
                );
            })}
        </ul>
    );
}