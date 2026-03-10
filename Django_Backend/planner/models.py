from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta


class FoodItem(models.Model):
    """Food items from the dataset"""
    name = models.CharField(max_length=255)
    cook_time = models.CharField(max_length=50, blank=True)
    prep_time = models.CharField(max_length=50, blank=True)
    total_time = models.CharField(max_length=50, blank=True)
    calories = models.FloatField()
    fat_content = models.FloatField(default=0)
    saturated_fat_content = models.FloatField(default=0)
    cholesterol_content = models.FloatField(default=0)
    sodium_content = models.FloatField(default=0)
    carbohydrate_content = models.FloatField(default=0)
    fiber_content = models.FloatField(default=0)
    sugar_content = models.FloatField(default=0)
    protein_content = models.FloatField(default=0)
    ingredients = models.JSONField(default=list)  # List of ingredient strings
    instructions = models.JSONField(default=list)  # List of instruction strings
    image_link = models.URLField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


class WeeklyMealPlan(models.Model):
    """Weekly meal plan (Monday to Sunday)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='meal_plans')
    week_start_date = models.DateField()  # Monday of the week
    week_end_date = models.DateField()  # Sunday of the week
    target_calories = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'week_start_date']
        ordering = ['-week_start_date']
    
    def __str__(self):
        return f"{self.user.username}'s Plan - Week of {self.week_start_date}"
    
    @classmethod
    def get_current_week(cls, user):
        """Get or create current week's plan"""
        today = timezone.now().date()
        # Get Monday of current week
        days_since_monday = today.weekday()
        monday = today - timedelta(days=days_since_monday)
        sunday = monday + timedelta(days=6)
        
        plan, created = cls.objects.get_or_create(
            user=user,
            week_start_date=monday,
            defaults={'week_end_date': sunday, 'target_calories': 2000}
        )
        return plan, created


class Meal(models.Model):
    """Individual meal (breakfast, lunch, snack, dinner)"""
    MEAL_TYPES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('snack', 'Snack'),
        ('dinner', 'Dinner'),
    ]
    
    DAYS = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ]
    
    meal_plan = models.ForeignKey(WeeklyMealPlan, on_delete=models.CASCADE, related_name='meals')
    day = models.CharField(max_length=10, choices=DAYS)
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPES)
    target_calories = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['meal_plan', 'day', 'meal_type']
        ordering = ['day', 'meal_type']
    
    def __str__(self):
        return f"{self.meal_plan.user.username} - {self.day} {self.meal_type}"
    
    def get_total_calories(self):
        return sum(item.food_item.calories for item in self.food_items.all())
    
    def get_total_macros(self):
        total = {'carbs': 0, 'protein': 0, 'fat': 0}
        for item in self.food_items.all():
            total['carbs'] += item.food_item.carbohydrate_content
            total['protein'] += item.food_item.protein_content
            total['fat'] += item.food_item.fat_content
        return total


class MealFoodItem(models.Model):
    """Food items in a meal (many-to-many relationship)"""
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name='food_items')
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)  # Order in the meal
    
    class Meta:
        ordering = ['order']
        unique_together = ['meal', 'food_item', 'order']
    
    def __str__(self):
        return f"{self.meal} - {self.food_item.name}"


class FoodLog(models.Model):
    """What user actually ate (logged food)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='food_logs')
    date = models.DateField()
    meal_type = models.CharField(max_length=20, choices=Meal.MEAL_TYPES)
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE)
    quantity = models.FloatField(default=1.0)  # Multiplier for calories/macros
    logged_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date', 'meal_type', '-logged_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.date} {self.meal_type} - {self.food_item.name}"
    
    def get_calories(self):
        return self.food_item.calories * self.quantity


class Swap(models.Model):
    """Food item swap tracking"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='swaps')
    meal_plan = models.ForeignKey(WeeklyMealPlan, on_delete=models.CASCADE, related_name='swaps')
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name='swaps')
    old_food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE, related_name='old_swaps')
    new_food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE, related_name='new_swaps')
    reason = models.TextField(blank=True)
    swapped_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-swapped_at']
    
    def __str__(self):
        return f"{self.user.username} swapped {self.old_food_item.name} -> {self.new_food_item.name}"


class WeightEntry(models.Model):
    """Weight tracking entries"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='weight_entries')
    weight_kg = models.FloatField()
    date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.user.username} - {self.date}: {self.weight_kg}kg"
