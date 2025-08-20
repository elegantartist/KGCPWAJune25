import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useCPD } from "@/hooks/useCPD";

const MBPWiz: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"information" | "external">("information");
  const isMobile = useIsMobile();
  const [showReturnAlert, setShowReturnAlert] = useState(false);
  const { toast } = useToast();
  const userId = 2; // Patient Reuben Collins - secure hardcoded for demo

  // Use unified CPD hook for automatic updates and secure data segregation
  const {
    loadingCPD,
    medicationPlan: carePlanDirective,
    hasMedicationDirective
  } = useCPD(userId);

  // Function to handle clicking the external link
  const handleExternalClick = () => {
    setShowReturnAlert(true);
    // Open in a new tab
    window.open("https://www.chemistwarehouse.com.au/", "_blank");
  };

  // Function to handle returning from external link
  const handleReturnToKGC = () => {
    setShowReturnAlert(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">MBP Wiz - Medication Pricing</h1>

      {/* Doctor's Medication Recommendations */}
      <Card className="mb-6 border-l-4 border-l-primary">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">Doctor's medication recommendations:</p>
          {loadingCPD ? (
            <div className="flex items-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
              <p>Loading doctor's recommendations...</p>
            </div>
          ) : (
            <p className="whitespace-pre-line">{carePlanDirective}</p>
          )}
        </CardContent>
      </Card>

      {showReturnAlert && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>You are viewing an external site in a new tab</AlertTitle>
          <AlertDescription>
            Remember to return to Keep Going Care after browsing Chemist Warehouse.
            <Button variant="outline" size="sm" className="ml-2" onClick={handleReturnToKGC}>
              <ArrowLeft className="mr-2 h-4 w-4" /> I'm Back
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="information" onValueChange={(value) => setActiveTab(value as any)} className="mb-6">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="external">Visit Website</TabsTrigger>
        </TabsList>
        
        <TabsContent value="information" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Medication Information</CardTitle>
              <CardDescription>
                Helpful tips for managing your medications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-medium text-blue-800 mb-2">About Chemist Warehouse</h3>
                  <p className="text-gray-700 text-sm mb-2">
                    Chemist Warehouse is Australia's largest pharmacy retailer offering discounted prices on prescription and over-the-counter medications.
                  </p>
                  <p className="text-gray-700 text-sm">
                    Click the "Visit Website" tab to access the Chemist Warehouse website in a new browser tab.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-medium mb-2">Medication Shopping Tips:</h4>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        <span>Check your doctor's medication recommendations above</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        <span>Look for PBS-subsidized options when available</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        <span>Ask about generic alternatives to save costs</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        <span>Compare prices across different brands</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <h4 className="font-medium mb-2">Medication Safety:</h4>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        <span>Always follow your doctor's dosage instructions</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        <span>Check for potential drug interactions</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        <span>Set reminders to take medications on schedule</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-primary mr-2">•</span>
                        <span>Store medications properly as directed</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-center">
                  <Button 
                    onClick={handleExternalClick}
                    className="bg-primary text-white hover:bg-primary/90"
                    size="lg"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Chemist Warehouse
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="external">
          <Card>
            <CardHeader>
              <CardTitle>Visit Chemist Warehouse Website</CardTitle>
              <CardDescription>
                Access the full Chemist Warehouse website in a new browser tab
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-gray-700 mb-8 text-center max-w-md">
                  For the best browsing experience, you can visit the official Chemist Warehouse website in a new tab.
                </p>
                <Button 
                  onClick={handleExternalClick}
                  className="bg-primary text-white hover:bg-primary/90"
                  size="lg"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Chemist Warehouse
                </Button>
                
                <div className="mt-8 text-center text-sm text-muted-foreground max-w-md">
                  <p>Remember to return to KGC after browsing the external website.</p>
                  <p className="mt-2">For urgent medication questions, contact your healthcare provider.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Back button for easy navigation to main dashboard */}
      <div className="mt-6 flex justify-center">
        <Button variant="outline" asChild>
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </a>
        </Button>
      </div>
    </div>
  );
};

export default MBPWiz;