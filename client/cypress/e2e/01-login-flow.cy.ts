describe('KGC Login Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the login page', () => {
    cy.contains('Keep Going Care').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });

  it('should login as admin successfully', () => {
    cy.get('input[type="email"]').type(Cypress.env('adminEmail'));
    cy.get('input[type="password"]').type(Cypress.env('adminPassword'));
    cy.get('button[type="submit"]').click();
    
    // Should redirect to admin dashboard
    cy.url().should('include', '/admin');
    cy.contains('Admin Dashboard').should('be.visible');
    cy.contains('Welcome').should('be.visible');
  });

  it('should login as doctor successfully', () => {
    cy.get('input[type="email"]').type(Cypress.env('doctorEmail'));
    cy.get('input[type="password"]').type(Cypress.env('doctorPassword'));
    cy.get('button[type="submit"]').click();
    
    // Should redirect to doctor dashboard
    cy.url().should('include', '/doctor');
    cy.contains('Doctor Dashboard').should('be.visible');
    cy.contains('Welcome').should('be.visible');
  });

  it('should login as patient successfully', () => {
    cy.get('input[type="email"]').type(Cypress.env('patientEmail'));
    cy.get('input[type="password"]').type(Cypress.env('patientPassword'));
    cy.get('button[type="submit"]').click();
    
    // Should redirect to patient dashboard
    cy.url().should('include', '/dashboard');
    cy.contains('Keep Going Care').should('be.visible');
    cy.get('[data-testid="chat-button"]').should('be.visible');
    cy.get('[data-testid="daily-scores-button"]').should('be.visible');
    cy.get('[data-testid="keep-going-button"]').should('be.visible');
  });

  it('should show error for invalid credentials', () => {
    cy.get('input[type="email"]').type('invalid@email.com');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    
    cy.contains('Invalid credentials').should('be.visible');
  });

  it('should logout successfully', () => {
    // Login first
    cy.get('input[type="email"]').type(Cypress.env('adminEmail'));
    cy.get('input[type="password"]').type(Cypress.env('adminPassword'));
    cy.get('button[type="submit"]').click();
    
    // Wait for dashboard to load
    cy.contains('Admin Dashboard').should('be.visible');
    
    // Logout
    cy.get('[data-testid="logout-button"]').click();
    
    // Should redirect to login
    cy.url().should('include', '/login');
    cy.get('input[type="email"]').should('be.visible');
  });
});