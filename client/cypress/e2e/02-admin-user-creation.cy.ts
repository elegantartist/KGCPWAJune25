describe('Admin User Creation Flow', () => {
  beforeEach(() => {
    // Login as admin before each test
    cy.visit('/');
    cy.get('input[type="email"]').type(Cypress.env('adminEmail'));
    cy.get('input[type="password"]').type(Cypress.env('adminPassword'));
    cy.get('button[type="submit"]').click();
    cy.contains('Admin Dashboard').should('be.visible');
  });

  it('should display admin dashboard with user management options', () => {
    cy.contains('User Management').should('be.visible');
    cy.get('[data-testid="create-doctor-button"]').should('be.visible');
    cy.get('[data-testid="create-patient-button"]').should('be.visible');
    cy.contains('Active Users').should('be.visible');
  });

  it('should create a new doctor successfully', () => {
    cy.get('[data-testid="create-doctor-button"]').click();
    
    // Fill out doctor creation form
    cy.get('input[name="firstName"]').type('Test');
    cy.get('input[name="lastName"]').type('Doctor');
    cy.get('input[name="email"]').type(`test.doctor.${Date.now()}@kgc.com`);
    cy.get('input[name="phone"]').type('+61412345678');
    
    cy.get('[data-testid="save-doctor-button"]').click();
    
    // Should show success message
    cy.contains('Doctor created successfully').should('be.visible');
    
    // Should appear in the doctors list
    cy.contains('Test Doctor').should('be.visible');
  });

  it('should create a new patient successfully', () => {
    cy.get('[data-testid="create-patient-button"]').click();
    
    // Fill out patient creation form
    cy.get('input[name="firstName"]').type('Test');
    cy.get('input[name="lastName"]').type('Patient');
    cy.get('input[name="email"]').type(`test.patient.${Date.now()}@example.com`);
    cy.get('input[name="phone"]').type('+61412345679');
    
    // Select a doctor to assign
    cy.get('select[name="doctorId"]').select(1); // Select first doctor
    
    cy.get('[data-testid="save-patient-button"]').click();
    
    // Should show success message
    cy.contains('Patient created successfully').should('be.visible');
    
    // Should appear in the patients list
    cy.contains('Test Patient').should('be.visible');
  });

  it('should validate required fields in doctor creation', () => {
    cy.get('[data-testid="create-doctor-button"]').click();
    
    // Try to save without filling required fields
    cy.get('[data-testid="save-doctor-button"]').click();
    
    // Should show validation errors
    cy.contains('First name is required').should('be.visible');
    cy.contains('Last name is required').should('be.visible');
    cy.contains('Email is required').should('be.visible');
  });

  it('should validate email format', () => {
    cy.get('[data-testid="create-doctor-button"]').click();
    
    cy.get('input[name="firstName"]').type('Test');
    cy.get('input[name="lastName"]').type('Doctor');
    cy.get('input[name="email"]').type('invalid-email');
    cy.get('input[name="phone"]').type('+61412345678');
    
    cy.get('[data-testid="save-doctor-button"]').click();
    
    // Should show email validation error
    cy.contains('Please enter a valid email').should('be.visible');
  });

  it('should delete and restore users', () => {
    // First create a test user to delete
    cy.get('[data-testid="create-doctor-button"]').click();
    cy.get('input[name="firstName"]').type('Delete');
    cy.get('input[name="lastName"]').type('Test');
    cy.get('input[name="email"]').type(`delete.test.${Date.now()}@kgc.com`);
    cy.get('input[name="phone"]').type('+61412345680');
    cy.get('[data-testid="save-doctor-button"]').click();
    
    // Wait for creation success
    cy.contains('Doctor created successfully').should('be.visible');
    
    // Delete the user
    cy.contains('Delete Test').parent().find('[data-testid="delete-user-button"]').click();
    cy.get('[data-testid="confirm-delete-button"]').click();
    
    // Should show success message
    cy.contains('User deleted successfully').should('be.visible');
    
    // User should not appear in active users
    cy.contains('Delete Test').should('not.exist');
    
    // Check deleted users section
    cy.get('[data-testid="deleted-users-tab"]').click();
    cy.contains('Delete Test').should('be.visible');
    
    // Restore the user
    cy.contains('Delete Test').parent().find('[data-testid="restore-user-button"]').click();
    cy.get('[data-testid="confirm-restore-button"]').click();
    
    // Should show success message
    cy.contains('User restored successfully').should('be.visible');
    
    // User should appear back in active users
    cy.get('[data-testid="active-users-tab"]').click();
    cy.contains('Delete Test').should('be.visible');
  });
});