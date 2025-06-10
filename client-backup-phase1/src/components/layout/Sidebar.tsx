import React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import IconMenu from "./IconMenu";
import kgcLogoPath from "@/assets/KGC Logo2 Nov24_1744113864434.jpg";

interface SidebarProps {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, toggleSidebar }) => {
  return (
    <div 
      className={cn(
        "absolute right-0 top-0 h-full w-[300px] bg-[#fdfdfd] border-l border-[#2E8BC0]/20 overflow-y-auto transition-transform duration-300 ease-in-out shadow-lg z-50",
        sidebarOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="p-4 border-b border-[#2E8BC0]/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-[#676767]">Menu</h2>
          <button 
            onClick={toggleSidebar}
            className="rounded-full p-1 text-[#676767] hover:bg-[#2E8BC0]/20"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full overflow-hidden logo-metallic h-16 w-16">
            <img 
              src={kgcLogoPath} 
              alt="KGC Logo" 
              className="h-16 w-16" 
            />
          </div>
          <div>
            <h3 className="font-medium text-[#676767]">Keep Going Care</h3>
            <p className="text-xs text-[#2E8BC0] italic">Lifestyle Prescription</p>
          </div>
        </div>
      </div>
      <IconMenu />
    </div>
  );
};

export default Sidebar;