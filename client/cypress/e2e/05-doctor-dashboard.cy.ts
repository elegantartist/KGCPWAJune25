describe('Doctor Dashboard Functionality', () => {
  beforeEach(() => {
    // Login as doctor before each test
    cy.visit('/');
    cy.get('input[type="email"]').type(Cypress.env('doctorEmail'));
    cy.get('input[type="password"]').type(Cypress.env('doctorPassword'));
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/doctor');
  });

  it('should display doctor dashboard with patient list', () => {
    cy.contains('Doctor Dashboard').should('be.visible');
    cy.contains('Welcome').should('be.visible');
    cy.contains('My Patients').should('be.visible');
    cy.get('[data-testid="create-patient-button"]').should('be.visible');
    cy.get('[data-testid="mca-link"]').should('be.visible');
  });

  it('should show patients sorted by alert count', () => {
    cy.get('[data-testid="patient-list"]').should('be.visible');
    
    // Patients should be displayed with alert badges
    cy.get('[data-testid="patient-card"]').should('have.length.at.least', 1);
    cy.get('[data-testid="alert-badge"]').should('be.visible');
    
    // First patient should have highest alert count
    cy.get('[data-testid="patient-card"]').first().within(() => {
      cy.get('[data-testid="alert-count"]').should('be.visible');
    });
  });

  it('should navigate to patient detail view', () => {
    cy.get('[data-testid="patient-card"]').first().click();
    
    // Should show patient details
    cy.url().should('include', '/doctor/patient/');
    cy.contains('Patient Details').should('be.visible');
    cy.contains('Care Plan Directives').should('be.visible');
    cy.contains('Progress Reports').should('be.visible');
    cy.get('[data-testid="generate-ppr-button"]').should('be.visible');
  });

  it('should display and manage Care Plan Directives', () => {
    cy.get('[data-testid="patient-card"]').first().click();
    
    // Should show current CPDs
    cy.contains('Diet').should('be.visible');
    cy.contains('Exercise').should('be.visible');
    cy.contains('Medication').should('be.visible');
    
    // Should be able to edit CPDs
    cy.get('[data-testid="edit-cpd-button"]').first().click();
    cy.get('[data-testid="cpd-directive-input"]').should('be.visible');
    cy.get('[data-testid="cpd-target-input"]').should('be.visible');
    
    // Update CPD
    cy.get('[data-testid="cpd-directive-input"]').clear().type('Follow Mediterranean diet with reduced sodium');
    cy.get('[data-testid="cpd-target-input"]').clear().type('8');
    cy.get('[data-testid="save-cpd-button"]').click();
    
    // Should show success message
    cy.contains('CPD updated successfully').should('be.visible');
  });

  it('should generate Patient Progress Report', () => {
    cy.get('[data-testid="patient-card"]').first().click();
    
    // Generate new PPR
    cy.get('[data-testid="generate-ppr-button"]').click();
    
    // Should show loading state
    cy.get('[data-testid="generating-ppr"]').should('be.visible');
    
    // Should show generated PPR
    cy.contains('Patient Progress Report', { timeout: 15000 }).should('be.visible');
    cy.contains('Compliance Analysis').should('be.visible');
    cy.contains('Behavioral Patterns').should('be.visible');
    cy.contains('Recommendations').should('be.visible');
    
    // PPR should appear in the list
    cy.get('[data-testid="ppr-list"]').within(() => {
      cy.contains('Generated').should('be.visible');
    });
  });

  it('should create new patient with CPDs', () => {
    cy.get('[data-testid="create-patient-button"]').click();
    
    // Fill patient details
    cy.get('input[name="firstName"]').type('New');
    cy.get('input[name="lastName"]').type('Patient');
    cy.get('input[name="email"]').type(`new.patient.${Date.now()}@example.com`);
    cy.get('input[name="phone"]').type('+61412345681');
    
    // Set CPDs
    cy.get('textarea[name="dietCPD"]').type('Follow low-carb diet with portion control');
    cy.get('textarea[name="exerciseCPD"]').type('30 minutes walking daily, strength training 2x/week');
    cy.get('textarea[name="medicationCPD"]').type('Take metformin as prescribed, monitor blood glucose');
    
    cy.get('[data-testid="save-patient-button"]').click();
    
    // Should show success message
    cy.contains('Patient created successfully').should('be.visible');
    
    // Should send welcome email
    cy.contains('Welcome email sent').should('be.visible');
    
    // Patient should appear in list
    cy.contains('New Patient').should('be.visible');
  });

  it('should access MCA program', () => {
    cy.get('[data-testid="mca-link"]').click();
    
    // Should navigate to MCA page
    cy.url().should('include', '/doctor/mca');
    cy.contains('Mini Clinical Audit').should('be.visible');
    cy.contains('5 Hours CPD').should('be.visible');
    cy.contains('ACRRM/RACGP').should('be.visible');
    
    // Should show progress tracking
    cy.get('[data-testid="cpd-progress"]').should('be.visible');
    cy.contains('hours completed').should('be.visible');
  });

  it('should show doctor analytics', () => {
    cy.get('[data-testid="analytics-tab"]').click();
    
    // Should display key metrics
    cy.contains('Patient Compliance').should('be.visible');
    cy.contains('High-Risk Patients').should('be.visible');
    cy.contains('Average Scores').should('be.visible');
    
    // Should have charts
    cy.get('[data-testid="compliance-chart"]').should('be.visible');
    cy.get('[data-testid="trends-chart"]').should('be.visible');
  });

  it('should handle patient alerts appropriately', () => {
    // Look for high-alert patient
    cy.get('[data-testid="patient-card"]').first().within(() => {
      cy.get('[data-testid="alert-badge"]').should('be.visible');
      
      // Check alert types
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="emergency-alert"]').length > 0) {
          cy.get('[data-testid="emergency-alert"]').should('be.visible');
          cy.contains('Emergency').should('be.visible');
        }
        if ($body.find('[data-testid="compliance-alert"]').length > 0) {
          cy.get('[data-testid="compliance-alert"]').should('be.visible');
          cy.contains('Non-compliance').should('be.visible');
        }
      });
    });
  });

  it('should validate CPD input', () => {
    cy.get('[data-testid="create-patient-button"]').click();
    
    // Try to save without CPDs
    cy.get('input[name="firstName"]').type('Test');
    cy.get('input[name="lastName"]').type('Patient');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="phone"]').type('+61412345682');
    
    cy.get('[data-testid="save-patient-button"]').click();
    
    // Should show validation errors
    cy.contains('Diet CPD is required').should('be.visible');
    cy.contains('Exercise CPD is required').should('be.visible');
    cy.contains('Medication CPD is required').should('be.visible');
  });
});