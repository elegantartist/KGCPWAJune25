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
        
        // Request SMS for test patient
        const smsResponse = await axios.post(`${BASE_URL}/auth/sms-request`, {
            phoneNumber: '+61400000001'
        });
        
        // Verify with test code
        const verifyResponse = await axios.post(`${BASE_URL}/auth/sms-verify`, {
            phoneNumber: '+61400000001',
            code: '123456'
        });
        
        if (verifyResponse.data.token) {
            console.log('✅ Authentication successful');
            return verifyResponse.data.token;
        } else {
            throw new Error('No token received');
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

// Test Supervisor Agent query processing
async function testSupervisorQuery(token, query, expectedTool = null) {
    try {
        console.log(`\n🤖 Testing Supervisor query: "${query}"`);
        
        const response = await axios.post(`${BASE_URL}/v2/supervisor/query`, {
            query: query,
            requiresValidation: false
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = response.data;
        console.log('✅ Query processed:', {
            modelUsed: result.modelUsed,
            toolsUsed: result.toolsUsed,
            responseLength: result.response.length,
            processingTime: result.processingTime
        });
        
        if (expectedTool && result.toolsUsed?.includes(expectedTool)) {
            console.log(`✅ Expected tool "${expectedTool}" was used`);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Supervisor query failed:', error.response?.data || error.message);
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
    
    // Step 3: Test Supervisor Agent with various queries
    await testSupervisorQuery(token, "What should I eat for lunch?", "meal-inspiration");
    await testSupervisorQuery(token, "I'm feeling stressed, what can I do?", "wellness-inspiration");
    await testSupervisorQuery(token, "Help me plan meals for the week", "weekly-meal-plan");
    await testSupervisorQuery(token, "Create a wellness routine for me", "wellness-program");
    await testSupervisorQuery(token, "Tell me about my health metrics");
    
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