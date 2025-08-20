import React from "react";
import { useLocation, Link } from "wouter";
import { User, UserCog, UserRoundCog } from "lucide-react";
import { createHapticFeedback } from "@/lib/hapticFeedback";
import { cn } from "@/lib/utils";

const DashboardSwitcher: React.FC = () => {
  const [location] = useLocation();

  const isActive = (path: string): boolean => {
    if (path === "/" && location === "/dashboard") return true;
    if (path === "/" && location === "/") return true;
    return location === path;
  };

  const handleClick = () => {
    // Play haptic feedback on click
    createHapticFeedback();
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-full shadow-lg border border-gray-200">
      <div className="flex items-center justify-center px-1 py-1">
        <Link href="/" onClick={handleClick}>
          <div
            className={cn(
              "flex flex-col items-center justify-center w-24 h-16 rounded-full transition-all",
              isActive("/") ? "bg-[#2E8BC0] text-white" : "hover:bg-gray-100"
            )}
            aria-label="Patient Dashboard"
          >
            <User className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Patient</span>
          </div>
        </Link>
        
        <Link href="/doctor-dashboard" onClick={handleClick}>
          <div
            className={cn(
              "flex flex-col items-center justify-center w-24 h-16 rounded-full mx-1 transition-all",
              isActive("/doctor-dashboard") ? "bg-[#2E8BC0] text-white" : "hover:bg-gray-100"
            )}
            aria-label="Doctor Dashboard"
          >
            <UserCog className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Doctor</span>
          </div>
        </Link>
        
        <Link href="/admin-dashboard" onClick={handleClick}>
          <div
            className={cn(
              "flex flex-col items-center justify-center w-24 h-16 rounded-full transition-all",
              isActive("/admin-dashboard") ? "bg-[#2E8BC0] text-white" : "hover:bg-gray-100"
            )}
            aria-label="Admin Dashboard"
          >
            <UserRoundCog className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Admin</span>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default DashboardSwitcher;