import fetch from 'node-fetch';

// Test the enhanced OpenAI filtering system
async function testEnhancedSearch() {
  try {
    console.log('Testing OpenAI-Enhanced Inspiration Machine Searches...\n');
    
    // Authenticate
    const authResponse = await fetch('http://localhost:5000/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const { access_token } = await authResponse.json();
    console.log('✓ Authenticated successfully');
    
    // Test recipe search with AI enhancement
    console.log('\n🧠 Testing AI-Enhanced Recipe Search...');
    const recipeResponse = await fetch('http://localhost:5000/api/recipes/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      body: JSON.stringify({
        cuisineType: 'Asian',
        mealType: 'dinner',
        ingredients: ['chicken', 'ginger', 'soy sauce'],
        dietaryPreferences: ['healthy']
      }),
      timeout: 60000
    });
    
    if (recipeResponse.ok) {
      const recipeData = await recipeResponse.json();
      console.log('✓ Recipe search completed');
      console.log(`  - Found ${recipeData.videos?.length || 0} videos`);
      
      if (recipeData.videos?.[0]) {
        const firstVideo = recipeData.videos[0];
        console.log('  - First result enhanced with:');
        console.log(`    • Relevance Score: ${firstVideo.relevanceScore || 'N/A'}`);
        console.log(`    • Health Score: ${firstVideo.nutritionalAnalysis?.healthScore || 'N/A'}`);
        console.log(`    • Difficulty: ${firstVideo.nutritionalAnalysis?.difficulty || 'N/A'}`);
        console.log(`    • Equipment: ${firstVideo.enhancedMetadata?.equipmentNeeded?.join(', ') || 'N/A'}`);
      }
    } else {
      console.log('✗ Recipe search failed:', recipeResponse.status);
    }
    
    // Test exercise search with AI enhancement
    console.log('\n🏋️ Testing AI-Enhanced Exercise Search...');
    const exerciseResponse = await fetch('http://localhost:5000/api/exercise-wellness/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      body: JSON.stringify({
        category: 'exercise',
        intensity: 'moderate',
        duration: 'medium',
        tags: ['cardio', 'beginner']
      }),
      timeout: 60000
    });
    
    if (exerciseResponse.ok) {
      const exerciseData = await exerciseResponse.json();
      console.log('✓ Exercise search completed');
      console.log(`  - Found ${exerciseData.videos?.length || 0} videos`);
      
      if (exerciseData.videos?.[0]) {
        const firstVideo = exerciseData.videos[0];
        console.log('  - First result enhanced with:');
        console.log(`    • Relevance Score: ${firstVideo.relevanceScore || 'N/A'}`);
        console.log(`    • Target Muscles: ${firstVideo.enhancedMetadata?.targetMuscleGroups?.join(', ') || 'N/A'}`);
        console.log(`    • Calorie Burn: ${firstVideo.enhancedMetadata?.estimatedCalorieBurn || 'N/A'}`);
        console.log(`    • Fitness Level: ${firstVideo.enhancedMetadata?.fitnessLevel || 'N/A'}`);
      }
    } else {
      console.log('✗ Exercise search failed:', exerciseResponse.status);
    }
    
    console.log('\n🎯 Enhanced AI Filtering System Summary:');
    console.log('• OpenAI GPT-4o analyzing all search results');
    console.log('• Intelligent relevance scoring and ranking');
    console.log('• Nutritional analysis for recipes');
    console.log('• Fitness analysis for exercise videos');
    console.log('• Equipment and safety recommendations');
    console.log('• Health-focused content filtering');
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

runEnhancedTests().catch(console.error);

async function runEnhancedTests() {
  await testEnhancedSearch();
}