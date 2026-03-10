from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Basic info
    full_name = models.CharField(max_length=255, blank=True)
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, choices=[
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ], blank=True)
    height_cm = models.FloatField(null=True, blank=True)
    current_weight_kg = models.FloatField(null=True, blank=True)
    activity_level = models.CharField(max_length=50, choices=[
        ('sedentary', 'Little/no exercise'),
        ('light', 'Light exercise'),
        ('moderate', 'Moderate exercise (3-5 days/wk)'),
        ('active', 'Very active (6-7 days/wk)'),
        ('very_active', 'Extra active (very active & physical job)'),
    ], blank=True)
    
    # Goals
    goal = models.CharField(max_length=20, choices=[
        ('weight_loss', 'Weight Loss'),
        ('maintain', 'Maintain Weight'),
        ('weight_gain', 'Weight Gain'),
    ], default='maintain')
    
    # Dietary preferences
    allergies = models.JSONField(default=list, blank=True)  # List of allergy strings
    is_vegetarian = models.BooleanField(default=False)
    avoid_beef = models.BooleanField(default=False)
    avoid_pork = models.BooleanField(default=False)
    
    # Health conditions
    has_diabetes = models.BooleanField(default=False)
    has_hypertension = models.BooleanField(default=False)
    
    # Onboarding completion
    onboarding_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    def calculate_bmi(self):
        if self.height_cm and self.current_weight_kg:
            height_m = self.height_cm / 100
            return round(self.current_weight_kg / (height_m ** 2), 2)
        return None
    
    def get_bmi_category(self):
        bmi = self.calculate_bmi()
        if bmi is None:
            return None
        if bmi < 18.5:
            return 'underweight'
        elif bmi < 25:
            return 'normal'
        elif bmi < 30:
            return 'overweight'
        else:
            return 'obese'
    
    def get_goal_from_bmi(self):
        """Set goal automatically from BMI: underweight -> weight_gain, normal -> maintain, overweight/obese -> weight_loss"""
        category = self.get_bmi_category()
        if category is None:
            return 'maintain'
        if category == 'underweight':
            return 'weight_gain'
        if category in ('overweight', 'obese'):
            return 'weight_loss'
        return 'maintain'
    
    def calculate_bmr(self):
        if not all([self.age, self.height_cm, self.current_weight_kg, self.gender]):
            return None
        
        if self.gender == 'male':
            bmr = 10 * self.current_weight_kg + 6.25 * self.height_cm - 5 * self.age + 5
        else:
            bmr = 10 * self.current_weight_kg + 6.25 * self.height_cm - 5 * self.age - 161
        return round(bmr, 2)
    
    def calculate_daily_calories(self):
        bmr = self.calculate_bmr()
        if bmr is None:
            return None
        
        activity_multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.9,
        }
        
        multiplier = activity_multipliers.get(self.activity_level, 1.2)
        maintain_calories = bmr * multiplier
        
        # Adjust based on goal
        if self.goal == 'weight_loss':
            return round(maintain_calories * 0.8, 0)  # 20% deficit
        elif self.goal == 'weight_gain':
            return round(maintain_calories * 1.1, 0)  # 10% surplus
        else:
            return round(maintain_calories, 0)
