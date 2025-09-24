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
          features: [
            // "Process 5 videos per month",
            "Full transcript access",
            "AI executive summary",
            "Basic video analysis",
            "Home dashboard access",
            "Standard video processing"
          ],
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
          features: [
            // "Process 50 videos per month",
            "Full transcript access",
            "AI executive summary with key insights",
            "People & companies mentioned",
            "Enhanced video analysis",
            "Time range summaries",
            "Q&A with your videos",
            "Text-to-speech summaries",
            "Follow YouTube channels",
            "Home and My Channels dashboard"
          ],
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
          features: [
            // "Unlimited video processing",
            "Full transcript access",
            "Complete AI analysis suite",
            "Advanced topic analysis",
            "Tone & delivery analysis",
            "Time range summaries",
            "Q&A with your videos",
            "Video translation",
            "Text-to-speech summaries",
            "Follow YouTube channels",
            "YouTube video search",
            "Topics & saved videos",
            "Processing queues",
            "Full dashboard access"
          ],
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
        const successUrl = `${window.location.origin}/success`;
        const cancelUrl = `${window.location.origin}/cancel`;
        
        const response = await apiService.createCheckoutSession(plan.id, successUrl, cancelUrl);
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
              className={`relative transition-all duration-300 hover:shadow-xl flex flex-col h-full ${
                plan.type === 'premium' 
                  ? 'border-2 border-yellow-200 shadow-lg scale-105' 
                  : 'border border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.type === 'premium' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-1 text-sm font-medium shadow-md">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-6 pt-8">
                <div className="flex justify-center mb-4">
                  <div className={`p-3 rounded-full ${
                    plan.type === 'free' 
                      ? 'bg-gray-100' 
                      : plan.type === 'basic' 
                      ? 'bg-blue-100' 
                      : 'bg-yellow-100'
                  }`}>
                    {getPlanIcon(plan.type)}
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  {plan.type === 'free' 
                    ? 'Perfect for getting started'
                    : plan.type === 'basic'
                    ? 'Great for regular users'
                    : 'For power users and teams'
                  }
                </CardDescription>
                <div className="mt-6">
                  <div className="flex items-baseline justify-center">
                    <span className="text-5xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600 ml-2 text-lg">
                      /{plan.interval}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6 flex-1">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {/* <div className="mt-auto">
                  {plan.video_limit ? (
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <p className="text-sm text-gray-600 text-center">
                        <span className="font-semibold text-gray-900">{plan.video_limit}</span> videos per month
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-semibold text-center">
                        Unlimited videos
                      </p>
                    </div>
                  )}
                </div> */}
              </CardContent>

              <CardFooter className="pt-0 px-6 pb-6">
                <Button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={processing || isCurrentPlan(plan)}
                  className={`w-full h-12 text-base font-medium transition-all duration-200 ${
                    plan.type === 'premium'
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl'
                      : plan.type === 'basic'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-md hover:shadow-lg'
                  } ${
                    isCurrentPlan(plan) 
                      ? 'bg-green-600 hover:bg-green-700 cursor-not-allowed' 
                      : ''
                  }`}
                >
                  {processing && selectedPlan?.id === plan.id ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : isCurrentPlan(plan) ? (
                    <div className="flex items-center justify-center">
                      <Check className="h-4 w-4 mr-2" />
                      Current Plan
                    </div>
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
