import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, UserCog, UserPlus } from 'lucide-react';
import axios from 'axios';

interface UserOption {
  id: number;
  name: string;
  role: 'admin' | 'doctor' | 'patient';
  uin: string;
  redirectPath: string;
}

const Login: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Testing mode: Auto-redirect to admin dashboard
  useEffect(() => {
    // For quick testing: auto-login as admin
    const adminUser = { id: 4, name: 'Admin User', role: 'admin' as const, uin: 'ADM-789012', redirectPath: '/admin-dashboard' };
    
    // Auto login after a short delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      // Store admin user info directly
      localStorage.setItem('currentUser', JSON.stringify({
        id: adminUser.id,
        name: adminUser.name,
        role: adminUser.role,
        uin: adminUser.uin
      }));
      
      // Redirect to admin dashboard
      setLocation('/admin-dashboard');
    }, 100);
    
    return () => clearTimeout(timer);
  }, [setLocation]);

  // Fetch user data from the database
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Convert database users to user options with proper UINs
        const users: UserOption[] = [
          { id: 4, name: 'Admin User', role: 'admin', uin: 'ADM-789012', redirectPath: '/admin-dashboard' },
          { id: 3, name: 'Dr. Adel El-Mezin', role: 'doctor', uin: 'DOC-462690', redirectPath: '/doctor-dashboard' },
          { id: 1, name: 'Bill Smith', role: 'patient', uin: 'PAT-123456', redirectPath: '/' }
        ];
        
        setUserOptions(users);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast({
          title: "Error",
          description: "Failed to load user options",
          variant: "destructive",
        });
        
        // Fallback options in case API fails
        setUserOptions([
          { id: 4, name: 'Admin User', role: 'admin', uin: 'ADM-789012', redirectPath: '/admin-dashboard' },
          { id: 3, name: 'Dr. Adel El-Mezin', role: 'doctor', uin: 'DOC-462690', redirectPath: '/doctor-dashboard' },
          { id: 1, name: 'Bill Smith', role: 'patient', uin: 'PAT-123456', redirectPath: '/' }
        ]);
        setIsLoaded(true);
      }
    };

    fetchUsers();
  }, [toast]);

  const handleUserSelect = (user: UserOption) => {
    setSelectedUser(user);
  };

  const handleLogin = async (user: UserOption | null = selectedUser) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please select a user to continue",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);

    try {
      // Store complete user info in localStorage for persistence with UIN
      localStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        name: user.name,
        role: user.role,
        uin: user.uin
      }));

      // If doctor, get associated patients to make them available in session
      if (user.role === 'doctor') {
        try {
          // This would be a real API call in production
          const doctorPatients = [
            { id: 1, name: 'Bill Smith', uin: 'PAT-123456' }
          ];
          localStorage.setItem('doctorPatients', JSON.stringify(doctorPatients));
        } catch (error) {
          console.error('Failed to fetch doctor patients:', error);
        }
      }

      toast({
        title: "Logged In",
        description: user.role === 'admin' 
          ? `Welcome, ${user.name} (${user.uin})`
          : `Welcome, ${user.name}`,
      });
      
      // Redirect to appropriate dashboard
      setLocation(user.redirectPath);
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <Card className="w-[380px] shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-800">Keep Going Care</CardTitle>
          <CardDescription>Select a user to access the application</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoaded ? (
            <div className="space-y-4">
              {userOptions.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedUser?.id === user.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => handleUserSelect(user)}
                >
                  {user.role === 'admin' && (
                    <UserPlus className="h-8 w-8 text-purple-500" />
                  )}
                  {user.role === 'doctor' && (
                    <UserCog className="h-8 w-8 text-blue-500" />
                  )}
                  {user.role === 'patient' && (
                    <User className="h-8 w-8 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <div className="flex flex-col">
                      <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                      {user.role === 'admin' && (
                        <p className="text-xs text-gray-400">{user.uin}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button 
            className="w-full" 
            size="lg"
            disabled={!selectedUser || isLoggingIn}
            onClick={() => handleLogin()}
          >
            {isLoggingIn ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Logging in...</span>
              </div>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Continue as {selectedUser?.name || "Selected User"}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;