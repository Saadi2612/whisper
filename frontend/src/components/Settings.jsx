import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  User, 
  Heart, 
  MapPin, 
  Briefcase, 
  ShoppingBag, 
  Target, 
  Settings as SettingsIcon,
  Bell,
  Shield,
  Save,
  Loader2,
  ArrowLeft,
  Globe,
  Languages,
  CreditCard,
  Crown,
  Star,
  Zap,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';

const Settings = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    // Signup preferences
    interests: [],
    age_group: '',
    content_preference: '',
    // Profile preferences
    location: '',
    industry: '',
    purchase_frequency: '',
    product_goals: '',
    // Language preferences
    preferred_language: 'en'
  });
  const [settings, setSettings] = useState({
    auto_process_channels: true,
    notification_email: true,
    process_frequency: 'hourly'
  });
  const [subscription, setSubscription] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

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

  const processFrequencies = [
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }
  ];

  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData();
      loadSubscriptionData();
    }
    loadSupportedLanguages();
  }, [isAuthenticated, user]);

  const loadSubscriptionData = async () => {
    setSubscriptionLoading(true);
    try {
      const [subscriptionData, plansData] = await Promise.all([
        apiService.getCurrentSubscription(),
        apiService.getSubscriptionPlans()
      ]);
      setSubscription(subscriptionData.subscription);
      setAvailablePlans(plansData.plans || []);
      setCurrentPlan(subscriptionData.plan);
    } catch (error) {
      console.error('Failed to load subscription data:', error?.message);
      // toast.error('Failed to load subscription information');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Load user preferences and settings
      const [preferencesData, settingsData] = await Promise.all([
        apiService.getUserPreferences(),
        apiService.getUserSettings()
      ]);

      if (preferencesData.status === 'success') {
        setPreferences(preferencesData.preferences || {
          interests: [],
          age_group: '',
          content_preference: '',
          location: '',
          industry: '',
          purchase_frequency: '',
          product_goals: '',
          preferred_language: 'en'
        });
      }

      if (settingsData.status === 'success') {
        setSettings(settingsData.settings || {
          auto_process_channels: true,
          notification_email: true,
          process_frequency: 'hourly'
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSupportedLanguages = async () => {
    setIsLoadingLanguages(true);
    try {
      const response = await apiService.getSupportedLanguages();
      if (response.status === 'success') {
        setSupportedLanguages(response.languages || []);
      }
    } catch (error) {
      console.error('Error loading supported languages:', error);
      toast.error('Failed to load supported languages');
    } finally {
      setIsLoadingLanguages(false);
    }
  };

  const handlePreferenceChange = (field, value) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const handleInterestChange = (interest, checked) => {
    setPreferences(prev => ({
      ...prev,
      interests: checked 
        ? [...(prev.interests || []), interest]
        : (prev.interests || []).filter(i => i !== interest)
    }));
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const result = await apiService.updateUserPreferences(preferences);
      if (result.status === 'success') {
        toast.success('Preferences updated successfully');
      } else {
        toast.error(result.error || 'Failed to update preferences');
      }
    } catch (error) {
      toast.error('Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const saveLanguagePreference = async () => {
    setIsSaving(true);
    try {
      const result = await apiService.updateUserLanguage(preferences.preferred_language);
      if (result.status === 'success') {
        toast.success('Language preference updated successfully');
      } else {
        toast.error(result.error || 'Failed to update language preference');
      }
    } catch (error) {
      toast.error('Failed to update language preference');
    } finally {
      setIsSaving(false);
    }
  };

  const getPlanIcon = (planType) => {
    switch (planType) {
      case 'free':
        return <Star className="h-6 w-6 text-gray-400" />;
      case 'basic':
        return <Zap className="h-6 w-6 text-blue-500" />;
      case 'premium':
        return <Crown className="h-6 w-6 text-yellow-500" />;
      default:
        return <Star className="h-6 w-6 text-gray-400" />;
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.')) {
      return;
    }

    try {
      await apiService.cancelSubscription();
      toast.success('Subscription cancelled successfully. You will retain access until the end of your current billing period.');
      // Reload subscription data
      await loadSubscriptionData();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast.error('Failed to cancel subscription. Please try again.');
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const result = await apiService.updateUserSettings(settings);
      if (result.status === 'success') {
        toast.success('Settings updated successfully');
      } else {
        toast.error(result.error || 'Failed to update settings');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please log in to view settings</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <SettingsIcon className="h-8 w-8 text-purple-500" />
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-gray-600">Manage your preferences and account settings</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
      </div>

      <Tabs defaultValue="preferences" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences" className="flex items-center space-x-2">
            <Heart className="h-4 w-4" />
            <span>Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Subscription</span>
          </TabsTrigger>
          {/* <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger> */}
        </TabsList>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span>Content Preferences</span>
              </CardTitle>
              <CardDescription>
                Tell us what you're interested in to get better recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Interests */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Interests</Label>
                <div className="grid grid-cols-2 gap-3">
                  {interestOptions.map((interest) => (
                    <div key={interest} className="flex items-center space-x-3">
                      <Checkbox
                        id={interest}
                        checked={preferences.interests && preferences.interests.includes(interest)}
                        onCheckedChange={(checked) => handleInterestChange(interest, checked)}
                        className="h-4 w-4"
                      />
                      <Label 
                        htmlFor={interest} 
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {interest}
                      </Label>
                    </div>
                  ))}
                </div>
                {preferences.interests && preferences.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {preferences.interests.map((interest) => (
                      <Badge key={interest} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Age Group */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Age Group</Label>
                <RadioGroup
                  value={preferences.age_group}
                  onValueChange={(value) => handlePreferenceChange('age_group', value)}
                  className="grid grid-cols-2 gap-3"
                >
                  {ageGroups.map((age) => (
                    <div key={age} className="flex items-center space-x-3">
                      <RadioGroupItem value={age} id={age} className="h-4 w-4" />
                      <Label 
                        htmlFor={age} 
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {age}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              {/* Content Preference */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Content Preference</Label>
                <RadioGroup
                  value={preferences.content_preference}
                  onValueChange={(value) => handlePreferenceChange('content_preference', value)}
                  className="space-y-3"
                >
                  {contentPreferences.map((pref) => (
                    <div key={pref} className="flex items-center space-x-3">
                      <RadioGroupItem value={pref} id={pref} className="h-4 w-4" />
                      <Label 
                        htmlFor={pref} 
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {pref}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Button 
                onClick={savePreferences} 
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-500" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Additional information to help us personalize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Location */}
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span>Location</span>
                </Label>
                <Input
                  placeholder="e.g., New York, NY or London, UK"
                  value={preferences.location}
                  onChange={(e) => handlePreferenceChange('location', e.target.value)}
                />
                <p className="text-sm text-gray-500">City or region – for local updates & recommendations</p>
              </div>

              <Separator />

              {/* Industry */}
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center space-x-2">
                  <Briefcase className="h-4 w-4 text-green-500" />
                  <span>Industry / Occupation</span>
                </Label>
                <Select
                  value={preferences.industry}
                  onValueChange={(value) => handlePreferenceChange('industry', value)}
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
                <p className="text-sm text-gray-500">Pick from a dropdown or enter manually</p>
              </div>

              <Separator />

              {/* Purchase Frequency */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center space-x-2">
                  <ShoppingBag className="h-4 w-4 text-orange-500" />
                  <span>Purchase Frequency</span>
                </Label>
                <RadioGroup
                  value={preferences.purchase_frequency}
                  onValueChange={(value) => handlePreferenceChange('purchase_frequency', value)}
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
                <p className="text-sm text-gray-500">How often do you buy things in your main interests?</p>
              </div>

              <Separator />

              {/* Language Preference */}
              <div className="space-y-3">
                <Label className="text-base font-medium flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span>Preferred Language</span>
                </Label>
                <Select
                  value={preferences.preferred_language}
                  onValueChange={(value) => handlePreferenceChange('preferred_language', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your preferred language" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {isLoadingLanguages ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading languages...</span>
                        </div>
                      </SelectItem>
                    ) : (
                      supportedLanguages.map((language) => (
                        <SelectItem key={language.code} value={language.code}>
                          <div className="flex items-center space-x-2">
                            <Languages className="h-4 w-4" />
                            <span>{language.name}</span>
                            <span className="text-xs text-gray-500">({language.code})</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Choose your preferred language for video transcripts and analysis. New videos will be processed in this language.
                </p>
                <Button 
                  onClick={saveLanguagePreference} 
                  disabled={isSaving}
                  variant="outline"
                  size="sm"
                  className="w-fit"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Language
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Product Goals */}
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center space-x-2">
                  <Target className="h-4 w-4 text-purple-500" />
                  <span>Product Goals</span>
                </Label>
                <Textarea
                  placeholder="Tell us about your current product goals or shopping plans..."
                  value={preferences.product_goals}
                  onChange={(e) => handlePreferenceChange('product_goals', e.target.value)}
                  className="min-h-[100px] resize-none"
                  maxLength={500}
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Any product goals right now? (e.g., "Buying a new phone," "Looking for fitness gear," "Planning a holiday")</span>
                  <span>{(preferences.product_goals || '').length}/500</span>
                </div>
              </div>

              <Button 
                onClick={savePreferences} 
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                <span>Subscription Management</span>
              </CardTitle>
              <CardDescription>
                Manage your subscription plan and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {subscriptionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600">Loading subscription information...</span>
                </div>
              ) : subscription ? (
                <div className="space-y-6">
                  {/* Current Plan Status */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getPlanIcon(currentPlan?.type)}
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">
                            {currentPlan?.name || 'Unknown Plan'}
                          </h3>
                          <p className="text-gray-600">
                            ${currentPlan?.price || 0}/{currentPlan?.interval || 'month'}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={subscription.status === 'active' ? 'default' : 'secondary'}
                        className={subscription.status === 'active' ? 'bg-green-500' : ''}
                      >
                        {subscription.status === 'active' ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                        ) : (
                          <><AlertCircle className="h-3 w-3 mr-1" /> {subscription.status}</>
                        )}
                      </Badge>
                    </div>
                    
                    {currentPlan?.features && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Plan Features:</h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {currentPlan?.features.map((feature, index) => (
                            <li key={index} className="flex items-center text-sm text-gray-600">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Billing Information */}
                  {subscription.status === 'active' && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Billing Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Next billing date:</span>
                          <span className="ml-2 font-medium">
                            {subscription.current_period_end 
                              ? new Date(subscription.current_period_end).toLocaleDateString()
                              : 'N/A'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Amount:</span>
                          <span className="ml-2 font-medium">
                            ${currentPlan?.price || 0}/{currentPlan?.interval || 'month'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => navigate('/pricing')}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Change Plan
                    </Button>
                    {subscription.status === 'active' && subscription.plan?.type !== 'free' && (
                      <Button
                        onClick={handleCancelSubscription}
                        variant="outline"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Subscription Found</h3>
                  <p className="text-gray-600 mb-4">You don't have an active subscription plan.</p>
                  <Button
                    onClick={() => navigate('/pricing')}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Plans
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        {/* <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-yellow-500" />
                <span>Notification Settings</span>
              </CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Auto-process Channels</Label>
                    <p className="text-sm text-gray-500">Automatically process videos from followed channels</p>
                  </div>
                  <Checkbox
                    checked={settings.auto_process_channels}
                    onCheckedChange={(checked) => handleSettingChange('auto_process_channels', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive email updates about your videos and channels</p>
                  </div>
                  <Checkbox
                    checked={settings.notification_email}
                    onCheckedChange={(checked) => handleSettingChange('notification_email', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-base font-medium">Processing Frequency</Label>
                  <Select
                    value={settings.process_frequency}
                    onValueChange={(value) => handleSettingChange('process_frequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {processFrequencies.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">How often to check for new videos from followed channels</p>
                </div>
              </div>

              <Button 
                onClick={saveSettings} 
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent> */}
      </Tabs>
    </div>
  );
};

export default Settings;
