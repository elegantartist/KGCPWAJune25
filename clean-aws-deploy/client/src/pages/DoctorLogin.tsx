import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocation } from 'wouter';

export default function DoctorLogin() {
  const [step, setStep] = useState<'email' | 'sms' | 'dashboard'>('email');
  const [email, setEmail] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [, setLocation] = useLocation();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/doctor/login/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setStep('sms');
      } else {
        setError(data.message || 'Failed to send SMS code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/doctor/login/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: smsCode })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to doctor dashboard
        setLocation('/doctor-dashboard');
      } else {
        setError(data.message || 'Invalid SMS code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Doctor Portal Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Doctor Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Sending SMS...' : 'Send SMS Code'}
              </Button>
            </form>
          )}

          {step === 'sms' && (
            <form onSubmit={handleSmsSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  SMS Verification Code
                </label>
                <Input
                  type="text"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                />
                <p className="text-sm text-gray-600 mt-1">
                  Code sent to your registered phone number
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Access Dashboard'}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                className="w-full"
                onClick={() => setStep('email')}
              >
                Back to Email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}