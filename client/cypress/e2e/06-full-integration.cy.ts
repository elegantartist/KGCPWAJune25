describe('KGC Full Application Integration', () => {
  it('should complete the full clinical cycle workflow', () => {
    // This test verifies the complete KGC clinical cycle:
    // Doctor creates CPDs → AI guides patients → Patients score 8-10 daily → PPRs feed back to doctors
    
    const timestamp = Date.now();
    const testPatientEmail = `integration.patient.${timestamp}@example.com`;
    
    // STEP 1: Admin creates a doctor
    cy.visit('/');
    cy.get('input[type="email"]').type(Cypress.env('adminEmail'));
    cy.get('input[type="password"]').type(Cypress.env('adminPassword'));
    cy.get('button[type="submit"]').click();
    
    cy.get('[data-testid="create-doctor-button"]').click();
    cy.get('input[name="firstName"]').type('Integration');
    cy.get('input[name="lastName"]').type('Doctor');
    cy.get('input[name="email"]').type(`integration.doctor.${timestamp}@kgc.com`);
    cy.get('input[name="phone"]').type('+61412345690');
    cy.get('[data-testid="save-doctor-button"]').click();
    cy.contains('Doctor created successfully').should('be.visible');
    
    // Logout admin
    cy.get('[data-testid="logout-button"]').click();
    
    // STEP 2: Doctor creates patient with CPDs
    cy.get('input[type="email"]').type(`integration.doctor.${timestamp}@kgc.com`);
    cy.get('input[type="password"]').type('doctor123'); // Default password from seeding
    cy.get('button[type="submit"]').click();
    
    cy.get('[data-testid="create-patient-button"]').click();
    cy.get('input[name="firstName"]').type('Integration');
    cy.get('input[name="lastName"]').type('Patient');
    cy.get('input[name="email"]').type(testPatientEmail);
    cy.get('input[name="phone"]').type('+61412345691');
    
    // Set comprehensive CPDs
    cy.get('textarea[name="dietCPD"]').type('Follow Mediterranean diet, limit processed foods, aim for 8-10 daily score');
    cy.get('textarea[name="exerciseCPD"]').type('30 minutes moderate exercise daily, strength training twice weekly, target 8-10 score');
    cy.get('textarea[name="medicationCPD"]').type('Take prescribed medications as directed, monitor side effects, maintain 8-10 adherence score');
    
    cy.get('[data-testid="save-patient-button"]').click();
    cy.contains('Patient created successfully').should('be.visible');
    
    // Logout doctor
    cy.get('[data-testid="logout-button"]').click();
    
    // STEP 3: Patient logs in and interacts with AI
    cy.get('input[type="email"]').type(testPatientEmail);
    cy.get('input[type="password"]').type('patient123'); // Default password
    cy.get('button[type="submit"]').click();
    
    // Patient chats with AI about their care plan
    cy.get('[data-testid="chat-button"]').click();
    cy.get('[data-testid="chat-input"]').type('What should I focus on for my health today?');
    cy.get('[data-testid="send-button"]').click();
    
    // AI should reference the CPDs
    cy.contains('Mediterranean', { timeout: 15000 }).should('be.visible');
    cy.contains('exercise', { timeout: 15000 }).should('be.visible');
    
    // Navigate back to dashboard
    cy.get('[data-testid="back-to-dashboard"]').click();
    
    // STEP 4: Patient submits high daily scores (8-10 range)
    cy.get('[data-testid="daily-scores-button"]').click();
    
    cy.get('[data-testid="diet-slider"]').invoke('val', 9).trigger('input');
    cy.get('[data-testid="exercise-slider"]').invoke('val', 8).trigger('input');
    cy.get('[data-testid="medication-slider"]').invoke('val', 10).trigger('input');
    
    cy.get('[data-testid="submit-scores-button"]').click();
    cy.contains('Scores submitted successfully').should('be.visible');
    
    // Should trigger AI analysis
    cy.contains('AI Analysis').should('be.visible');
    cy.contains('excellent').should('be.visible');
    
    // Logout patient
    cy.get('[data-testid="logout-button"]').click();
    
    // STEP 5: Doctor reviews Patient Progress Report
    cy.get('input[type="email"]').type(`integration.doctor.${timestamp}@kgc.com`);
    cy.get('input[type="password"]').type('doctor123');
    cy.get('button[type="submit"]').click();
    
    // Find the integration patient
    cy.contains('Integration Patient').click();
    
    // Generate PPR
    cy.get('[data-testid="generate-ppr-button"]').click();
    
    // PPR should include the high scores and AI interactions
    cy.contains('Patient Progress Report', { timeout: 20000 }).should('be.visible');
    cy.contains('Compliance Analysis').should('be.visible');
    cy.contains('9/10').should('be.visible'); // Diet score
    cy.contains('8/10').should('be.visible'); // Exercise score
    cy.contains('10/10').should('be.visible'); // Medication score
    
    // Should show AI interaction summary
    cy.contains('Chat Interactions').should('be.visible');
    cy.contains('Mediterranean').should('be.visible');
    
    // STEP 6: Doctor updates CPDs based on PPR insights
    cy.get('[data-testid="edit-cpd-button"]').first().click();
    cy.get('[data-testid="cpd-directive-input"]').clear().type('Continue Mediterranean diet, add omega-3 supplements, maintain excellent 9-10 scores');
    cy.get('[data-testid="save-cpd-button"]').click();
    cy.contains('CPD updated successfully').should('be.visible');
    
    // STEP 7: Verify MCA tracking
    cy.get('[data-testid="mca-link"]').click();
    cy.contains('Mini Clinical Audit').should('be.visible');
    
    // Should show progress toward 5 hours
    cy.get('[data-testid="cpd-progress"]').should('be.visible');
    cy.contains('Patient Outcome Measurement').should('be.visible');
    
    // Complete the clinical cycle verification
    cy.contains('Clinical Cycle Complete').should('be.visible');
  });

  it('should handle the complete emergency protocol', () => {
    // Test the emergency detection and response system
    
    // Login as patient
    cy.visit('/');
    cy.get('input[type="email"]').type(Cypress.env('patientEmail'));
    cy.get('input[type="password"]').type(Cypress.env('patientPassword'));
    cy.get('button[type="submit"]').click();
    
    // Go to chatbot
    cy.get('[data-testid="chat-button"]').click();
    
    // Express emergency situation
    cy.get('[data-testid="chat-input"]').type('I am having severe chest pain and trouble breathing, I think I might be having a heart attack');
    cy.get('[data-testid="send-button"]').click();
    
    // Should immediately trigger emergency protocol
    cy.contains('000', { timeout: 5000 }).should('be.visible');
    cy.contains('emergency', { timeout: 5000 }).should('be.visible');
    cy.get('[data-testid="emergency-alert"]').should('be.visible');
    
    // Should log emergency event
    cy.get('[data-testid="emergency-logged"]').should('be.visible');
    
    // Logout patient
    cy.get('[data-testid="logout-button"]').click();
    
    // Login as doctor to verify alert
    cy.get('input[type="email"]').type(Cypress.env('doctorEmail'));
    cy.get('input[type="password"]').type(Cypress.env('doctorPassword'));
    cy.get('button[type="submit"]').click();
    
    // Should see emergency alert for patient
    cy.get('[data-testid="emergency-alert-badge"]').should('be.visible');
    cy.contains('Emergency Contact').should('be.visible');
    
    // Logout doctor
    cy.get('[data-testid="logout-button"]').click();
    
    // Login as admin to verify system alert
    cy.get('input[type="email"]').type(Cypress.env('adminEmail'));
    cy.get('input[type="password"]').type(Cypress.env('adminPassword'));
    cy.get('button[type="submit"]').click();
    
    // Should see emergency event in admin dashboard
    cy.get('[data-testid="emergency-events-tab"]').click();
    cy.contains('chest pain').should('be.visible');
    cy.contains('Emergency').should('be.visible');
    
    // Mark as resolved
    cy.get('[data-testid="resolve-emergency-button"]').first().click();
    cy.get('[data-testid="resolution-notes"]').type('Patient contacted emergency services, situation resolved');
    cy.get('[data-testid="confirm-resolution"]').click();
    
    cy.contains('Emergency resolved').should('be.visible');
  });

  it('should demonstrate the complete gamification system', () => {
    // Test the progress milestones and badge system
    
    // Login as patient
    cy.visit('/');
    cy.get('input[type="email"]').type(Cypress.env('patientEmail'));
    cy.get('input[type="password"]').type(Cypress.env('patientPassword'));
    cy.get('button[type="submit"]').click();
    
    // Check current progress milestones
    cy.get('[data-testid="progress-milestones-button"]').click();
    cy.contains('Achievement Badges').should('be.visible');
    
    // Should show badge categories
    cy.contains('Healthy Eating Hero').should('be.visible');
    cy.contains('Exercise Consistency Champion').should('be.visible');
    cy.contains('Medication Maverick').should('be.visible');
    
    // Check progress toward badges
    cy.get('[data-testid="badge-progress"]').should('be.visible');
    cy.contains('weeks completed').should('be.visible');
    
    // Navigate to daily scores
    cy.get('[data-testid="daily-scores-button"]').click();
    
    // Submit consistently high scores to trigger badge progress
    cy.get('[data-testid="diet-slider"]').invoke('val', 9).trigger('input');
    cy.get('[data-testid="exercise-slider"]').invoke('val', 9).trigger('input');
    cy.get('[data-testid="medication-slider"]').invoke('val', 9).trigger('input');
    
    cy.get('[data-testid="submit-scores-button"]').click();
    cy.contains('Scores submitted successfully').should('be.visible');
    
    // Check if award ceremony triggers (depends on existing streak data)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="award-ceremony"]').length > 0) {
        cy.get('[data-testid="award-ceremony"]').should('be.visible');
        cy.contains('Congratulations').should('be.visible');
        cy.get('[data-testid="badge-display"]').should('be.visible');
        
        // Should play celebration sound
        cy.get('[data-testid="celebration-sound"]').should('exist');
        
        // Continue button should close ceremony
        cy.get('[data-testid="continue-journey-button"]').click();
      }
    });
    
    // Check progress milestones again
    cy.get('[data-testid="progress-milestones-button"]').click();
    
    // Progress should have updated
    cy.get('[data-testid="badge-progress"]').should('be.visible');
    
    // Check for $100 reward eligibility
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="platinum-reward"]').length > 0) {
        cy.get('[data-testid="platinum-reward"]').should('be.visible');
        cy.contains('$100').should('be.visible');
        cy.contains('voucher').should('be.visible');
      }
    });
  });

  it('should verify complete data privacy and security', () => {
    // Test privacy protection and data handling
    
    // Login as patient
    cy.visit('/');
    cy.get('input[type="email"]').type(Cypress.env('patientEmail'));
    cy.get('input[type="password"]').type(Cypress.env('patientPassword'));
    cy.get('button[type="submit"]').click();
    
    // Chat with AI using personal information
    cy.get('[data-testid="chat-button"]').click();
    cy.get('[data-testid="chat-input"]').type('My name is John Smith and I live at 123 Main Street, my phone is 0412345678');
    cy.get('[data-testid="send-button"]').click();
    
    // AI should acknowledge but not repeat personal details
    cy.get('[data-testid="ai-message"]', { timeout: 10000 }).should('be.visible');
    cy.get('[data-testid="ai-message"]').should('not.contain.text', '123 Main Street');
    cy.get('[data-testid="ai-message"]').should('not.contain.text', '0412345678');
    
    // Should show privacy protection notice
    cy.contains('privacy', { timeout: 10000 }).should('be.visible');
    
    // Logout patient
    cy.get('[data-testid="logout-button"]').click();
    
    // Login as admin to verify audit logging
    cy.get('input[type="email"]').type(Cypress.env('adminEmail'));
    cy.get('input[type="password"]').type(Cypress.env('adminPassword'));
    cy.get('button[type="submit"]').click();
    
    // Check audit logs
    cy.get('[data-testid="audit-logs-tab"]').click();
    cy.contains('Chat Interaction').should('be.visible');
    cy.contains('Privacy Protection Applied').should('be.visible');
    
    // Verify PII was redacted in logs
    cy.get('[data-testid="audit-entry"]').should('not.contain.text', '123 Main Street');
    cy.get('[data-testid="audit-entry"]').should('not.contain.text', '0412345678');
  });
});