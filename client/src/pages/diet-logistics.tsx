import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCPD } from "@/hooks/useCPD";
import { ShoppingCart, UtensilsCrossed, Clock, ExternalLink, ArrowLeft, HomeIcon, Loader2,
  RefreshCw, ShoppingBag, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";

interface CarePlanDirective {
  id: number;
  userId: number;
  directive: string;
  category: string;
  targetValue: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryService {
  id: number;
  name: string;
  logo: string;
  deliveryTime: string;
  deliveryFee: number;
  minimumOrder: number;
  website: string;
}

const deliveryServices: DeliveryService[] = [
  { 
    id: 1, 
    name: "Woolworths", 
    logo: "🛒", 
    deliveryTime: "2-4 hours", 
    deliveryFee: 9, 
    minimumOrder: 50,
    website: "https://www.woolworths.com.au/shop/signup"
  },
  { 
    id: 2, 
    name: "Coles", 
    logo: "🛒", 
    deliveryTime: "Same day", 
    deliveryFee: 8, 
    minimumOrder: 50,
    website: "https://www.coles.com.au/account/login"
  },
  { 
    id: 3, 
    name: "HelloFresh", 
    logo: "🥗", 
    deliveryTime: "Weekly", 
    deliveryFee: 0, 
    minimumOrder: 69.99,
    website: "https://www.hellofresh.com.au/plans"
  },
  { 
    id: 4, 
    name: "Marley Spoon", 
    logo: "🍽️", 
    deliveryTime: "Weekly", 
    deliveryFee: 0, 
    minimumOrder: 64.95,
    website: "https://marleyspoon.com.au/select-plan"
  },
  { 
    id: 5, 
    name: "UberEats", 
    logo: "🛵", 
    deliveryTime: "30-45 min", 
    deliveryFee: 5.99, 
    minimumOrder: 20,
    website: "https://www.ubereats.com/au/login-redirect"
  },
  { 
    id: 6, 
    name: "YouFoodz", 
    logo: "🍱", 
    deliveryTime: "Weekly", 
    deliveryFee: 0, 
    minimumOrder: 59.95,
    website: "https://youfoodz.com"
  },
  { 
    id: 7, 
    name: "Dinnerly", 
    logo: "🍽️", 
    deliveryTime: "Weekly", 
    deliveryFee: 0, 
    minimumOrder: 55.99,
    website: "https://dinnerly.com.au"
  },
  { 
    id: 8, 
    name: "Every Plate", 
    logo: "🥘", 
    deliveryTime: "Weekly", 
    deliveryFee: 0, 
    minimumOrder: 49.99,
    website: "https://www.everyplate.com.au"
  }
];

const DietLogistics: React.FC = () => {
  const [activeService, setActiveService] = useState<number | null>(null);
  const [showReturnButton, setShowReturnButton] = useState(false);
  // Shopping list feature state
  const [showShoppingList, setShowShoppingList] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Secure user ID for data segregation
  const userId = 2; // Patient Reuben Collins - secure hardcoded for demo
  
  // Use unified CPD hook for automatic updates and secure data segregation
  const {
    carePlanDirectives: directives,
    loadingCPD: isLoadingDirectives,
    getDietDirective,
    dietPlan,
    hasDietDirective
  } = useCPD(userId);
  
  // Get diet directive
  const dietDirective = getDietDirective();
  
  // Initialize shopping list from localStorage
  const [shoppingListItems, setShoppingListItems] = useState<string>(() => {
    // Get saved shopping list from localStorage
    const savedList = localStorage.getItem(`user_${userId}_shopping_list`);
    return savedList || '';
  });

  const handleServiceSelect = (serviceId: number) => {
    setActiveService(serviceId);
    
    toast({
      title: "Service selected",
      description: `You selected ${deliveryServices.find(s => s.id === serviceId)?.name}`,
    });
  };

  // Validate URL format
  const isValidHttpUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (e) {
      return false;
    }
  };
  
  const handleExternalLink = (service: DeliveryService) => {
    // Validate URL before attempting to open
    if (!service.website || !isValidHttpUrl(service.website)) {
      toast({
        title: "Invalid Website Link",
        description: "The website URL is not valid. Please try again later.",
        variant: "destructive"
      });
      return;
    }
    
    // Create a sessionStorage flag to remember the user was on Diet Logistics
    sessionStorage.setItem('kgc_previous_page', 'diet_logistics');
    
    // Open the website in a new tab with enhanced security
    const newWindow = window.open(service.website, "_blank");
    
    if (newWindow) {
      // Prevent the new page from having access to window.opener
      newWindow.opener = null;
      newWindow.focus();
      
      toast({
        title: "External Website",
        description: `Opening ${service.name} website in a new tab`,
      });
      
      // Show the return button
      setShowReturnButton(true);
      
      // Automatically hide the return button after 15 seconds
      setTimeout(() => {
        setShowReturnButton(false);
      }, 15000);
      
    } else {
      // Handle popup blockers
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to visit external websites",
        variant: "destructive"
      });
    }
    
    // Show a follow-up toast to remind the user how to return
    setTimeout(() => {
      toast({
        title: "Remember",
        description: "You can return to KGC by closing the external tab or using the back button",
        duration: 5000,
      });
    }, 1500);
  };

  // Check if user came back from an external site
  useEffect(() => {
    const previousPage = sessionStorage.getItem('kgc_previous_page');
    if (previousPage === 'diet_logistics') {
      // Clear the flag when processing it
      sessionStorage.removeItem('kgc_previous_page');
      // Welcome the user back
      toast({
        title: "Welcome Back to KGC",
        description: "You've returned to your Patient Dashboard",
      });
    }
  }, [toast]);
  
  // Save shopping list to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`user_${userId}_shopping_list`, shoppingListItems);
    
    // Dispatch a custom event to notify other components about the change
    const event = new CustomEvent('shopping_list_updated', { 
      detail: { userId, items: shoppingListItems } 
    });
    window.dispatchEvent(event);
  }, [shoppingListItems, userId]);
  
  // Listen for shopping list updates from other components
  useEffect(() => {
    const handleShoppingListUpdate = (e: CustomEvent) => {
      const data = e.detail;
      if (data.userId === userId && data.items !== shoppingListItems) {
        setShoppingListItems(data.items);
      }
    };
    
    // Add event listener with type assertion for CustomEvent
    window.addEventListener('shopping_list_updated', handleShoppingListUpdate as EventListener);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('shopping_list_updated', handleShoppingListUpdate as EventListener);
    };
  }, [userId, shoppingListItems]);
  
  // Shopping list functions
  const handleShoppingListChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newList = e.target.value;
    setShoppingListItems(newList);
    // The useEffect hook will handle saving to localStorage
  };
  
  const clearShoppingList = () => {
    setShoppingListItems('');
    localStorage.removeItem(`user_${userId}_shopping_list`);
    
    // Dispatch a custom event to notify other components about the cleared list
    const event = new CustomEvent('shopping_list_updated', { 
      detail: { userId, items: '' } 
    });
    window.dispatchEvent(event);
    
    toast({
      title: "Shopping List Cleared",
      description: "Your healthy ingredients shopping list has been cleared.",
      variant: "default"
    });
  };
  
  const toggleShoppingList = () => {
    setShowShoppingList(prev => !prev);
  };

  // Component for floating return button - renders for 15 seconds after external link open
  const ReturnToKGCButton = () => {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          className="shadow-lg bg-primary hover:bg-primary/90 flex items-center gap-2"
          onClick={() => {
            window.focus();
            // Navigate to home page when clicked
            window.location.href = '/';
          }}
        >
          <HomeIcon className="h-4 w-4" />
          <span className={isMobile ? "sr-only" : ""}>Return to KGC Dashboard</span>
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      {/* Show floating return button if external site was opened */}
      {showReturnButton && <ReturnToKGCButton />}
      
      {/* Permanent return to Dashboard button */}
      <div className="flex items-center mb-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-2 text-primary hover:text-primary/80">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold">Diet Logistics</h1>
        <Button
          onClick={toggleShoppingList}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ShoppingBag className="h-4 w-4" />
          {showShoppingList ? 'Hide' : 'Show'} Shopping List
        </Button>
      </div>
      
      {/* Healthy Ingredients Shopping List */}
      {showShoppingList && (
        <Card className="mb-4 border-green-100">
          <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2 text-green-600" />
                Healthy Ingredients Shopping List
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleShoppingList}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Note down ingredients you need to order with your delivery service
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Textarea
              placeholder="Write your shopping list here... 
Example:
- 2 cups spinach
- 1 avocado
- 250g lean chicken breast
- 1 bunch fresh herbs"
              className="min-h-[150px] font-mono text-sm"
              value={shoppingListItems}
              onChange={handleShoppingListChange}
            />
            <div className="flex justify-end mt-3">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={clearShoppingList}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Clear List
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Doctor's Dietary Recommendations Section */}
      <div className="mb-6">
        <Card>
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
            <CardTitle className="text-lg">Dietary Recommendations</CardTitle>
            <CardDescription>
              Your Doctor's Healthy Meal Plan Recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoadingDirectives ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : hasDietDirective ? (
              <div className="p-2 border-l-4 border-primary bg-primary/5">
                <p className="text-gray-700">{dietPlan}</p>
              </div>
            ) : (
              <div className="p-2 border-l-4 border-amber-500 bg-amber-50">
                <p className="text-amber-700">{dietPlan}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="grocery" className="mb-6">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="grocery">Grocery Delivery</TabsTrigger>
          <TabsTrigger value="meal-kits">Meal Kits</TabsTrigger>
          <TabsTrigger value="takeaway">Healthy Takeaway</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grocery" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Grocery Delivery Services</CardTitle>
              <CardDescription>
                Get ingredients for your doctor's recommended meal plan delivered to your door
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deliveryServices.filter(s => s.id <= 2).map((service) => (
                  <div
                    key={service.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      activeService === service.id ? "border-primary bg-primary/5" : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleServiceSelect(service.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{service.logo}</div>
                        <div>
                          <h3 className="font-medium">{service.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{service.deliveryTime}</span>
                            <span>•</span>
                            <span>${service.deliveryFee.toFixed(2)} delivery</span>
                            <span>•</span>
                            <span>Min. ${service.minimumOrder}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExternalLink(service);
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="meal-kits">
          <Card>
            <CardHeader>
              <CardTitle>Meal Kit Services</CardTitle>
              <CardDescription>
                Doctor-recommended ingredients and recipes aligned with your diet plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deliveryServices.filter(s => s.id === 3 || s.id === 4 || s.id === 6 || s.id === 7 || s.id === 8).map((service) => (
                  <div
                    key={service.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      activeService === service.id ? "border-primary bg-primary/5" : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleServiceSelect(service.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{service.logo}</div>
                        <div>
                          <h3 className="font-medium">{service.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{service.deliveryTime}</span>
                            <span>•</span>
                            <span>From ${service.minimumOrder}/week</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExternalLink(service);
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-800">Health Benefits of Meal Kits</h3>
                  <ul className="mt-2 space-y-2 text-blue-700">
                    <li className="flex items-start gap-2">
                      <div className="mt-1">✓</div>
                      <div>Portion control helps maintain a balanced diet</div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-1">✓</div>
                      <div>Reduces food waste with exact ingredient portions</div>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-1">✓</div>
                      <div>Many services offer doctor-approved healthy options</div>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="takeaway">
          <Card>
            <CardHeader>
              <CardTitle>Healthy Takeaway Options</CardTitle>
              <CardDescription>
                Quick meal solutions that align with your doctor's dietary recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deliveryServices.filter(s => s.id === 5).map((service) => (
                  <div
                    key={service.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      activeService === service.id ? "border-primary bg-primary/5" : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleServiceSelect(service.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{service.logo}</div>
                        <div>
                          <h3 className="font-medium">{service.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Clock className="h-3 w-3" />
                            <span>{service.deliveryTime}</span>
                            <span>•</span>
                            <span>From ${service.deliveryFee.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExternalLink(service);
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Healthy Restaurant Options</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Poke Bowls</Badge>
                    <Badge variant="outline">Salad Bars</Badge>
                    <Badge variant="outline">Vietnamese</Badge>
                    <Badge variant="outline">Grilled Chicken</Badge>
                    <Badge variant="outline">Vegetarian</Badge>
                    <Badge variant="outline">Grain Bowls</Badge>
                    <Badge variant="outline">Sushi</Badge>
                  </div>
                  
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-green-800">Tips for Healthy Takeaway</h3>
                    <ul className="mt-2 space-y-2 text-green-700">
                      <li className="flex items-start gap-2">
                        <div className="mt-1">✓</div>
                        <div>Choose grilled over fried options</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="mt-1">✓</div>
                        <div>Ask for dressings and sauces on the side</div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="mt-1">✓</div>
                        <div>Look for options with vegetables and lean proteins</div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DietLogistics;