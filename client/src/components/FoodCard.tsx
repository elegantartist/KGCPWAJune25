import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FoodItem {
  id: number;
  name: string;
  description: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number;
  category: string;
  cpdRelevantTags: string[];
  source: string;
}

const FoodCard = ({ food, isInitialFavourite }: { food: FoodItem, isInitialFavourite: boolean }) => {
  const [isFavourite, setIsFavourite] = useState(isInitialFavourite);
  const { toast } = useToast();
  const [isOnline] = useState(navigator.onLine);

  const toggleFavourite = async () => {
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Can't update favourites while offline.",
        variant: "destructive"
      });
      return;
    }

    // Mock API call
    console.log(`Toggling favourite for food item: ${food.id}`);
    setIsFavourite(!isFavourite);
    toast({
      title: !isFavourite ? "Added to favourites" : "Removed from favourites",
      description: `${food.name} has been ${!isFavourite ? 'added to' : 'removed from'} your favourites.`,
    });
    // In a real app, you would have error handling here.
  };

  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg leading-tight pr-2">{food.name}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={toggleFavourite}
          >
            <Heart className={`h-5 w-5 transition-colors ${isFavourite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline">{food.category}</Badge>
          {food.cpdRelevantTags?.slice(0, 2).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pb-2 flex-grow">
        <p className="text-sm text-muted-foreground mb-3">{food.description}</p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div><span className="font-medium">Serving:</span> {food.servingSize}</div>
          <div><span className="font-medium">Calories:</span> {food.calories} kcal</div>
          <div><span className="font-medium">Protein:</span> {food.protein}g</div>
          <div><span className="font-medium">Carbs:</span> {food.carbs}g</div>
          <div><span className="font-medium">Fat:</span> {food.fat}g</div>
          <div><span className="font-medium">Sodium:</span> {food.sodium}mg</div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800">
        <div className="flex justify-between items-center w-full">
          <span>Source: {food.source || 'FSANZ'}</span>
          <div className="flex items-center gap-2">
            {food.cpdRelevantTags?.[0] &&
              <Badge variant="outline" className="border-green-600 bg-green-50 text-green-800 capitalize">
                {food.cpdRelevantTags[0]?.replace(/-/g, ' ')}
              </Badge>
            }
            <a href="https://www.foodstandards.gov.au/science-data/food-composition-databases" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              View Source
            </a>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default FoodCard;
