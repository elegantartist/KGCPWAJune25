import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  
  test('should allow a patient to log in successfully', async ({ page }) => {
    // Mock the API response for sending the SMS code
    await page.route('**/api/auth/send-sms', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Verification code sent successfully.' }),
      });
    });

    // Mock the API response for verifying the SMS code
    await page.route('**/api/auth/verify-sms', async route => {
      const mockUser = {
        id: 1,
        name: 'Test Patient',
        email: 'patient@test.com',
        role: 'patient',
      };
      const mockToken = 'mock-jwt-token'; // A dummy token for the test

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: mockToken, user: mockUser }),
      });
    });

    // 1. Navigate to the login page
    await page.goto('/login');

    // 2. Select the "Patient" tab
    await page.getByRole('tab', { name: 'Patient' }).click();

    // 3. Fill in the email and request a verification code
    await page.getByLabel('Email Address').fill('patient@test.com');
    await page.getByRole('button', { name: 'Send Verification Code' }).click();

    // 4. Wait for the code input field to appear and fill it in
    const verificationCodeInput = page.getByLabel('Verification Code');
    await expect(verificationCodeInput).toBeVisible();
    await verificationCodeInput.fill('123456');

    // 5. Click the login button
    await page.getByRole('button', { name: 'Login' }).click();

    // 6. Verify that the user is redirected to the patient dashboard
    // The dashboard component might be named `dashboard.tsx` or `PatientDashboard.tsx`
    // We check for a unique element on that page, like the welcome message.
    await expect(page).toHaveURL('/patient-dashboard');
    const welcomeMessage = page.getByRole('heading', { name: /Welcome, Test Patient/i });
    await expect(welcomeMessage).toBeVisible();
  });

});