import React from "react";
import { Cloud, CloudOff, Info, CheckCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OfflineStatus as OfflineStatusType } from "../types";

interface OfflineStatusProps {
  isOnline: boolean;
  status: OfflineStatusType;
  onRefresh: () => void;
}

const OfflineStatus: React.FC<OfflineStatusProps> = ({ 
  isOnline, 
  status, 
  onRefresh 
}) => {
  return (
    <div className="mb-6">
      {/* Online/offline indicator */}
      <div className="flex items-center mb-3">
        {isOnline ? (
          <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
            <Cloud className="h-3 w-3" />
            Online
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200">
            <CloudOff className="h-3 w-3" />
            Offline
          </Badge>
        )}
      </div>
      
      {/* Offline caching status */}
      <div className="bg-slate-50 rounded-md border p-3">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            {status.cached ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Info className="h-4 w-4 text-blue-500" />
            )}
            <p className="font-medium">{status.statusMessage}</p>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs" 
            onClick={onRefresh}
            disabled={!isOnline || status.caching}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh Offline Data
          </Button>
        </div>
        
        {/* Progress bar for caching operation */}
        {status.caching && (
          <div className="mt-2">
            <Progress value={status.progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {status.progress < 100 
                ? 'Preparing food data for offline access...' 
                : 'Completed!'}
            </p>
          </div>
        )}
        
        {/* Offline capabilities info */}
        {status.cached && (
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-medium">Supervisor Agent:</span> CPD-aligned food recommendations will now be available even when you're offline.
          </p>
        )}
      </div>
    </div>
  );
};

export default OfflineStatus;