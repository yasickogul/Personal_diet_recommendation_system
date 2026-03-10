import React, { useState, useEffect } from "react";
import TopNavbar from "../components/navbar";
import GlassCard from "../components/glasscard";
import api from "../api/client";

export default function LogFood() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [selectedDate]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/planner/log-food/?date=${selectedDate}`);
      setLogs(response.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeekLogs = async () => {
    try {
      setLoading(true);
      // Get current week's logs
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
      
      const weekLogs = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        try {
          const response = await api.get(`/planner/log-food/?date=${dateStr}`);
          if (response.data && response.data.length > 0) {
            weekLogs.push({
              date: dateStr,
              logs: response.data
            });
          }
        } catch (e) {
          // Skip if error
        }
      }
      setSelectedWeek(weekLogs);
    } catch (error) {
      console.error("Error fetching week logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const mealTypeLabels = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    snack: "Snack",
    dinner: "Dinner",
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading && !selectedWeek) {
    return (
      <div style={pageStyle}>
        <TopNavbar />
        <div style={containerStyle}>
          <div style={{ color: "white", textAlign: "center", padding: 40 }}>
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
        <GlassCard style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ marginBottom: 20 }}>Log Food</h2>
          
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", marginBottom: 8, fontSize: 13, opacity: 0.85 }}>
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedWeek(null);
                }}
                style={inputStyle}
              />
            </div>
            <button
              onClick={() => {
                setSelectedWeek(null);
                fetchLogs();
              }}
              style={primaryBtn}
            >
              View Date
            </button>
            <button
              onClick={fetchWeekLogs}
              style={secondaryBtn}
            >
              View This Week
            </button>
          </div>

          {selectedWeek ? (
            <div style={{ display: "grid", gap: 16 }}>
              {selectedWeek.length > 0 ? (
                selectedWeek.map((dayLog, idx) => (
                  <div key={idx} style={dayCardStyle}>
                    <h3 style={{ marginBottom: 12, color: "#6366F1" }}>
                      {formatDate(dayLog.date)}
                    </h3>
                    <div style={{ display: "grid", gap: 10 }}>
                      {dayLog.logs.map((log) => (
                        <div key={log.id} style={logItemStyle}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                {log.food_item?.name || "Unknown"}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.7 }}>
                                {mealTypeLabels[log.meal_type] || log.meal_type} • {Math.round(log.calories || 0)} kcal
                              </div>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.6 }}>
                              {new Date(log.logged_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: 40, opacity: 0.7 }}>
                  No logs found for this week
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div key={log.id} style={logItemStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                          {log.food_item?.name || "Unknown"}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {mealTypeLabels[log.meal_type] || log.meal_type} • {Math.round(log.calories || 0)} kcal
                        </div>
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.6 }}>
                        {new Date(log.logged_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: 40, opacity: 0.7 }}>
                  No logs found for {formatDate(selectedDate)}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#F8FAFC",
};

const containerStyle = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "12px 16px",
};

const inputStyle = {
  width: "100%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.22)",
  color: "white",
  outline: "none",
  fontFamily: "inherit",
};

const primaryBtn = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  color: "#0b0d12",
  background: "linear-gradient(135deg, rgba(99,102,241,1), rgba(236,72,153,1))",
  alignSelf: "flex-end",
};

const secondaryBtn = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  cursor: "pointer",
  fontWeight: 600,
  color: "white",
  background: "rgba(255,255,255,0.06)",
  alignSelf: "flex-end",
};

const logItemStyle = {
  padding: 14,
  borderRadius: 12,
  background: "rgba(0,0,0,0.20)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const dayCardStyle = {
  padding: 18,
  borderRadius: 16,
  background: "rgba(0,0,0,0.15)",
  border: "1px solid rgba(255,255,255,0.10)",
};
