import os
import pandas as pd
from random import uniform as rnd
from datetime import datetime, timedelta
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from account.models import UserProfile
from api.model import recommend, output_recommended_recipes
from .models import (
    WeeklyMealPlan, Meal, MealFoodItem, FoodItem, 
    FoodLog, Swap, WeightEntry
)
from .serializers import (
    WeeklyMealPlanSerializer, MealSerializer, FoodItemSerializer,
    FoodLogSerializer, SwapSerializer, WeightEntrySerializer
)

# Load dataset lazily
def get_dataset():
    """Lazy load dataset to avoid loading at module import"""
    # Django_Backend/planner/views.py -> Django_Backend -> project root -> Data/dataset.csv
    current_file = os.path.abspath(__file__)
    django_backend_dir = os.path.dirname(os.path.dirname(current_file))
    project_root = os.path.dirname(django_backend_dir)
    DATASET_PATH = os.path.join(project_root, 'Data', 'dataset.csv')
    if os.path.exists(DATASET_PATH):
        return pd.read_csv(DATASET_PATH, compression='gzip')
    return None

# Cache dataset
_dataset_cache = None

def get_cached_dataset():
    global _dataset_cache
    if _dataset_cache is None:
        _dataset_cache = get_dataset()
    return _dataset_cache


def create_food_item_from_recipe(recipe_data):
    """Create or get FoodItem from recipe data"""
    food_item, created = FoodItem.objects.get_or_create(
        name=recipe_data['Name'],
        defaults={
            'cook_time': recipe_data.get('CookTime', ''),
            'prep_time': recipe_data.get('PrepTime', ''),
            'total_time': recipe_data.get('TotalTime', ''),
            'calories': recipe_data.get('Calories', 0),
            'fat_content': recipe_data.get('FatContent', 0),
            'saturated_fat_content': recipe_data.get('SaturatedFatContent', 0),
            'cholesterol_content': recipe_data.get('CholesterolContent', 0),
            'sodium_content': recipe_data.get('SodiumContent', 0),
            'carbohydrate_content': recipe_data.get('CarbohydrateContent', 0),
            'fiber_content': recipe_data.get('FiberContent', 0),
            'sugar_content': recipe_data.get('SugarContent', 0),
            'protein_content': recipe_data.get('ProteinContent', 0),
            'ingredients': recipe_data.get('RecipeIngredientParts', []),
            'instructions': recipe_data.get('RecipeInstructions', []),
            'image_link': recipe_data.get('image_link', ''),
        }
    )
    return food_item


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_weekly_plan(request):
    """Generate weekly meal plan for current week"""
    try:
        user = request.user
        profile = user.profile
        
        if not profile.onboarding_completed:
            return Response(
                {'detail': 'Please complete onboarding first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create current week's plan
        meal_plan, created = WeeklyMealPlan.get_current_week(user)
        
        # Check if plan already exists and user wants to regenerate
        # Check if plan has meals
        has_meals = Meal.objects.filter(meal_plan=meal_plan).exists()
        if not created and has_meals and not request.data.get('regenerate', False):
            serializer = WeeklyMealPlanSerializer(meal_plan)
            return Response({
                'plan': serializer.data,
                'message': 'Plan already exists for this week. Use regenerate=true to overwrite.'
            })
        
        # Calculate daily calories
        daily_calories = profile.calculate_daily_calories() or 2000
        meal_plan.target_calories = daily_calories
        meal_plan.save()
        
        # Meal calorie distribution (4 meals per day)
        meal_calories = {
            'breakfast': daily_calories * 0.25,  # 25%
            'lunch': daily_calories * 0.35,      # 35%
            'snack': daily_calories * 0.10,      # 10%
            'dinner': daily_calories * 0.30,     # 30%
        }
        
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        # Load dataset before transaction
        dataset = get_cached_dataset()
        if dataset is None:
            return Response(
                {'detail': 'Dataset not found. Please ensure dataset.csv is in the Data folder.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        import random
        
        with transaction.atomic():
            # Delete existing meals if regenerating
            if not created:
                Meal.objects.filter(meal_plan=meal_plan).delete()
            
            # Dietary limits: hypertension ≤1500 mg sodium/day; diabetes ≤50g carbs/meal
            SODIUM_PER_MEAL_MAX = 375  # 1500/4 meals
            CARBS_PER_MEAL_MAX = 50

            # Generate meals for each day
            for day in days:
                day_sodium_used = 0  # Track sodium for hypertension (daily cap 1500 mg)
                for meal_type, target_cal in meal_calories.items():
                    # Base nutrition input [cal, fat, sat_fat, chol, sodium, carbs, fiber, sugar, protein]
                    if meal_type == 'breakfast':
                        base = [target_cal, rnd(10, 30), rnd(0, 4), rnd(0, 30),
                                rnd(0, 400), rnd(40, 75), rnd(4, 10), rnd(0, 10), rnd(30, 100)]
                    elif meal_type == 'lunch':
                        base = [target_cal, rnd(20, 40), rnd(0, 4), rnd(0, 30),
                                rnd(0, 400), rnd(40, 75), rnd(4, 20), rnd(0, 10), rnd(50, 175)]
                    elif meal_type == 'dinner':
                        base = [target_cal, rnd(20, 40), rnd(0, 4), rnd(0, 30),
                                rnd(0, 400), rnd(40, 75), rnd(4, 20), rnd(0, 10), rnd(50, 175)]
                    else:  # snack
                        base = [target_cal, rnd(10, 30), rnd(0, 4), rnd(0, 30),
                                rnd(0, 400), rnd(40, 75), rnd(4, 10), rnd(0, 10), rnd(30, 100)]

                    # Apply diabetes: low carb/sugar (carbs per meal ≤50g)
                    if profile.has_diabetes:
                        base[5] = rnd(10, 45)   # carbs
                        base[7] = rnd(0, 12)    # sugar
                    # Apply hypertension: low sodium (total ≤1500 mg/day; cap per meal)
                    if profile.has_hypertension:
                        sodium_budget_left = 1500 - day_sodium_used
                        base[4] = min(rnd(50, 350), max(50, sodium_budget_left))

                    nutrition_input = base
                    
                    # Get recommendations (2-4 items per meal)
                    params = {'n_neighbors': random.randint(2, 4), 'return_distance': False}
                    ingredients = []
                    
                    # Apply dietary restrictions
                    if profile.is_vegetarian:
                        ingredients = ['vegetable', 'fruit']
                    if profile.avoid_beef:
                        ingredients.append('chicken')
                    if profile.avoid_pork:
                        ingredients.append('chicken')
                    
                    recommendation_df = recommend(dataset, nutrition_input, ingredients, params)
                    
                    if recommendation_df is not None and not recommendation_df.empty:
                        recipes = output_recommended_recipes(recommendation_df)

                        # Filter by health conditions: diabetes ≤50g carbs/meal, low sugar; hypertension ≤1500 mg Na/day
                        if profile.has_diabetes:
                            recipes = [r for r in recipes if (r.get('CarbohydrateContent') or 0) <= CARBS_PER_MEAL_MAX
                                       and (r.get('SugarContent') or 0) <= 20]
                        if profile.has_hypertension:
                            sodium_budget_left = 1500 - day_sodium_used
                            recipes = [r for r in recipes if (r.get('SodiumContent') or 0) <= min(SODIUM_PER_MEAL_MAX, sodium_budget_left)]
                        
                        if recipes and len(recipes) > 0:
                            # Create meal
                            meal = Meal.objects.create(
                                meal_plan=meal_plan,
                                day=day,
                                meal_type=meal_type,
                                target_calories=target_cal
                            )
                            
                            # Select recipes that best fit target calories and health limits
                            selected_recipes = []
                            total_cal = 0
                            total_carbs = 0
                            total_sodium = 0
                            min_cal = target_cal * 0.8
                            max_cal = target_cal * 1.2
                            sodium_budget = 1500 - day_sodium_used if profile.has_hypertension else float('inf')

                            for recipe in recipes[:6]:
                                rc = recipe.get('Calories', 0)
                                rcarbs = recipe.get('CarbohydrateContent') or 0
                                rna = recipe.get('SodiumContent') or 0
                                if total_cal + rc > max_cal:
                                    continue
                                if profile.has_diabetes and total_carbs + rcarbs > CARBS_PER_MEAL_MAX:
                                    continue
                                if profile.has_hypertension and total_sodium + rna > sodium_budget:
                                    continue
                                selected_recipes.append(recipe)
                                total_cal += rc
                                total_carbs += rcarbs
                                total_sodium += rna
                                if total_cal >= min_cal:
                                    break

                            if len(selected_recipes) < 2 or total_cal < min_cal:
                                selected_recipes = recipes[:min(len(recipes), 4)]
                                total_sodium = sum(r.get('SodiumContent') or 0 for r in selected_recipes)
                            
                            # Add food items to meal
                            for idx, recipe in enumerate(selected_recipes):
                                # Try to get image link (optional, don't fail if it doesn't work)
                                image_link = ''
                                try:
                                    # Simple image search - you can enhance this later
                                    # For now, we'll leave it empty or use a placeholder
                                    pass
                                except:
                                    pass
                                
                                recipe['image_link'] = image_link
                                try:
                                    food_item = create_food_item_from_recipe(recipe)
                                    MealFoodItem.objects.create(
                                        meal=meal,
                                        food_item=food_item,
                                        order=idx
                                    )
                                except Exception as e:
                                    print(f"Error creating food item: {str(e)}")
                                    import traceback
                                    traceback.print_exc()
                                    continue
                            if profile.has_hypertension:
                                day_sodium_used += total_sodium
                        else:
                            # No recipes after filtering - create meal with no items
                            Meal.objects.create(
                                meal_plan=meal_plan,
                                day=day,
                                meal_type=meal_type,
                                target_calories=target_cal
                            )
                    else:
                        # If no recommendations found, still create meal with no items
                        # This ensures the meal structure exists
                        Meal.objects.create(
                            meal_plan=meal_plan,
                            day=day,
                            meal_type=meal_type,
                            target_calories=target_cal
                        )
        
        serializer = WeeklyMealPlanSerializer(meal_plan)
        return Response({
            'plan': serializer.data,
            'message': 'Weekly meal plan generated successfully.'
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Error in generate_weekly_plan: {error_msg}")
        traceback.print_exc()
        return Response(
            {'detail': f'Error generating meal plan: {error_msg}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Error in generate_weekly_plan: {error_msg}")
        traceback.print_exc()
        return Response(
            {'detail': f'Error generating meal plan: {error_msg}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_plan(request):
    """Get current week's meal plan"""
    meal_plan, _ = WeeklyMealPlan.get_current_week(request.user)
    serializer = WeeklyMealPlanSerializer(meal_plan)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def swap_food_item(request):
    """Swap a food item in a meal using custom food recommendation"""
    meal_id = request.data.get('meal_id')
    old_food_item_id = request.data.get('old_food_item_id')
    reason = request.data.get('reason', '')
    
    try:
        meal = Meal.objects.get(id=meal_id, meal_plan__user=request.user)
        old_food_item = FoodItem.objects.get(id=old_food_item_id)
        profile = request.user.profile

        # Get the nutrition values from the old food item to use for recommendation
        nutrition_input = [
            old_food_item.calories,
            old_food_item.fat_content,
            old_food_item.saturated_fat_content,
            old_food_item.cholesterol_content,
            old_food_item.sodium_content,
            old_food_item.carbohydrate_content,
            old_food_item.fiber_content,
            old_food_item.sugar_content,
            old_food_item.protein_content,
        ]
        # Apply diabetes: low carb target (≤50g per meal)
        if profile.has_diabetes:
            nutrition_input[5] = min(nutrition_input[5], 45)
            nutrition_input[7] = min(nutrition_input[7], 12)
        # Apply hypertension: low sodium target (≤375 mg per meal for 1500 mg/day)
        if profile.has_hypertension:
            nutrition_input[4] = min(nutrition_input[4], 350)
        
        # Get dietary restrictions from user profile
        ingredients = []
        if profile.is_vegetarian:
            ingredients = ['vegetable', 'fruit']
        if profile.avoid_beef:
            ingredients.append('chicken')
        if profile.avoid_pork:
            ingredients.append('chicken')
        
        # Use custom food recommendation API
        dataset = get_cached_dataset()
        if dataset is None:
            return Response(
                {'detail': 'Dataset not found. Please ensure dataset.csv is in the Data folder.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        import random
        params = {'n_neighbors': 1, 'return_distance': False}
        recommendation_df = recommend(dataset, nutrition_input, ingredients, params)
        
        if recommendation_df is None or recommendation_df.empty:
            return Response(
                {'detail': 'No suitable replacement found. Please try again.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        recipes = output_recommended_recipes(recommendation_df)
        if not recipes or len(recipes) == 0:
            return Response(
                {'detail': 'No suitable replacement found. Please try again.'},
                status=status.HTTP_404_NOT_FOUND
            )
        # Filter by health conditions: diabetes ≤50g carbs, low sugar; hypertension ≤375 mg Na/meal
        if profile.has_diabetes:
            recipes = [r for r in recipes if (r.get('CarbohydrateContent') or 0) <= 50
                       and (r.get('SugarContent') or 0) <= 20]
        if profile.has_hypertension:
            recipes = [r for r in recipes if (r.get('SodiumContent') or 0) <= 375]
        if not recipes:
            return Response(
                {'detail': 'No suitable replacement found within your dietary limits. Please try again.'},
                status=status.HTTP_404_NOT_FOUND
            )
        # Get the first recommended recipe
        new_recipe = recipes[0]
        new_recipe['image_link'] = new_recipe.get('image_link', '')
        
        # Create or get the new food item
        new_food_item = create_food_item_from_recipe(new_recipe)
        
        # Find and update the meal food item
        meal_food_item = MealFoodItem.objects.get(
            meal=meal,
            food_item=old_food_item
        )
        
        with transaction.atomic():
            meal_food_item.food_item = new_food_item
            meal_food_item.save()
            
            # Record swap
            Swap.objects.create(
                user=request.user,
                meal_plan=meal.meal_plan,
                meal=meal,
                old_food_item=old_food_item,
                new_food_item=new_food_item,
                reason=reason
            )
        
        serializer = MealSerializer(meal)
        return Response({
            'meal': serializer.data,
            'message': 'Food item swapped successfully.'
        })
    
    except Meal.DoesNotExist:
        return Response(
            {'detail': 'Meal not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except FoodItem.DoesNotExist:
        return Response(
            {'detail': 'Food item not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except MealFoodItem.DoesNotExist:
        return Response(
            {'detail': 'Meal food item not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        import traceback
        print(f"Error in swap_food_item: {str(e)}")
        traceback.print_exc()
        return Response(
            {'detail': f'Error swapping food item: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def log_food(request):
    """Log food that user actually ate"""
    if request.method == 'POST':
        date = request.data.get('date')
        meal_type = request.data.get('meal_type')
        meal_id = request.data.get('meal_id')  # Optional: if provided, log entire meal with scaling
        
        # Check if this meal_type is already logged for this date
        existing_log = FoodLog.objects.filter(
            user=request.user,
            date=date,
            meal_type=meal_type
        ).first()
        
        if existing_log:
            return Response(
                {'detail': f'{meal_type.capitalize()} meal already logged for this date. You can only log each meal type once per day.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If meal_id is provided, log entire meal with calorie scaling
        if meal_id:
            try:
                meal = Meal.objects.get(id=meal_id, meal_plan__user=request.user)
                food_items = meal.food_items.all()
                
                if not food_items.exists():
                    return Response(
                        {'detail': 'Meal has no food items to log.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Calculate total calories of all food items in the meal
                total_meal_calories = sum(item.food_item.calories for item in food_items)
                target_calories = meal.target_calories
                
                # Calculate scale factor to match target calories
                # If total exceeds target, scale down; if less, keep at 1.0 (don't scale up - user ate what was in meal)
                if total_meal_calories > 0:
                    scale_factor = min(target_calories / total_meal_calories, 1.0)
                else:
                    scale_factor = 1.0
                
                # Log all food items with scaled quantities
                logged_items = []
                for meal_food_item in food_items:
                    food_log = FoodLog.objects.create(
                        user=request.user,
                        date=date,
                        meal_type=meal_type,
                        food_item=meal_food_item.food_item,
                        quantity=scale_factor
                    )
                    logged_items.append(food_log)
                
                # Return summary
                total_logged_calories = sum(log.get_calories() for log in logged_items)
                return Response({
                    'message': f'Meal logged successfully. Total calories: {round(total_logged_calories, 0)} cal (target: {round(target_calories, 0)} cal)',
                    'logged_items': FoodLogSerializer(logged_items, many=True).data,
                    'total_calories': round(total_logged_calories, 0),
                    'target_calories': round(target_calories, 0),
                    'scale_factor': round(scale_factor, 3)
                }, status=status.HTTP_201_CREATED)
                
            except Meal.DoesNotExist:
                return Response(
                    {'detail': 'Meal not found.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            except Exception as e:
                return Response(
                    {'detail': f'Error logging meal: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Otherwise, log single food item (for backward compatibility or manual logging)
        serializer = FoodLogSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # GET: Filter by date if provided
    date = request.query_params.get('date')
    queryset = FoodLog.objects.filter(user=request.user)
    if date:
        queryset = queryset.filter(date=date)
    
    serializer = FoodLogSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    """Get dashboard summary data"""
    user = request.user
    profile = user.profile
    today = timezone.now().date()
    
    # Get current week's plan
    meal_plan, _ = WeeklyMealPlan.get_current_week(user)
    
    # Calculate today's consumed calories
    today_logs = FoodLog.objects.filter(user=user, date=today)
    consumed_calories = sum(log.get_calories() for log in today_logs)
    
    # Get today's meals
    # weekday() returns 0=Monday, 6=Sunday
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    today_weekday = today.weekday()  # 0=Monday, 6=Sunday
    today_day = days[today_weekday]
    
    today_meals = Meal.objects.filter(meal_plan=meal_plan, day=today_day)
    total_meals = today_meals.count()
    
    # Get logged meal types for today (to track adherence)
    logged_meal_types = set(today_logs.values_list('meal_type', flat=True).distinct())
    logged_meals_count = len(logged_meal_types)
    
    # Calculate adherence
    adherence = {
        'logged_meals': logged_meals_count,
        'total_meals': total_meals if total_meals > 0 else 4,  # Default to 4 if no plan
    }
    
    # Calculate progress based on adherence (only 100% when all meals logged)
    if adherence['total_meals'] > 0:
        progress_percent = round((adherence['logged_meals'] / adherence['total_meals']) * 100, 1)
    else:
        progress_percent = 0.0
    
    # Check if plan has any meals
    has_plan = Meal.objects.filter(meal_plan=meal_plan).exists()
    
    # Get recent swaps and logs
    recent_swaps = Swap.objects.filter(user=user).order_by('-swapped_at')[:5]
    recent_logs = FoodLog.objects.filter(user=user).order_by('-logged_at')[:5]
    
    # Get weight entries for graph
    weight_entries = WeightEntry.objects.filter(user=user).order_by('-date')[:7]
    
    # Calculate weekly calories (target vs consumed for each day)
    # Use consistent daily target for all days so chart shows comparable bars; consumed from FoodLog
    from datetime import timedelta
    daily_target = meal_plan.target_calories or profile.calculate_daily_calories() or 2000
    week_start = today - timedelta(days=today.weekday())  # Monday of current week
    weekly_calories = []
    for i in range(7):
        day_date = week_start + timedelta(days=i)
        day_name = days[i]
        
        day_logs = FoodLog.objects.filter(user=user, date=day_date)
        consumed_cal = sum(log.get_calories() for log in day_logs)
        
        weekly_calories.append({
            'day': day_name,
            'date': day_date.isoformat(),
            'planned_calories': round(float(daily_target), 0),
            'consumed_calories': round(consumed_cal, 0),
        })
    
    # Serialize current plan with context to include is_logged
    plan_serializer = WeeklyMealPlanSerializer(meal_plan, context={'request': request})
    
    return Response({
        'summary': {
            'target_calories': meal_plan.target_calories,
            'consumed_calories': round(consumed_calories, 0),
            'progress_percent': progress_percent,
            'bmi': profile.calculate_bmi(),
            'bmi_category': profile.get_bmi_category(),
            'adherence': adherence,
        },
        'current_plan': plan_serializer.data,
        'has_plan': has_plan,
        'recent_swaps': [{
            'date': swap.swapped_at.date(),
            'meal': swap.meal.meal_type,
            'old_item': swap.old_food_item.name,
            'new_item': swap.new_food_item.name,
        } for swap in recent_swaps],
        'recent_logs': [{
            'date': log.date,
            'meal': log.meal_type,
            'food': log.food_item.name,
            'calories': log.get_calories(),
        } for log in recent_logs],
        'weight_entries': WeightEntrySerializer(weight_entries, many=True).data,
        'weekly_calories': weekly_calories,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def progress_data(request):
    """Get progress/analytics data"""
    user = request.user
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    
    # Get this week's logs
    week_logs = FoodLog.objects.filter(
        user=user,
        date__gte=week_start,
        date__lte=today
    )
    
    # Calculate daily totals
    daily_totals = {}
    for log in week_logs:
        date_str = str(log.date)
        if date_str not in daily_totals:
            daily_totals[date_str] = {'calories': 0, 'carbs': 0, 'protein': 0, 'fat': 0}
        daily_totals[date_str]['calories'] += log.get_calories()
        daily_totals[date_str]['carbs'] += log.food_item.carbohydrate_content * log.quantity
        daily_totals[date_str]['protein'] += log.food_item.protein_content * log.quantity
        daily_totals[date_str]['fat'] += log.food_item.fat_content * log.quantity
    
    # Get planned vs consumed
    meal_plan, _ = WeeklyMealPlan.get_current_week(user)
    planned_calories = meal_plan.target_calories * 7  # Weekly target
    
    return Response({
        'daily_totals': daily_totals,
        'planned_calories': planned_calories,
        'consumed_calories': sum(totals['calories'] for totals in daily_totals.values()),
    })


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def weight_entries(request):
    """Create or get weight entries with projected weights"""
    if request.method == 'POST':
        try:
            serializer = WeightEntrySerializer(data=request.data)
            if serializer.is_valid():
                # Check if entry already exists for this date
                date = serializer.validated_data.get('date')
                existing_entry = WeightEntry.objects.filter(
                    user=request.user,
                    date=date
                ).first()
                
                if existing_entry:
                    # Update existing entry
                    serializer = WeightEntrySerializer(existing_entry, data=request.data, partial=True)
                    if serializer.is_valid():
                        serializer.save()
                        return Response(serializer.data, status=status.HTTP_200_OK)
                else:
                    # Create new entry
                    serializer.save(user=request.user)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            print(f"Error in weight_entries POST: {str(e)}")
            traceback.print_exc()
            return Response(
                {'detail': f'Error creating weight entry: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # GET request - return weight entries with projected weights
    queryset = WeightEntry.objects.filter(user=request.user).order_by('date')
    serializer = WeightEntrySerializer(queryset, many=True)
    
    # Calculate projected weights based on goal
    profile = request.user.profile
    weight_entries_list = serializer.data
    
    # Get projected weights
    projected_weights = []
    if weight_entries_list and profile.current_weight_kg:
        # Get first weight entry date
        first_entry_date = weight_entries_list[0]['date']
        start_weight = weight_entries_list[0]['weight_kg']
        
        # Calculate weekly weight change based on goal
        weekly_change = 0
        if profile.goal == 'weight_loss':
            weekly_change = -0.5  # Lose 0.5kg per week
        elif profile.goal == 'weight_gain':
            weekly_change = 0.5  # Gain 0.5kg per week
        # maintain = 0 (no change)
        
        # Generate projected weights for 12 weeks from first entry
        from datetime import datetime, timedelta
        start_date = datetime.strptime(first_entry_date, '%Y-%m-%d').date()
        
        for week in range(0, 13):  # 12 weeks ahead
            projected_date = start_date + timedelta(weeks=week)
            projected_weight = start_weight + (weekly_change * week)
            projected_weights.append({
                'date': projected_date.isoformat(),
                'weight_kg': round(projected_weight, 1),
                'is_projected': True
            })
    
    return Response({
        'weight_entries': serializer.data,
        'projected_weights': projected_weights,
        'goal': profile.goal,
        'current_weight': profile.current_weight_kg
    })
