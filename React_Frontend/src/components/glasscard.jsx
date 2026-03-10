import React from "react";

export default function GlassCard({ children, style }) {
  return (
    <div
      style={{
        borderRadius: 18,
        background: "#FFFFFF",
        border: "1px solid #E0E7FF",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05), 0 10px 15px rgba(0, 0, 0, 0.1)",
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
