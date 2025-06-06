import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { User, Stethoscope, Shield, Loader2 } from "lucide-react";

export default function CentralizedLogin() {
  const [email, setEmail] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [step, setStep] = useState<"email" | "sms">("email");
  const [userType, setUserType] = useState<"patient" | "doctor" | "admin">("patient");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError("");

    try {
      let endpoint = "";
      switch (userType) {
        case "patient":
          endpoint = "/api/patient/login/send-sms";
          break;
        case "doctor":
          endpoint = "/api/doctor/login/send-sms";
          break;
        case "admin":
          // Admin uses password-based login, redirect to admin login
          setLocation("/admin-login");
          return;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("sms");
        toast({
          title: "SMS Sent",
          description: `Please check your phone for the verification code`,
        });
      } else {
        setError(data.message || "Failed to send SMS");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsCode) return;

    setIsLoading(true);
    setError("");

    try {
      let endpoint = "";
      let redirectPath = "";
      
      switch (userType) {
        case "patient":
          endpoint = "/api/patient/login/verify-sms";
          redirectPath = "/patient-dashboard";
          break;
        case "doctor":
          endpoint = "/api/doctor/login/verify-sms";
          redirectPath = "/doctor-dashboard";
          break;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          smsCode: userType === "patient" ? smsCode : undefined,
          code: userType === "doctor" ? smsCode : undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Login Successful",
          description: `Welcome to Keep Going Care!`,
        });
        setLocation(redirectPath);
      } else {
        setError(data.message || "Invalid verification code");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep("email");
    setEmail("");
    setSmsCode("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">KGC</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Keep Going Care
          </CardTitle>
          <CardDescription>
            Your Personal Health Assistant
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendSMS} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  I am a:
                </label>
                <Tabs value={userType} onValueChange={(value: any) => setUserType(value)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="patient" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Patient
                    </TabsTrigger>
                    <TabsTrigger value="doctor" className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4" />
                      Doctor
                    </TabsTrigger>
                    <TabsTrigger value="admin" className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {userType === "admin" ? "Redirecting..." : "Sending SMS..."}
                  </>
                ) : (
                  userType === "admin" ? "Continue to Admin Login" : "Send SMS Code"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifySMS} className="space-y-4">
              <div>
                <label htmlFor="smsCode" className="text-sm font-medium text-gray-700 mb-2 block">
                  SMS Verification Code
                </label>
                <Input
                  id="smsCode"
                  type="text"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                  className="w-full text-center text-lg tracking-widest"
                />
                <p className="text-sm text-gray-500 mt-2">
                  We sent a verification code to your phone
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !smsCode}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Login"
                  )}
                </Button>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={resetForm}
                  disabled={isLoading}
                >
                  Back to Email
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}