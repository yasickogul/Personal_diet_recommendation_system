import React from "react";
import { Link } from "react-router-dom";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.brandRow}>
            <div style={styles.logo} />
            <span style={styles.brand}>PDRS</span>
          </div>
          <h1 style={styles.title}>{title}</h1>
          {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
        </div>

        <div style={styles.body}>{children}</div>

        <div style={styles.footer}>
          {footer}
          
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background:
      "radial-gradient(700px 520px at 12% 12%, rgba(79,70,229,0.12), transparent 60%), radial-gradient(640px 520px at 82% 18%, rgba(236,72,153,0.10), transparent 55%), #F8FAFC",
    color: "#1E293B",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    padding: 24,
    background: "#FFFFFF",
    border: "1px solid #E0E7FF",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.08)",
  },
  header: { marginBottom: 18 },
  brandRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background:
      "linear-gradient(135deg, rgba(99,102,241,1), rgba(236,72,153,1))",
    boxShadow: "0 10px 30px rgba(99,102,241,0.22)",
  },
  brand: { fontWeight: 700, letterSpacing: 0.4, color: "#4F46E5" },
  title: { margin: 0, fontSize: 26, lineHeight: 1.2, color: "#1E293B" },
  subtitle: { margin: "6px 0 0", fontSize: 14, color: "#64748B" },
  body: { display: "grid", gap: 12 },
  footer: { marginTop: 14, textAlign: "center", color: "#475569" },
  smallLink: { color: "#4F46E5", textDecoration: "none", fontWeight: 600 },
};
