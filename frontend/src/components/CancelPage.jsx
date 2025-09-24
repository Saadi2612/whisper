import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle, Mail } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

const CancelPage = () => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate('/pricing');
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Cancel Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Cancelled
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            No worries! Your payment was cancelled and you haven't been charged. You can try again anytime.
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <XCircle className="h-6 w-6 text-red-600" />
                Payment Cancelled
              </CardTitle>
              <CardDescription>
                Your subscription process was cancelled
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Status */}
              <div className="text-center">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancelled
                </Badge>
                <p className="text-sm text-gray-600 mt-2">
                  No charges were made to your account
                </p>
              </div>

              {/* Current Plan */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Your current plan</span>
                </div>
                <p className="text-sm text-gray-600">
                  You're still on the Free plan with basic features
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Why Cancel? */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-8"
        >
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">Why did you cancel?</CardTitle>
              <CardDescription>
                We'd love to understand what we can improve
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <h4 className="font-medium text-gray-900 text-sm">Price concerns</h4>
                  <p className="text-xs text-gray-600">The plan was too expensive</p>
                </div>
                
                <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <h4 className="font-medium text-gray-900 text-sm">Need more time</h4>
                  <p className="text-xs text-gray-600">Want to try free plan first</p>
                </div>
                
                <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <h4 className="font-medium text-gray-900 text-sm">Technical issues</h4>
                  <p className="text-xs text-gray-600">Had trouble with payment</p>
                </div>
                
                <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <h4 className="font-medium text-gray-900 text-sm">Changed mind</h4>
                  <p className="text-xs text-gray-600">Decided not to subscribe</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* What You Can Do */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-8"
        >
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">What you can do now</CardTitle>
              <CardDescription>
                Your options to continue with Whisper Dashboard
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Continue with Free plan</h4>
                  <p className="text-sm text-gray-600">Keep using basic features and upgrade later when ready</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Try again with a different plan</h4>
                  <p className="text-sm text-gray-600">Choose a plan that better fits your needs and budget</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Contact support</h4>
                  <p className="text-sm text-gray-600">Get help choosing the right plan or resolve any issues</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleTryAgain}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={handleGoHome}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-12 text-center"
        >
          <div className="bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-3">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">Need Help?</h3>
            </div>
            
            <p className="text-sm text-blue-800 mb-4">
              Our support team is here to help you choose the right plan or resolve any issues you encountered.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">support@whisperdashboard.com</span>
              </div>
              
              <div className="hidden sm:block text-blue-300">•</div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-800">Response time: &lt; 24 hours</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CancelPage;
