import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/authLayout";

export default function SignUp() {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (formData.password !== formData.password2) {
      setError("Passwords do not match");
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    const userData = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
      password2: formData.password2,
      first_name: formData.first_name,
      last_name: formData.last_name,
    };

    const result = await signup(userData);
    
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Start your personalized meal planning."
      footer={
        <div style={{ fontSize: 14, opacity: 0.9 }}>
          Already have an account?{" "}
          <Link to="/signin" style={linkStyle}>Sign in</Link>
        </div>
      }
    >
      {error && (
        <div style={{
          padding: "12px",
          borderRadius: 10,
          background: "#FEE2E2",
          border: "1px solid #FCA5A5",
          color: "#B91C1C",
          fontSize: 13,
          marginBottom: 8,
          fontWeight: 600,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <Field label="Username">
          <input 
            type="text" 
            name="username"
            placeholder="Choose a username" 
            value={formData.username}
            onChange={handleChange}
            required 
            style={inputStyle} 
          />
        </Field>

        <Field label="Email">
          <input 
            type="email" 
            name="email"
            placeholder="you@example.com" 
            value={formData.email}
            onChange={handleChange}
            required 
            style={inputStyle} 
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="First name">
            <input 
              type="text" 
              name="first_name"
              placeholder="First name" 
              value={formData.first_name}
              onChange={handleChange}
              style={inputStyle} 
            />
          </Field>

          <Field label="Last name">
            <input 
              type="text" 
              name="last_name"
              placeholder="Last name" 
              value={formData.last_name}
              onChange={handleChange}
              style={inputStyle} 
            />
          </Field>
        </div>

        <Field label="Password">
          <input 
            type="password" 
            name="password"
            placeholder="Create a password (min 8 characters)" 
            value={formData.password}
            onChange={handleChange}
            required 
            style={inputStyle} 
          />
        </Field>

        <Field label="Confirm password">
          <input 
            type="password" 
            name="password2"
            placeholder="Re-enter password" 
            value={formData.password2}
            onChange={handleChange}
            required 
            style={inputStyle} 
          />
        </Field>

        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#475569", fontWeight: 600 }}>
          <input type="checkbox" required />
          I agree to the terms & privacy policy
        </label>

        <button type="submit" style={primaryBtn} disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        <div style={{ textAlign: "center", fontSize: 13, color: "#475569" }}>
          By creating an account, you can build meal plans and track progress.
        </div>
      </form>
    </AuthLayout>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid #CBD5F5",
  background: "#FFFFFF",
  color: "#1E293B",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
  outline: "none",
};

const primaryBtn = {
  padding: "12px 12px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  color: "#FFFFFF",
  background:
    "linear-gradient(135deg, rgba(99,102,241,1), rgba(236,72,153,1))",
};

const linkStyle = { color: "#4F46E5", textDecoration: "none", fontWeight: 600 };
