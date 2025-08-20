import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Globe, Star, Navigation } from 'lucide-react';

interface LocalRecommendation {
  id: string;
  name: string;
  category: 'exercise' | 'nutrition' | 'wellness' | 'pharmacy';
  address: string;
  description: string;
  cpdAlignment: string;
  distance?: string;
  rating?: number;
  phoneNumber?: string;
  website?: string;
  openingHours?: string;
  amenities?: string[];
}

interface LocalRecommendationsCardProps {
  recommendations: LocalRecommendation[];
  onRecommendationSelect?: (recommendation: LocalRecommendation) => void;
  className?: string;
}

const LocalRecommendationsCard: React.FC<LocalRecommendationsCardProps> = ({
  recommendations,
  onRecommendationSelect,
  className = ""
}) => {
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'exercise': return 'bg-blue-100 text-blue-800';
      case 'nutrition': return 'bg-green-100 text-green-800';
      case 'wellness': return 'bg-purple-100 text-purple-800';
      case 'pharmacy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'exercise': return '🏃‍♀️';
      case 'nutrition': return '🥗';
      case 'wellness': return '🧘‍♀️';
      case 'pharmacy': return '💊';
      default: return '📍';
    }
  };

  const openInMaps = (address: string, name: string) => {
    const query = encodeURIComponent(`${name}, ${address}`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(mapsUrl, '_blank');
  };

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <Card className={`mt-3 border-l-4 border-l-blue-500 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-blue-600" />
          Local Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div 
              key={rec.id} 
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onRecommendationSelect?.(rec)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getCategoryIcon(rec.category)}</span>
                    <h3 className="font-semibold text-gray-900">{rec.name}</h3>
                    <Badge className={getCategoryColor(rec.category)} variant="secondary">
                      {rec.category}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{rec.address}</span>
                    </div>
                    
                    {rec.distance && (
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        <span>{rec.distance}</span>
                      </div>
                    )}
                    
                    {rec.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{rec.rating}/5</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                {rec.description}
              </p>
              
              {/* CPD Alignment */}
              <div className="p-2 bg-green-50 rounded text-xs text-green-800 mb-3">
                <strong>Care Plan Alignment:</strong> {rec.cpdAlignment}
              </div>
              
              {/* Amenities */}
              {rec.amenities && rec.amenities.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {rec.amenities.map((amenity, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Opening Hours */}
              {rec.openingHours && (
                <div className="text-xs text-gray-600 mb-3">
                  <strong>Hours:</strong> {rec.openingHours}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    openInMaps(rec.address, rec.name);
                  }}
                  className="flex items-center gap-1"
                >
                  <MapPin className="h-3 w-3" />
                  Directions
                </Button>
                
                {rec.phoneNumber && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`tel:${rec.phoneNumber}`, '_self');
                    }}
                    className="flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    Call
                  </Button>
                )}
                
                {rec.website && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(rec.website, '_blank');
                    }}
                    className="flex items-center gap-1"
                  >
                    <Globe className="h-3 w-3" />
                    Website
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocalRecommendationsCard;