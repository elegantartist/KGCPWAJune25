# MCP Protocol Communication Guide

## Overview

The Keep Going Care (KGC) application uses a standardized Model Context Protocol (MCP) architecture that makes adding, removing, and debugging modules extremely straightforward. Everything follows the same communication pattern, making the system highly modular and maintainable.

## Communication Protocol

### Standard MCP Server Structure

Every MCP server follows this exact pattern:

```javascript
class YourNewServer {
  constructor() {
    this.name = 'YourNewServer';
    this.description = 'Brief description of what this server handles';
  }

  /**
   * Main execution method - all servers use this same signature
   * @param {string} argument - Raw user input 
   * @param {object} context - Standard context object with userId, CPDs, etc.
   * @returns {Promise<string>} - Formatted response string
   */
  async execute(argument, context = {}) {
    console.log(`[${this.name}] Processing: "${argument}"`);
    
    try {
      // Your server logic here
      return this.formatResponse(result, context);
    } catch (error) {
      console.error(`[${this.name}] Error:`, error);
      return "Standard error message for users";
    }
  }
}

export default new YourNewServer();
```

### Standard Context Object

Every server receives the same context structure:

```javascript
const context = {
  userId: number,
  cpdGuidance: string[],        // Current Care Plan Directives
  primeDirective: string,       // "Focus on 8-10 scoring through CPD compliance"
  currentScores: {              // Latest health scores
    medication: number,
    diet: number, 
    exercise: number
  },
  chatHistory: string[],        // Recent chat context
  location: string              // User's location for local searches
};
```

## Adding New MCP Servers

### Step 1: Create the Server File

Create your new server in `client/src/components/mcp_servers/YourNewServer.js`:

```javascript
/**
 * Your New Server - Specialist Chef for [Your Feature]
 * 
 * This server handles [specific functionality] with CPD integration
 * and CBT/MI techniques focused on 8-10 scoring.
 */

import { apiRequest } from '@/lib/queryClient';

class YourNewServer {
  constructor() {
    this.name = 'YourNewServer';
    this.description = 'Handles [your specific functionality]';
  }

  async execute(argument, context = {}) {
    console.log(`[${this.name}] Processing: "${argument}"`);
    
    try {
      // Extract parameters from user input
      const parameters = await this.extractParameters(argument);
      
      // Process with CPD guidance
      const result = await this.processWithCPDGuidance(parameters, context);
      
      // Format response with CBT/MI techniques
      return this.formatCBTMIResponse(result, context);
      
    } catch (error) {
      console.error(`[${this.name}] Error:`, error);
      return "I'm having trouble with that request. Please try rephrasing or check your connection.";
    }
  }

  async extractParameters(argument) {
    // Use AI to extract specific parameters from user input
    // This keeps the server intelligent and flexible
  }

  async processWithCPDGuidance(parameters, context) {
    // Your core business logic here
    // Always consider context.cpdGuidance for alignment
  }

  formatCBTMIResponse(result, context) {
    // Format response using CBT/MI techniques
    // Focus on 8-10 scoring motivation
    // Reference CPDs when relevant
  }
}

export default new YourNewServer();
```

### Step 2: Register in Router

Add your server to `client/src/components/mcp_client/router.js`:

```javascript
// Import your server
import YourNewServer from '../mcp_servers/YourNewServer.js';

// Add routing cases
case 'your_tool_name':
case 'alternative_name':
case 'another_alias':
  return await YourNewServer.execute(argument, context);
```

### Step 3: Update Available Tools List

Add your tools to the `getAvailableTools()` function in router.js:

```javascript
export function getAvailableTools() {
  return [
    // ... existing tools
    {
      name: 'your_tool_name',
      description: 'Brief description for the Supervisor Agent',
      server: 'YourNewServer'
    }
  ];
}
```

## Standard Error Handling

All servers use consistent error handling:

```javascript
try {
  // Server logic
} catch (error) {
  console.error(`[${this.name}] Error:`, error);
  
  // Return user-friendly error that maintains therapeutic relationship
  return "I'm having trouble with that request right now. Your progress is important - please try again in a moment.";
}
```

## CBT/MI Integration Pattern

Every server response should follow CBT (Cognitive Behavioral Therapy) and MI (Motivational Interviewing) principles:

```javascript
formatCBTMIResponse(result, context) {
  let response = `**${this.getFeatureName()}** 🎯\n\n`;
  
  // 1. Acknowledge current state
  response += this.acknowledgeCurrentState(context.currentScores);
  
  // 2. Connect to CPD compliance
  response += this.connectToCPDs(result, context.cpdGuidance);
  
  // 3. Motivate toward 8-10 scoring
  response += this.motivateTowardGoals(context);
  
  // 4. Provide specific guidance
  response += this.provideSpecificGuidance(result);
  
  return response;
}
```

