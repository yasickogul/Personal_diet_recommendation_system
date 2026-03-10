import { useState } from 'react';
import './RecipeCard.css';

function RecipeCard({ recipe }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const nutritionValues = ['Calories', 'FatContent', 'SaturatedFatContent', 'CholesterolContent', 
    'SodiumContent', 'CarbohydrateContent', 'FiberContent', 'SugarContent', 'ProteinContent'];

  if (!recipe) return null;

  return (
    <div className="recipe-card">
      <div className="recipe-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3>{recipe.Name}</h3>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>
      {isExpanded && (
        <div className="recipe-content">
          {recipe.image_link && (
            <div className="recipe-image">
              <img src={recipe.image_link} alt={recipe.Name} onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          )}
          
          <div className="nutrition-section">
            <h4>Nutritional Values (g):</h4>
            <table className="nutrition-table">
              <tbody>
                {nutritionValues.map((value) => (
                  <tr key={value}>
                    <td>{value}</td>
                    <td>{recipe[value]?.toFixed(2) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ingredients-section">
            <h4>Ingredients:</h4>
            <ul>
              {recipe.RecipeIngredientParts?.map((ingredient, index) => (
                <li key={index}>{ingredient}</li>
              ))}
            </ul>
          </div>

          <div className="instructions-section">
            <h4>Recipe Instructions:</h4>
            <ol>
              {recipe.RecipeInstructions?.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
          </div>

          <div className="time-section">
            <h4>Cooking and Preparation Time:</h4>
            <p>Cook Time: {recipe.CookTime}min</p>
            <p>Preparation Time: {recipe.PrepTime}min</p>
            <p>Total Time: {recipe.TotalTime}min</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipeCard;

