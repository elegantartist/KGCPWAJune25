import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function RestrictedAccessWall() {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdatePayment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // This endpoint will be created in a future step.
      // It will create a Stripe Customer Portal session.
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/stripe/create-customer-portal-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to open payment portal.');
      }

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe Customer Portal
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-red-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md border-red-300">
        <CardHeader>
          <CardTitle className="text-2xl text-red-700 flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6" />
            Access Restricted
          </CardTitle>
          <CardDescription>
            Hello {user?.name}, your access to Keep Going Care has been temporarily restricted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
            <p className="text-base font-semibold text-red-800 dark:text-red-300">There is an issue with your monthly subscription payment.</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">To regain full access to your dashboard, please update your payment information. Our admin team has been alerted and may contact you to assist.</p>
          <Button onClick={handleUpdatePayment} className="w-full bg-red-600 hover:bg-red-700" disabled={isLoading}>{isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>) : ('Update Payment Method')}</Button>
          <Button variant="link" className="w-full text-gray-500" onClick={logout}>Logout</Button>
        </CardContent>
      </Card>
    </div>
  );
}