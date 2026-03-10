from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'full_name', 'age', 'gender', 'goal', 'onboarding_completed']
    list_filter = ['goal', 'onboarding_completed', 'has_diabetes', 'has_hypertension']
    search_fields = ['user__username', 'full_name']
