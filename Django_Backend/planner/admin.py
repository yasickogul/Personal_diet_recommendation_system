from django.contrib import admin
from .models import (
    FoodItem, WeeklyMealPlan, Meal, MealFoodItem,
    FoodLog, Swap, WeightEntry
)


@admin.register(FoodItem)
class FoodItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'calories', 'protein_content', 'carbohydrate_content', 'fat_content']
    search_fields = ['name']


@admin.register(WeeklyMealPlan)
class WeeklyMealPlanAdmin(admin.ModelAdmin):
    list_display = ['user', 'week_start_date', 'week_end_date', 'target_calories']
    list_filter = ['week_start_date']


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ['meal_plan', 'day', 'meal_type', 'target_calories']
    list_filter = ['day', 'meal_type']


@admin.register(MealFoodItem)
class MealFoodItemAdmin(admin.ModelAdmin):
    list_display = ['meal', 'food_item', 'order']


@admin.register(FoodLog)
class FoodLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'meal_type', 'food_item', 'quantity']
    list_filter = ['date', 'meal_type']


@admin.register(Swap)
class SwapAdmin(admin.ModelAdmin):
    list_display = ['user', 'meal', 'old_food_item', 'new_food_item', 'swapped_at']


@admin.register(WeightEntry)
class WeightEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'weight_kg']
    list_filter = ['date']
