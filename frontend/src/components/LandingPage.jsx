import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Play, FileText, Users, Clock, Target, BookOpen, Zap, Linkedin, Twitter, Youtube, UserCircle, LogOut, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { mockData } from '../data/mockData';
import VideoProcessSearch from './VideoProcessSearch';
import AuthModal from './AuthModal';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const LandingPage = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const location = useLocation();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const hasShownPrompt = useRef(false);

  // Check if user was redirected from a protected route
  useEffect(() => {
    if (location.state?.from && !hasShownPrompt.current) {
      setShowLoginPrompt(true);
      toast.info('Please sign in to access the dashboard');
      hasShownPrompt.current = true;
    }
  }, [location.state]);

  const handleVideoProcessed = (video) => {
    console.log('Video processed:', video);
    // Could add additional logic here if needed
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      {/* Login Prompt Banner */}
      {/* {showLoginPrompt && !isAuthenticated && (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Please sign in to access your dashboard</span>
            </div>
            <Button
              onClick={() => setShowAuthModal(true)}
              variant="secondary"
              size="sm"
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              Sign In
            </Button>
          </div>
        </div>
      )} */}

      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
                  <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Whisper</h1>
              <p className="text-xs text-gray-500">Save Minutes, Gain Hours.</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-700">Hi, {user?.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
                <Link to="/dashboard">
                  <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">Dashboard</Button>
                </Link>
              </div>
            ) : (
              <>
                <Button 
                  variant="ghost"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign In
                </Button>
                <Link to="/dashboard">
                  <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">Dashboard</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-purple-50 to-blue-50">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-20 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl transform rotate-12 animate-pulse opacity-60"></div>
          <div className="absolute top-40 right-20 w-24 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-xl transform -rotate-6 animate-pulse opacity-40 animation-delay-1000"></div>
          <div className="absolute bottom-32 left-1/4 w-28 h-18 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg transform rotate-3 animate-pulse opacity-50 animation-delay-2000"></div>
          <div className="absolute top-60 right-1/3 w-20 h-14 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl transform -rotate-12 animate-pulse opacity-30 animation-delay-3000"></div>
        </div>

        <div className="relative container mx-auto px-6 py-20 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center px-4 py-1 bg-purple-100/70 text-purple-700 rounded-full text-sm font-medium backdrop-blur-sm">
              Powered by Whisper AI
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Turn YouTube Into<br />
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Readable Knowledge
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Process YouTube videos to get AI-powered transcripts, summaries, and never miss key insights.
          </p>

          {/* Video Processing Search Component */}
          <div className="mb-8">
            <VideoProcessSearch onVideoProcessed={handleVideoProcessed} />
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <Link to="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105">
                View Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="border-purple-200 text-purple-700 hover:bg-purple-50 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-200 hover:scale-105">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-12">
            {mockData.howItWorks.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <step.icon className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Your Personal YouTube Dashboard</h2>
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="flex h-96">
                {/* Left Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 p-6">
                  <nav className="space-y-3">
                    {mockData.sidebarItems.map((item, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
                          index === 0 ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                    ))}
                  </nav>
                </div>

                {/* Main Feed */}
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="space-y-4">
                    {mockData.videoCards.map((video, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-4 p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                        onMouseEnter={() => setHoveredCard(index)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold">
                          {video.channel[0]}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{video.title}</h4>
                          <p className="text-sm text-gray-500 mb-2">{video.channel} • {video.duration}</p>
                          <div className="space-y-1">
                            {video.summary.map((point, i) => (
                              <div key={i} className="flex items-start space-x-2">
                                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2"></div>
                                <p className="text-sm text-gray-700">{point}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center space-x-2 mt-3">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">{video.timestamp}</span>
                            {hoveredCard === index && (
                              <div className="flex space-x-2 animate-in slide-in-from-left duration-200">
                                <Button size="sm" variant="outline" className="text-xs">Summary</Button>
                                <Button size="sm" variant="outline" className="text-xs">Transcript</Button>
                                <Button size="sm" variant="outline" className="text-xs">Q&A</Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-64 bg-gray-50 border-l border-gray-200 p-6">
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Trending Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {mockData.trendingTags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-white text-gray-700 text-xs rounded-full border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors cursor-pointer"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Top Quotes</h4>
                    <div className="space-y-3">
                      {mockData.topQuotes.map((quote, index) => (
                        <blockquote key={index} className="text-sm text-gray-600 italic border-l-3 border-purple-300 pl-3">
                          "{quote}"
                        </blockquote>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Powerful Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {mockData.features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 shadow-lg">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-8 h-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">What People Say</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {mockData.testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardContent className="p-8">
                  <blockquote className="text-lg text-gray-700 mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-bold">
                      {testimonial.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-sm"></div>
                  </div>
                </div>
                <h3 className="text-xl font-bold">Whisper</h3>
              </div>
              <p className="text-gray-400 leading-relaxed max-w-md">
                Made with ❤️ for people who read faster than they watch.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-purple-600 transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Whisper. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={(open) => {
          setShowAuthModal(open);
          if (!open) {
            setShowLoginPrompt(false);
          }
        }}
      />
    </div>
  );
};

export default LandingPage;