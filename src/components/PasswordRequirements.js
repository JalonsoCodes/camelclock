"use client";

import { Check } from "lucide-react";
import { PASSWORD_RULES } from "@/utils/passwordValidation";
import { auth } from "@/content/auth";

export default function PasswordRequirements({ password = "" }) {
    const value = typeof password === "string" ? password : "";

    const rules = PASSWORD_RULES.map((rule) => {
        if (rule.label === "At least 8 characters") return { ...rule, label: auth.passwordRequirements.min };
        if (rule.label === "At least one uppercase letter") return { ...rule, label: auth.passwordRequirements.upper };
        if (rule.label === "At least one lowercase letter") return { ...rule, label: auth.passwordRequirements.lower };
        if (rule.label === "At least one number") return { ...rule, label: auth.passwordRequirements.number };
        return rule;
    });

    return (
        <ul className="password-reqs">
            {rules.map((rule) => {
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