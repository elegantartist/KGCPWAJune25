import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { createHapticFeedback } from "@/lib/hapticFeedback";
import { getMenuItems, filterMenuItems } from "../menu/MenuData";

interface IconMenuItemProps {
  icon: React.ReactNode;
  label: string;
  path: string;
  active?: boolean;
  layout?: "vertical" | "horizontal";
}

const IconMenuItem: React.FC<IconMenuItemProps> = ({ 
  icon, 
  label, 
  path, 
  active, 
  layout = "vertical" 
}) => {
  // Get the setLocation function from wouter
  const [, setLocation] = useLocation();
  
  // Handler to provide haptic feedback without sound when menu item is clicked
  const handleClick = (e: React.MouseEvent) => {
    // Prevent default Link behavior
    e.preventDefault();
    
    // Provide haptic feedback without sound (vibration only)
    createHapticFeedback(500, false);
    
    // Navigate immediately since there's no sound to wait for
    // Use wouter's setLocation instead of direct window.location - this maintains React context
    setLocation(path);
  };
  
  return (
    // Use <a> instead of Link to have full control over navigation
    <div 
      className={cn(
        "flex items-center gap-3 py-3 px-4 rounded-lg transition-colors cursor-pointer",
        layout === "vertical" ? "hover:bg-[#2E8BC0]/10 my-1" : "",
        active 
          ? "text-[#2E8BC0] font-medium bg-[#2E8BC0]/10 border border-[#17a092]/50 rounded-lg" 
          : "text-[#676767]"
      )}
      onClick={handleClick}
    >
      <div className={cn(
        "flex items-center justify-center", 
        layout === "horizontal" ? "flex-col" : ""
      )}>
        <span className="text-center">{icon}</span>
        <span className={cn(
          layout === "horizontal" ? "text-xs mt-1" : "text-base",
          layout === "vertical" && "ml-3"
        )}>
          {label}
        </span>
      </div>
    </div>
  );
};

interface IconMenuProps {
  layout?: "vertical" | "horizontal";
}

const IconMenu: React.FC<IconMenuProps> = ({ layout = "vertical" }) => {
  const [location] = useLocation();
  
  // Get menu items from centralized source
  const allMenuItems = getMenuItems();
  
  // Filter out any "Mood Booster Audio" entries that might exist
  const filteredMenuItems = filterMenuItems(allMenuItems);
  
  return (
    <div className={cn(
      layout === "vertical" 
        ? "flex flex-col p-2" 
        : "flex items-center justify-between w-full"
    )}>
      {filteredMenuItems.map((item, index) => (
        <IconMenuItem
          key={index}
          icon={item.icon}
          label={item.label}
          path={item.path}
          active={location === item.path}
          layout={layout}
        />
      ))}
    </div>
  );
};

export default IconMenu;