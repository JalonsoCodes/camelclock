"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, X } from "lucide-react";
import { resolveReport } from "@/app/admin/reports/actions";

export default function AdminReports({ reports: initialReports }) {
    const [reports, setReports] = useState(initialReports);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");

    const resolve = async (report, status) => {
        if (busyId) return;

        setError("");
        setBusyId(report.id);
        const previous = reports;
        setReports((current) => current.filter((item) => item.id !== report.id));

        const { error: actionError } = await resolveReport(report.id, status);
        setBusyId(null);

        if (actionError) {
            setReports(previous);
            setError(actionError);
        }
    };

    return (
        <div className="admin-showcase-page">
            <div className="admin-header">
                <h1>Reports</h1>
                <Link className="pressable admin-showcase-link" href="/admin/showcases">
                    <ArrowLeft className="button-icon" aria-hidden="true" />
                    SHOWCASES
                </Link>
            </div>

            <p className="admin-showcase-hint">
                Reports are only visible to admins. Resolving or dismissing closes a report on this list;
                neither action changes the clock itself.
            </p>

            {error && <p className="admin-showcase-status">{error}</p>}

            {reports.length === 0 ? (
                <p className="admin-empty">No open reports.</p>
            ) : (
                <ul className="report-list">
                    {reports.map((report) => (
                        <li key={report.id} className="report-card nbtc">
                            <div className="report-card-top">
                                {report.clock_status === "live" ? (
                                    <Link href={`/clock/${report.clock_id}`} className="pressable admin-showcase-link">
                                        {report.clock_title ?? "Deleted clock"}
                                        <ExternalLink className="button-icon" aria-hidden="true" />
                                    </Link>
                                ) : (
                                    <span className="admin-showcase-link">{report.clock_title ?? "Deleted clock"}</span>
                                )}
                                <span className="admin-clock-hint">{report.when}</span>
                            </div>

                            <p className="report-meta">
                                {report.reporter_handle ? `@${report.reporter_handle}` : "No handle"}
                                {" \u00B7 "}
                                {report.clock_status ? report.clock_status.toUpperCase() : "UNKNOWN"}
                            </p>

                            <p className="report-reason-body">{report.reason}</p>

                            <div className="report-actions">
                                <button
                                    className="btn-link"
                                    type="button"
                                    onClick={() => resolve(report, "resolved")}
                                    disabled={!!busyId}
                                >
                                    <Check className="button-icon" aria-hidden="true" />
                                    RESOLVE
                                </button>
                                <button
                                    className="btn-link"
                                    type="button"
                                    onClick={() => resolve(report, "dismissed")}
                                    disabled={!!busyId}
                                >
                                    <X className="button-icon" aria-hidden="true" />
                                    DISMISS
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
