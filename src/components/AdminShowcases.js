"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { reorderShowcases } from "@/app/admin/showcases/actions";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatTarget(targetAt) {
    const d = new Date(targetAt);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${hh}:${mm}`;
}

function byOrder(a, b) {
    return a.showcase_order - b.showcase_order;
}

export default function AdminShowcases({ clocks: initialClocks }) {
    const [clocks, setClocks] = useState(() => [...initialClocks].sort(byOrder));
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");

    const move = async (clock, direction) => {
        if (busyId) return;
        setError("");

        const list = [...clocks];
        const index = list.findIndex((c) => c.id === clock.id);
        const target = index + direction;
        if (index === -1 || target < 0 || target >= list.length) return;

        [list[index], list[target]] = [list[target], list[index]];

        const previous = clocks;

        setBusyId(clock.id);
        setClocks(list.map((c, i) => ({ ...c, showcase_order: i })));

        const { error: actionError } = await reorderShowcases(list.map((c) => c.id));
        setBusyId(null);

        if (actionError) {
            setClocks(previous);
            setError(actionError);
        }
    };

    return (
        <div className="admin-showcase-page">
            <div className="admin-header">
                <h1>Showcase Order</h1>
            </div>

            <p className="admin-showcase-hint">
                These are the clocks featured on the landing page, in the order they appear. Flag a clock by
                setting <code>is_showcase = true</code> on its row in the database, then set its order here.
            </p>

            {error && <p className="admin-showcase-status">{error}</p>}

            {clocks.length === 0 ? (
                <p className="admin-empty">
                    No clocks are flagged as showcases. Set <code>is_showcase = true</code> on a live clock to
                    feature it.
                </p>
            ) : (
                <div className="showcase-sheet nbtc">
                    <table className="showcase-table">
                        <thead>
                            <tr>
                                <th className="col-order">ORDER</th>
                                <th className="col-title">CLOCK</th>
                                <th className="col-target">TARGET</th>
                                <th className="col-hydrations">HYDRATIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clocks.map((clock, index) => {
                                const isFirst = index === 0;
                                const isLast = index === clocks.length - 1;

                                return (
                                    <tr key={clock.id}>
                                        <td className="col-order">
                                            <div className="order-controls">
                                                <button
                                                    className="order-arrow nbtc"
                                                    type="button"
                                                    title="Move up"
                                                    aria-label="Move up"
                                                    onClick={() => move(clock, -1)}
                                                    disabled={isFirst || !!busyId}
                                                >
                                                    <ArrowUp aria-hidden="true" />
                                                </button>
                                                <button
                                                    className="order-arrow nbtc"
                                                    type="button"
                                                    title="Move down"
                                                    aria-label="Move down"
                                                    onClick={() => move(clock, 1)}
                                                    disabled={isLast || !!busyId}
                                                >
                                                    <ArrowDown aria-hidden="true" />
                                                </button>
                                            </div>
                                        </td>

                                        <td className="col-title">
                                            <Link href={`/clock/${clock.id}`} className="pressable admin-showcase-link">
                                                {clock.title}
                                                <ExternalLink className="button-icon" aria-hidden="true" />
                                            </Link>
                                        </td>

                                        <td className="col-target">
                                            <span className="admin-clock-hint">{formatTarget(clock.target_at)}</span>
                                        </td>

                                        <td className="col-hydrations">
                                            <span className="admin-clock-hint">
                                                {clock.hydrate_count} &middot; {clock.hydrator_count ?? 0} hydrators
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
