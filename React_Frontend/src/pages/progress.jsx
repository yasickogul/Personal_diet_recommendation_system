import React, { useState, useEffect } from "react";
import TopNavbar from "../components/navbar";
import GlassCard from "../components/glasscard";
import api from "../api/client";
import ReactECharts from 'echarts-for-react';

export default function Progress() {
  const [loading, setLoading] = useState(true);
  const [weightEntries, setWeightEntries] = useState([]);
  const [projectedWeights, setProjectedWeights] = useState([]);
  const [goal, setGoal] = useState(null);
  const [currentWeight, setCurrentWeight] = useState(null);

  useEffect(() => {
    fetchWeightData();
    fetchProfile();
  }, []);

  const fetchWeightData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/planner/weight-entries/");
      // Handle new response format with projected weights
      if (response.data.weight_entries) {
        const sorted = response.data.weight_entries.sort((a, b) => new Date(a.date) - new Date(b.date));
        setWeightEntries(sorted);
        setProjectedWeights(response.data.projected_weights || []);
        setGoal(response.data.goal);
        setCurrentWeight(response.data.current_weight);
      } else {
        // Fallback for old format
        const sorted = response.data.sort((a, b) => new Date(a.date) - new Date(b.date));
        setWeightEntries(sorted);
        setProjectedWeights([]);
      }
    } catch (error) {
      console.error("Error fetching weight data:", error);
      setWeightEntries([]);
      setProjectedWeights([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get("/accounts/profile/");
      setGoal(response.data.goal);
      setCurrentWeight(response.data.current_weight_kg);
    } catch (error) {
      console.error("Error fetching profile:", error);
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

  // Combine actual and projected weights for display
  const allDates = [...weightEntries, ...projectedWeights]
    .map(item => item.date)
    .filter((date, index, self) => self.indexOf(date) === index)
    .sort((a, b) => new Date(a) - new Date(b));

  const actualData = allDates.map(date => {
    const entry = weightEntries.find(e => e.date === date);
    return entry ? entry.weight_kg : null;
  });

  const projectedData = allDates.map(date => {
    const entry = projectedWeights.find(e => e.date === date);
    return entry ? entry.weight_kg : null;
  });

  const chartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: function(params) {
        let result = params[0].name + '<br/>';
        params.forEach(param => {
          if (param.value !== null) {
            result += param.marker + param.seriesName + ': ' + param.value + ' kg<br/>';
          }
        });
        return result;
      }
    },
    legend: {
      data: ['Actual Weight', 'Projected Weight'],
      bottom: 6,
      left: 'center',
      textStyle: { color: '#1E293B' },
    },
    grid: {
      top: 60,
      left: 55,
      right: 18,
      bottom: 55,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: allDates.map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      axisLabel: {
        color: '#64748B',
        margin: 14,
        fontSize: 12,
      },
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#CBD5E1' } },
    },
    yAxis: {
      type: 'value',
      name: 'Weight (kg)',
      nameLocation: 'end',
      nameGap: 18,
      nameTextStyle: { color: '#64748B' },
      axisLabel: { color: '#64748B' },
      axisLine: { lineStyle: { color: '#CBD5E1' } },
      splitLine: { lineStyle: { color: '#E2E8F0' } },
    },
    series: [
      {
        name: 'Actual Weight',
        type: 'line',
        smooth: true,
        data: actualData,
        itemStyle: { color: '#4F46E5' },
        lineStyle: { color: '#4F46E5', width: 3 },
        symbol: 'circle',
        symbolSize: 8,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(79, 70, 229, 0.2)' },
              { offset: 1, color: 'rgba(79, 70, 229, 0.05)' },
            ],
          },
        },
      },
      {
        name: 'Projected Weight',
        type: 'line',
        smooth: true,
        data: projectedData,
        itemStyle: { color: '#818CF8' },
        lineStyle: { color: '#818CF8', width: 2, type: 'dashed' },
        symbol: 'none',
      },
    ],
  };

  const goalLabels = {
    weight_loss: 'Weight Loss',
    maintain: 'Maintain Weight',
    weight_gain: 'Weight Gain',
  };

  return (
    <div style={pageStyle}>
      <TopNavbar />
      <div style={containerStyle}>
        <GlassCard style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ marginBottom: 8, color: "#1E293B" }}>Progress</h2>
          <p style={{ color: "#64748B", marginBottom: 20 }}>
            Track your weight changes and progress towards your goal: <strong style={{ color: "#4F46E5" }}>{goalLabels[goal] || 'N/A'}</strong>
          </p>

          {weightEntries.length > 0 ? (
            <>
              <ReactECharts
                option={chartOption}
                style={{ height: '400px', width: '100%' }}
              />
              
              <div style={{ marginTop: 24 }}>
                <h3 style={{ marginBottom: 12, fontSize: 16, color: "#1E293B" }}>Weight History</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {weightEntries.slice().reverse().map((entry) => (
                    <div key={entry.id} style={entryStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: 4, color: "#1E293B" }}>
                            {new Date(entry.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                          {entry.notes && (
                            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                              {entry.notes}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "#4F46E5" }}>
                          {entry.weight_kg} kg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 60, color: "#64748B" }}>
              <p style={{ marginBottom: 12 }}>No weight data yet.</p>
              <p style={{ fontSize: 14 }}>
                Update your weight in your Profile page to start tracking your progress.
              </p>
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

const entryStyle = {
  padding: 14,
  borderRadius: 12,
  background: "#FFFFFF",
  border: "1px solid #E0E7FF",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};
