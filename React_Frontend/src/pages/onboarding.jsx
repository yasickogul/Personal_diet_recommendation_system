// src/pages/onboarding.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GlassCard from "../components/glasscard";
import api from "../api/client";

export default function Onboarding() {
  const navigate = useNavigate();
  const { fetchProfile, generateMotivationalQuote } = useAuth();

  // UI state
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState("moderate");


  // optional health flags
  const [hasDiabetes, setHasDiabetes] = useState(false);
  const [hasHypertension, setHasHypertension] = useState(false);
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [avoidBeef, setAvoidBeef] = useState(false);
  const [avoidPork, setAvoidPork] = useState(false);

  // request state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const progress = useMemo(() => 100, []);

  async function finishSetup() {
    try {
      setSaving(true);
      setError("");

      const payload = {
        full_name: fullName || "",
        age: age ? Number(age) : null,
        gender: gender || "",
        height_cm: heightCm ? Number(heightCm) : null,
        current_weight_kg: weightKg ? Number(weightKg) : null,
        activity_level: activityLevel || "",
        has_diabetes: !!hasDiabetes,
        has_hypertension: !!hasHypertension,
        is_vegetarian: !!isVegetarian,
        avoid_beef: !!avoidBeef,
        avoid_pork: !!avoidPork,
      };

      const response = await api.patch("/accounts/profile/", payload);

      // Verify the response has onboarding_completed
      if (response.data.onboarding_completed) {
        // Refresh profile to update user state
        await fetchProfile();
        
        // Generate motivational quote
        if (generateMotivationalQuote) {
          await generateMotivationalQuote();
        }
        
        // Small delay to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Force navigation to dashboard
        navigate("/dashboard", { replace: true });
      } else {
        setError("Failed to complete onboarding. Please check all required fields are filled.");
        setSaving(false);
      }
    } catch (e) {
      // Extract validation message from Django REST Framework response
      const data = e?.response?.data;
      let msg = data?.detail || data?.message || data?.error || e?.message || "Failed to finish setup";
      if (typeof data === "object" && !data.detail && !data.message) {
        const firstKey = Object.keys(data)[0];
        const val = data[firstKey];
        if (Array.isArray(val)) msg = val[0];
        else if (typeof val === "string") msg = val;
      }
      setError(msg);
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.center}>
        <GlassCard style={styles.card}>
          {/* header */}
          <div style={styles.header}>
            <div style={styles.brandRow}>
              <div style={styles.logo} />
              <div>
                <div style={styles.brand}>PDRS</div>
                <div style={styles.subBrand}>Let’s set up your profile</div>
              </div>
            </div>

            <div style={styles.progressRow}>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
            <div style={styles.progressText}>{progress}%</div>
            </div>

            <div style={styles.stepText}>Profile setup</div>

            {error ? <div style={styles.error}>{error}</div> : null}
          </div>

          {/* body */}
          <div style={styles.body}>
              <div style={styles.sectionTitle}>Basic details</div>

              <div style={styles.grid2}>
                <Field
                  label="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
                <Field
                  label="Age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 22"
                  type="number"
                />
              </div>

              <div style={styles.grid2}>
                <Select
                  label="Gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ]}
                />
                <Select
                  label="Activity level"
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                  options={[
                    { value: "sedentary", label: "Little/no exercise" },
                    { value: "light", label: "Light exercise" },
                    { value: "moderate", label: "Moderate (3-5 days/wk)" },
                    { value: "active", label: "Very active (6-7 days/wk)" },
                    { value: "very_active", label: "Extra active" },
                  ]}
                />
              </div>

              <div style={styles.grid2}>
                <Field
                  label="Height (cm)"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="e.g. 170"
                  type="number"
                />
                <Field
                  label="Weight (kg)"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g. 65"
                  type="number"
                />
              </div>

              {/* optional flags */}
              <div style={{ marginTop: 12 }}>
                <div style={styles.sectionTitle}>Health conditions (optional)</div>

                <div style={styles.flagsGrid}>
                  <Toggle label="Diabetes" checked={hasDiabetes} onChange={setHasDiabetes} />
                  <Toggle
                    label="Hypertension"
                    checked={hasHypertension}
                    onChange={setHasHypertension}
                  />
                  <Toggle
                    label="Vegetarian"
                    checked={isVegetarian}
                    onChange={setIsVegetarian}
                  />
                  <Toggle label="Avoid Beef" checked={avoidBeef} onChange={setAvoidBeef} />
                  <Toggle label="Avoid Pork" checked={avoidPork} onChange={setAvoidPork} />
                </div>
              </div>

              <div style={styles.footer}>
                <button
                  type="button"
                  style={styles.primaryBtn}
                  onClick={finishSetup}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Finish setup"}
                </button>
              </div>
            </div>
        </GlassCard>
      </div>
    </div>
  );
}

