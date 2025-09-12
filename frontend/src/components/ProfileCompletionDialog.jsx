import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { MapPin, Briefcase, ShoppingBag, Target, X } from 'lucide-react';

const ProfileCompletionDialog = ({ open, onClose, onSave, isLoading }) => {
  const [preferences, setPreferences] = useState({
    location: '',
    industry: '',
    purchase_frequency: '',
    product_goals: ''
  });

  const [errors, setErrors] = useState({});

  const industryOptions = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Retail',
    'Manufacturing',
    'Consulting',
    'Marketing',
    'Sales',
    'Design',
    'Engineering',
    'Other'
  ];

  const purchaseFrequencies = [
    'Weekly',
    'Monthly',
    'Occasionally',
    'Rarely',
    'Just browsing'
  ];

  const handleInputChange = (field, value) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = () => {
    // All fields are optional, so no validation required
    onSave(preferences);
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-purple-500" />
            <span>Complete Your Profile</span>
          </DialogTitle>
          <DialogDescription>
            Help us personalize your experience with a few optional details. You can always update these later in settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Location */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span>Location</span>
              </CardTitle>
              <CardDescription>
                City or region – for local updates & recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g., New York, NY or London, UK"
                value={preferences.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Industry */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Briefcase className="h-4 w-4 text-green-500" />
                <span>Industry / Occupation</span>
              </CardTitle>
              <CardDescription>
                Pick from a dropdown or enter manually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={preferences.industry}
                onValueChange={(value) => handleInputChange('industry', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {industryOptions.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {preferences.industry === 'Other' && (
                <Input
                  placeholder="Enter your industry"
                  value={preferences.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  className="mt-2"
                />
              )}
            </CardContent>
          </Card>

          {/* Purchase Frequency */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <ShoppingBag className="h-4 w-4 text-orange-500" />
                <span>Purchase Frequency</span>
              </CardTitle>
              <CardDescription>
                How often do you buy things in your main interests?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={preferences.purchase_frequency}
                onValueChange={(value) => handleInputChange('purchase_frequency', value)}
                className="space-y-3"
              >
                {purchaseFrequencies.map((frequency) => (
                  <div key={frequency} className="flex items-center space-x-3">
                    <RadioGroupItem value={frequency} id={frequency} className="h-4 w-4" />
                    <Label 
                      htmlFor={frequency} 
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {frequency}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Product Goals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span>Product Goals</span>
              </CardTitle>
              <CardDescription>
                Any product goals right now? (e.g., "Buying a new phone," "Looking for fitness gear," "Planning a holiday")
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Tell us about your current product goals or shopping plans..."
                value={preferences.product_goals}
                onChange={(e) => handleInputChange('product_goals', e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {preferences.product_goals.length}/500 characters
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <X className="h-4 w-4" />
              <span>Skip for now</span>
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              <span>Save Preferences</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCompletionDialog;
