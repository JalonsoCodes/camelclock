"use client";

import { useRef, useState } from "react";
import { Play, Plus, Save, Shuffle, Trash2 } from "lucide-react";
import CamelClock from "./CamelClock";
import ConfirmDialog from "./ConfirmDialog";
import { createShowcase, deleteShowcase, updateShowcase } from "@/app/admin/showcases/actions";
import { getConfiguredTarget, getDaysInMonth } from "@/utils/time";
import { validateClock } from "@/utils/validation";
import { wearables as wearableData } from "@/utils/grids";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const EMPTY_SHOWCASE = {
    title: "New Showcase",
    target_at: new Date(new Date().getFullYear() + 1, 0, 1).toISOString(),
    intro_text: "Ends in:",
    celebration_message: "TIME IS UP!",
    primary_colour: "#DBB279",
    secondary_colour: "#8E652C",
    celebration_type: "spit",
    wearables: [],
};

const SHEET_COLUMNS = [
    ["PREVIEW", "col-preview"],
    ["TITLE", "col-title"],
    ["TARGET", "col-target"],
    ["LABEL", "col-label"],
    ["COMPLETION MESSAGE", "col-message"],
    ["COLOURS", "col-colours"],
    ["WEARABLES", "col-wearables"],
    ["LIVE CLOCK", "col-clock"],
    ["ACTIONS", "col-actions"],
];

function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function HexColourInput({ idPrefix, value, onChange }) {
    return (
        <div className="colour-picker-wrapper">
            <input
                className="nbtc colour-swatch"
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <div className="hex-input-container nbtc">
                <span className="hex-hash">#</span>
                <input
                    className="colour-hex-text"
                    type="text"
                    value={undefined}
                    defaultValue={value.replace('#', '').toUpperCase()}
                    key={`${idPrefix}-${value}`}
                    onChange={(e) => {
                        const cleanValue = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                        e.target.value = cleanValue.toUpperCase();
                        if (cleanValue.length === 6) {
                            onChange(`#${cleanValue}`);
                        }
                    }}
                    maxLength={7}
                    onFocus={(e) => e.target.select()}
                />
            </div>
        </div>
    );
}

