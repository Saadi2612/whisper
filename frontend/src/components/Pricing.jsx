import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';

const Pricing = () => {
  const { user, isAuthenticated } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await apiService.getSubscriptionPlans();
      setPlans(response.plans || []);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      // Fallback to hardcoded plans if API fails
      setPlans([
        {
          id: "free",
          name: "Free",
          type: "free",
          price: 0.00,
          currency: "usd",
          interval: "month",
          features: ["5 videos per month", "Basic analysis", "Transcript access"],
          video_limit: 5,
          is_active: true
        },
        {
          id: "basic",
          name: "Basic",
          type: "basic",
          price: 9.99,
          currency: "usd",
          interval: "month",
          features: ["50 videos per month", "Enhanced analysis", "Priority processing", "Email support"],
          video_limit: 50,
          is_active: true
        },
        {
          id: "premium",
          name: "Premium",
          type: "premium",
          price: 19.99,
          currency: "usd",
          interval: "month",
          features: ["Unlimited videos", "Advanced analysis", "Real-time processing", "Priority support", "API access"],
          video_limit: null,
          is_active: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to subscribe to a plan');
      return;
    }

    setSelectedPlan(plan);
    setProcessing(true);

    try {
      if (plan.type === 'free') {
        // Handle free plan selection
        await apiService.selectSubscriptionPlan(plan.id);
        toast.success('Free plan activated successfully!');
      } else {
        // Handle paid plan selection - redirect to Stripe checkout
        const response = await apiService.createCheckoutSession(plan.id);
        if (response.url) {
          window.location.href = response.url;
        } else {
          throw new Error('Failed to create checkout session');
        }
      }
    } catch (error) {
      console.error('Error selecting plan:', error);
      toast.error(error.message || 'Failed to select plan');
    } finally {
      setProcessing(false);
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

  const getPlanColor = (planType) => {
    switch (planType) {
      case 'free':
        return 'border-gray-200 hover:border-gray-300';
      case 'basic':
        return 'border-blue-200 hover:border-blue-300';
      case 'premium':
        return 'border-yellow-200 hover:border-yellow-300 ring-2 ring-yellow-100';
      default:
        return 'border-gray-200 hover:border-gray-300';
    }
  };

  const isCurrentPlan = (plan) => {
    return user?.subscription?.plan_id === plan.id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock the full potential of video analysis with our flexible subscription plans
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative transition-all duration-300 hover:shadow-xl ${getPlanColor(plan.type)} ${
                plan.type === 'premium' ? 'scale-105' : ''
              }`}
            >
              {plan.type === 'premium' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-yellow-500 text-white px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <div className="flex justify-center mb-4">
                  {getPlanIcon(plan.type)}
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600">
                  {plan.type === 'free' 
                    ? 'Perfect for getting started'
                    : plan.type === 'basic'
                    ? 'Great for regular users'
                    : 'For power users and teams'
                  }
                </CardDescription>
                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600 ml-2">
                    /{plan.interval}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6">
                <ul className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {plan.video_limit && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">{plan.video_limit}</span> videos per month
                    </p>
                  </div>
                )}
                
                {!plan.video_limit && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700 font-semibold">
                      Unlimited videos
                    </p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={processing || isCurrentPlan(plan)}
                  className={`w-full ${
                    plan.type === 'premium'
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : plan.type === 'basic'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  {processing && selectedPlan?.id === plan.id ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : isCurrentPlan(plan) ? (
                    'Current Plan'
                  ) : plan.type === 'free' ? (
                    'Get Started'
                  ) : (
                    `Subscribe to ${plan.name}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I change my plan anytime?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens if I exceed my video limit?
              </h3>
              <p className="text-gray-600">
                You'll be notified when approaching your limit. You can upgrade your plan or wait for the next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! Our free plan includes 5 videos per month with basic analysis features.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How does billing work?
              </h3>
              <p className="text-gray-600">
                All paid plans are billed monthly. You can cancel anytime with no cancellation fees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
