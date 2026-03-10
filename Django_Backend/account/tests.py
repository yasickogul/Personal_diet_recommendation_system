from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from .models import UserProfile


class AccountAPITests(APITestCase):
	def setUp(self):
		self.client = APIClient()
		self.signup_url = reverse('signup')
		self.signin_url = reverse('signin')
		self.profile_url = reverse('profile')

		self.user = User.objects.create_user(
			username='existinguser',
			email='existing@example.com',
			password='Str0ngPass!234',
			first_name='Existing',
			last_name='User'
		)
		UserProfile.objects.create(user=self.user)

	def test_signup_creates_user_and_profile(self):
		payload = {
			'username': 'newuser',
			'email': 'newuser@example.com',
			'password': 'Compl3xPass!456',
			'password2': 'Compl3xPass!456',
			'first_name': 'New',
			'last_name': 'User'
		}

		response = self.client.post(self.signup_url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertIn('tokens', response.data)
		self.assertTrue(User.objects.filter(username='newuser').exists())
		new_user = User.objects.get(username='newuser')
		self.assertTrue(UserProfile.objects.filter(user=new_user).exists())
		self.assertFalse(new_user.profile.onboarding_completed)

	def test_signup_rejects_password_mismatch(self):
		payload = {
			'username': 'baduser',
			'email': 'baduser@example.com',
			'password': 'Compl3xPass!456',
			'password2': 'DifferentPass!789',
		}

		response = self.client.post(self.signup_url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('password', response.data)
		self.assertFalse(User.objects.filter(username='baduser').exists())

	def test_signin_returns_tokens_for_valid_credentials(self):
		payload = {
			'username': 'existinguser',
			'password': 'Str0ngPass!234'
		}

		response = self.client.post(self.signin_url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('tokens', response.data)
		self.assertIn('access', response.data['tokens'])

	def test_signin_rejects_invalid_credentials(self):
		payload = {
			'username': 'existinguser',
			'password': 'WrongPass!234'
		}

		response = self.client.post(self.signin_url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
		self.assertEqual(response.data['detail'], 'Invalid credentials.')

	def test_profile_requires_authentication(self):
		response = self.client.get(self.profile_url)

		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_profile_get_returns_user_profile_data(self):
		self.client.force_authenticate(user=self.user)

		response = self.client.get(self.profile_url)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['user']['username'], 'existinguser')
		self.assertIn('bmi', response.data)
		self.client.force_authenticate(user=None)

	def test_profile_patch_updates_fields_and_completes_onboarding(self):
		self.client.force_authenticate(user=self.user)

		payload = {
			'full_name': 'Existing User',
			'age': 30,
			'gender': 'male',
			'height_cm': 180,
			'current_weight_kg': 75,
			'activity_level': 'moderate',
			'goal': 'maintain'
		}

		response = self.client.patch(self.profile_url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertTrue(response.data['onboarding_completed'])
		self.assertEqual(response.data['bmi'], 23.15)
		self.assertEqual(response.data['daily_calories'], 2682)

		profile = UserProfile.objects.get(user=self.user)
		self.assertTrue(profile.onboarding_completed)
		self.assertEqual(profile.current_weight_kg, 75)
		self.client.force_authenticate(user=None)

	def test_profile_patch_accepts_weight_kg_alias(self):
		self.client.force_authenticate(user=self.user)

		payload = {
			'age': 25,
			'gender': 'female',
			'height_cm': 165,
			'weight_kg': 60,
			'activity_level': 'light',
		}

		response = self.client.patch(self.profile_url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)

		profile = UserProfile.objects.get(user=self.user)
		self.assertEqual(profile.current_weight_kg, 60)
		self.assertEqual(response.data['current_weight_kg'], 60)
		self.client.force_authenticate(user=None)
