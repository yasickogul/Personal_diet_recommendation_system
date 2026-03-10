from rest_framework import serializers
from .models import (
    FoodItem, WeeklyMealPlan, Meal, MealFoodItem, 
    FoodLog, Swap, WeightEntry
)


class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = '__all__'


class MealFoodItemSerializer(serializers.ModelSerializer):
    food_item = FoodItemSerializer(read_only=True)
    food_item_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = MealFoodItem
        fields = ['id', 'food_item', 'food_item_id', 'order']
        read_only_fields = ['id']


class MealSerializer(serializers.ModelSerializer):
    food_items = MealFoodItemSerializer(many=True, read_only=True)
    total_calories = serializers.SerializerMethodField()
    total_macros = serializers.SerializerMethodField()
    is_logged = serializers.SerializerMethodField()
    
    class Meta:
        model = Meal
        fields = [
            'id', 'day', 'meal_type', 'target_calories', 
            'food_items', 'total_calories', 'total_macros', 'is_logged'
        ]
        read_only_fields = ['id']
    
    def get_total_calories(self, obj):
        return obj.get_total_calories()
    
    def get_total_macros(self, obj):
        return obj.get_total_macros()
    
    def get_is_logged(self, obj):
        """Check if this meal is logged for today"""
        request = self.context.get('request')
        if not request or not request.user:
            return False
        
        from django.utils import timezone
        today = timezone.now().date()
        from .models import FoodLog
        return FoodLog.objects.filter(
            user=request.user,
            date=today,
            meal_type=obj.meal_type
        ).exists()


class WeeklyMealPlanSerializer(serializers.ModelSerializer):
    meals = MealSerializer(many=True, read_only=True)
    
    class Meta:
        model = WeeklyMealPlan
        fields = [
            'id', 'week_start_date', 'week_end_date', 
            'target_calories', 'meals', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FoodLogSerializer(serializers.ModelSerializer):
    food_item = FoodItemSerializer(read_only=True)
    food_item_id = serializers.IntegerField(write_only=True)
    calories = serializers.SerializerMethodField()
    
    class Meta:
        model = FoodLog
        fields = [
            'id', 'date', 'meal_type', 'food_item', 'food_item_id', 
            'quantity', 'calories', 'logged_at'
        ]
        read_only_fields = ['id', 'logged_at']
    
    def get_calories(self, obj):
        return obj.get_calories()
    
    def create(self, validated_data):
        food_item_id = validated_data.pop('food_item_id')
        from .models import FoodItem
        food_item = FoodItem.objects.get(id=food_item_id)
        validated_data['food_item'] = food_item
        return super().create(validated_data)


class SwapSerializer(serializers.ModelSerializer):
    old_food_item = FoodItemSerializer(read_only=True)
    new_food_item = FoodItemSerializer(read_only=True)
    old_food_item_id = serializers.IntegerField(write_only=True)
    new_food_item_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Swap
        fields = [
            'id', 'meal_plan', 'meal', 'old_food_item', 'old_food_item_id',
            'new_food_item', 'new_food_item_id', 'reason', 'swapped_at'
        ]
        read_only_fields = ['id', 'swapped_at']


class WeightEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightEntry
        fields = ['id', 'weight_kg', 'date', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

