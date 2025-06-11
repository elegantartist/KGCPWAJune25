/**
 * Frontend Inspiration Machine Test
 * Tests video search functionality through the frontend service layer
 */

const fs = require('fs');
const path = require('path');

// Mock fetch for testing
global.fetch = require('node-fetch');

// Simple test to verify video search endpoint
async function testVideoSearchEndpoint() {
  try {
    console.log('Testing video search endpoint...');
    
    // First authenticate as admin
    const authResponse = await fetch('http://localhost:5000/api/auth/admin-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    if (!authResponse.ok) {
      console.error('Authentication failed:', authResponse.status);
      return false;
    }

    const authData = await authResponse.json();
    console.log('✓ Authentication successful');

    // Test video search with valid token
    const videoResponse = await fetch('http://localhost:5000/api/recipes/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`
      },
      body: JSON.stringify({
        cuisineType: 'healthy',
        mealType: 'dinner',
        ingredients: ['chicken', 'vegetables']
      })
    });

    console.log('Video search response status:', videoResponse.status);
    console.log('Video search response headers:', Object.fromEntries(videoResponse.headers.entries()));

    const responseText = await videoResponse.text();
    console.log('Response preview:', responseText.substring(0, 200));

    // Check if response is JSON
    try {
      const videoData = JSON.parse(responseText);
      console.log('✓ Video search returned JSON:', Object.keys(videoData));
      return true;
    } catch (e) {
      console.error('✗ Video search returned HTML instead of JSON');
      console.log('Response type appears to be HTML - Vite middleware interference detected');
      return false;
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    return false;
  }
}

// Test exercise videos endpoint as well
async function testExerciseVideoEndpoint() {
  try {
    console.log('\nTesting exercise video search endpoint...');
    
    // Authenticate as admin
    const authResponse = await fetch('http://localhost:5000/api/auth/admin-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });

    const authData = await authResponse.json();

    // Test exercise video search
    const exerciseResponse = await fetch('http://localhost:5000/api/exercise-wellness/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`
      },
      body: JSON.stringify({
        activityType: 'cardio',
        intensity: 'moderate',
        duration: 30
      })
    });

    console.log('Exercise search response status:', exerciseResponse.status);
    
    const responseText = await exerciseResponse.text();
    
    try {
      const exerciseData = JSON.parse(responseText);
      console.log('✓ Exercise search returned JSON:', Object.keys(exerciseData));
      return true;
    } catch (e) {
      console.error('✗ Exercise search returned HTML instead of JSON');
      return false;
    }

  } catch (error) {
    console.error('Exercise test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('=== Inspiration Machine Frontend Tests ===\n');
  
  const recipeTest = await testVideoSearchEndpoint();
  const exerciseTest = await testExerciseVideoEndpoint();
  
  console.log('\n=== Test Results ===');
  console.log('Recipe video search:', recipeTest ? 'PASS' : 'FAIL');
  console.log('Exercise video search:', exerciseTest ? 'PASS' : 'FAIL');
  
  if (!recipeTest || !exerciseTest) {
    console.log('\n⚠️  Inspiration machine searches are returning HTML instead of JSON');
    console.log('   This indicates Vite middleware is intercepting API requests');
    console.log('   The Express routes are receiving requests but responses are being transformed');
  } else {
    console.log('\n✅ All inspiration machine searches working correctly');
  }
}

// Run the tests
runTests().catch(console.error);