"use client";

import { useState } from "react";
import { KeyRound, Mail, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { changePassword, deleteAccount } from "@/app/settings/actions";

export default function SettingsView({ email }) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwStatus, setPwStatus] = useState(null);
    const [savingPassword, setSavingPassword] = useState(false);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPwStatus(null);

        if (password !== confirmPassword) {
            setPwStatus({ type: "error", text: "Passwords do not match." });
            return;
        }
        if (password.length < 8) {
            setPwStatus({ type: "error", text: "Password must be at least 8 characters." });
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
                    your follows. This cannot be undone.
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
