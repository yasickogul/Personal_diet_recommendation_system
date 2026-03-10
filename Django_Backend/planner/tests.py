from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from account.models import UserProfile
from .models import FoodItem, FoodLog, WeeklyMealPlan, WeightEntry


class PlannerAPITests(APITestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(
			username='planneruser',
			email='planner@example.com',
			password='PlanPass!123'
		)
		self.profile = UserProfile.objects.create(
			user=self.user,
			onboarding_completed=True,
			current_weight_kg=80,
			goal='weight_loss'
		)
		self.current_plan_url = reverse('get_current_plan')
		self.log_food_url = reverse('log_food')
		self.weight_entries_url = reverse('weight_entries')
		self.client.force_authenticate(user=self.user)

	def test_get_current_plan_creates_weekly_plan(self):
		response = self.client.get(self.current_plan_url)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(WeeklyMealPlan.objects.filter(user=self.user).exists())
		plan = WeeklyMealPlan.objects.get(user=self.user)
		self.assertIn('meals', response.data)
		self.assertEqual(str(plan.user), 'planneruser')

	def test_log_food_manual_entry_creates_food_log(self):
		food_item = FoodItem.objects.create(
			name='Test Oatmeal',
			calories=250,
			fat_content=5,
			saturated_fat_content=1,
			cholesterol_content=0,
			sodium_content=150,
			carbohydrate_content=40,
			fiber_content=4,
			sugar_content=10,
			protein_content=8
		)

		payload = {
			'date': '2024-01-01',
			'meal_type': 'breakfast',
			'food_item_id': food_item.id,
			'quantity': 1.0
		}

		response = self.client.post(self.log_food_url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(FoodLog.objects.count(), 1)
		log = FoodLog.objects.get()
		self.assertEqual(log.food_item, food_item)
		self.assertEqual(log.get_calories(), 250)

		duplicate_response = self.client.post(self.log_food_url, payload, format='json')
		self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('detail', duplicate_response.data)

	def test_weight_entries_create_and_update(self):
		payload = {
			'date': '2024-01-01',
			'weight_kg': 80,
			'notes': 'Starting weight'
		}

		create_response = self.client.post(self.weight_entries_url, payload, format='json')
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(WeightEntry.objects.count(), 1)

		update_payload = {
			'date': '2024-01-01',
			'weight_kg': 79.5,
			'notes': 'Updated weight'
		}

		update_response = self.client.post(self.weight_entries_url, update_payload, format='json')
		self.assertEqual(update_response.status_code, status.HTTP_200_OK)
		entry = WeightEntry.objects.get(user=self.user)
		self.assertEqual(entry.weight_kg, 79.5)

		get_response = self.client.get(self.weight_entries_url)
		self.assertEqual(get_response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(get_response.data['weight_entries']), 1)
		self.assertGreater(len(get_response.data['projected_weights']), 0)
		first_projection = get_response.data['projected_weights'][0]
		self.assertTrue(first_projection['is_projected'])
		self.assertEqual(first_projection['weight_kg'], round(79.5, 1))
