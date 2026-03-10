from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class SignUpSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists. Please choose a different username.")
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists. Please choose a different email.")
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        # Create profile
        UserProfile.objects.create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    bmi = serializers.SerializerMethodField()
    bmi_category = serializers.SerializerMethodField()
    daily_calories = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'full_name', 'age', 'gender', 'height_cm', 'current_weight_kg',
            'activity_level', 'goal', 'is_vegetarian', 'avoid_beef', 'avoid_pork',
            'has_diabetes', 'has_hypertension', 'onboarding_completed', 'bmi', 'bmi_category',
            'daily_calories', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'goal', 'created_at', 'updated_at']
    
    def get_bmi(self, obj):
        return obj.calculate_bmi()
    
    def get_bmi_category(self, obj):
        return obj.get_bmi_category()
    
    def get_daily_calories(self, obj):
        return obj.calculate_daily_calories()
    
    def update(self, instance, validated_data):
        # Handle weight_kg -> current_weight_kg mapping (for backward compatibility)
        if 'weight_kg' in validated_data:
            validated_data['current_weight_kg'] = validated_data.pop('weight_kg')
        
        # Never allow goal from client; remove if sent
        validated_data.pop('goal', None)
        validated_data.pop('allergies', None)  # Allergy function removed
        
        # Update all fields first
        for attr, value in validated_data.items():
            if attr != 'onboarding_completed':  # We'll set this after checking
                setattr(instance, attr, value)
        
        # Set goal automatically from BMI
        instance.goal = instance.get_goal_from_bmi()
        
        # Mark onboarding as completed if key fields are present
        # Check the final values (after update)
        age = instance.age
        height = instance.height_cm
        weight = instance.current_weight_kg
        
        # Check if all required fields are present and valid (not None, not 0)
        if age is not None and height is not None and weight is not None:
            if age > 0 and height > 0 and weight > 0:
                instance.onboarding_completed = True
        
        # Save explicitly to ensure all fields including onboarding_completed are saved
        instance.save()
        
        return instance

