import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  AlertCircle,
  Check, 
  X
} from 'lucide-react';
import { useFeatureManagement } from '../hooks/useFeatureManagement';
import { getAllFeatures, FeatureConfig as AppFeatureConfig } from '@/features/featureRegistry';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const FeatureManagementPanel: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('patient');
  
  // Get features from the registry
  const appFeatureRegistry = getAllFeatures();
  
  // Use the feature management hook
  const { 
    features, 
    isLoading, 
    error,
    toggleFeature,
    resetFeature,
    isToggling,
    isResetting
  } = useFeatureManagement();
  
  // Handler for toggling feature enabled state
  const handleToggleFeature = async (featureId: string, currentlyEnabled: boolean) => {
    try {
      await toggleFeature({ featureId, enabled: !currentlyEnabled });
      toast({
        title: `Feature ${!currentlyEnabled ? 'enabled' : 'disabled'}`,
        description: `${appFeatureRegistry[featureId]?.name || featureId} has been ${!currentlyEnabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to update feature status. Please try again.`,
        variant: 'destructive',
      });
    }
  };
  
  // Handler for resetting feature to defaults
  const handleResetFeature = async (featureId: string) => {
    try {
      await resetFeature(featureId);
      toast({
        title: 'Feature reset',
        description: `${appFeatureRegistry[featureId]?.name || featureId} has been reset to default settings.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to reset feature. Please try again.`,
        variant: 'destructive',
      });
    }
  };
  
  // Filter features by dashboard category
  const getFeaturesByCategory = (category: 'patient' | 'doctor' | 'admin' | 'all') => {
    return Object.values(appFeatureRegistry)
      .filter(feature => 
        feature.dashboardCategory === category || 
        feature.dashboardCategory === 'all'
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  
  // Group features by category for the selected tab
  const patientFeatures = getFeaturesByCategory('patient');
  const doctorFeatures = getFeaturesByCategory('doctor');
  const adminFeatures = getFeaturesByCategory('admin');
  const globalFeatures = getFeaturesByCategory('all');
  
  // Render skeleton loader while features are loading
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feature Management</CardTitle>
          <CardDescription>Loading feature configurations...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error Loading Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load feature configurations</AlertTitle>
            <AlertDescription>
              There was an error loading the feature management panel. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Feature Management
        </CardTitle>
        <CardDescription>
          Enable, disable, or configure features across KGC dashboards
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tab navigation for different dashboard categories */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="patient">Patient Dashboard</TabsTrigger>
            <TabsTrigger value="doctor">Doctor Dashboard</TabsTrigger>
            <TabsTrigger value="admin">Admin Dashboard</TabsTrigger>
            <TabsTrigger value="global">Global Features</TabsTrigger>
          </TabsList>
          
          {/* Patient dashboard features */}
          <TabsContent value="patient" className="space-y-4">
            {patientFeatures.length > 0 ? (
              patientFeatures.map(feature => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  featureConfig={features?.[feature.id]}
                  onToggle={handleToggleFeature}
                  onReset={handleResetFeature}
                  isToggling={isToggling}
                  isResetting={isResetting}
                />
              ))
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                No patient dashboard features found
              </div>
            )}
          </TabsContent>
          
          {/* Doctor dashboard features */}
          <TabsContent value="doctor" className="space-y-4">
            {doctorFeatures.length > 0 ? (
              doctorFeatures.map(feature => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  featureConfig={features?.[feature.id]}
                  onToggle={handleToggleFeature}
                  onReset={handleResetFeature}
                  isToggling={isToggling}
                  isResetting={isResetting}
                />
              ))
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                No doctor dashboard features found
              </div>
            )}
          </TabsContent>
          
          {/* Admin dashboard features */}
          <TabsContent value="admin" className="space-y-4">
            {adminFeatures.length > 0 ? (
              adminFeatures.map(feature => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  featureConfig={features?.[feature.id]}
                  onToggle={handleToggleFeature}
                  onReset={handleResetFeature}
                  isToggling={isToggling}
                  isResetting={isResetting}
                />
              ))
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                No admin dashboard features found
              </div>
            )}
          </TabsContent>
          
          {/* Global features */}
          <TabsContent value="global" className="space-y-4">
            {globalFeatures.length > 0 ? (
              globalFeatures.map(feature => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  featureConfig={features?.[feature.id]}
                  onToggle={handleToggleFeature}
                  onReset={handleResetFeature}
                  isToggling={isToggling}
                  isResetting={isResetting}
                />
              ))
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                No global features found
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Sub-component for individual feature cards
interface FeatureCardProps {
  feature: AppFeatureConfig;
  featureConfig: Record<string, any> | undefined;
  onToggle: (featureId: string, currentlyEnabled: boolean) => void;
  onReset: (featureId: string) => void;
  isToggling: boolean;
  isResetting: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  featureConfig,
  onToggle,
  onReset,
  isToggling,
  isResetting
}) => {
  const isEnabled = featureConfig?.enabled !== undefined 
    ? featureConfig.enabled 
    : feature.enabled;
  
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors">
      <div className="space-y-1">
        <div className="flex items-center">
          <h3 className="font-medium">{feature.name}</h3>
          {isEnabled ? (
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
              <Check className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-2 bg-gray-50 text-gray-700 border-gray-200">
              <X className="h-3 w-3 mr-1" />
              Disabled
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{feature.description}</p>
        {feature.dependencies.length > 0 && (
          <div className="mt-2">
            <span className="text-xs text-muted-foreground">Dependencies: </span>
            {feature.dependencies.map(dep => (
              <Badge key={dep} variant="secondary" className="mr-1 text-xs">
                {dep}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Switch 
          checked={isEnabled}
          onCheckedChange={() => onToggle(feature.id, isEnabled)}
          disabled={isToggling || !feature.adminConfigurable}
          aria-label={`Toggle ${feature.name}`}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReset(feature.id)}
          disabled={isResetting || !feature.adminConfigurable}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
};

export default FeatureManagementPanel;