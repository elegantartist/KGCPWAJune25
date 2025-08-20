import React from "react";
import { useLocation, Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MainContentProps {
  children: React.ReactNode;
}

const MainContent: React.FC<MainContentProps> = ({ children }) => {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Back Button - adjusted for mobile */}
      <div className={cn(
        "bg-white border-b border-gray-200",
        isMobile ? "p-3 pl-14" : "p-4"
      )}>
        {/* Only show back button if not on home page */}
        {location !== "/" && (
          <Link href="/">
            <a className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white">
              <ChevronLeft className="h-4 w-4" />
            </a>
          </Link>
        )}
      </div>

      {/* Main Content Area - adjusted for mobile */}
      <div className={cn(
        "mx-auto py-4",
        isMobile ? "px-3 max-w-full" : "py-6 px-4 sm:px-6 max-w-5xl"
      )}>
        {children}
      </div>
    </div>
  );
};

export default MainContent;
