import React, { useEffect,useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/authLayout";


export default function SignIn() {
  const { signin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState("");


  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signin(username, password);
    
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Continue your diet plan."
      footer={
        <div style={{ fontSize: 14, opacity: 0.9 }}>
          New here? <Link to="/signup" style={linkStyle}>Create an account</Link>
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
            placeholder="Enter your username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required 
            style={inputStyle} 
          />
        </Field>

        <Field label="Password">
          <input 
            type="password" 
            placeholder="••••••••" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            style={inputStyle} 
          />
        </Field>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#475569", fontWeight: 600 }}>
            <input type="checkbox" />
            Remember me
          </label>

          <button
            type="button"
            onClick={() => alert("Forgot password (UI only)")}
            style={ghostBtn}
          >
            Forgot password?
          </button>
        </div>

        <button type="submit" style={primaryBtn} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <button
          type="button"
          onClick={() => alert("Google sign-in (UI only)")}
          style={secondaryBtn}
        >
          Continue with Google
        </button>
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

const secondaryBtn = {
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid #C7D2FE",
  cursor: "pointer",
  fontWeight: 700,
  color: "#4F46E5",
  background: "#FFFFFF",
};

const ghostBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "#4F46E5",
  fontSize: 13,
  padding: 0,
};

const linkStyle = { color: "#4F46E5", textDecoration: "none", fontWeight: 600 };
