"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import CamelClock from "./CamelClock";
import ConfirmDialog from "./ConfirmDialog";
import { createTemplate, deleteTemplate, updateTemplate } from "@/app/admin/templates/actions";
import { getConfiguredTarget, getDaysInMonth } from "@/utils/time";
import { validateClock } from "@/utils/validation";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const EMPTY_TEMPLATE = {
    title: "New Template",
    target_at: new Date(new Date().getFullYear() + 1, 0, 1).toISOString(),
    intro_text: "Ends in:",
    celebration_message: "TIME IS UP!",
    primary_colour: "#DBB279",
    secondary_colour: "#8E652C",
    celebration_type: "spit",
    template_sort_order: 100,
};

function TemplateEditor({ template, onSave, onDelete }) {
    const [fields, setFields] = useState({
        title: template.title ?? "",
        intro_text: template.intro_text ?? "",
        celebration_message: template.celebration_message ?? "",
        primary_colour: template.primary_colour ?? "#DBB279",
        secondary_colour: template.secondary_colour ?? "#8E652C",
        template_sort_order: template.template_sort_order ?? 0,
    });

    const target = new Date(template.target_at);
    const [month, setMonth] = useState(target.getMonth());
    const [day, setDay] = useState(target.getDate());
    const [time, setTime] = useState(
        `${String(target.getHours()).padStart(2, "0")}:${String(target.getMinutes()).padStart(2, "0")}`
    );

    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const update = (key, value) => setFields((prev) => ({ ...prev, [key]: value }));

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
        });
        if (!validation.valid) {
            setStatus(validation.errors[0]);
            setSaving(false);
            return;
        }

        const currentYear = new Date().getFullYear();
        let targetDate = getConfiguredTarget(month, day, time, currentYear);
        if (targetDate <= new Date()) {
            targetDate.setFullYear(currentYear + 1);
        }

        const { data, error } = await updateTemplate(template.id, {
            title: fields.title,
            target_at: targetDate.toISOString(),
            intro_text: fields.intro_text,
            celebration_message: fields.celebration_message,
            primary_colour: fields.primary_colour,
            secondary_colour: fields.secondary_colour,
            template_sort_order: fields.template_sort_order,
        });

        setSaving(false);
        setStatus(error ? (error ?? "Failed to save") : "Saved!");
        if (!error && data) {
            onSave?.(data);
            setTimeout(() => setStatus(""), 2000);
        }
    };

    const handleDelete = async () => {
        setDeleteError("");
        const { error } = await deleteTemplate(template.id);
        if (error) {
            setDeleteError(error);
            setConfirmDelete(false);
        } else {
            onDelete(template.id);
        }
    };

    return (
        <div className="admin-template-card nbtc">
            <div className="admin-template-preview">
                <CamelClock
                    title={fields.title}
                    month={month}
                    day={day}
                    time={time}
                    introText={fields.intro_text}
                    celebrationMessage={fields.celebration_message}
                    primaryColour={fields.primary_colour}
                    secondaryColour={fields.secondary_colour}
                    celebrationType="spit"
                />
            </div>

            <div className="admin-template-fields">
                <label>
                    TITLE
                    <input
                        className="nbtc"
                        type="text"
                        value={fields.title}
                        maxLength="72"
                        onChange={(e) => update("title", e.target.value)}
                        onFocus={(e) => e.target.select()}
                    />
                </label>

                <div className="form-group three-quarter-split">
                    <label>
                        MONTH
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
                    </label>

                    <label>
                        DAY
                        <input
                            className="nbtc"
                            type="number"
                            min="1"
                            max="31"
                            value={day}
                            onChange={(e) => setDay(Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                        />
                    </label>
                </div>

                <label>
                    TIME
                    <input
                        className="nbtc"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                    />
                </label>

                <label>
                    LABEL
                    <input
                        className="nbtc"
                        type="text"
                        value={fields.intro_text}
                        maxLength="15"
                        onChange={(e) => update("intro_text", e.target.value)}
                        onFocus={(e) => e.target.select()}
                    />
                </label>

                <label>
                    COMPLETION MESSAGE
                    <input
                        className="nbtc"
                        type="text"
                        value={fields.celebration_message}
                        maxLength="140"
                        onChange={(e) => update("celebration_message", e.target.value)}
                        onFocus={(e) => e.target.select()}
                    />
                </label>

                <div className="form-group">
                    <label>
                        PRIMARY COLOUR
                        <div className="colour-picker-wrapper">
                            <input
                                className="nbtc colour-swatch"
                                type="color"
                                value={fields.primary_colour}
                                onChange={(e) => update("primary_colour", e.target.value)}
                            />
                            <div className="hex-input-container nbtc">
                                <span className="hex-hash">#</span>
                                <input
                                    className="colour-hex-text"
                                    type="text"
                                    value={undefined}
                                    defaultValue={fields.primary_colour.replace('#', '').toUpperCase()}
                                    key={`primary-${fields.primary_colour}`}
                                    onChange={(e) => {
                                        const cleanValue = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                                        e.target.value = cleanValue.toUpperCase();
                                        if (cleanValue.length === 6) {
                                            update("primary_colour", `#${cleanValue}`);
                                        }
                                    }}
                                    maxLength={7}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>
                    </label>

                    <label>
                        SECONDARY COLOUR
                        <div className="colour-picker-wrapper">
                            <input
                                className="nbtc colour-swatch"
                                type="color"
                                value={fields.secondary_colour}
                                onChange={(e) => update("secondary_colour", e.target.value)}
                            />
                            <div className="hex-input-container nbtc">
                                <span className="hex-hash">#</span>
                                <input
                                    className="colour-hex-text"
                                    type="text"
                                    value={undefined}
                                    defaultValue={fields.secondary_colour.replace('#', '').toUpperCase()}
                                    key={`secondary-${fields.secondary_colour}`}
                                    onChange={(e) => {
                                        const cleanValue = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                                        e.target.value = cleanValue.toUpperCase();
                                        if (cleanValue.length === 6) {
                                            update("secondary_colour", `#${cleanValue}`);
                                        }
                                    }}
                                    maxLength={7}
                                    onFocus={(e) => e.target.select()}
                                />
                            </div>
                        </div>
                    </label>
                </div>

                <label>
                    ORDER
                    <input
                        className="nbtc"
                        type="number"
                        value={fields.template_sort_order}
                        onChange={(e) => update("template_sort_order", Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                    />
                </label>

                <div className="admin-template-actions">
                    <button className="admin-save-button nbtc" type="button" onClick={handleSave} disabled={saving}>
                        <Save className="button-icon" />
                        {saving ? "Saving..." : "Save"}
                    </button>
                    <button className="admin-delete-button nbtc" type="button" onClick={() => setConfirmDelete(true)}>
                        <Trash2 className="button-icon" />
                        Delete
                    </button>
                </div>

                {status && <p className="admin-template-status">{status}</p>}
                {deleteError && <p className="admin-template-status">{deleteError}</p>}
            </div>

            {confirmDelete && (
                <ConfirmDialog
                    message={`Delete "${template.title}"? This cannot be undone.`}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
        </div>
    );
}

export default function AdminTemplates({ templates: initialTemplates }) {
    const [templates, setTemplates] = useState(initialTemplates);
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState("");

    const handleDelete = (id) => {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
    };

    const handleAdd = async () => {
        setAdding(true);
        setAddError("");

        const { data, error } = await createTemplate(EMPTY_TEMPLATE);

        setAdding(false);

        if (error) {
            setAddError(error);
        } else if (data) {
            setTemplates((prev) => [...prev, data]);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Template Manager</h1>
                <button className="share-button nbtc" type="button" onClick={handleAdd} disabled={adding}>
                    <Plus className="button-icon" />
                    {adding ? "Adding..." : "New Template"}
                </button>
            </div>

            {addError && <p className="admin-template-status">{addError}</p>}

            {templates.length === 0 ? (
                <p className="admin-empty">No templates yet. Add one to get started.</p>
            ) : (
                <div className="admin-templates-list">
                    {templates.map((template) => (
                        <TemplateEditor
                            key={template.id}
                            template={template}
                            onSave={(updated) => {
                                setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                            }}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
