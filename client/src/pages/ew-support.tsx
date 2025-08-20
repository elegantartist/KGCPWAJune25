import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCPD } from "@/hooks/useCPD";
import { Search, MapPin, Phone, ExternalLink, Star, Heart, Trash2, List, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Define types
interface Location {
  id: string;
  name: string;
  type: string;
  address: string;
  distance?: string;
  rating?: number;
  specialties?: string[];
  phone: string;
  website?: string;
  email?: string;
  bio?: string;
  verifications?: {
    abnVerified?: boolean;
    fitnessAustraliaVerified?: boolean;
    ausActiveVerified?: boolean;
    locationVerified?: boolean;
  };
}

interface Trainer {
  id: string;
  name: string;
  type: string;
  address: string;
  specialization?: string;
  experience?: string;
  certification?: string;
  distance?: string;
  rating?: number;
  phone: string;
  website?: string;
  email?: string;
  bio?: string;
}

// Sample location data
const locations: Location[] = [
  {
    id: "provider-1",
    name: "Wellness Hub Fitness",
    type: "Gym",
    address: "123 Health St, Sydney",
    distance: "0.8 km",
    rating: 4.8,
    specialties: ["Senior Fitness", "Cardiac Rehab", "Personal Training"],
    phone: "02 9123 4567",
    website: "https://example.com/wellnesshub"
  },
  {
    id: "provider-2",
    name: "MindBody Yoga Studio",
    type: "Yoga Studio",
    address: "45 Zen Ave, Sydney",
    distance: "1.2 km",
    rating: 4.7,
    specialties: ["Gentle Yoga", "Chair Yoga", "Meditation"],
    phone: "02 9234 5678",
    website: "https://example.com/mindbody"
  },
  {
    id: "provider-3",
    name: "Revival Pilates Center",
    type: "Pilates Studio",
    address: "78 Core St, Sydney",
    distance: "2.4 km",
    rating: 4.9,
    specialties: ["Clinical Pilates", "Rehabilitation", "Small Group Classes"],
    phone: "02 9345 6789",
    website: "https://example.com/revival"
  },
  {
    id: "provider-4",
    name: "Aqua Wellness Pool",
    type: "Fitness Center",
    address: "90 Splash Rd, Sydney",
    distance: "3.5 km",
    rating: 4.6,
    specialties: ["Aqua Therapy", "Water Aerobics", "Low-Impact Exercise"],
    phone: "02 9456 7890",
    website: "https://example.com/aquawellness"
  },
  {
    id: "provider-5",
    name: "Senior Strength Gym",
    type: "Gym",
    address: "34 Muscle Lane, Sydney",
    distance: "1.9 km",
    rating: 4.5,
    specialties: ["Strength Training", "Balance Classes", "Bone Health"],
    phone: "02 9567 8901",
    website: "https://example.com/seniorstrength"
  },
  {
    id: "provider-6",
    name: "Heart Health Fitness",
    type: "Fitness Center",
    address: "56 Pulse Blvd, Sydney",
    distance: "2.7 km",
    rating: 4.7,
    specialties: ["Cardiac Rehab", "Monitored Exercise", "Heart Healthy Classes"],
    phone: "02 9678 9012",
    website: "https://example.com/hearthealth"
  }
];

// Personal trainers data
const trainers: Trainer[] = [
  {
    id: "trainer-1",
    name: "Sarah Johnson",
    type: "Personal Trainer",
    address: "Sydney, NSW",
    specialization: "Senior Fitness Specialist",
    experience: "12 years",
    certification: "Certified Exercise Physiologist",
    distance: "Mobile - comes to you",
    rating: 4.9,
    phone: "0412 345 678"
  },
  {
    id: "trainer-2",
    name: "Michael Chen",
    type: "Personal Trainer",
    address: "North Sydney, NSW",
    specialization: "Rehabilitation Trainer",
    experience: "8 years",
    certification: "Physical Therapy Assistant & Certified Trainer",
    distance: "1.5 km",
    rating: 4.8,
    phone: "0423 456 789"
  },
  {
    id: "trainer-3",
    name: "Emma Williams",
    type: "Personal Trainer",
    address: "Bondi, Sydney, NSW",
    specialization: "Cardiac Health & Recovery",
    experience: "15 years",
    certification: "Clinical Exercise Physiologist",
    distance: "Mobile - comes to you",
    rating: 5.0,
    phone: "0434 567 890"
  }
];

// Interface for favorite items
interface FavoriteItem {
  id: number;
  type: 'location' | 'trainer';
  name: string;
  details: string;
  phone: string;
  saveDate: string;
  originalId?: string; // Store the original string ID for reference
}

const EWSupport: React.FC = () => {
  // Get toast and mobile hooks
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // State declarations
  const [activeTab, setActiveTab] = useState("locations");
  const [searchLocation, setSearchLocation] = useState("Sydney");
  const [postcode, setPostcode] = useState("");
  const [locationType, setLocationType] = useState("");
  const [searchResults, setSearchResults] = useState<(Location | Trainer)[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesList, setFavoritesList] = useState<FavoriteItem[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Secure user ID for data segregation
  const userId = 2; // Patient Reuben Collins - secure hardcoded for demo

  // Use unified CPD hook for automatic updates and secure data segregation
  const {
    loadingCPD,
    exercisePlan: carePlanDirective,
    hasExerciseDirective
  } = useCPD(userId);

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem(`user_${userId}_ew_favorite_ids`);
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
    
    const savedFavoritesList = localStorage.getItem(`user_${userId}_ew_favorites_list`);
    if (savedFavoritesList) {
      setFavoritesList(JSON.parse(savedFavoritesList));
    }
  }, [userId]);

  // Display initial results
  useEffect(() => {
    setSearchResults(activeTab === "locations" ? locations : trainers);
  }, [activeTab]);
  
  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`user_${userId}_ew_favorite_ids`, JSON.stringify(favorites));
  }, [favorites, userId]);
  
  // Save favorites list to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`user_${userId}_ew_favorites_list`, JSON.stringify(favoritesList));
  }, [favoritesList, userId]);

  // Default data to use in case the API fails
  const getDefaultLocations = (): Location[] => {
    return [
      {
        id: "provider-default-1",
        name: "Heart Foundation Walking",
        type: "Fitness Center",
        address: "123 Health Street, Sydney",
        distance: "0.8 km",
        rating: 4.5,
        specialties: ["Cardiac Health", "Walking Programs"],
        phone: "02 9123 4567",
        website: "https://walking.heartfoundation.org.au/"
      },
      {
        id: "provider-default-2",
        name: "Physical Activity Center",
        type: "Gym",
        address: "45 Fitness Lane, Sydney",
        distance: "1.5 km",
        rating: 4.2,
        specialties: ["Rehabilitation", "Cardiac Health"],
        phone: "02 9234 5678",
        website: "https://www.heartfoundation.org.au/your-heart/support/physical-activity-after-a-heart-attack"
      },
      {
        id: "provider-default-3",
        name: "Senior Wellness Hub",
        type: "Gym",
        address: "78 Wellness Rd, Sydney",
        distance: "2.3 km",
        rating: 4.3,
        specialties: ["Senior Programs", "Heart Health"],
        phone: "02 9345 6789",
        website: "https://example.com/wellnesshub"
      },
      {
        id: "provider-default-4",
        name: "Active Living Center",
        type: "Fitness Center",
        address: "90 Active Way, Sydney",
        distance: "3.1 km",
        rating: 4.4,
        specialties: ["Cardiac Rehab", "Monitored Exercise"],
        phone: "02 9456 7890",
        website: "https://example.com/activeliving"
      },
      {
        id: "provider-default-5",
        name: "Sydney Health Clinic",
        type: "Fitness Center",
        address: "110 Health Avenue, Sydney",
        distance: "3.7 km",
        rating: 4.6,
        specialties: ["Clinical Exercise", "Rehabilitation"],
        phone: "02 9567 8901",
        website: "https://example.com/sydneyhealth"
      }
    ];
  };

  // Default data to use in case the API fails
  const getDefaultTrainers = (): Trainer[] => {
    return [
      {
        id: "trainer-default-1",
        name: "Sarah Johnson",
        type: "Personal Trainer",
        address: "Sydney, NSW",
        specialization: "Senior Fitness Specialist",
        experience: "12 years",
        certification: "Certified Exercise Physiologist",
        distance: "Mobile - comes to you",
        rating: 4.9,
        phone: "0412 345 678"
      },
      {
        id: "trainer-default-2",
        name: "Michael Chen",
        type: "Personal Trainer",
        address: "North Sydney, NSW",
        specialization: "Rehabilitation Trainer",
        experience: "8 years",
        certification: "Physical Therapy Assistant & Certified Trainer",
        distance: "1.5 km",
        rating: 4.8,
        phone: "0423 456 789"
      },
      {
        id: "trainer-default-3",
        name: "Emma Williams",
        type: "Personal Trainer",
        address: "Bondi, Sydney, NSW",
        specialization: "Cardiac Health & Recovery",
        experience: "15 years",
        certification: "Clinical Exercise Physiologist",
        distance: "Mobile - comes to you",
        rating: 5.0,
        phone: "0434 567 890"
      },
      {
        id: "trainer-default-4",
        name: "David Thompson",
        type: "Personal Trainer",
        address: "Surry Hills, Sydney, NSW",
        specialization: "Senior Fitness & Balance",
        experience: "10 years",
        certification: "Certified Senior Fitness Specialist",
        distance: "2.3 km",
        rating: 4.7,
        phone: "0445 678 901"
      },
      {
        id: "trainer-default-5",
        name: "Jessica Liu",
        type: "Personal Trainer",
        address: "Chatswood, Sydney, NSW",
        specialization: "Rehabilitation & Mobility",
        experience: "14 years",
        certification: "Physical Therapist & Certified Trainer",
        distance: "Mobile - comes to you",
        rating: 4.9,
        phone: "0456 789 012"
      }
    ];
  };

  const handleSearch = async () => {
    const MIN_RESULTS = 5;
    let results: (Location | Trainer)[] = [];
    let radiusExpandedMessage = false;
    
    // Validate postcode for Australian format (4 digits)
    if (postcode && (!/^\d{4}$/.test(postcode))) {
      toast({
        title: "Invalid postcode",
        description: "Please enter a valid 4-digit Australian postcode",
        variant: "destructive"
      });
      return;
    }
    
    // Set searching state and show loading status
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // Make API call to our backend which uses Tavily API with LocalSearch targeting
      let response;
      
      if (activeTab === "locations") {
        // Call fitness facilities API with parameters
        const typeParam = locationType ? `&type=${encodeURIComponent(locationType)}` : '';
        const postcodeParam = postcode ? `&postcode=${encodeURIComponent(postcode)}` : '';
        const useLocalSearchParam = '&useLocalSearch=true'; // Tell backend to target LocalSearch.com.au
        
        response = await fetch(
          `/api/search/fitness-facilities?location=${encodeURIComponent(searchLocation)}${typeParam}${postcodeParam}${useLocalSearchParam}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch facilities: ${response.statusText}`);
        }
        
        const data = await response.json();
        results = data.results;
        
        // Check if radius was expanded
        if (data.radiusExpanded) {
          radiusExpandedMessage = true;
        }
      } else {
        // Call personal trainers API
        const postcodeParam = postcode ? `&postcode=${encodeURIComponent(postcode)}` : '';
        const useLocalSearchParam = '&useLocalSearch=true'; // Tell backend to target LocalSearch.com.au
        
        response = await fetch(
          `/api/search/personal-trainers?location=${encodeURIComponent(searchLocation)}${postcodeParam}${useLocalSearchParam}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch trainers: ${response.statusText}`);
        }
        
        const data = await response.json();
        results = data.results;
        
        // Check if radius was expanded
        if (data.radiusExpanded) {
          radiusExpandedMessage = true;
        }
      }
      
      // Update the search results state
      setSearchResults(results);
      
      // Show appropriate toast notification
      if (radiusExpandedMessage) {
        toast({
          title: "Search radius expanded",
          description: `Found ${results.length} results near ${searchLocation} by expanding search radius`,
          variant: "default"
        });
      } else {
        toast({
          title: "Search complete",
          description: `Found ${results.length} ${activeTab === "locations" ? "facilities" : "trainers"} near ${searchLocation}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search error",
        description: "An error occurred while searching. Please try again.",
        variant: "destructive"
      });
      
      // Fallback to ensure we always show results even if there's an error
      const fallbackResults = activeTab === "locations" 
        ? getDefaultLocations()
        : getDefaultTrainers();
        
      setSearchResults(fallbackResults);
    } finally {
      // Always reset loading state
      setIsSearching(false);
    }
  };

  const toggleFavorite = (id: string, isLocation: boolean = true) => {
    // Find the item in the current search results
    const currentItem = searchResults.find(item => item.id === id);
      
    if (!currentItem) return;
    
    if (favorites.includes(id)) {
      // Remove from favorites
      setFavorites(favorites.filter(fav => fav !== id));
      // Note: ID in favoritesList is numeric while id parameter is string
      setFavoritesList(favoritesList.filter(fav => fav.originalId !== id));
      
      toast({
        title: "Removed from favorites",
        description: "Item removed from your saved list",
      });
    } else {
      // Add to favorites
      setFavorites([...favorites, id]);
      
      let details = '';
      
      if (isLocation) {
        const location = currentItem as Location;
        details = `${location.type}, ${location.address}`;
      } else {
        const trainer = currentItem as Trainer;
        const trainerDetail = trainer.specialization ? 
          `${trainer.specialization}${trainer.distance ? `, ${trainer.distance}` : ''}` : 
          (trainer.distance || trainer.type || 'Personal Trainer');
        details = trainerDetail;
      }
      
      const numericId = parseInt(id.replace(/\D/g, '')) || favoritesList.length + 1;
      
      const newFavorite: FavoriteItem = {
        id: numericId,
        type: isLocation ? 'location' : 'trainer',
        name: currentItem.name,
        details,
        phone: currentItem.phone,
        saveDate: new Date().toISOString(),
        originalId: id // Store the original string ID
      };
      
      setFavoritesList([...favoritesList, newFavorite]);
      
      toast({
        title: "Added to favorites",
        description: "Item added to your saved list",
      });
    }
  };
  
  const removeFavorite = (id: number) => {
    // Find the favorite item by numeric id
    const favoriteItem = favoritesList.find(fav => fav.id === id);
    
    // If we have the original string ID, use it to remove from favorites array
    if (favoriteItem?.originalId) {
      setFavorites(favorites.filter(fav => fav !== favoriteItem.originalId));
    }
    
    // Remove from the favoritesList array by the numeric id
    setFavoritesList(favoritesList.filter(fav => fav.id !== id));
    
    toast({
      title: "Removed from favorites",
      description: "Item removed from your saved list",
    });
  };
  
  const clearAllFavorites = () => {
    setFavorites([]);
    setFavoritesList([]);
    
    toast({
      title: "Favorites cleared",
      description: "All saved items have been removed",
    });
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Exercise & Wellness Support</h1>
      {/* Doctor's Recommendations */}
      <Card className="mb-6 border-l-4 border-l-primary">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">Doctor's recommendations:</p>
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Find Local Support</h2>
        
        {/* Favorites Button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Heart className={`h-4 w-4 ${favoritesList.length > 0 ? "fill-red-500 text-red-500" : ""}`} />
              <span>Favorites</span>
              {favoritesList.length > 0 && (
                <Badge variant="secondary" className="ml-1">{favoritesList.length}</Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center">
                <span>Your Favorites</span>
                {favoritesList.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive" 
                    onClick={clearAllFavorites}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </DialogTitle>
              <DialogDescription>
                Saved facilities and trainers for quick access
              </DialogDescription>
            </DialogHeader>
            
            {favoritesList.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <Heart className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p>You haven't saved any favorites yet.</p>
                <p className="text-sm mt-1">Click the heart icon to save locations or trainers you like.</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[60vh]">
                {favoritesList.map((item) => (
                  <div key={item.id} className="py-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.details}</p>
                        <div className="flex items-center mt-1">
                          <Badge variant="outline" className="mr-2">
                            {item.type === 'location' ? 'Facility' : 'Trainer'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Saved on {formatDate(item.saveDate)}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeFavorite(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Phone className="h-3 w-3 mr-1" />
                        {item.phone}
                      </Button>
                    </div>
                    <Separator className="mt-3" />
                  </div>
                ))}
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Find Local Support</CardTitle>
          <CardDescription>
            Search for gyms, studios, pools, and trainers near you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="locations" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="locations">
                <MapPin className="h-4 w-4 mr-2" />
                Facilities
              </TabsTrigger>
              <TabsTrigger value="trainers">
                <Star className="h-4 w-4 mr-2" />
                Personal Trainers
              </TabsTrigger>
            </TabsList>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="location">Suburb</Label>
                    <Input 
                      id="location" 
                      placeholder="Enter your suburb" 
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input 
                      id="postcode" 
                      placeholder="Enter Australian postcode" 
                      maxLength={4}
                      value={postcode}
                      onChange={(e) => {
                        // Only allow digits for Australian postcodes
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 4) setPostcode(value);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Australian postcode required for accurate results
                    </p>
                  </div>
                </div>
                
                {activeTab === "locations" && (
                  <div>
                    <Label htmlFor="type">Facility Type</Label>
                    <Select onValueChange={setLocationType}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gym">Gyms</SelectItem>
                        <SelectItem value="yoga">Yoga Studios</SelectItem>
                        <SelectItem value="pilates">Pilates Studios</SelectItem>
                        <SelectItem value="aquatic">Aquatic Centers</SelectItem>
                        <SelectItem value="cardiac">Cardiac Rehab Centers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {activeTab === "trainers" && (
                  <div>
                    <Label htmlFor="specialization">Specialization</Label>
                    <Select>
                      <SelectTrigger id="specialization">
                        <SelectValue placeholder="Select specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="senior">Senior Fitness</SelectItem>
                        <SelectItem value="rehab">Rehabilitation</SelectItem>
                        <SelectItem value="cardiac">Cardiac Health</SelectItem>
                        <SelectItem value="strength">Strength & Balance</SelectItem>
                        <SelectItem value="general">General Fitness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-primary text-white hover:bg-primary/90 w-full md:w-auto"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </Tabs>
        </CardContent>
      </Card>
      <div className="space-y-4">
        {isSearching ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <h2 className="text-xl font-semibold mb-2">
                  Searching for {activeTab === "locations" ? "facilities" : "trainers"}...
                </h2>
                <p className="text-gray-600">
                  Finding the best {activeTab === "locations" ? "fitness facilities" : "personal trainers"} near {searchLocation}
                </p>
                <div className="mt-4 text-sm text-gray-500">
                  Using distance-based search protocol (5km → 10km → 15km → 20km)
                </div>
              </div>
            </div>
          </div>
        ) : searchResults.length > 0 ? (
          <>
            <h2 className="text-xl font-semibold">
              {activeTab === "locations" ? "Facilities" : "Trainers"} near you
            </h2>
            
            {activeTab === "locations" ? (
              // Facilities list
              (searchResults.map((location: any) => (
                <Card key={location.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{location.name}</h3>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>{location.address} {location.distance ? `(${location.distance})` : ''}</span>
                        </div>
                        {location.email && (
                          <div className="text-sm text-gray-500 mt-1">
                            Email: {location.email}
                          </div>
                        )}
                        {location.bio && (
                          <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {location.bio}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(location.id, true)}
                      >
                        <Heart 
                          className={`h-5 w-5 ${favorites.includes(location.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} 
                        />
                      </Button>
                    </div>
                    
                    {location.specialties && location.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {location.specialties.map((specialty: string, i: number) => (
                          <Badge key={i} variant="outline">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {location.rating && (
                      <div className="flex items-center mt-3">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < Math.floor(location.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} 
                            />
                          ))}
                        </div>
                        <span className="ml-1 text-sm">{Number(location.rating || 0).toFixed(1)}</span>
                      </div>
                    )}
                    
                    <div className="flex gap-3 mt-4">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`tel:${location.phone}`)}>
                        <Phone className="h-4 w-4 mr-1" />
                        {location.phone}
                      </Button>
                      {location.website && (
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="flex-1"
                          onClick={() => window.open(location.website, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Website
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )))
            ) : (
              // Trainers list
              (searchResults.map((trainer: any) => (
                <Card key={trainer.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{trainer.name}</h3>
                        {trainer.specialization && (
                          <p className="text-primary font-medium">{trainer.specialization}</p>
                        )}
                        {trainer.experience && trainer.certification && (
                          <div className="text-sm text-gray-500 mt-1">
                            {trainer.experience} experience • {trainer.certification}
                          </div>
                        )}
                        {trainer.address && (
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>{trainer.address}</span>
                          </div>
                        )}
                        {trainer.distance && (
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span>{trainer.distance}</span>
                          </div>
                        )}
                        {trainer.email && (
                          <div className="text-sm text-gray-500 mt-1">
                            Email: {trainer.email}
                          </div>
                        )}
                        {trainer.bio && (
                          <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {trainer.bio}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(trainer.id, false)}
                      >
                        <Heart 
                          className={`h-5 w-5 ${favorites.includes(trainer.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} 
                        />
                      </Button>
                    </div>
                    
                    {trainer.rating && (
                      <div className="flex items-center mt-3">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < Math.floor(trainer.rating || 0) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} 
                            />
                          ))}
                        </div>
                        <span className="ml-1 text-sm">{Number(trainer.rating || 0).toFixed(1)}</span>
                      </div>
                    )}
                    
                    <div className="flex gap-3 mt-4">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`tel:${trainer.phone}`)}>
                        <Phone className="h-4 w-4 mr-1" />
                        {trainer.phone}
                      </Button>
                      {trainer.website ? (
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="flex-1"
                          onClick={() => window.open(trainer.website, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Website
                        </Button>
                      ) : (
                        <Button size="sm" variant="default" className="flex-1">
                          Contact Now
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )))
            )}
          </>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-gray-500">Searching for Your Exercise and Wellness Professional</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EWSupport;