import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Lock, Crown, Zap, Star, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlanAccess } from '../hooks/usePlanAccess';

const LockedFeature = ({ 
  featureName, 
  featurePath, 
  children, 
  className = "",
  showUpgradeButton = true,
  customMessage = null 
}) => {
  const navigate = useNavigate();
  const { canAccess, getUpgradePrompt, getPlanInfo } = usePlanAccess();
  const { currentPlan } = getPlanInfo();
  
  // If user has access, render the children
  if (canAccess(featurePath)) {
    return children;
  }
  
  const getPlanIcon = (planType) => {
    switch (planType) {
      case 'free':
        return <Star className="h-4 w-4 text-gray-400" />;
      case 'basic':
        return <Zap className="h-4 w-4 text-blue-500" />;
      case 'premium':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      default:
        return <Star className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getRequiredPlan = () => {
    // Determine required plan based on feature path
    if (featurePath.includes('youtube') || featurePath.includes('topics') || featurePath.includes('saved') || featurePath.includes('queues')) {
      return 'premium';
    }
    if (featurePath.includes('my_channels') || featurePath.includes('time_range') || featurePath.includes('q_and_a')) {
      return 'basic';
    }
    if (featurePath.includes('tone_analysis')) {
      return 'premium';
    }
    if (featurePath.includes('translation')) {
      return 'premium';
    }
    return 'basic';
  };
  
  const requiredPlan = getRequiredPlan();
  const message = customMessage || getUpgradePrompt(featurePath);
  
  return (
    <div className={`relative ${className}`}>
      {/* Blurred content */}
      <div className="blur-sm pointer-events-none select-none">
        {children}
      </div>
      
      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg">
        <Card className="w-full max-w-md mx-4 shadow-lg border-2 border-dashed border-gray-300">
          <CardContent className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <Lock className="h-8 w-8 text-gray-500" />
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {featureName} Locked
            </h3>
            
            <p className="text-gray-600 mb-4 text-sm">
              {message}
            </p>
            
            <div className="flex items-center justify-center space-x-2 mb-4">
              <span className="text-sm text-gray-500">Available in:</span>
              <Badge variant="outline" className="flex items-center space-x-1">
                {getPlanIcon(requiredPlan)}
                <span className="capitalize">{requiredPlan}</span>
              </Badge>
            </div>
            
            {showUpgradeButton && (
              <Button
                onClick={() => navigate('/pricing')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LockedFeature;