function ShowcaseRow({ showcase, onSave, onRequestDelete }) {
    const clockRef = useRef(null);
    const [fields, setFields] = useState({
        title: showcase.title ?? "",
        intro_text: showcase.intro_text ?? "",
        celebration_message: showcase.celebration_message ?? "",
        primary_colour: showcase.primary_colour ?? "#DBB279",
        secondary_colour: showcase.secondary_colour ?? "#8E652C",
        wearables: showcase.wearables ?? [],
    });
    const [linkedClockId, setLinkedClockId] = useState(showcase.clock_id ?? null);

    const target = new Date(showcase.target_at);
    const [month, setMonth] = useState(target.getMonth());
    const [day, setDay] = useState(target.getDate());
    const [time, setTime] = useState(
        `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`
    );

    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState("");

    const update = (key, value) => setFields((prev) => ({ ...prev, [key]: value }));

    const randomiseColours = () => {
        const hue = Math.floor(Math.random() * 360);
        update("primary_colour", hslToHex(hue, 55, 68));
        const secondaryHue = (hue + 60 + Math.floor(Math.random() * 120)) % 360;
        update("secondary_colour", hslToHex(secondaryHue, 45, 30));
    };

    const toggleWearable = (id, cat) => {
        setFields((prev) => {
            if (prev.wearables.includes(id)) {
                return { ...prev, wearables: prev.wearables.filter((wid) => wid !== id) };
            }
            return {
                ...prev,
                wearables: [...prev.wearables.filter((wid) => wearableData[wid]?.category !== cat), id],
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setStatus("");

        const validation = validateClock({
            title: fields.title,
            introText: fields.intro_text,
            celebrationMessage: fields.celebration_message,
            primaryColour: fields.primary_colour,
            secondaryColour: fields.secondary_colour,
            month,
            day,
            time,
            wearables: fields.wearables,
        });
        if (!validation.valid) {
            setStatus(validation.errors[0]);
            setSaving(false);
            return;
        }

        let targetDate = getConfiguredTarget(month, day, time, target.getFullYear());
        if (targetDate <= new Date()) {
            targetDate.setFullYear(target.getFullYear() + 1);
        }

        const { data, error, createdClock } = await updateShowcase(showcase.id, {
            title: fields.title,
            target_at: targetDate.toISOString(),
            intro_text: fields.intro_text,
            celebration_message: fields.celebration_message,
            primary_colour: fields.primary_colour,
            secondary_colour: fields.secondary_colour,
            celebration_type: "spit",
            wearables: fields.wearables,
        });

        setSaving(false);
        if (error) {
            setStatus(error ?? "Failed to save");
            return;
        }

        if (data?.clock_id) {
            setLinkedClockId(data.clock_id);
        }
        setStatus(createdClock ? "Saved! Clock created." : "Saved!");
        onSave?.(data);
        setTimeout(() => setStatus(""), 2000);
    };

    const categories = {};
    Object.entries(wearableData).forEach(([id, item]) => {
        if (!categories[item.category]) categories[item.category] = [];
        categories[item.category].push({ id, ...item });
    });

    return (
        <tr>
            <td className="col-preview">
                <CamelClock
                    ref={clockRef}
                    title={fields.title}
                    month={month}
                    day={day}
                    time={time}
                    introText={fields.intro_text}
                    celebrationMessage={fields.celebration_message}
                    primaryColour={fields.primary_colour}
                    secondaryColour={fields.secondary_colour}
                    celebrationType="spit"
                    boosts={fields.wearables}
                />
                <button className="preview-button" type="button" title="Preview the finished countdown" onClick={() => clockRef.current?.preview()}>
                    <Play fill="currentColor" strokeWidth={0} aria-hidden="true" />
                    Preview completion
                </button>
            </td>

            <td className="col-title">
                <label className="cell-label">TITLE</label>
                <input
                    className="nbtc"
                    type="text"
                    value={fields.title}
                    maxLength="72"
                    onChange={(e) => update("title", e.target.value)}
                    onFocus={(e) => e.target.select()}
                />
            </td>

            <td className="col-target">
                <label className="cell-label">MONTH</label>
                <select className="nbtc" value={month} onChange={(e) => {
                    const newMonth = Number(e.target.value);
                    setMonth(newMonth);
                    const maxDays = getDaysInMonth(newMonth, target.getFullYear());
                    setDay((d) => Math.min(d, maxDays));
                }}>
                    {MONTH_NAMES.map((name, i) => (
                        <option key={i} value={i}>{name}</option>
                    ))}
                </select>

                <label className="cell-label">DAY</label>
                <input
                    className="nbtc"
                    type="number"
                    min="1"
                    max="31"
                    value={day}
                    onChange={(e) => setDay(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                />

                <label className="cell-label">TIME</label>
                <input
                    className="nbtc"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                />
            </td>

            <td className="col-label">
                <label className="cell-label">LABEL</label>
                <input
                    className="nbtc"
                    type="text"
                    value={fields.intro_text}
                    maxLength="15"
                    onChange={(e) => update("intro_text", e.target.value)}
                    onFocus={(e) => e.target.select()}
                />
            </td>

            <td className="col-message">
                <label className="cell-label">COMPLETION MESSAGE</label>
                <textarea
                    className="nbtc"
                    value={fields.celebration_message}
                    rows="3"
                    maxLength="140"
                    placeholder="Shown at the end of the animation"
                    onChange={(e) => update("celebration_message", e.target.value)}
                    onFocus={(e) => e.target.select()}
                />
            </td>

            <td className="col-colours">
                <label className="cell-label">PRIMARY</label>
                <HexColourInput idPrefix={`primary-${showcase.id}`} value={fields.primary_colour} onChange={(v) => update("primary_colour", v)} />

                <label className="cell-label">SECONDARY</label>
                <HexColourInput idPrefix={`secondary-${showcase.id}`} value={fields.secondary_colour} onChange={(v) => update("secondary_colour", v)} />

                <button className="randomise-button" type="button" title="Randomise the colour palette" onClick={randomiseColours}>
                    <Shuffle aria-hidden="true" />
                    Randomise colours
                </button>
            </td>

            <td className="col-wearables">
                <label className="cell-label">WEARABLES</label>
                {Object.entries(categories).map(([cat, items]) => (
                    <div key={cat} className="wearables-chip-group">
                        <span className="wearables-chip-heading">{cat}</span>
                        <div className="wearables-chip-row">
                            {items.map((item) => {
                                const isSelected = fields.wearables.includes(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={`wearables-chip${isSelected ? " selected" : ""}`}
                                        title={`${item.name} (${cat})`}
                                        onClick={() => toggleWearable(item.id, cat)}
                                    >
                                        {isSelected ? "✓" : item.emoji}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </td>

            <td className="col-clock">
                <label className="cell-label">CLOCK</label>
                {linkedClockId ? (
                    <a
                        href={`/clock/${linkedClockId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open the live showcase clock"
                        className="nbtc pressable admin-open-button"
                    >
                        OPEN
                    </a>
                ) : (
                    <p className="admin-clock-hint">Created on first save.</p>
                )}
            </td>

            <td className="col-actions cell-actions">
                <button className="admin-save-button nbtc" type="button" onClick={handleSave} disabled={saving}>
                    <Save className="button-icon" />
                    {saving ? "Saving..." : "Save"}
                </button>
                <button
                    className="admin-delete-button nbtc"
                    type="button"
                    onClick={() => onRequestDelete(showcase.id)}
                >
                    <Trash2 className="button-icon" />
                    Delete
                </button>
                {status && <p className="admin-showcase-status">{status}</p>}
            </td>
        </tr>
    );
}

export default function AdminShowcases({ showcases: initialShowcases }) {
    const [showcases, setShowcases] = useState(initialShowcases);
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState("");
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const pendingShowcase = showcases.find((s) => s.id === pendingDeleteId);

    const handleDelete = (id) => {
        setShowcases((prev) => prev.filter((s) => s.id !== id));
    };

    const confirmDelete = async () => {
        setDeleting(true);
        setDeleteError("");

        const { error } = await deleteShowcase(pendingDeleteId);

        setDeleting(false);
        if (error) {
            setDeleteError(error);
            setPendingDeleteId(null);
        } else {
            handleDelete(pendingDeleteId);
            setPendingDeleteId(null);
        }
    };

    const handleAdd = async () => {
        setAdding(true);
        setAddError("");

        const { data, error } = await createShowcase(EMPTY_SHOWCASE);

        setAdding(false);

        if (error) {
            setAddError(error);
        } else if (data) {
            setShowcases((prev) => [...prev, data]);
        }
    };

    return (
        <div className="admin-showcase-page">
            <div className="admin-header">
                <h1>Showcase Manager</h1>
                <button className="share-button nbtc" type="button" onClick={handleAdd} disabled={adding}>
                    <Plus className="button-icon" />
                    {adding ? "Adding..." : "New Showcase"}
                </button>
            </div>

            {addError && <p className="admin-showcase-status">{addError}</p>}
            {deleteError && <p className="admin-showcase-status">{deleteError}</p>}

            {showcases.length === 0 ? (
                <p className="admin-empty">No showcases yet. Add one to get started.</p>
            ) : (
                <div className="showcase-sheet nbtc">
                    <table className="showcase-table">
                        <thead>
                            <tr>
                                {SHEET_COLUMNS.map(([label, colClass]) => (
                                    <th key={label} className={colClass}>{label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {showcases.map((showcase) => (
                                <ShowcaseRow
                                    key={showcase.id}
                                    showcase={showcase}
                                    onSave={(updated) => {
                                        setShowcases((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
                                    }}
                                    onRequestDelete={setPendingDeleteId}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {pendingDeleteId && (
                <ConfirmDialog
                    message={
                        pendingShowcase?.clock_id
                            ? `Delete "${pendingShowcase.title}" and its live clock? This cannot be undone.`
                            : `Delete "${pendingShowcase?.title}"? This cannot be undone.`
                    }
                    onConfirm={confirmDelete}
                    onCancel={() => setPendingDeleteId(null)}
                />
            )}
        </div>
    );
}
