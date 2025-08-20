import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, UserCog, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

interface UserOption {
  id: number;
  name: string;
  role: 'admin' | 'doctor' | 'patient';
  uin: string;
  redirectPath: string;
}

const Login: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isLoading, isAuthenticated } = useAuth();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

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

    if (isLoading) return;

    try {
      const success = await login(user.uin, user.name, user.role);
      
      if (success) {
        if (user.role === 'doctor') {
          const doctorPatients = [
            { id: 1, name: 'Bill Smith', uin: 'PAT-123456' }
          ];
          localStorage.setItem('doctorPatients', JSON.stringify(doctorPatients));
        }

        toast({
          title: "Login Successful",
          description: `Welcome, ${user.name}`,
        });
        
        // Redirect to appropriate dashboard
        setLocation(user.redirectPath);
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid credentials or authentication error",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: "An error occurred during login",
        variant: "destructive",
      });
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
          {userOptions.length > 0 ? (
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
            disabled={!selectedUser || isLoading}
            onClick={() => handleLogin()}
          >
            {isLoading ? (
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