import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Play } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { createHapticFeedback } from "@/lib/hapticFeedback";
import OrientationVideo from "@/components/orientation/OrientationVideo";
// Import the logo directly from the assets folder
import kgcLogoPath from "@/assets/KGC Logo2 Nov24_1744113864434.jpg";
// Import the sidebar and UserHeader
import Sidebar from "./Sidebar";
import { SidebarProvider } from "./SidebarContext";
import UserHeader from "./UserHeader";


interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [logoAnimating, setLogoAnimating] = useState(false);
  const [showOrientationVideo, setShowOrientationVideo] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Effect to trigger logo animation when any page loads or changes
  useEffect(() => {
    // Add animation class for all location changes
    setLogoAnimating(true);
    
    // Reset animation after it completes
    const timer = setTimeout(() => {
      setLogoAnimating(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [location]);
  
  // Effect to close sidebar when location changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);
  
  const toggleSidebar = () => {
    // Play haptic sound when opening/closing the menu
    createHapticFeedback();
    setSidebarOpen(!sidebarOpen);
  };

  // Get current page name from location
  const getPageName = () => {
    switch (location) {
      case "/":
        return "Dashboard";
      case "/patient-profile":
        return "Patient Profile";
      default:
        return "Keep Going Care";
    }
  };
  
  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-[#fdfdfd]">
        {/* Top Navigation Bar */}
        <header className="h-44 bg-[#fdfdfd] px-4 relative border-b border-[#2E8BC0]/20">
          {/* Orientation button on the left - smaller with KGC stacked above Orientation */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
            <button 
              onClick={() => {
                createHapticFeedback();
                setTimeout(() => setShowOrientationVideo(true), 2000);
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-[#2E8BC0]/10 rounded-md"
              aria-label="Watch orientation"
            >
              <div className="flex flex-col items-center justify-center h-12 gap-1">
                <div className="h-2.5 w-2.5 rounded-full dot-metallic"></div>
                <div className="h-2.5 w-2.5 rounded-full dot-metallic"></div>
                <div className="h-2.5 w-2.5 rounded-full dot-metallic"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-semibold text-[#676767] text-center">KGC</span>
                <span className="text-sm text-[#676767] text-center">Orientation</span>
              </div>
            </button>
          </div>
          
          {/* Menu text with blue dots button on the right */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
            <button 
              onClick={toggleSidebar}
              className="flex items-center gap-3 px-3 py-2 hover:bg-[#2E8BC0]/10 rounded-md"
              aria-label="Toggle menu"
            >
              <span className="text-lg font-semibold text-[#676767]">Menu</span>
              <div className="flex flex-col items-center justify-center h-12 gap-1">
                <div className="h-2.5 w-2.5 rounded-full dot-metallic"></div>
                <div className="h-2.5 w-2.5 rounded-full dot-metallic"></div>
                <div className="h-2.5 w-2.5 rounded-full dot-metallic"></div>
              </div>
            </button>
          </div>
          
          {/* Centered KGC Logo with animation */}
          <div className="flex justify-center items-center h-full">
            <div className="rounded-full overflow-hidden logo-metallic">
              <img 
                src={kgcLogoPath} 
                alt="KGC Logo" 
                className={cn(
                  "h-[180px] w-[180px] transition-all duration-300", 
                  logoAnimating && "logo-animation"
                )}
                id="kgc-logo"
              />
            </div>
          </div>
          
          {/* Orientation Video Modal */}
          {showOrientationVideo && (
            <OrientationVideo 
              videoId="Qj5J9Uw0pEg" 
              onClose={() => setShowOrientationVideo(false)} 
            />
          )}
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Main content area with UserHeader */}
          <div className="flex flex-col flex-1">
            {/* User Header with Logout Button - Moved higher with reduced padding */}
            <div className="-mt-2">
              <UserHeader />
            </div>
            
            {/* Content area */}
            <main className="flex-1 overflow-y-auto p-2 bg-[#fdfdfd]">
              {children}
            </main>
          </div>
          
          {/* Side menu - now imported from separate component */}
          <Sidebar sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;