/* ---------- Small UI helpers (no external libs) ---------- */

function Field({ label, ...props }) {
  return (
    <div style={styles.field}>
      <div style={styles.label}>{label}</div>
      <input style={styles.input} {...props} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={styles.field}>
      <div style={styles.label}>{label}</div>
      <select style={styles.input} value={value} onChange={onChange}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={styles.toggle}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span style={styles.toggleText}>{label}</span>
    </label>
  );
}

/* ---------- Styles ---------- */
const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(820px 520px at 18% 12%, rgba(79,70,229,0.12), transparent 60%), radial-gradient(760px 520px at 80% 28%, rgba(236,72,153,0.10), transparent 55%), #F8FAFC",
    display: "grid",
    placeItems: "center",
    padding: 16,
  },
  center: { width: "100%", display: "grid", placeItems: "center" },
  card: { width: "min(680px, 92vw)", padding: 18 },

  header: { display: "grid", gap: 10, marginBottom: 12 },
  brandRow: { display: "flex", gap: 12, alignItems: "center" },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "linear-gradient(135deg, rgba(99,102,241,1), rgba(236,72,153,1))",
  },
  brand: { fontWeight: 950, letterSpacing: -0.2, color: "#4F46E5" },
  subBrand: { color: "#64748B", fontSize: 13, fontWeight: 600 },

  progressRow: { display: "flex", gap: 10, alignItems: "center" },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    background: "#E0E7FF",
    border: "1px solid #C7D2FE",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(135deg, rgba(99,102,241,1), rgba(236,72,153,1))",
  },
  progressText: { fontSize: 12, color: "#475569", fontWeight: 700 },
  stepText: { fontSize: 12, color: "#64748B", fontWeight: 600 },

  error: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #FCA5A5",
    background: "#FEE2E2",
    color: "#B91C1C",
    fontWeight: 700,
    fontSize: 13,
  },

  body: { display: "grid", gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 950, color: "#1E293B", letterSpacing: -0.2 },

  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  field: { display: "grid", gap: 6 },
  label: { fontSize: 12, color: "#475569", fontWeight: 700 },
  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid #CBD5F5",
    background: "#FFFFFF",
    color: "#1E293B",
    outline: "none",
  },

  flagsGrid: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  toggle: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid #D1D9F5",
    background: "#F8FAFF",
    color: "#1E293B",
    fontWeight: 800,
    fontSize: 13,
  },
  toggleText: { color: "#1E293B" },

  labelRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  hint: { fontSize: 12, color: "#64748B", fontWeight: 600 },
  helpText: { fontSize: 12, color: "#64748B", marginTop: 8 },

  footer: { marginTop: 6, display: "flex", justifyContent: "flex-end" },
  footerRow: { marginTop: 6, display: "flex", justifyContent: "space-between", gap: 10 },

  primaryBtn: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    color: "#FFFFFF",
    background: "linear-gradient(135deg, rgba(99,102,241,1), rgba(236,72,153,1))",
    minWidth: 150,
  },
  secondaryBtn: {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #C7D2FE",
    background: "#FFFFFF",
    color: "#4F46E5",
    cursor: "pointer",
    fontWeight: 900,
    minWidth: 120,
  },

  bottomNote: {
    marginTop: 10,
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
};
