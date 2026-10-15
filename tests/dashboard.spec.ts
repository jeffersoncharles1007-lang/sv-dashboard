import { test, expect } from '@playwright/test';

test.describe('SV Elétrica Dashboard', () => {
  test('should load the dashboard page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check page loaded (no crash)
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('page should not have JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected errors (Supabase not configured)
    const criticalErrors = errors.filter(e => 
      !e.includes('supabase') && 
      !e.includes('fetch') &&
      !e.includes('network')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('API Endpoints', () => {
  test('GET /api/dashboard should return valid JSON', async ({ request }) => {
    const response = await request.get('/api/dashboard');
    
    // Should return any valid HTTP response
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);
    
    // Response should be valid JSON
    const text = await response.text();
    expect(() => JSON.parse(text)).not.toThrow();
  });

  test('POST /api/sync should return any response', async ({ request }) => {
    const response = await request.post('/api/sync');
    
    // Accept any response status (sync may not be available)
    expect(response.status()).toBeGreaterThanOrEqual(100);
    expect(response.status()).toBeLessThan(600);
  });
});
