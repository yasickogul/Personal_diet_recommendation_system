from django.urls import path
from . import views

urlpatterns = [
    path('generate-weekly-plan/', views.generate_weekly_plan, name='generate_weekly_plan'),
    path('current-plan/', views.get_current_plan, name='get_current_plan'),
    path('swap-food/', views.swap_food_item, name='swap_food_item'),
    path('log-food/', views.log_food, name='log_food'),
    path('dashboard/', views.dashboard_data, name='dashboard_data'),
    path('progress/', views.progress_data, name='progress_data'),
    path('weight-entries/', views.weight_entries, name='weight_entries'),
]

