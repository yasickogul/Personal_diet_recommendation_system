from rest_framework import serializers


class ParamsSerializer(serializers.Serializer):
    n_neighbors = serializers.IntegerField(default=5)
    return_distance = serializers.BooleanField(default=False)


class PredictionInSerializer(serializers.Serializer):
    nutrition_input = serializers.ListField(
        child=serializers.FloatField(),
        min_length=9,
        max_length=9
    )
    ingredients = serializers.ListField(
        child=serializers.CharField(),
        default=list,
        allow_empty=True
    )
    params = ParamsSerializer(required=False, default={'n_neighbors': 5, 'return_distance': False})


class RecipeSerializer(serializers.Serializer):
    Name = serializers.CharField()
    CookTime = serializers.CharField()
    PrepTime = serializers.CharField()
    TotalTime = serializers.CharField()
    RecipeIngredientParts = serializers.ListField(child=serializers.CharField())
    Calories = serializers.FloatField()
    FatContent = serializers.FloatField()
    SaturatedFatContent = serializers.FloatField()
    CholesterolContent = serializers.FloatField()
    SodiumContent = serializers.FloatField()
    CarbohydrateContent = serializers.FloatField()
    FiberContent = serializers.FloatField()
    SugarContent = serializers.FloatField()
    ProteinContent = serializers.FloatField()
    RecipeInstructions = serializers.ListField(child=serializers.CharField())


class PredictionOutSerializer(serializers.Serializer):
    output = RecipeSerializer(many=True, required=False, allow_null=True)

