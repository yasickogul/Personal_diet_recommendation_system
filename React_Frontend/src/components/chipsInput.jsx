import React, { useMemo, useState } from "react";

export default function ChipsInput({
  label = "Allergies (optional)",
  placeholder = "Type an allergy and press Enter",
  value = [],
  onChange,
  maxItems = 20,
}) {
  const [text, setText] = useState("");

  const normalized = useMemo(
    () => value.map((v) => v.trim()).filter(Boolean),
    [value]
  );

  function addChip(raw) {
    const chip = raw.trim();
    if (!chip) return;

    // prevent duplicates (case-insensitive)
    const exists = normalized.some((x) => x.toLowerCase() === chip.toLowerCase());
    if (exists) return;

    if (normalized.length >= maxItems) return;

    onChange([...normalized, chip]);
  }

  function removeChip(chip) {
    onChange(normalized.filter((x) => x !== chip));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addChip(text);
      setText("");
    }

    // Optional: Backspace deletes last chip when input empty
    if (e.key === "Backspace" && text === "" && normalized.length > 0) {
      removeChip(normalized[normalized.length - 1]);
    }
  }

  function handleAddClick() {
    addChip(text);
    setText("");
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={styles.rowTop}>
        <div style={styles.label}>{label}</div>
        <button type="button" onClick={handleAddClick} style={styles.addNew}>
          Add New
        </button>
      </div>

      {/* Chips + input in one "pill area" like your screenshot */}
      <div style={styles.chipArea} onClick={() => document.getElementById("chipInput")?.focus()}>
        {normalized.map((chip) => (
          <span key={chip} style={styles.chip}>
            {chip}
            <button
              type="button"
              onClick={() => removeChip(chip)}
              aria-label={`Remove ${chip}`}
              style={styles.chipX}
            >
              ×
            </button>
          </span>
        ))}

        <input
          id="chipInput"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={normalized.length === 0 ? placeholder : ""}
          style={styles.input}
        />
      </div>

      <div style={styles.hint}>
        Add one-by-one (press Enter). Example: Peanuts, Milk, Egg, Seafood
      </div>
    </div>
  );
}

const styles = {
  rowTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  label: { fontSize: 13, fontWeight: 700, color: "#475569" },
  addNew: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontWeight: 800,
    color: "#4F46E5",
    fontSize: 13,
    padding: 0,
  },

  chipArea: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    border: "1px solid #CBD5F5",
    background: "#FFFFFF",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
    alignItems: "center",
    minHeight: 52,
  },

  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid #C7D2FE",
    background: "#E0E7FF",
    fontSize: 13,
    fontWeight: 700,
    color: "#4F46E5",
  },

  chipX: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "#4F46E5",
    fontSize: 18,
    lineHeight: 1,
    padding: 0,
  },

  input: {
    flex: 1,
    minWidth: 180,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#1E293B",
    fontSize: 14,
    padding: "8px 6px",
  },

  hint: { fontSize: 12, color: "#64748B" },
};
