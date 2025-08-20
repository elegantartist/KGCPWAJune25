import React from 'react';
import { 
  MessageCircle, 
  Heart, 
  Utensils, 
  ShoppingCart, 
  Pill, 
  User, 
  Award,
  Home,
  BarChart3,
  BarChart,
  BookOpen,
  Camera,
  Sparkles,
  Trophy,
  UserPlus,
  Apple,
  Watch,
  FileText
} from "lucide-react";

// Define menu item type
export interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

// Create centralized menu data source
export const getMenuItems = (): MenuItem[] => {
  return [
    { icon: <Home className="h-6 w-6 icon-metallic" />, label: "Home", path: "/" },
    { icon: <BarChart3 className="h-6 w-6 icon-metallic" />, label: "Daily Self Scores", path: "/daily-self-scores" },
    { icon: <Heart className="h-6 w-6 text-red-500" />, label: "MIP", path: "/motivation" }, 
    { icon: <Utensils className="h-6 w-6 icon-metallic" />, label: "Inspiration Machine D", path: "/inspiration-d" },
    { icon: <ShoppingCart className="h-6 w-6 icon-metallic" />, label: "Diet Logistics", path: "/diet-logistics" },
    { icon: <Award className="h-6 w-6 icon-metallic" />, label: "Inspiration Machine E&W", path: "/inspiration-ew" },
    { icon: <User className="h-6 w-6 icon-metallic" />, label: "E&W Support", path: "/ew-support" },
    { icon: <Pill className="h-6 w-6 icon-metallic" />, label: "MBP Wiz", path: "/mbp-wiz" },
    { icon: <BookOpen className="h-6 w-6 icon-metallic" />, label: "Journaling", path: "/journaling" },
    { icon: <BarChart className="h-6 w-6 icon-metallic" />, label: "Health Snapshots", path: "/health-snapshots" },
    { icon: <Trophy className="h-6 w-6 icon-metallic" />, label: "Progress Milestones", path: "/progress-milestones" },
    { icon: <Apple className="h-6 w-6 icon-metallic" />, label: "Food Database", path: "/food-database" },
    { icon: <MessageCircle className="h-6 w-6 icon-metallic" />, label: "Chatbot", path: "/chatbot" }
  ];
};

// Function to filter out any unwanted menu items
export const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
  return items.filter(item => 
    item.label !== "Mood Booster Audio" && 
    item.label !== "Wearables Integration" &&
    item.label !== "Social Check-ins"
  );
};