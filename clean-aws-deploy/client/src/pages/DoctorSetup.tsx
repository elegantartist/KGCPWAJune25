import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Phone, Lock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const phoneVerificationSchema = z.object({
  verificationCode: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d{6}$/, 'Must contain only numbers')
});

const passwordSetupSchema = z.object({
  password: z.string()
    .min(16, 'Password must be at least 16 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type PhoneVerificationForm = z.infer<typeof phoneVerificationSchema>;
type PasswordSetupForm = z.infer<typeof passwordSetupSchema>;

export default function DoctorSetup() {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'validating' | 'phone-verification' | 'complete'>('validating');
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Extract token from URL (URLSearchParams already handles decoding)
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token')?.trim() || null;

  const phoneForm = useForm<PhoneVerificationForm>({
    resolver: zodResolver(phoneVerificationSchema),
    defaultValues: { verificationCode: '' }
  });

  const passwordForm = useForm<PasswordSetupForm>({
    resolver: zodResolver(passwordSetupSchema),
    defaultValues: { password: '', confirmPassword: '' }
  });

  // Validate token once on component mount
  useEffect(() => {
    if (!token) {
      setError('Invalid setup link. Please contact your administrator.');
      return;
    }
    
    // Only validate if we haven't already validated
    if (step === 'validating') {
      validateToken();
    }
  }, []); // Empty dependency array to run only once

  const validateToken = async () => {
    try {
      console.log("Raw window.location.search:", window.location.search);
      console.log("Token extracted by frontend:", token);
      console.log("Token being sent to backend:", token);
      
      setIsLoading(true);
      const response = await fetch('/api/doctor/setup/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok) {
        setDoctorInfo(data.doctor);
        setStep('phone-verification');
        // Automatically send verification code
        await sendVerificationCode();
      } else {
        setError(data.message || 'Invalid or expired setup link.');
      }
    } catch (error) {
      setError('Failed to validate setup link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendVerificationCode = async () => {
    try {
      const response = await fetch('/api/doctor/setup/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Verification Code Sent",
          description: `A 6-digit code has been sent to your mobile phone ending in ${doctorInfo?.phone?.slice(-4) || 'XXXX'}`,
        });
      } else {
        setError(data.message || 'Failed to send verification code.');
      }
    } catch (error) {
      setError('Failed to send verification code. Please try again.');
    }
  };

  const onPhoneVerificationSubmit = async (data: PhoneVerificationForm) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/doctor/setup/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          verificationCode: data.verificationCode 
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Complete setup immediately after phone verification (passwordless)
        setStep('complete');
        toast({
          title: "Phone Verified!",
          description: "Your account has been activated successfully.",
        });
        
        // Complete the passwordless setup
        const setupResponse = await fetch('/api/doctor/setup/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        if (setupResponse.ok) {
          setTimeout(() => {
            setLocation('/doctor-dashboard');
          }, 3000);
        }
      } else {
        setError(result.message || 'Invalid verification code.');
      }
    } catch (error) {
      setError('Failed to verify phone number. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSetupSubmit = async (data: PasswordSetupForm) => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/doctor/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token
        })
      });

      const result = await response.json();

      if (response.ok) {
        setStep('complete');
        toast({
          title: "Account Setup Complete!",
          description: "Your doctor account has been successfully activated.",
        });
        
        // Redirect to doctor dashboard after 3 seconds
        setTimeout(() => {
          setLocation('/doctor-dashboard');
        }, 3000);
      } else {
        setError(result.message || 'Failed to complete account setup.');
      }
    } catch (error) {
      setError('Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationCode = async () => {
    await sendVerificationCode();
  };

  if (step === 'validating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Validating Setup Link</h2>
              <p className="text-sm text-gray-600 text-center">
                Please wait while we verify your account setup link...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && step === 'validating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Setup Link Invalid</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 mb-4">
                Please contact support for assistance:
              </p>
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> admin@anthrocytai.com</p>
                <p><strong>Phone:</strong> 0433509441</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {step === 'phone-verification' && (
              <div className="flex items-center justify-center space-x-2">
                <Phone className="h-5 w-5 text-blue-600" />
                <span>Verify Your Phone</span>
              </div>
            )}

            {step === 'complete' && (
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Setup Complete!</span>
              </div>
            )}
          </CardTitle>
          {doctorInfo && (
            <p className="text-center text-sm text-gray-600">
              Welcome, Dr. {doctorInfo.name}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {step === 'phone-verification' && (
            <div className="space-y-4">
              <div className="text-center">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">
                  We've sent a 6-digit verification code to your mobile phone ending in{' '}
                  <span className="font-mono">{doctorInfo?.phone?.slice(-4) || 'XXXX'}</span>
                </p>
              </div>

              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(onPhoneVerificationSubmit)} className="space-y-4">
                  <FormField
                    control={phoneForm.control}
                    name="verificationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter 6-digit code"
                            className="text-center text-lg font-mono tracking-widest"
                            maxLength={6}
                            autoComplete="one-time-code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Phone Number'
                    )}
                  </Button>
                </form>
              </Form>

              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resendVerificationCode}
                  disabled={isLoading}
                >
                  Resend verification code
                </Button>
              </div>
            </div>
          )}



          {step === 'complete' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Account Successfully Activated!
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your Keep Going Care doctor account is now ready to use.
                </p>
                <p className="text-xs text-gray-500">
                  Redirecting to your dashboard in a few seconds...
                </p>
              </div>
              <Button 
                onClick={() => setLocation('/doctor-dashboard')}
                className="w-full"
              >
                Go to Dashboard Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}