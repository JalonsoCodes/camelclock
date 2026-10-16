"use client";

import { useState } from "react";
import { AtSign, KeyRound, Mail, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { changePassword, deleteAccount, updateUsername } from "@/app/settings/actions";
import PasswordRequirements from "./PasswordRequirements";
import { validatePassword } from "@/utils/passwordValidation";
import { validateUsername } from "@/utils/usernameValidation";
import EmailConfirmBanner from "./EmailConfirmBanner";

export default function SettingsView({ email, emailConfirmed = true, username = null }) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwStatus, setPwStatus] = useState(null);
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
        } else {
            setHandleStatus({ type: "error", text: result?.error ?? "Something went wrong." });
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPwStatus(null);

        if (password !== confirmPassword) {
            setPwStatus({ type: "error", text: "Passwords do not match." });
            return;
        }
        const passwordError = validatePassword(password);
        if (passwordError) {
            setPwStatus({ type: "error", text: passwordError });
            return;
        }

        setSavingPassword(true);
        const result = await changePassword(password);
        setSavingPassword(false);

        if (result?.ok) {
            setPassword("");
            setConfirmPassword("");
            setPwStatus({ type: "ok", text: "PASSWORD UPDATED." });
        } else {
            setPwStatus({ type: "error", text: result?.error ?? "Something went wrong." });
        }
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
                <form className="settings-form" onSubmit={handlePasswordSubmit}>
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
                    <button className="auth-button" type="submit" disabled={savingPassword}>
                        <KeyRound className="button-icon" />
                        {savingPassword ? "SAVING..." : "UPDATE PASSWORD"}
                    </button>
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
