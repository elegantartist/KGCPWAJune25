describe('Doctor CPD Management', () => {
  beforeEach(() => {
    // Log in as a doctor before each test
    cy.login('sarah.johnson@kgc.com', 'doctor123');
    cy.visit('/doctor-dashboard');
  });

  it('should allow a doctor to view a patient\'s CPDs', () => {
    // Navigate to the first patient's profile
    cy.get('[data-testid="patient-list-item"]').first().click();
    cy.url().should('include', '/doctor/patient/');

    // Check that the CPD sections are visible
    cy.contains('Healthy Meal Plan').should('be.visible');
    cy.contains('Exercise and Wellness Routine').should('be.visible');
    cy.contains('Prescribed Medication').should('be.visible');
  });

  it('should allow a doctor to update a patient\'s CPDs', () => {
    // Navigate to the first patient's profile
    cy.get('[data-testid="patient-list-item"]').first().click();

    // Update the diet CPD
    const newDietDirective = 'Focus on a Mediterranean diet, rich in fruits, vegetables, and healthy fats.';
    cy.get('[data-testid="diet-cpd-textarea"]').clear().type(newDietDirective);

    // Save the changes
    cy.get('[data-testid="save-cpd-button"]').click();

    // Verify the success message
    cy.contains('Care Plan Directives saved successfully').should('be.visible');

    // Reload the page and verify the change persisted
    cy.reload();
    cy.get('[data-testid="diet-cpd-textarea"]').should('have.value', newDietDirective);
  });
});
