import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function PatientLogin() {
  const [email, setEmail] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [step, setStep] = useState<"email" | "sms">("email");
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
      const response = await fetch("/api/patient/login/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStep("sms");
        toast({
          title: "SMS Sent",
          description: "Please check your phone for the verification code",
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
      const response = await fetch("/api/patient/login/verify-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, smsCode }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Login Successful",
          description: "Welcome to your KGC dashboard!",
        });
        setLocation("/patient-dashboard");
      } else {
        setError(data.message || "Invalid verification code");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">KGC</span>
          </div>
          <CardTitle className="text-2xl">Patient Login</CardTitle>
          <CardDescription>
            {step === "email" 
              ? "Enter your email to receive a verification code"
              : "Enter the verification code sent to your phone"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendSMS} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Verification Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifySMS} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  maxLength={6}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify & Login"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStep("email");
                  setSmsCode("");
                  setError("");
                }}
                disabled={isLoading}
              >
                Back to Email
              </Button>
            </form>
          )}

          <div className="text-center text-sm text-gray-600 mt-4">
            <p>Secure SMS verification for your privacy and safety</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}