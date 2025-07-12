import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface LogoutButtonProps {
  userRole?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function LogoutButton({ userRole, variant = "outline" }: LogoutButtonProps) {
  const { logout } = useAuth();

  return (
    <Button variant={variant} onClick={logout}>
      <LogOut className="h-4 w-4 mr-2" />
      Logout
    </Button>
  );
}