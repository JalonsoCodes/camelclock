"use client";

import { useState } from "react";
import { AtSign, KeyRound, Mail, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { deleteAccount, updateUsername } from "@/app/settings/actions";
import PasswordRequirements from "./PasswordRequirements";
import { supabase } from "@/lib/supabase/client";
import { validatePassword } from "@/utils/passwordValidation";
import { validateUsername } from "@/utils/usernameValidation";
import { track } from "@/utils/analytics";
import EmailConfirmBanner from "./EmailConfirmBanner";

const PASSWORD_MESSAGES = {
    "New password should be different from the old password.": "Choose a password you haven't used before.",
    "Password should be at least 6 characters.": "Password must be at least 8 characters.",
};

function passwordErrorMessage(message) {
    if (!message) return "Something went wrong. Please try again.";
    if (/nonce|token|otp|expired|invalid/i.test(message)) {
        return "That code is invalid or has expired. Send a new one.";
    }
    return PASSWORD_MESSAGES[message] ?? "Could not update your password. Please try again.";
}

export default function SettingsView({ email, emailConfirmed = true, username = null }) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [code, setCode] = useState("");
    const [pwStep, setPwStep] = useState("request");
    const [pwStatus, setPwStatus] = useState(null);
    const [sendingCode, setSendingCode] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    const [handle, setHandle] = useState(username ?? "");
    const [hasHandle, setHasHandle] = useState(Boolean(username));
    const [handleStatus, setHandleStatus] = useState(null);
    const [savingHandle, setSavingHandle] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const handleHandleSubmit = async (e) => {
        e.preventDefault();
        setHandleStatus(null);

        const handleError = validateUsername(handle);
        if (handleError) {
            setHandleStatus({ type: "error", text: handleError });
            return;
        }

        setSavingHandle(true);
        const result = await updateUsername(handle);
        setSavingHandle(false);

        if (result?.ok) {
            setHasHandle(true);
            setHandleStatus({ type: "ok", text: `HANDLE SAVED — @${result.username}` });
            track("handle_set", { source: "settings" });
        } else {
            setHandleStatus({ type: "error", text: result?.error ?? "Something went wrong." });
        }
    };

    const validateNewPassword = () => {
        if (password !== confirmPassword) {
            setPwStatus({ type: "error", text: "Passwords do not match." });
            return false;
        }
        const passwordError = validatePassword(password);
        if (passwordError) {
            setPwStatus({ type: "error", text: passwordError });
            return false;
        }
        return true;
    };

    /* Secure password change: the account must re-prove itself with an email code
       before the password moves, so a lifted session can't silently change it. */
    const sendCode = async () => {
        setSendingCode(true);
        const { error } = await supabase.auth.reauthenticate();
        setSendingCode(false);
        if (error) {
            setPwStatus({ type: "error", text: "Could not send a code. Please try again." });
            return false;
        }
        return true;
    };

    const handleRequestCode = async (e) => {
        e.preventDefault();
        setPwStatus(null);
        if (!validateNewPassword()) return;
        if (await sendCode()) {
            setPwStep("verify");
            setPwStatus({ type: "ok", text: "We emailed you a 6-digit code." });
        }
    };

    const handleResendCode = async () => {
        setPwStatus(null);
        if (await sendCode()) {
            setPwStatus({ type: "ok", text: "A new code is on its way." });
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setPwStatus(null);

        if (!code.trim()) {
            setPwStatus({ type: "error", text: "Enter the 6-digit code from your email." });
            return;
        }

        setSavingPassword(true);
        const { error } = await supabase.auth.updateUser({ password, nonce: code.trim() });
        setSavingPassword(false);

        if (error) {
            setPwStatus({ type: "error", text: passwordErrorMessage(error.message) });
            return;
        }

        setPassword("");
        setConfirmPassword("");
        setCode("");
        setPwStep("request");
        setPwStatus({ type: "ok", text: "PASSWORD UPDATED." });
    };

    const restartPasswordFlow = () => {
        setPwStep("request");
        setCode("");
        setPwStatus(null);
    };

    const handleDeleteConfirmed = async () => {
        setDeleting(true);
        setDeleteError("");

        try {
            const result = await deleteAccount("DELETE");
            if (result?.error) {
                setDeleteError(result.error);
            }
        } catch {
            setDeleteError("Failed to delete your account. Please try again.");
        }

        setDeleting(false);
        setConfirmDelete(false);
    };

    return (
        <div className="settings-page">
            <h1 className="settings-heading">SETTINGS</h1>

            {!emailConfirmed && <EmailConfirmBanner email={email} />}

            <section className="settings-card nbtc">
                <h2 className="settings-card-title">
                    <KeyRound className="button-icon" />
                    CHANGE PASSWORD
                </h2>
                <form className="settings-form" onSubmit={pwStep === "request" ? handleRequestCode : handleVerifyCode}>
                    {pwStep === "request" ? (
                        <>
                            <label className="auth-label">
                                NEW PASSWORD
                                <input
                                    className="auth-input nbtc"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                />
                            </label>
                            <PasswordRequirements password={password} />
                            <label className="auth-label">
                                CONFIRM NEW PASSWORD
                                <input
                                    className="auth-input nbtc"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                />
                            </label>
                            {pwStatus && (
                                <p className={pwStatus.type === "ok" ? "settings-ok" : "auth-error"}>{pwStatus.text}</p>
                            )}
                            <p className="settings-hint">
                                We&apos;ll email you a 6-digit code to confirm it&apos;s you.
                            </p>
                            <button className="auth-button" type="submit" disabled={sendingCode}>
                                <KeyRound className="button-icon" />
                                {sendingCode ? "SENDING..." : "SEND CODE"}
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="settings-hint">
                                Enter the 6-digit code we sent to {email}.
                            </p>
                            <label className="auth-label">
                                CONFIRMATION CODE
                                <input
                                    className="auth-input nbtc"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    maxLength={10}
                                    required
                                />
                            </label>
                            {pwStatus && (
                                <p className={pwStatus.type === "ok" ? "settings-ok" : "auth-error"}>{pwStatus.text}</p>
                            )}
                            <button className="auth-button" type="submit" disabled={savingPassword}>
                                <KeyRound className="button-icon" />
                                {savingPassword ? "SAVING..." : "UPDATE PASSWORD"}
                            </button>
                            <div className="settings-password-actions">
                                <button className="btn-link" type="button" onClick={handleResendCode} disabled={sendingCode}>
                                    {sendingCode ? "SENDING..." : "RESEND CODE"}
                                </button>
                                <button className="btn-link btn-secondary" type="button" onClick={restartPasswordFlow}>
                                    START OVER
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </section>

            <section className="settings-card nbtc">
                <h2 className="settings-card-title">
                    <AtSign className="button-icon" />
                    YOUR HANDLE
                </h2>
                <p className="settings-hint">
                    Your public @handle — signed-in visitors see matching names on hydrate leaderboards.
                </p>
                <form className="settings-form" onSubmit={handleHandleSubmit}>
                    <label className="auth-label">
                        @HANDLE
                        <input
                            className="auth-input nbtc"
                            type="text"
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            placeholder="e.g. camel_fan"
                            minLength={3}
                            maxLength={20}
                            required
                        />
                    </label>
                    <p className="settings-hint">3–20 characters: lowercase letters, numbers and underscores.</p>
                    {handleStatus && (
                        <p className={handleStatus.type === "ok" ? "settings-ok" : "auth-error"}>{handleStatus.text}</p>
                    )}
                    <button className="auth-button" type="submit" disabled={savingHandle}>
                        <AtSign className="button-icon" />
                        {savingHandle ? "SAVING..." : hasHandle ? "UPDATE HANDLE" : "SET HANDLE"}
                    </button>
                </form>
            </section>

            <section className="settings-card settings-email-card nbtc">
                <h2 className="settings-card-title">
                    <Mail className="button-icon" />
                    EMAIL
                </h2>
                <p className="settings-email">{email}</p>
                <p className="settings-hint">Your sign-in email. Contact us if you need to change it.</p>
            </section>

            <section className="settings-card danger-zone">
                <h2 className="settings-card-title">
                    <Trash2 className="button-icon" />
                    DANGER ZONE
                </h2>
                <p className="settings-danger-copy">
                    Deleting your account permanently removes every clock you own and all of
                    your hydrations. This cannot be undone.
                </p>
                {deleteError && <p className="auth-error">{deleteError}</p>}
                <button className="danger-button" type="button" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="button-icon" />
                    DELETE ACCOUNT
                </button>
            </section>

            {confirmDelete && (
                <ConfirmDialog
                    message="This permanently deletes your account and every CamelClock you own. Type DELETE to confirm."
                    confirmLabel="DELETE FOREVER"
                    typeToConfirm="DELETE"
                    busy={deleting}
                    danger
                    onConfirm={handleDeleteConfirmed}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
        </div>
    );
}
