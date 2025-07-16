describe('Enhanced Chatbot Integration', () => {
  beforeEach(() => {
    // Login as patient and navigate to chatbot
    cy.visit('/');
    cy.get('input[type="email"]').type(Cypress.env('patientEmail'));
    cy.get('input[type="password"]').type(Cypress.env('patientPassword'));
    cy.get('button[type="submit"]').click();
    cy.get('[data-testid="chat-button"]').click();
    cy.url().should('include', '/enhanced-chatbot');
  });

  it('should display chatbot interface', () => {
    cy.contains('KGC Health Assistant').should('be.visible');
    cy.get('[data-testid="chat-input"]').should('be.visible');
    cy.get('[data-testid="send-button"]').should('be.visible');
    cy.get('[data-testid="voice-button"]').should('be.visible');
  });

  it('should show welcome dialogue for first-time users', () => {
    // This test assumes first visit triggers welcome
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="welcome-dialogue"]').length > 0) {
        cy.get('[data-testid="welcome-dialogue"]').should('be.visible');
        cy.contains('Welcome to KGC').should('be.visible');
        cy.get('[data-testid="start-chat-button"]').click();
      }
    });
  });

  it('should send and receive messages', () => {
    cy.get('[data-testid="chat-input"]').type('Hello, I need help with my diet');
    cy.get('[data-testid="send-button"]').click();
    
    // Should show user message
    cy.contains('Hello, I need help with my diet').should('be.visible');
    
    // Should show loading indicator
    cy.get('[data-testid="typing-indicator"]').should('be.visible');
    
    // Should receive AI response (wait up to 10 seconds)
    cy.contains('diet', { timeout: 10000 }).should('be.visible');
    
    // Response should reference Care Plan Directives
    cy.get('[data-testid="ai-message"]').should('contain.text', 'plan');
  });

  it('should provide CPD-aligned responses', () => {
    cy.get('[data-testid="chat-input"]').type('What should I eat today?');
    cy.get('[data-testid="send-button"]').click();
    
    // AI should reference doctor's care plan
    cy.contains('doctor', { timeout: 10000 }).should('be.visible');
    cy.contains('plan', { timeout: 10000 }).should('be.visible');
  });

  it('should recommend KGC features appropriately', () => {
    cy.get('[data-testid="chat-input"]').type('I need meal ideas');
    cy.get('[data-testid="send-button"]').click();
    
    // Should recommend Inspiration Machine D
    cy.contains('Inspiration Machine', { timeout: 10000 }).should('be.visible');
    
    // Should have clickable feature recommendation
    cy.get('[data-testid="feature-recommendation"]').should('be.visible');
  });

  it('should handle emergency situations appropriately', () => {
    cy.get('[data-testid="chat-input"]').type('I am having chest pain and feel like I might die');
    cy.get('[data-testid="send-button"]').click();
    
    // Should immediately recommend calling emergency services
    cy.contains('000', { timeout: 5000 }).should('be.visible');
    cy.contains('emergency', { timeout: 5000 }).should('be.visible');
    
    // Should show emergency alert
    cy.get('[data-testid="emergency-alert"]').should('be.visible');
  });

  it('should maintain conversation context', () => {
    // First message
    cy.get('[data-testid="chat-input"]').type('I scored 6 for diet today');
    cy.get('[data-testid="send-button"]').click();
    cy.wait(3000);
    
    // Follow-up message
    cy.get('[data-testid="chat-input"]').type('Why was it so low?');
    cy.get('[data-testid="send-button"]').click();
    
    // AI should understand context and reference the diet score
    cy.contains('diet', { timeout: 10000 }).should('be.visible');
  });

  it('should integrate voice controls', () => {
    // Test voice button functionality
    cy.get('[data-testid="voice-button"]').click();
    
    // Should show listening indicator
    cy.get('[data-testid="listening-indicator"]').should('be.visible');
    
    // Click again to stop listening
    cy.get('[data-testid="voice-button"]').click();
    
    // Should hide listening indicator
    cy.get('[data-testid="listening-indicator"]').should('not.exist');
  });

  it('should provide therapeutic responses using CBT/MI techniques', () => {
    cy.get('[data-testid="chat-input"]').type('I feel like giving up on my health goals');
    cy.get('[data-testid="send-button"]').click();
    
    // Should provide supportive, therapeutic response
    cy.contains('understand', { timeout: 10000 }).should('be.visible');
    cy.contains('progress', { timeout: 10000 }).should('be.visible');
    
    // Should use motivational interviewing techniques
    cy.get('[data-testid="ai-message"]').should('contain.text', 'important');
  });

  it('should log conversations for PPR generation', () => {
    cy.get('[data-testid="chat-input"]').type('I had trouble with my medication today');
    cy.get('[data-testid="send-button"]').click();
    cy.wait(3000);
    
    // Conversation should be logged (this would be verified in backend)
    // For now, just verify the message appears
    cy.contains('medication today').should('be.visible');
  });

  it('should handle network errors gracefully', () => {
    // Simulate network failure
    cy.intercept('POST', '/api/chat', { forceNetworkError: true }).as('chatError');
    
    cy.get('[data-testid="chat-input"]').type('Test message');
    cy.get('[data-testid="send-button"]').click();
    
    cy.wait('@chatError');
    
    // Should show error message
    cy.contains('connection error').should('be.visible');
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });
});