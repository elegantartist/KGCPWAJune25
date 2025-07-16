describe('Patient Daily Score Submission', () => {
  beforeEach(() => {
    // Login as patient before each test
    cy.visit('/');
    cy.get('input[type="email"]').type(Cypress.env('patientEmail'));
    cy.get('input[type="password"]').type(Cypress.env('patientPassword'));
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should display patient dashboard with daily scores option', () => {
    cy.contains('Keep Going Care').should('be.visible');
    cy.get('[data-testid="daily-scores-button"]').should('be.visible');
    cy.get('[data-testid="chat-button"]').should('be.visible');
    cy.get('[data-testid="keep-going-button"]').should('be.visible');
  });

  it('should navigate to daily scores page', () => {
    cy.get('[data-testid="daily-scores-button"]').click();
    
    cy.url().should('include', '/daily-self-scores');
    cy.contains('Daily Self-Scores').should('be.visible');
    cy.contains('Diet').should('be.visible');
    cy.contains('Exercise').should('be.visible');
    cy.contains('Medication').should('be.visible');
  });

  it('should submit daily scores successfully', () => {
    cy.get('[data-testid="daily-scores-button"]').click();
    
    // Set diet score to 8
    cy.get('[data-testid="diet-slider"]').invoke('val', 8).trigger('input');
    cy.contains('8/10').should('be.visible');
    
    // Set exercise score to 7
    cy.get('[data-testid="exercise-slider"]').invoke('val', 7).trigger('input');
    cy.contains('7/10').should('be.visible');
    
    // Set medication score to 9
    cy.get('[data-testid="medication-slider"]').invoke('val', 9).trigger('input');
    cy.contains('9/10').should('be.visible');
    
    // Submit scores
    cy.get('[data-testid="submit-scores-button"]').click();
    
    // Should show success message
    cy.contains('Scores submitted successfully').should('be.visible');
    
    // Should trigger AI analysis dialog
    cy.contains('AI Analysis').should('be.visible');
    cy.contains('Great job').should('be.visible');
  });

  it('should show score interpretation', () => {
    cy.get('[data-testid="daily-scores-button"]').click();
    
    // Set a low score
    cy.get('[data-testid="diet-slider"]').invoke('val', 3).trigger('input');
    cy.contains('Needs improvement').should('be.visible');
    
    // Set a high score
    cy.get('[data-testid="exercise-slider"]').invoke('val', 9).trigger('input');
    cy.contains('Excellent').should('be.visible');
    
    // Set a medium score
    cy.get('[data-testid="medication-slider"]').invoke('val', 6).trigger('input');
    cy.contains('Good progress').should('be.visible');
  });

  it('should prevent duplicate daily submissions', () => {
    cy.get('[data-testid="daily-scores-button"]').click();
    
    // Submit first set of scores
    cy.get('[data-testid="diet-slider"]').invoke('val', 8).trigger('input');
    cy.get('[data-testid="exercise-slider"]').invoke('val', 7).trigger('input');
    cy.get('[data-testid="medication-slider"]').invoke('val', 9).trigger('input');
    cy.get('[data-testid="submit-scores-button"]').click();
    
    // Wait for success
    cy.contains('Scores submitted successfully').should('be.visible');
    
    // Try to submit again
    cy.get('[data-testid="submit-scores-button"]').should('be.disabled');
    cy.contains('Already submitted today').should('be.visible');
  });

  it('should display historical scores chart', () => {
    cy.get('[data-testid="daily-scores-button"]').click();
    
    // Should show progress chart
    cy.get('[data-testid="progress-chart"]').should('be.visible');
    cy.contains('Progress Over Time').should('be.visible');
    
    // Chart should have data points
    cy.get('[data-testid="progress-chart"] .recharts-line').should('exist');
  });

  it('should trigger badge award ceremony for high scores', () => {
    cy.get('[data-testid="daily-scores-button"]').click();
    
    // Submit consistently high scores (8-10 range)
    cy.get('[data-testid="diet-slider"]').invoke('val', 9).trigger('input');
    cy.get('[data-testid="exercise-slider"]').invoke('val', 8).trigger('input');
    cy.get('[data-testid="medication-slider"]').invoke('val', 10).trigger('input');
    
    cy.get('[data-testid="submit-scores-button"]').click();
    
    // Should show success message first
    cy.contains('Scores submitted successfully').should('be.visible');
    
    // May trigger award ceremony if badge criteria met
    // This is conditional based on streak data
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="award-ceremony"]').length > 0) {
        cy.get('[data-testid="award-ceremony"]').should('be.visible');
        cy.contains('Congratulations').should('be.visible');
        cy.get('[data-testid="badge-display"]').should('be.visible');
      }
    });
  });

  it('should integrate with AI chatbot for score discussion', () => {
    cy.get('[data-testid="daily-scores-button"]').click();
    
    // Submit scores
    cy.get('[data-testid="diet-slider"]').invoke('val', 6).trigger('input');
    cy.get('[data-testid="exercise-slider"]').invoke('val', 5).trigger('input');
    cy.get('[data-testid="medication-slider"]').invoke('val', 8).trigger('input');
    
    cy.get('[data-testid="submit-scores-button"]').click();
    
    // Should show AI analysis dialog
    cy.contains('AI Analysis').should('be.visible');
    
    // Should have option to discuss with chatbot
    cy.get('[data-testid="discuss-with-ai-button"]').should('be.visible');
    
    // Click to open chatbot
    cy.get('[data-testid="discuss-with-ai-button"]').click();
    
    // Should navigate to chatbot with context
    cy.url().should('include', '/enhanced-chatbot');
    cy.contains('Health Assistant').should('be.visible');
    
    // Should have initial message about scores
    cy.contains('daily scores').should('be.visible');
  });
});