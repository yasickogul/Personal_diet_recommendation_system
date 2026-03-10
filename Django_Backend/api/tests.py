from unittest import mock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient


class APIPredictionTests(APITestCase):
	def setUp(self):
		self.client = APIClient()
		self.home_url = reverse('home')
		self.predict_url = reverse('predict')

	def test_home_returns_health_check(self):
		response = self.client.get(self.home_url)
		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data, {'health_check': 'OK'})

	def test_predict_rejects_invalid_payload(self):
		response = self.client.post(self.predict_url, {'nutrition_input': 'invalid'}, format='json')
		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertIn('nutrition_input', response.data)

	@mock.patch('api.views.output_recommended_recipes')
	@mock.patch('api.views.recommend')
	def test_predict_returns_recommendations(self, mock_recommend, mock_output):
		mock_recommend.return_value = ['mock_dataframe']
		mock_output.return_value = [
			{
				'Name': 'Sample Recipe',
				'Calories': 300,
				'ProteinContent': 20,
				'CarbohydrateContent': 35
			}
		]

		payload = {
			'nutrition_input': [2000, 50, 10, 10, 500, 200, 30, 20, 60],
			'ingredients': ['chicken'],
			'params': {'n_neighbors': 3, 'return_distance': False}
		}

		response = self.client.post(self.predict_url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn('output', response.data)
		self.assertEqual(response.data['output'][0]['Name'], 'Sample Recipe')
		mock_recommend.assert_called_once()
		mock_output.assert_called_once_with(['mock_dataframe'])
