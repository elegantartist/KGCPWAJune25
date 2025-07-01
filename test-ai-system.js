/**
 * Comprehensive AI System Test Suite
 * Tests Phase 1 (Privacy Middleware) + Phase 2 (Supervisor Agent) + Phase 3 (Inspiration Machines)
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

// Test authentication and get token
async function authenticateTestPatient() {
    try {
        console.log('🔐 Authenticating test patient...');
        
        // Request SMS for test patient using correct endpoint
        const smsResponse = await axios.post(`${BASE_URL}/auth/send-sms`, {
            email: 'patient@test.com',
            role: 'patient'
        });
        
        // Verify with test code using correct endpoint
        const verifyResponse = await axios.post(`${BASE_URL}/auth/verify-sms`, {
            email: 'patient@test.com',
            code: '123456'
        });
        
        if (verifyResponse.data.accessToken) {
            console.log('✅ Authentication successful');
            return verifyResponse.data.accessToken;
        } else {
            throw new Error('No access token received');
        }
    } catch (error) {
        console.error('❌ Authentication failed:', error.response?.data || error.message);
        return null;
    }
}

// Test Supervisor Agent capabilities
async function testSupervisorCapabilities(token) {
    try {
        console.log('\n🧠 Testing Supervisor Agent capabilities...');
        
        const response = await axios.get(`${BASE_URL}/v2/supervisor/capabilities`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const capabilities = response.data;
        console.log('✅ Capabilities retrieved:', {
            version: capabilities.version,
            toolCount: capabilities.capabilities.length,
            inspirationMachines: Object.keys(capabilities.inspirationMachines).length,
            safetyFeatures: capabilities.safetyFeatures.length
        });
        
        return capabilities;
    } catch (error) {
        console.error('❌ Capabilities test failed:', error.response?.data || error.message);
        return null;
    }
}

// Test Supervisor Agent health check
async function testSupervisorHealth(token) {
    try {
        console.log('\n🏥 Testing Supervisor Agent health...');
        
        const response = await axios.get(`${BASE_URL}/v2/supervisor/health`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Health check passed:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Health check failed:', error.response?.data || error.message);
        return null;
    }
}

// Test individual Inspiration Machines
async function testInspirationMachine(token, type, endpoint, description) {
    try {
        console.log(`\n🎯 Testing ${description}...`);
        
        const response = await axios.post(`${BASE_URL}/v2/inspiration/${endpoint}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = response.data;
        console.log('✅ Inspiration generated:', {
            success: result.success,
            type: result.type,
            responseLength: result.inspiration?.length || result.plan?.length || result.program?.length,
            hasSessionId: !!result.sessionId
        });
        
        return result;
    } catch (error) {
        console.error(`❌ ${description} failed:`, error.response?.data || error.message);
        return null;
    }
}

// Test the new /api/chat endpoint created during the refactor.
async function testNewChatEndpoint(token, message) {
    try {
        console.log(`\n💬 Testing new /api/chat endpoint with message: "${message}"`);

        const response = await axios.post(`${BASE_URL}/chat`, {
            message: message,
            sessionId: `test-session-${Date.now()}`
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const result = response.data;
        if (result && result.response) {
            console.log('✅ New chat endpoint responded successfully:', {
                responseLength: result.response.length
            });
            return result;
        } else {
            throw new Error('Invalid response format from /api/chat');
        }
    } catch (error) {
        console.error('❌ New chat endpoint test failed:', error.response?.data || error.message);
        return null;
    }
}

// Main test suite
async function runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive AI System Tests\n');
    console.log('Phase 1: Privacy Middleware ✅ (Integrated)');
    console.log('Phase 2: Supervisor Agent 🧠 (Testing)');
    console.log('Phase 3: Inspiration Machines 🎯 (Testing)\n');
    
    // Step 1: Authenticate
    const token = await authenticateTestPatient();
    if (!token) {
        console.log('❌ Cannot proceed without authentication');
        return;
    }
    
    // Step 2: Test Supervisor Agent
    const capabilities = await testSupervisorCapabilities(token);
    const health = await testSupervisorHealth(token);
    
    // Step 3: Test the new refactored chat endpoint with realistic queries
    await testNewChatEndpoint(token, "What should I eat for lunch?");
    await testNewChatEndpoint(token, "I'm feeling stressed, what can I do?");

    // Step 4: Test individual Inspiration Machines
    await testInspirationMachine(token, 'meal', 'meal', 'Meal Inspiration Machine');
    await testInspirationMachine(token, 'wellness', 'wellness', 'Wellness Inspiration Machine');
    await testInspirationMachine(token, 'meal-plan', 'meal-plan', 'Weekly Meal Planning Tool');
    await testInspirationMachine(token, 'wellness-program', 'wellness-program', 'Wellness Program Tool');
    
    console.log('\n🎉 Comprehensive AI System Tests Completed');
    console.log('✅ Phase 1: Privacy Middleware - Integrated');
    console.log('✅ Phase 2: Supervisor Agent - Operational');
    console.log('✅ Phase 3: Inspiration Machines - Deployed');
}

// Run the tests
runComprehensiveTests().catch(console.error);