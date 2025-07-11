import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth'; // Uncommented and path confirmed
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export function PaymentWall() {
  const { user } = useAuth(); // Uncommented
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, the token would come from your auth context/hook
      const token = localStorage.getItem('accessToken'); 

      const response = await fetch('/api/stripe/create-subscription-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create subscription session.');
      }

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe Checkout
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome!</CardTitle>
          <CardDescription>
            To unlock your personalized health dashboard, please complete your subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
              <p className="text-lg font-semibold text-blue-800 dark:text-blue-300">Keep Going Care Subscription</p>
              <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">$50</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">per month</p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Your subscription gives you full access to your personal health assistant, daily tracking, progress milestones, and direct support aligned with your doctor's care plan.
            </p>
            <Button onClick={handleSubscribe} className="w-full" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>
              ) : (
                'Subscribe Now'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}