import { useState } from "react";
import { Heart } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FoodItem } from '../types';
import { useToggleFavourite } from '../api/hooks';

interface FoodCardProps {
  food: FoodItem;
  isFavourite?: boolean;
}

const FoodCard: React.FC<FoodCardProps> = ({ food, isFavourite: initialFavourite = false }) => {
  const [isFavourite, setIsFavourite] = useState(initialFavourite);
  const { toast } = useToast();
  const toggleFavouriteMutation = useToggleFavourite();
  
  const handleToggleFavourite = async () => {
    try {
      const result = await toggleFavouriteMutation.mutateAsync(food.id);
      setIsFavourite(result.isFavourite);
      
      toast({
        title: result.isFavourite ? "Added to favourites" : "Removed from favourites",
        description: `${food.name} ${result.isFavourite ? 'added to' : 'removed from'} your favourites`,
      });
    } catch (error) {
      toast({
        title: "Failed to update favourites",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{food.name}</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleToggleFavourite}
            title={isFavourite ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart
              className={`h-5 w-5 ${isFavourite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{food.description}</p>
        
        {/* Nutrition information */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Serving size</span>
            <span className="font-medium">{food.servingSize}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Calories</span>
            <span className="font-medium">{food.calories} kcal</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Protein</span>
            <span className="font-medium">{food.protein}g</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Carbs</span>
            <span className="font-medium">{food.carbs}g</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Fat</span>
            <span className="font-medium">{food.fat}g</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Sodium</span>
            <span className="font-medium">{food.sodium}mg</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex flex-wrap gap-1">
        <Badge variant="outline">{food.category}</Badge>
        {food.cpdRelevantTags.map(tag => (
          <Badge key={tag} variant="secondary">{tag}</Badge>
        ))}
      </CardFooter>
    </Card>
  );
};

export default FoodCard;