import os
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import pandas as pd
from .model import recommend, output_recommended_recipes
from .serializers import PredictionInSerializer

# Load dataset once when the module is imported
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, '..', 'Data', 'dataset.csv')
dataset = pd.read_csv(DATASET_PATH, compression='gzip')


@api_view(['GET'])
def home(request):
    return Response({"health_check": "OK"})


@api_view(['POST'])
def predict(request):
    serializer = PredictionInSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    validated_data = serializer.validated_data
    nutrition_input = validated_data['nutrition_input']
    ingredients = validated_data.get('ingredients', [])
    params = validated_data.get('params', {})
    
    # Ensure params is a dict with default values
    if not isinstance(params, dict):
        params = {}
    params = {
        'n_neighbors': params.get('n_neighbors', 5),
        'return_distance': params.get('return_distance', False)
    }
    
    recommendation_dataframe = recommend(dataset, nutrition_input, ingredients, params)
    output = output_recommended_recipes(recommendation_dataframe)
    
    if output is None:
        return Response({"output": None})
    else:
        return Response({"output": output})
