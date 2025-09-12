import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

const SignupPreferences = ({ onBack, onComplete, isLoading }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState({
    interests: [],
    age_group: '',
    content_preference: ''
  });

  const interestOptions = [
    'Technology',
    'Food & Cooking',
    'Fitness & Wellness',
    'Fashion & Beauty',
    'Travel & Adventure',
    'Entertainment'
  ];

  const ageGroups = [
    'Under 18',
    '18-24',
    '25-34',
    '35-44',
    '45-54',
    '55+'
  ];

  const contentPreferences = [
    'Short & snappy',
    'In-depth & detailed',
    'Visual (images/video heavy)',
    'Conversational / text-based'
  ];

  const handleInterestChange = (interest, checked) => {
    setPreferences(prev => ({
      ...prev,
      interests: checked 
        ? [...prev.interests, interest]
        : prev.interests.filter(i => i !== interest)
    }));
  };

  const handleAgeGroupChange = (value) => {
    setPreferences(prev => ({
      ...prev,
      age_group: value
    }));
  };

  const handleContentPreferenceChange = (value) => {
    setPreferences(prev => ({
      ...prev,
      content_preference: value
    }));
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(preferences);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return preferences.interests.length > 0;
      case 1:
        return preferences.age_group !== '';
      case 2:
        return preferences.content_preference !== '';
      default:
        return false;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 0:
        return "What are you most interested in?";
      case 1:
        return "Which age group do you fit into?";
      case 2:
        return "How do you like your content?";
      default:
        return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 0:
        return "Choose as many as you like";
      case 1:
        return "Help us personalize your experience";
      case 2:
        return "This helps us show you the right content";
      default:
        return "";
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-3">
            {interestOptions.map((interest) => (
              <div key={interest} className="flex items-center space-x-3">
                <Checkbox
                  id={interest}
                  checked={preferences.interests.includes(interest)}
                  onCheckedChange={(checked) => handleInterestChange(interest, checked)}
                  className="h-5 w-5"
                />
                <Label 
                  htmlFor={interest} 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {interest}
                </Label>
              </div>
            ))}
          </div>
        );
      
      case 1:
        return (
          <RadioGroup
            value={preferences.age_group}
            onValueChange={handleAgeGroupChange}
            className="space-y-3"
          >
            {ageGroups.map((age) => (
              <div key={age} className="flex items-center space-x-3">
                <RadioGroupItem value={age} id={age} className="h-5 w-5" />
                <Label 
                  htmlFor={age} 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {age}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case 2:
        return (
          <RadioGroup
            value={preferences.content_preference}
            onValueChange={handleContentPreferenceChange}
            className="space-y-3"
          >
            {contentPreferences.map((pref) => (
              <div key={pref} className="flex items-center space-x-3">
                <RadioGroupItem value={pref} id={pref} className="h-5 w-5" />
                <Label 
                  htmlFor={pref} 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {pref}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-2">
          <Sparkles className="h-6 w-6 text-purple-500" />
        </div>
        <CardTitle className="text-xl font-semibold">
          {getStepTitle()}
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          {getStepDescription()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {[0, 1, 2].map((step) => (
            <div
              key={step}
              className={`h-2 w-8 rounded-full transition-colors ${
                step <= currentStep ? 'bg-purple-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[200px]">
          {renderStepContent()}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          >
            <span>{currentStep === 2 ? 'Complete' : 'Next'}</span>
            {currentStep < 2 && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignupPreferences;