## Debugging Made Easy

### Console Logging Pattern

Every server uses consistent logging:

```javascript
console.log(`[${this.name}] Processing: "${argument}"`);
console.log(`[${this.name}] Extracted parameters:`, parameters);
console.log(`[${this.name}] CPD guidance:`, context.cpdGuidance);
console.error(`[${this.name}] Error:`, error);
```

### Router Debugging

The router logs all tool requests:

```javascript
console.log(`[Router] Routing request to: ${toolName} with argument: ${argument}`);
console.warn(`[Router] Unknown tool: ${toolName}`);
```

### Testing New Servers

1. **Console Testing**: Check browser console for server logs
2. **Isolation Testing**: Test server directly with mock context
3. **Integration Testing**: Test through Chat.js with real user input

## Removing MCP Servers

### Step 1: Remove Router Cases

Comment out or remove the routing cases in router.js:

```javascript
// Disabled server
// case 'old_tool_name':
//   return await OldServer.execute(argument, context);
```

### Step 2: Remove Import

Comment out the import in router.js:

```javascript
// import OldServer from '../mcp_servers/OldServer.js';
```

### Step 3: Archive Server File

Move the server file to a `removed` directory for future reference.

## Best Practices

### 1. Server Naming Convention
- Use descriptive names ending in "Server"
- Example: `NutritionAnalysisServer`, `ExerciseRecommendationServer`

### 2. Tool Name Aliases
- Provide multiple aliases for the same functionality
- Think about how users might naturally phrase requests

### 3. CPD Integration
- Always check `context.cpdGuidance` for Care Plan Directives
- Align all recommendations with doctor's guidance
- Focus responses on achieving 8-10 health scores

### 4. Error Recovery
- Provide graceful fallbacks when APIs fail
- Maintain therapeutic relationship even during errors
- Suggest alternative approaches when primary method fails

### 5. Documentation
- Include markdown documentation in server comments
- Document parameter extraction logic
- Explain CPD alignment strategies

## Example: Adding a Sleep Tracking Server

```javascript
/**
 * Sleep Tracking Server - Specialist Chef for Sleep Analysis
 * 
 * Analyzes sleep patterns and provides CBT-based sleep hygiene
 * recommendations aligned with CPDs for optimal health scoring.
 */

import { apiRequest } from '@/lib/queryClient';

class SleepTrackingServer {
  constructor() {
    this.name = 'SleepTrackingServer';
    this.description = 'Analyzes sleep patterns with CBT techniques for 8-10 scoring';
  }

  async execute(argument, context = {}) {
    console.log(`[SleepTrackingServer] Processing: "${argument}"`);
    
    try {
      const sleepData = await this.getSleepData(context.userId);
      const analysis = await this.analyzeSleepPatterns(sleepData, context);
      
      return this.formatSleepGuidance(analysis, context);
      
    } catch (error) {
      console.error('[SleepTrackingServer] Error:', error);
      return "I'm having trouble accessing your sleep data. Good sleep supports all your health goals - please try again shortly.";
    }
  }

  async getSleepData(userId) {
    return await apiRequest(`/api/patients/${userId}/sleep-data`);
  }

  async analyzeSleepPatterns(sleepData, context) {
    // Analyze patterns considering CPDs
    return {
      quality: sleepData.averageQuality,
      duration: sleepData.averageDuration,
      consistency: sleepData.consistency,
      cpdAlignment: this.assessCPDAlignment(sleepData, context.cpdGuidance)
    };
  }

  formatSleepGuidance(analysis, context) {
    let response = `**Sleep Analysis** 😴\n\n`;
    
    // CBT approach to sleep improvement
    response += `Your sleep patterns directly impact your ability to achieve 8-10 scores in medication, diet, and exercise.\n\n`;
    
    if (context.cpdGuidance?.includes('sleep')) {
      response += `**Care Plan Connection**: Your doctor has included sleep guidance in your care plan. `;
    }
    
    response += `**Sleep Quality**: ${analysis.quality}/10\n`;
    response += `**Recommendations**: ${this.generateCBTSleepTips(analysis)}\n\n`;
    response += `**Next Steps**: Track your sleep consistently to see patterns and improve your overall health scores.`;
    
    return response;
  }
}

export default new SleepTrackingServer();
```

Then add to router.js:

```javascript
case 'sleep_tracking':
case 'sleep_analysis': 
case 'sleep_patterns':
  return await SleepTrackingServer.execute(argument, context);
```

This standardized approach makes the entire system extremely maintainable and extensible.