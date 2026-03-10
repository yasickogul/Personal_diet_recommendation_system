import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNavbar from "../components/navbar";
import GlassCard from "../components/glasscard";
import RecipeCard from "../components/RecipeCard";
import api from "../api/client";

export default function MealPlan() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState(null);
  const [expandedDays, setExpandedDays] = useState({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchMealPlan();
  }, []);

  const fetchMealPlan = async () => {
    try {
      setLoading(true);
      const response = await api.get("/planner/current-plan/");
      setMealPlan(response.data);
      
      // Expand today by default
      const today = new Date();
      // JavaScript getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
      const jsDay = today.getDay();
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const todayDay = jsDay === 0 ? 'sunday' : days[jsDay - 1];
      setExpandedDays({ [todayDay]: true });
    } catch (error) {
      console.error("Error fetching meal plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    try {
      setGenerating(true);
      const response = await api.post("/planner/generate-weekly-plan/", {});
      await fetchMealPlan(); // Refresh meal plan after generation
      if (response.data.message) {
        console.log(response.data.message);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || "Failed to generate meal plan";
      alert(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const toggleDay = (day) => {
    setExpandedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  if (loading) {
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

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  const mealTypeLabels = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    snack: 'Snack',
    dinner: 'Dinner',
  };

  const hasMeals = mealPlan?.meals && mealPlan.meals.length > 0;

  return (
    <div style={pageStyle}>
      <TopNavbar />
      <div style={containerStyle}>
        <GlassCard style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ marginBottom: 8 }}>Weekly Meal Plan</h2>
              {mealPlan && (
                <div style={{ fontSize: 14, opacity: 0.8 }}>
                  Week of {new Date(mealPlan.week_start_date).toLocaleDateString()} - {new Date(mealPlan.week_end_date).toLocaleDateString()}
                </div>
              )}
            </div>
            {!hasMeals && (
              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                style={generateBtn}
              >
                {generating ? "Generating..." : "Generate This Week's Plan"}
              </button>
            )}
          </div>

          {!hasMeals ? (
            <div style={{ textAlign: "center", padding: 60, opacity: 0.7 }}>
              <p>No meal plan generated yet.</p>
              <p>Click "Generate This Week's Plan" to create your weekly meal plan.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {days.map(day => {
                const dayMeals = mealPlan.meals.filter(meal => meal.day === day);
                const isExpanded = expandedDays[day];
                
                return (
                  <GlassCard key={day} style={{ padding: 20 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        marginBottom: isExpanded ? 16 : 0,
                      }}
                      onClick={() => toggleDay(day)}
                    >
                      <h3 style={{ margin: 0 }}>{dayLabels[day]}</h3>
                      <span style={{ fontSize: 20 }}>{isExpanded ? '▼' : '▶'}</span>
                    </div>

                    {isExpanded && (
                      <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
                        {['breakfast', 'lunch', 'snack', 'dinner'].map(mealType => {
                          const meal = dayMeals.find(m => m.meal_type === mealType);
                          
                          if (!meal) return null;

                          return (
                            <div key={mealType} style={{ marginBottom: 20 }}>
                              <div style={{ 
                                fontSize: 16, 
                                fontWeight: 700, 
                                marginBottom: 12,
                                color: "rgba(255,255,255,0.9)"
                              }}>
                                {mealTypeLabels[mealType]}
                                <span style={{ 
                                  fontSize: 12, 
                                  fontWeight: 400, 
                                  marginLeft: 8,
                                  opacity: 0.7 
                                }}>
                                  ({Math.round(meal.total_calories || 0)} kcal)
                                </span>
                              </div>
                              
                              <div style={{ display: "grid", gap: 12 }}>
                                {meal.food_items && meal.food_items.length > 0 ? (
                                  meal.food_items.map((mealFoodItem, idx) => {
                                    const foodItem = mealFoodItem.food_item;
                                    if (!foodItem) return null;
                                    
                                    // Create a recipe-like object for RecipeCard
                                    const recipe = {
                                      Name: foodItem.name,
                                      CookTime: foodItem.cook_time || '0',
                                      PrepTime: foodItem.prep_time || '0',
                                      TotalTime: foodItem.total_time || '0',
                                      Calories: foodItem.calories,
                                      FatContent: foodItem.fat_content,
                                      SaturatedFatContent: foodItem.saturated_fat_content,
                                      CholesterolContent: foodItem.cholesterol_content,
                                      SodiumContent: foodItem.sodium_content,
                                      CarbohydrateContent: foodItem.carbohydrate_content,
                                      FiberContent: foodItem.fiber_content,
                                      SugarContent: foodItem.sugar_content,
                                      ProteinContent: foodItem.protein_content,
                                      RecipeIngredientParts: foodItem.ingredients || [],
                                      RecipeInstructions: foodItem.instructions || [],
                                      image_link: foodItem.image_link || '',
                                    };
                                    
                                    return (
                                      <div key={idx} style={{ marginBottom: 12 }}>
                                        <RecipeCard recipe={recipe} />
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div style={{ opacity: 0.6, padding: 12 }}>
                                    No items for this meal
                                  </div>
                                )}
                              </div>

                              
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </GlassCard>
                );
              })}
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
  paddingBottom: 40,
};

const containerStyle = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "12px 16px",
};

const generateBtn = {
  padding: "12px 20px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: 900,
  color: "#0b0d12",
  background: "linear-gradient(135deg, rgba(99,102,241,1), rgba(236,72,153,1))",
};

const smallBtn = {
  padding: "9px 10px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: 900,
  color: "#0b0d12",
  background: "linear-gradient(135deg, rgba(99,102,241,1), rgba(236,72,153,1))",
  fontSize: 12,
};

const smallBtnGhost = {
  padding: "9px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  cursor: "pointer",
  fontWeight: 800,
  color: "white",
  background: "rgba(255,255,255,0.06)",
  fontSize: 12,
};
