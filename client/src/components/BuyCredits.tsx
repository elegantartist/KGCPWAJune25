import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Gem } from 'lucide-react';

const creditPackages = [
  {
    credits: 100,
    price: '$10', // IMPORTANT: Replace with your actual Stripe Price ID from your Stripe Dashboard
    priceId: 'price_...', 
    description: 'Perfect for getting started.'
  },
  {
    credits: 550,
    price: '$50', // IMPORTANT: Replace with your actual Stripe Price ID from your Stripe Dashboard
    priceId: 'price_...', 
    description: 'Best value for regular users.'
  },
  {
    credits: 1200,
    price: '$100', // IMPORTANT: Replace with your actual Stripe Price ID from your Stripe Dashboard
    priceId: 'price_...', 
    description: 'For power users and long-term planning.'
  }
];

export function BuyCredits() {
  const [isLoading, setIsLoading] = useState<string | null>(null); // Store which button is loading
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = async (priceId: string, credits: number) => {
    setIsLoading(priceId);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/stripe/create-credit-purchase-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, credits_to_add: credits }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment session.');
      }

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe Checkout
    } catch (err: any) {
      setError(err.message);
      setIsLoading(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Purchase Credits</CardTitle>
        <CardDescription>
          Top up your account to use premium features like AI-powered wellness program generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          {creditPackages.map((pkg) => (
            <Card key={pkg.priceId} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center"><Gem className="mr-2 h-5 w-5 text-blue-500" /> {pkg.credits} Credits</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-end">
                <p className="text-3xl font-bold mb-4">{pkg.price}</p>
                <Button onClick={() => handlePurchase(pkg.priceId, pkg.credits)} disabled={!!isLoading} className="w-full">
                  {isLoading === pkg.priceId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Purchase'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}