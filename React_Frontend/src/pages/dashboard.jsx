import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNavbar from "../components/navbar";
import GlassCard from "../components/glasscard";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import ReactECharts from 'echarts-for-react';

export default function Dashboard() {
  const { user, motivationalQuote } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [todayMeals, setTodayMeals] = useState([]);
  const [hasPlan, setHasPlan] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/planner/dashboard/");
      setDashboardData(response.data);
      
      // Check if plan exists and has meals
      const hasPlanData = response.data.has_plan || (response.data.current_plan?.meals && response.data.current_plan.meals.length > 0);
      setHasPlan(hasPlanData);
      
      // Get today's meals from current plan
      if (hasPlanData && response.data.current_plan?.meals && response.data.current_plan.meals.length > 0) {
        const today = new Date();
        // JavaScript getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
        // Convert to our day format: monday=0, tuesday=1, ..., sunday=6
        const jsDay = today.getDay();
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const todayDay = jsDay === 0 ? 'sunday' : days[jsDay - 1]; // Sunday=0 becomes 'sunday', Monday=1 becomes days[0]='monday'
        
        const todayMealsData = response.data.current_plan.meals.filter(
          meal => meal.day === todayDay
        );
        setTodayMeals(todayMealsData);
      } else {
        setTodayMeals([]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setHasPlan(false);
      setTodayMeals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setGenerating(true);
      const response = await api.post("/planner/generate-weekly-plan/", { regenerate: hasPlan });
      // Refresh data after generation
      await fetchDashboardData();
      if (response.data.message) {
        // Show success message
        console.log(response.data.message);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || "Failed to generate meal plan";
      alert(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleLogMeal = async (meal) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to log this ${meal.meal_type} meal for today?`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Log entire meal with calorie scaling (backend will scale quantities to match target)
      const response = await api.post("/planner/log-food/", {
        date: today,
        meal_type: meal.meal_type,
        meal_id: meal.id,  // Send meal_id to trigger meal logging with scaling
      });
      
      // Refresh dashboard data
      await fetchDashboardData();
      
      // Show success message with calorie info
      const message = response.data?.message || "Meal logged successfully! This meal is now marked as completed.";
      alert(message);
    } catch (error) {
      console.error("Error logging meal:", error);
      alert(error.response?.data?.detail || "Failed to log meal");
    }
  };

  const handleSwapMeal = async (meal, foodItemId) => {
    try {
      const response = await api.post("/planner/swap-food/", {
        meal_id: meal.id,
        old_food_item_id: foodItemId,
        reason: "",
      });
      
      if (response.data && response.data.meal) {
        // Update the meal in todayMeals state
        setTodayMeals(prevMeals => 
          prevMeals.map(m => m.id === meal.id ? response.data.meal : m)
        );
      }
      
      // Refresh dashboard data to get updated plan
      await fetchDashboardData();
      alert("Food item swapped successfully!");
    } catch (error) {
      console.error("Error swapping meal:", error);
      const errorMsg = error.response?.data?.detail || "Failed to swap food item";
      alert(errorMsg);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <TopNavbar />
        <div style={styles.container}>
          <div style={{ color: "#1E293B", textAlign: "center", padding: 40 }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  const summary = dashboardData?.summary || {};
  const profile = user?.profile || {};
  const targetKcal = summary.target_calories || profile.daily_calories || 0;
  const consumedKcal = summary.consumed_calories || 0;
  // Progress is now based on adherence (meals logged), not calories
  const progress = summary.progress_percent || 0;
  const adherence = summary.adherence || { logged_meals: 0, total_meals: 4 };
  const bmi = summary.bmi || profile.bmi || null;
  const bmiCategory = summary.bmi_category || profile.bmi_category || null;
  const goal = profile.goal || "maintain";
  const goalLabels = {
    weight_loss: "Weight Loss",
    maintain: "Maintain Weight",
    weight_gain: "Weight Gain",
  };

  // Calculate macros from today's meals
  const totalMacros = { carbs: 0, protein: 0, fat: 0 };
  todayMeals.forEach(meal => {
    if (meal.total_macros) {
      totalMacros.carbs += meal.total_macros.carbs || 0;
      totalMacros.protein += meal.total_macros.protein || 0;
      totalMacros.fat += meal.total_macros.fat || 0;
    }
  });
  const totalMacroCalories = totalMacros.carbs * 4 + totalMacros.protein * 4 + totalMacros.fat * 9;
  const carbsPercent = totalMacroCalories > 0 ? Math.round((totalMacros.carbs * 4 / totalMacroCalories) * 100) : 0;
  const proteinPercent = totalMacroCalories > 0 ? Math.round((totalMacros.protein * 4 / totalMacroCalories) * 100) : 0;
  const fatPercent = totalMacroCalories > 0 ? Math.round((totalMacros.fat * 9 / totalMacroCalories) * 100) : 0;

  // Get dietary tags from profile
  const dietaryTags = [];
  if (profile.has_diabetes) dietaryTags.push("Diabetes-safe");
  if (profile.has_hypertension) dietaryTags.push("Low sodium");
  if (profile.is_vegetarian) dietaryTags.push("Vegetarian");

  return (
    <div style={styles.page}>
      <TopNavbar />

      <div style={styles.container}>
        {/* Motivational Quote */}
        {motivationalQuote && (
          <GlassCard style={{ padding: 18, marginBottom: 14, background: "#E0E7FF", border: "1px solid #C7D2FE" }}>
            <div style={{ textAlign: "center", fontStyle: "italic", fontSize: 15, lineHeight: 1.6, color: "#4F46E5" }}>
              "{motivationalQuote}"
            </div>
          </GlassCard>
        )}
        
        {/* Generate Plan Button */}
        {!hasPlan && (
          <GlassCard style={{ marginBottom: 14, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={styles.sectionTitle}>No meal plan yet</div>
                <div style={styles.sectionSub}>Generate your weekly meal plan to get started</div>
              </div>
              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                style={styles.generateBtn}
              >
                {generating ? "Generating..." : "Generate This Week's Plan"}
              </button>
            </div>
          </GlassCard>
        )}

        {/* Regenerate Plan Button (if plan exists) */}
        {hasPlan && (
          <GlassCard style={{ marginBottom: 14, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={styles.sectionTitle}>Current Week's Plan</div>
                <div style={styles.sectionSub}>Plan generated for this week</div>
              </div>
              <button
                onClick={async () => {
                  if (window.confirm("This will regenerate your meal plan for this week. Continue?")) {
                    try {
                      setGenerating(true);
                      await api.post("/planner/generate-weekly-plan/", { regenerate: true });
                      await fetchDashboardData();
                    } catch (error) {
                      alert(error.response?.data?.detail || "Failed to regenerate meal plan");
                    } finally {
                      setGenerating(false);
                    }
                  }
                }}
                disabled={generating}
                style={styles.regenerateBtn}
              >
                {generating ? "Regenerating..." : "Regenerate Plan"}
              </button>
            </div>
          </GlassCard>
        )}

        {/* HERO / SUMMARY */}
        <div style={styles.heroGrid}>
          <GlassCard>
            <div style={styles.cardTitle}>Calories</div>
            <div style={styles.bigValue}>
              {Math.round(consumedKcal)} <span style={styles.muted}>/ {Math.round(targetKcal)} cal</span>
            </div>

            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>

            <div style={styles.smallRow}>
              <span style={styles.muted}>Progress</span>
              <span style={{ fontWeight: 800 }}>{progress}%</span>
            </div>
          </GlassCard>

          <GlassCard>
            <div style={styles.cardTitle}>Macros</div>
            {totalMacroCalories > 0 ? (
              <>
                <div style={styles.macroRow}>
                  <MacroChip label="Carbs" value={`${carbsPercent}%`} />
                  <MacroChip label="Protein" value={`${proteinPercent}%`} />
                  <MacroChip label="Fat" value={`${fatPercent}%`} />
                </div>
                <div style={{ marginTop: 12, ...styles.muted }}>
                  Balanced for your goal today.
                </div>
              </>
            ) : (
              <div style={{ marginTop: 12, ...styles.muted }}>
                No meals logged yet.
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div style={styles.cardTitle}>Adherence</div>
            <div style={styles.bigValue}>
              {adherence.logged_meals} <span style={styles.muted}>/ {adherence.total_meals} meals</span>
            </div>
            <div style={{ marginTop: 10, ...styles.muted }}>
              {adherence.logged_meals === adherence.total_meals 
                ? "All meals logged! Great job!" 
                : `Keep going — ${adherence.total_meals - adherence.logged_meals} meal${adherence.total_meals - adherence.logged_meals > 1 ? 's' : ''} remaining.`}
            </div>
          </GlassCard>

          <GlassCard>
            <div style={styles.cardTitle}>Goal</div>
            <div style={styles.bigValue}>{goalLabels[goal] || "Maintain Weight"}</div>
            <div style={{ marginTop: 10, ...styles.muted }}>
              Daily target: <b>{Math.round(targetKcal)} cal</b>
            </div>
            {bmi && (
              <div style={{ marginTop: 10, ...styles.muted }}>
                BMI: {bmi} ({bmiCategory || "N/A"})
              </div>
            )}

            {dietaryTags.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {dietaryTags.slice(0, 3).map((tag, idx) => (
                  <Tag key={idx} text={tag} />
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* MAIN GRID */}
        <div style={styles.mainGrid}>
          {/* Left: Meals */}
          <GlassCard style={{ padding: 18 }}>
            <div style={styles.sectionHead}>
              <div>
                <div style={styles.sectionTitle}>Today's Meal Plan</div>
                <div style={styles.sectionSub}>
                  {hasPlan ? "Tap Log / Swap" : "Generate plan to see meals"}
                </div>
              </div>
              <button
                onClick={() => navigate("/meal-plan")}
                style={styles.ghostBtn}
              >
                View Weekly
              </button>
            </div>

            {hasPlan && todayMeals.length > 0 ? (
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                {todayMeals.map((meal) => (
                  <MealCard 
                    key={meal.id} 
                    meal={meal} 
                    navigate={navigate}
                    onLog={handleLogMeal}
                    onSwap={handleSwapMeal}
                    refreshData={fetchDashboardData}
                    isLogged={meal.is_logged || false}
                  />
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 14, textAlign: "center", opacity: 0.7, padding: 40 }}>
                No meals planned for today. Generate your weekly plan to get started.
              </div>
            )}
          </GlassCard>

          {/* Right: Trends + Insights */}
          <div style={{ display: "grid", gap: 14 }}>
            <GlassCard style={{ padding: 18 }}>
              <div style={styles.sectionTitle}>Weekly Trend</div>
              <div style={styles.sectionSub}>Target vs Consumed Calories</div>

              {dashboardData?.weekly_calories && dashboardData.weekly_calories.length > 0 ? (
                <ReactECharts
                option={{
                  tooltip: {
                    trigger: "axis",
                    axisPointer: { type: "shadow" },
                  },
                
                  // ✅ Move legend to bottom and keep it centered
                  legend: {
                    data: ["Target Calories", "Consumed Calories"],
                    bottom: 6,
                    left: "center",
                    itemWidth: 18,
                    itemHeight: 10,
                    textStyle: { color: "black"
                     },
                  },
                
                  // ✅ Give room for title/subtitle area and x-axis + legend
                  grid: {
                    top: 60,
                    left: 55,
                    right: 18,
                    bottom: 55,      // ⭐ key fix: more bottom space
                    containLabel: true,
                  },
                
                  xAxis: {
                    type: "category",
                    data: dashboardData.weekly_calories.map((w) => {
                      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                      const dayIndex = [
                        "monday",
                        "tuesday",
                        "wednesday",
                        "thursday",
                        "friday",
                        "saturday",
                        "sunday",
                      ].indexOf(w.day);
                      return dayNames[dayIndex] || w.day;
                    }),
                
                    axisLabel: {
                      color: "black",
                      margin: 14,      // ✅ push labels a bit down
                      fontSize: 12,
                    },
                    axisTick: { alignWithLabel: true },
                    axisLine: { lineStyle: { color: "rgba(255,255,255,0.35)" } },
                  },
                
                  yAxis: {
                    type: "value",
                    name: "Calories",
                    nameLocation: "end",
                    nameGap: 18,
                    nameTextStyle: { color: "#black" },
                    axisLabel: { color: "#334155" },
                    axisLine: { lineStyle: { color: "#CBD5E1" } },
                    splitLine: { lineStyle: { color: "#E5E7EB" ,type: "dashed"} },
                  },
                
                  // ✅ bar spacing so bars look aligned and not “stuck”
                  series: [
                    {
                      name: "Target Calories",
                      type: "bar",
                      barWidth: 20,
                      barGap: "30%",
                      data: dashboardData.weekly_calories.map((w) => w.planned_calories),
                      itemStyle: { color: "#6366F1", borderRadius: [6, 6, 0, 0] },
                    },
                    {
                      name: "Consumed Calories",
                      type: "bar",
                      barWidth: 20,
                      data: dashboardData.weekly_calories.map((w) => w.consumed_calories),
                      itemStyle: { color: "#EC4899", borderRadius: [6, 6, 0, 0] },
                    },
                  ],
                }}
                
                  style={{ height: '250px', width: '100%' }}
                />
              ) : (
                <div style={{ marginTop: 14, opacity: 0.5, textAlign: "center", padding: 40 }}>
                  No weekly data available
                </div>
              )}
            </GlassCard>

            <GlassCard style={{ padding: 18 }}>
              <div style={styles.sectionTitle}>Smart Insights</div>
              <div style={styles.sectionSub}>
                Why these recommendations
              </div>

              {dietaryTags.length > 0 ? (
                <>
                  <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {dietaryTags.map((t, idx) => (
                      <Tag key={idx} text={t} />
                    ))}
                  </div>

                </>
              ) : (
                <div style={{ marginTop: 12, opacity: 0.7 }}>
                  Complete your profile to see personalized insights.
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        <div style={{ height: 30 }} />
      </div>
    </div>
  );
}

function MealCard({ meal, navigate, onLog, onSwap, refreshData, isLogged }) {
  const [logging, setLogging] = useState(false);
  const [swapping, setSwapping] = useState(false);
  
  const mealTypeLabels = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    snack: "Snack",
    dinner: "Dinner",
  };

  const foodItems = meal.food_items || [];
  const mealName = foodItems.length > 0 
    ? foodItems.map(item => item.food_item?.name).filter(Boolean).join(" + ")
    : "No items";

  const totalCalories = meal.total_calories || 0;
  const macros = meal.total_macros || { carbs: 0, protein: 0, fat: 0 };

  const handleLog = async () => {
    if (isLogged) {
      return; // Don't allow logging if already logged
    }
    if (onLog) {
      setLogging(true);
      try {
        await onLog(meal);
      } finally {
        setLogging(false);
      }
    }
  };

  const handleSwap = async () => {
    if (foodItems.length === 0) {
      alert("No food items to swap");
      return;
    }
    
    // For now, swap the first food item. You can enhance this to let user select which item to swap
    const firstFoodItem = foodItems[0];
    if (!firstFoodItem?.food_item?.id) {
      alert("Cannot swap: food item not found");
      return;
    }
    
    if (onSwap) {
      setSwapping(true);
      try {
        await onSwap(meal, firstFoodItem.food_item.id);
        if (refreshData) {
          await refreshData();
        }
      } finally {
        setSwapping(false);
      }
    }
  };

  return (
    <div style={styles.mealCard}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "grid", gap: 4, flex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{mealTypeLabels[meal.meal_type] || meal.meal_type}</div>
          <div style={{ fontWeight: 900, lineHeight: 1.2 }}>{mealName}</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            {Math.round(totalCalories)} cal • C {Math.round(macros.carbs)}g • P {Math.round(macros.protein)}g • F {Math.round(macros.fat)}g
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
          {isLogged ? (
            <div style={{
              padding: "9px 10px",
              borderRadius: 12,
              border: "1px solid #86EFAC",
              background: "#D1FAE5",
              color: "#059669",
              fontWeight: 800,
              fontSize: 13,
            }}>
              ✓ Completed
            </div>
          ) : (
            <>
              <button 
                onClick={handleLog} 
                disabled={logging || isLogged}
                style={styles.smallBtn}
              >
                {logging ? "Logging..." : "Log"}
              </button>
              <button 
                onClick={handleSwap} 
                disabled={swapping}
                style={styles.smallBtnGhost}
              >
                {swapping ? "Swapping..." : "Swap"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Tag({ text }) {
  return (
    <span style={styles.tag}>
      {text}
    </span>
  );
}

function MacroChip({ label, value }) {
  return (
    <div style={styles.macroChip}>
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
      <div style={{ fontWeight: 900 }}>{value}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#F8FAFC",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "12px 16px 0",
  },

  heroGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.35fr 1fr",
    gap: 14,
    marginTop: 14,
  },

  cardTitle: { fontSize: 12, color: "#64748B", marginBottom: 8 },
  bigValue: { fontSize: 26, fontWeight: 950, letterSpacing: -0.2, color: "#1E293B" },
  muted: { color: "#64748B", fontSize: 13, fontWeight: 600 },

  progressTrack: {
    marginTop: 12,
    height: 10,
    borderRadius: 999,
    background: "#E0E7FF",
    border: "1px solid #C7D2FE",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(135deg, #4F46E5, #6366F1)",
  },

  smallRow: { marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" },

  macroRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  macroChip: {
    padding: "10px 12px",
    borderRadius: 14,
    background: "#E0E7FF",
    border: "1px solid #C7D2FE",
    minWidth: 110,
  },

  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 950, letterSpacing: -0.2, color: "#1E293B" },
  sectionSub: { fontSize: 12, color: "#64748B", marginTop: 4 },

  generateBtn: {
    padding: "12px 20px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    color: "#FFFFFF",
    background: "linear-gradient(135deg, #4F46E5, #6366F1)",
  },
  regenerateBtn: {
    padding: "12px 20px",
    borderRadius: 12,
    border: "1px solid #C7D2FE",
    cursor: "pointer",
    fontWeight: 800,
    color: "#4F46E5",
    background: "#E0E7FF",
  },

  ghostBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #C7D2FE",
    background: "#FFFFFF",
    color: "#4F46E5",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
  },

  mealCard: {
    padding: 14,
    borderRadius: 16,
    background: "#FFFFFF",
    border: "1px solid #E0E7FF",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  smallBtn: {
    padding: "9px 10px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    color: "#FFFFFF",
    background: "linear-gradient(135deg, #4F46E5, #6366F1)",
  },
  smallBtnGhost: {
    padding: "9px 10px",
    borderRadius: 12,
    border: "1px solid #C7D2FE",
    cursor: "pointer",
    fontWeight: 800,
    color: "#4F46E5",
    background: "#E0E7FF",
  },

  tag: {
    fontSize: 12,
    fontWeight: 800,
    padding: "7px 10px",
    borderRadius: 999,
    background: "#E0E7FF",
    border: "1px solid #C7D2FE",
    color: "#4F46E5",
  },

  barWrap: { width: 28, display: "grid", gap: 6, justifyItems: "center" },
  bar: {
    width: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(135deg, rgba(99,102,241,1), rgba(236,72,153,1))",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  barLabel: { fontSize: 10, opacity: 0.7 },
};
