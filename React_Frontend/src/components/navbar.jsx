import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function TopNavbar() {
  const { user } = useAuth();
  const username = user?.username || user?.user?.username || "User";
  const displayName = user?.profile?.full_name || username;
  const navItems = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/meal-plan", label: "Meal Plan" },
    { to: "/log", label: "Log Food" },
    { to: "/progress", label: "Progress" },
    { to: "/profile", label: "Profile" },
  ];

  return (
    <div style={styles.navWrap}>
      <div style={styles.nav}>
        <div style={styles.left}>
          <div style={styles.logo} />
          <div style={{ display: "grid" }}>
            <div style={styles.brand}>PDRS</div>
            <div style={styles.caption}>Personalized Diet Recommendation</div>
          </div>
        </div>

        <div style={styles.links}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.linkActive : null),
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.background = '#E0E7FF';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div style={styles.right}>
          <div style={styles.userChip} title="User menu">
            <div style={styles.avatar}>{username.charAt(0).toUpperCase()}</div>
            <div style={{ display: "grid" }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1, color: "#1E293B" }}>
                {username}
              </div>
              <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.1 }}>
                {displayName !== username ? displayName : "User"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  navWrap: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    padding: "14px 16px",
    background: "#FFFFFF",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  nav: {
    maxWidth: 1200,
    margin: "0 auto",
    borderRadius: 18,
    padding: "12px 14px",
    background: "#FFFFFF",
    border: "1px solid #E0E7FF",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  left: { display: "flex", alignItems: "center", gap: 10, minWidth: 240 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 12,
    background: "linear-gradient(135deg, #4F46E5, #6366F1)",
    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
  },
  brand: { fontWeight: 800, letterSpacing: 0.4, color: "#1E293B" },
  caption: { fontSize: 11, color: "#64748B" },

  links: {
    display: "flex",
    gap: 10,
    flex: 1,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  link: {
    textDecoration: "none",
    color: "#64748B",
    fontSize: 13,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid transparent",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  linkActive: {
    color: "#4F46E5",
    background: "#E0E7FF",
    border: "1px solid #C7D2FE",
    fontWeight: 600,
  },

  right: { display: "flex", alignItems: "center", gap: 10, minWidth: 200, justifyContent: "flex-end" },
  primaryBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 800,
    color: "#FFFFFF",
    background: "linear-gradient(135deg, #4F46E5, #6366F1)",
  },
  userChip: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: 14,
    background: "#F1F5F9",
    border: "1px solid #E0E7FF",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: "#4F46E5",
    color: "#FFFFFF",
    border: "1px solid #C7D2FE",
  },
};
