import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNavbar from "../components/navbar";
import GlassCard from "../components/glasscard";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, fetchProfile, signout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    gender: "male",
    height_cm: "",
    weight_kg: "",
    activity_level: "moderate",
    has_diabetes: false,
    has_hypertension: false,
    is_vegetarian: false,
    avoid_beef: false,
    avoid_pork: false,
  });
  const [displayGoal, setDisplayGoal] = useState(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/accounts/profile/");
      const profile = response.data;
      
      setFormData({
        full_name: profile.full_name || "",
        age: profile.age || "",
        gender: profile.gender || "male",
        height_cm: profile.height_cm || "",
        weight_kg: profile.current_weight_kg || "",
        activity_level: profile.activity_level || "moderate",
        has_diabetes: profile.has_diabetes || false,
        has_hypertension: profile.has_hypertension || false,
        is_vegetarian: profile.is_vegetarian || false,
        avoid_beef: profile.avoid_beef || false,
        avoid_pork: profile.avoid_pork || false,
      });
      setDisplayGoal(profile.goal || null);
    } catch (error) {
      console.error("Error loading profile:", error);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload = {
        full_name: formData.full_name || "",
        age: formData.age ? Number(formData.age) : null,
        gender: formData.gender || "",
        height_cm: formData.height_cm ? Number(formData.height_cm) : null,
        current_weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
        activity_level: formData.activity_level || "",
        has_diabetes: formData.has_diabetes,
        has_hypertension: formData.has_hypertension,
        is_vegetarian: formData.is_vegetarian,
        avoid_beef: formData.avoid_beef,
        avoid_pork: formData.avoid_pork,
      };

      await api.patch("/accounts/profile/", payload);
      
      // If weight was updated, create a weight entry
      if (formData.weight_kg && Number(formData.weight_kg) > 0) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const weightEntryResponse = await api.post("/planner/weight-entries/", {
            weight_kg: Number(formData.weight_kg),
            date: today,
            notes: "Updated from profile",
          });
          console.log("Weight entry created:", weightEntryResponse.data);
        } catch (error) {
          console.error("Error creating weight entry:", error);
          console.error("Error details:", error.response?.data);
          // Don't fail the whole update if weight entry fails - it's optional
        }
      }
      
      await fetchProfile();
      setSuccess("Profile updated successfully!");
    } catch (error) {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to update profile";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <TopNavbar />
        <div style={containerStyle}>
          <div style={{ color: "#1E293B", textAlign: "center", padding: 40 }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <TopNavbar />
      <div style={containerStyle}>
        <GlassCard style={{ padding: 24 }}>
          <h2 style={{ marginBottom: 20, color: "#1E293B" }}>Edit Profile</h2>

          {error && (
            <div style={errorStyle}>{error}</div>
          )}

          {success && (
            <div style={successStyle}>{success}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
            {/* Basic Info */}
            <div>
              <h3 style={sectionTitle}>Basic Information</h3>
              <div style={grid2}>
                <Field label="Full name">
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Age">
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div style={grid2}>
                <Field label="Gender">
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Activity Level">
                  <select
                    value={formData.activity_level}
                    onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="sedentary">Little/no exercise</option>
                    <option value="light">Light exercise</option>
                    <option value="moderate">Moderate exercise (3-5 days/wk)</option>
                    <option value="active">Very active (6-7 days/wk)</option>
                    <option value="very_active">Extra active (very active & physical job)</option>
                  </select>
                </Field>
              </div>

              <div style={grid2}>
                <Field label="Height (cm)">
                  <input
                    type="number"
                    value={formData.height_cm}
                    onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Weight (kg)">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
              </div>
            </div>

            {/* Goal */}
            <div>
              <h3 style={sectionTitle}>Goal</h3>
              <div
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  background: "#E0E7FF",
                  border: "1px solid #C7D2FE",
                }}
              >
                <div style={{ fontSize: 13, color: "#64748B", marginBottom: 4 }}>
                  Current goal
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#4F46E5" }}>
                  {displayGoal === "weight_loss"
                    ? "Weight Loss"
                    : displayGoal === "weight_gain"
                    ? "Weight Gain"
                    : displayGoal === "maintain"
                    ? "Maintain Weight"
                    : "—"}
                </div>
              </div>
            </div>

            {/* Dietary Preferences */}
            <div>
              <h3 style={sectionTitle}>Dietary Preferences</h3>
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                <label style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.is_vegetarian}
                    onChange={(e) => setFormData({ ...formData, is_vegetarian: e.target.checked })}
                  />
                  Vegetarian
                </label>
                <label style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.avoid_beef}
                    onChange={(e) => setFormData({ ...formData, avoid_beef: e.target.checked })}
                  />
                  Avoid Beef
                </label>
                <label style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.avoid_pork}
                    onChange={(e) => setFormData({ ...formData, avoid_pork: e.target.checked })}
                  />
                  Avoid Pork
                </label>
              </div>
            </div>

            {/* Health Conditions */}
            <div>
              <h3 style={sectionTitle}>Health Conditions</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.has_diabetes}
                    onChange={(e) => setFormData({ ...formData, has_diabetes: e.target.checked })}
                  />
                  Diabetes
                </label>
                <label style={checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.has_hypertension}
                    onChange={(e) => setFormData({ ...formData, has_hypertension: e.target.checked })}
                  />
                  Hypertension
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
              <button type="submit" style={primaryBtn} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  if (window.confirm("Are you sure you want to logout?")) {
                    signout();
                  }
                }}
                style={logoutBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.6)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Logout
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 13, opacity: 0.85 }}>{label}</div>
      {children}
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#F8FAFC",
};
const containerStyle = { maxWidth: 800, margin: "0 auto", padding: "12px 16px" };

const inputStyle = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#1E293B",
  outline: "none",
  fontFamily: "inherit",
};

const primaryBtn = {
  padding: "12px 12px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  color: "#FFFFFF",
  background: "linear-gradient(135deg, #4F46E5, #6366F1)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
};

const sectionTitle = {
  fontSize: 16,
  fontWeight: 900,
  marginBottom: 12,
  color: "#1E293B",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  marginBottom: 12,
};

const checkboxLabel = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontSize: 14,
  color: "#1E293B",
  cursor: "pointer",
};

const errorStyle = {
  padding: "12px",
  borderRadius: 8,
  background: "#FEE2E2",
  border: "1px solid #FCA5A5",
  color: "#DC2626",
  fontSize: 13,
  marginBottom: 12,
};

const successStyle = {
  padding: "12px",
  borderRadius: 8,
  background: "#D1FAE5",
  border: "1px solid #86EFAC",
  color: "#059669",
  fontSize: 13,
  marginBottom: 12,
};

const logoutBtn = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid #FCA5A5",
  cursor: "pointer",
  fontWeight: 700,
  color: "#DC2626",
  background: "#FEE2E2",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
};
