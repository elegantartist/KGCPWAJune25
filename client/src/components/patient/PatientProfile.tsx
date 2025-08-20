import React from "react";
import { format } from "date-fns";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import kgcLogo from "@/assets/KGC Logo2 Nov24_1744113864434.jpg";

interface PatientProfileProps {
  user: User;
}

const PatientProfile: React.FC<PatientProfileProps> = ({ user }) => {
  const isMobile = useIsMobile();
  const formattedDate = format(new Date(user.joinedDate), "yyyy-MM-dd");
  
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className={`flex ${isMobile ? "flex-col" : "flex-row"} gap-6 mb-6`}>
          <div className="flex flex-col items-center">
            <img 
              src={kgcLogo} 
              alt="Keep Going Care Logo" 
              className={`rounded-lg ${isMobile ? "w-40" : "w-48"}`}
            />
            {/* Removed "Lifestyle Prescription" text as requested */}
          </div>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Daily Self-Scores</h2>
            
            <div className="space-y-2">
              <div className="flex items-start">
                <span className={cn("text-primary font-medium", isMobile ? "w-24" : "w-32")}>Name:</span>
                <span>{user.name}</span>
              </div>
              <div className="flex items-start">
                <span className={cn("text-primary font-medium", isMobile ? "w-24" : "w-32")}>Email:</span>
                <span className="break-all">{user.email}</span>
              </div>
              <div className="flex items-start">
                <span className={cn("text-primary font-medium", isMobile ? "w-24" : "w-32")}>Joined Date:</span>
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Removed Chatbot and Keep Going buttons as requested */}
      </CardContent>
    </Card>
  );
};

export default PatientProfile;
