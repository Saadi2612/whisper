import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  Plus,
  Search,
  Home,
  Tag,
  Bookmark,
  ListChecks,
  Settings,
  Sparkles,
  BarChart3,
  Loader2,
  AlertCircle,
  ExternalLink,
  Users,
  Menu,
  X,
  LogOut,
  UserCircle,
  BookOpen,
  Target,
  Clock,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import VideoProcessSearch from './VideoProcessSearch';
import TimeRangePicker from './TimeRangePicker';
import TimeRangeSummary from './TimeRangeSummary';
import { toast } from 'sonner';

// Utility to format topics as badges
const TopicBadges = ({ topics }) => (
  <div className="flex flex-wrap gap-2 mt-3">
    {topics?.map((t) => (
      <Badge key={t} variant="secondary" className="capitalize">{t.replace(/-/g, ' ')}</Badge>
    ))}
  </div>
);

// ----------------------------------------------------
// Video Card Component
// ----------------------------------------------------
function VideoCard({ video, onOpen }) {
  const formatTitle = (title) => {
    return title.length > 80 ? title.substring(0, 80) + '...' : title;
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group" onClick={() => onOpen(video)}>
      <div className="relative aspect-video w-full overflow-hidden">
        <img 
          src={video.thumbnail || 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1200&auto=format&fit=crop'} 
          alt={video.title} 
          className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1200&auto=format&fit=crop';
          }}
        />
        <Badge className="absolute top-2 left-2 bg-black/70 text-white backdrop-blur">{video.published_at}</Badge>
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-7 w-7">
            <AvatarImage src={video.channel_avatar} />
            <AvatarFallback>{video.channel_name?.[0] || 'C'}</AvatarFallback>
          </Avatar>
          <div className="text-sm text-muted-foreground">{video.channel_name}</div>
        </div>
        <CardTitle className="text-base leading-snug mt-1">{formatTitle(video.title)}</CardTitle>
        <CardDescription>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            {video.analysis?.key_insights?.slice(0, 3).map((insight, i) => (
              <li key={i} className="text-sm">{insight}</li>
            ))}
          </ul>
        </CardDescription>
        <TopicBadges topics={video.analysis?.topics || []} />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>AI summary • {video.analysis?.estimated_read_time || '3 min read'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------
// YouTube Video Card Component
// ----------------------------------------------------
function YouTubeVideoCard({ video, onProcess }) {
  const formatTitle = (title) => {
    return title.length > 80 ? title.substring(0, 80) + '...' : title;
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    const number = parseInt(num);
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all group h-full flex flex-col">
      <div className="relative aspect-video w-full overflow-hidden">
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=1200&auto=format&fit=crop';
          }}
        />
        <Badge className="absolute top-2 left-2 bg-black/70 text-white backdrop-blur">{video.published_at}</Badge>
        <Badge className="absolute top-2 right-2 bg-red-600 text-white">{video.duration}</Badge>
      </div>
      <CardHeader className="pb-2 flex-1 flex flex-col">
        <div className="flex items-center gap-3">
          <Avatar className="h-7 w-7">
            <AvatarFallback>{video.channel?.name?.[0] || 'C'}</AvatarFallback>
          </Avatar>
          <div className="text-sm text-muted-foreground">{video.channel?.name}</div>
        </div>
        <CardTitle className="text-base leading-snug mt-1">{formatTitle(video.title)}</CardTitle>
        {/* <CardDescription className="text-sm text-gray-600 line-clamp-2">
          {video.description}
        </CardDescription> */}
        
        {/* Tags */}
        {/* {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {video.tags.slice(0, 4).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs capitalize">
                {tag.replace(/-/g, ' ')}
              </Badge>
            ))}
            {video.tags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{video.tags.length - 4} more
              </Badge>
            )}
          </div>
        )} */}
      </CardHeader>
      <CardContent className="pt-0 mt-auto">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {formatNumber(video.view_count)} views
            </span>
            <span className="flex items-center gap-1">
              <span className="text-red-500">❤️</span>
              {formatNumber(video.like_count)}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-blue-500">💬</span>
              {formatNumber(video.comment_count)}
            </span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => onProcess(video)}
            className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Process with AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(video.url, '_blank')}
            className="border-gray-300"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------
// Video Q&A Component
// ----------------------------------------------------
function VideoQA({ video }) {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);

  // Load suggested questions on mount
  useEffect(() => {
    const loadSuggestedQuestions = async () => {
      try {
        const result = await apiService.getSuggestedQuestions(video.id);
        setSuggestedQuestions(result.questions || []);
      } catch (error) {
        console.error('Failed to load suggested questions:', error);
      }
    };

    if (video?.id) {
      loadSuggestedQuestions();
    }
  }, [video?.id]);

  const handleAskQuestion = async (questionText = question) => {
    if (!questionText.trim()) {
      toast.error('Please enter a question');
      return;
    }

    try {
      setIsAsking(true);
      
      const result = await apiService.askQuestionAboutVideo(video.id, questionText);
      
      setQaHistory(prev => [...prev, {
        question: questionText,
        answer: result.answer,
        confidence: result.confidence,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      setQuestion('');
      
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
        <h3 className="text-xl font-bold text-gray-900">Ask Questions</h3>
        <Badge variant="outline" className="text-xs">AI-Powered Q&A</Badge>
      </div>

      {/* Question Input */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input
              placeholder="Ask anything about this video... (e.g., What is RSI?)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAskQuestion();
                }
              }}
            />
            <Button
              onClick={() => handleAskQuestion()}
              disabled={isAsking || !question.trim()}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              {isAsking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">💡 Suggested Questions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestedQuestions.map((suggestedQ, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleAskQuestion(suggestedQ)}
                className="text-left h-auto py-3 px-4 border-blue-200 text-blue-700 hover:bg-blue-50 justify-start"
                disabled={isAsking}
              >
                <span className="text-sm">{suggestedQ}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Q&A History */}
      {qaHistory.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">💬 Your Questions & Answers</h4>
          <div className="space-y-4">
            {qaHistory.map((qa, index) => (
              <div key={index} className="space-y-3">
                {/* Question */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Search className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-blue-800">You asked:</p>
                        <p className="text-blue-700">{qa.question}</p>
                        <p className="text-xs text-blue-500 mt-1">{qa.timestamp}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Answer */}
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium text-green-800">AI Answer:</p>
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            {Math.round(qa.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <div className="prose prose-green max-w-none">
                          <p className="text-green-700 leading-6 whitespace-pre-wrap">{qa.answer}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function VideoDetail({ open, onOpenChange, video }) {
  const [timeline, setTimeline] = useState(null);
  const [timeRangeSummaries, setTimeRangeSummaries] = useState([]);
  const [isGeneratingTimeRange, setIsGeneratingTimeRange] = useState(false);
  const [showTimeRangePicker, setShowTimeRangePicker] = useState(false);

  console.log('video', video);

  // Load timeline when video is opened
  useEffect(() => {
    const loadTimeline = async () => {
      if (!video?.id) return;
      
      try {
        const result = await apiService.getVideoTimeline(video.id);
        if (result.status === 'success') {
          setTimeline(result);
        }
      } catch (error) {
        console.error('Failed to load timeline:', error);
      }
    };
    
    if (open && video?.id) {
      loadTimeline();
    }
  }, [open, video?.id]);

  const handleTimeRangeSelect = async (rangeData) => {
    if (!video?.id) return;
    
    try {
      setIsGeneratingTimeRange(true);
      
      const result = await apiService.getTimeRangeSummary(
        video.id, 
        rangeData.start_time, 
        rangeData.end_time
      );
      
      if (result.status === 'success') {
        // Use raw_summary for structured data if available, fallback to summary
        const summaryData = result.raw_summary || result.summary;
        const formattedContent = result.summary || result.formatted_summary;
        
        // Add both structured data and formatted content
        const enhancedSummary = {
          ...summaryData,
          formatted_content: formattedContent
        };
        
        setTimeRangeSummaries(prev => [enhancedSummary, ...prev]);
        toast.success(`Summary generated for ${rangeData.start_time} - ${rangeData.end_time}`);
      } else {
        toast.error(result.error || 'Failed to generate time range summary');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsGeneratingTimeRange(false);
    }
  };

  const handleRemoveTimeRangeSummary = (index) => {
    setTimeRangeSummaries(prev => prev.filter((_, i) => i !== index));
  };

  if (!video) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="px-6 pt-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={video.channel_avatar} />
                <AvatarFallback>{video.channel_name?.[0] || 'C'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <SheetTitle className="text-xl leading-tight">{video.title}</SheetTitle>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {video.channel_name} • {video.published_at}
                  <a 
                    href={video.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Watch
                  </a>
                </div>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="summary" className="mt-4 flex-1 flex flex-col">
            <div className="px-6">
              <TabsList>
                <TabsTrigger value="summary">AI Analysis</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
                <TabsTrigger value="timerange">Time Range</TabsTrigger>
                <TabsTrigger value="qa">Q&A</TabsTrigger>
              </TabsList>
            </div>

            <Separator className="my-4" />

            {/* AI Summary Tab */}
            <TabsContent value="summary" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[70vh] px-6 pr-8">
                <div className="space-y-8">
                  {/* Executive Summary */}
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
                      <h3 className="text-xl font-bold text-gray-900">Executive Summary</h3>
                      {video.analysis?.confidence_score && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(video.analysis.confidence_score * 100)}% confidence
                        </Badge>
                      )}
                    </div>
                    <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-xl p-6 border border-purple-100">
                      <p className="text-gray-800 leading-7 text-base">
                        {video.analysis?.executive_summary || 'No summary available.'}
                      </p>
                    </div>
                  </section>

                  {/* Dynamic Sections */}
                  {video.analysis?.dynamic_sections && video.analysis.dynamic_sections.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900">Detailed Analysis</h3>
                      </div>
                      <div className="space-y-6">
                        {video.analysis.dynamic_sections.map((section, index) => (
                          <Card key={index} className="border-l-4 border-l-purple-500">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg flex items-center gap-2">
                                {section.type === 'stock_analysis' && <BarChart3 className="h-5 w-5 text-green-600" />}
                                {section.type === 'product_review' && <Sparkles className="h-5 w-5 text-blue-600" />}
                                {section.type === 'concept_explanation' && <BookOpen className="h-5 w-5 text-purple-600" />}
                                {section.title}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-gray-700 leading-6 mb-4">{section.content}</p>
                              
                              {/* Stock Data Cards */}
                              {section.data?.stocks && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  {section.data.stocks.map((stock, stockIndex) => (
                                    <Card key={stockIndex} className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                                      <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <h4 className="font-bold text-lg">${stock.symbol}</h4>
                                          <Badge className={`${stock.change.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {stock.change}
                                          </Badge>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Current Price:</span>
                                            <span className="font-semibold">${stock.price}</span>
                                          </div>
                                          {stock.resistance && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Resistance:</span>
                                              <span className="font-semibold text-red-600">${stock.resistance}</span>
                                            </div>
                                          )}
                                          {stock.support && (
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Support:</span>
                                              <span className="font-semibold text-green-600">${stock.support}</span>
                                            </div>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              )}
                              
                              {/* Product Data Cards */}
                              {section.data?.products && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  {section.data.products.map((product, productIndex) => (
                                    <Card key={productIndex} className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                                      <CardContent className="p-4">
                                        <h4 className="font-bold text-lg mb-2">{product.name}</h4>
                                        {product.price && (
                                          <div className="flex justify-between mb-2">
                                            <span className="text-gray-600">Price:</span>
                                            <span className="font-semibold text-blue-600">{product.price}</span>
                                          </div>
                                        )}
                                        {product.specs && Object.keys(product.specs).length > 0 && (
                                          <div className="space-y-1">
                                            {Object.entries(product.specs).map(([key, value]) => (
                                              <div key={key} className="flex justify-between text-sm">
                                                <span className="text-gray-600 capitalize">{key}:</span>
                                                <span className="font-medium">{value}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              )}
                              
                              {/* Metrics Data */}
                              {section.data?.metrics && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                  {section.data.metrics.map((metric, metricIndex) => (
                                    <div key={metricIndex} className="bg-gray-50 rounded-lg p-3 text-center">
                                      <div className="text-sm text-gray-600">{metric.name}</div>
                                      <div className="text-lg font-bold text-gray-900">{metric.value}</div>
                                      {metric.change && (
                                        <div className={`text-sm ${metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                                          {metric.change}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Key Insights */}
                  {video.analysis?.key_insights && video.analysis.key_insights.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-8 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900">Key Insights</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {video.analysis.key_insights.map((insight, i) => (
                          <Card key={i} className="border-l-4 border-l-yellow-400 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                  <span className="text-yellow-600 font-bold text-sm">{i + 1}</span>
                                </div>
                                <p className="text-gray-700 leading-6">{insight}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Entities */}
                  {video.analysis?.entities && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900">People & Companies Mentioned</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {video.analysis.entities.companies?.length > 0 && (
                          <Card className="bg-blue-50 border-blue-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-blue-800">Companies</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-2">
                                {video.analysis.entities.companies.map((company, i) => (
                                  <Badge key={i} variant="secondary" className="bg-blue-100 text-blue-700">
                                    {company}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        {video.analysis.entities.people?.length > 0 && (
                          <Card className="bg-green-50 border-green-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-green-800">People</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-2">
                                {video.analysis.entities.people.map((person, i) => (
                                  <Badge key={i} variant="secondary" className="bg-green-100 text-green-700">
                                    {person}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        {video.analysis.entities.products?.length > 0 && (
                          <Card className="bg-purple-50 border-purple-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-purple-800">Products</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-2">
                                {video.analysis.entities.products.map((product, i) => (
                                  <Badge key={i} variant="secondary" className="bg-purple-100 text-purple-700">
                                    {product}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
                        {video.analysis.entities.locations?.length > 0 && (
                          <Card className="bg-orange-50 border-orange-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm text-orange-800">Locations</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex flex-wrap gap-2">
                                {video.analysis.entities.locations.map((location, i) => (
                                  <Badge key={i} variant="secondary" className="bg-orange-100 text-orange-700">
                                    {location}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Key Quotes */}
                  {video.analysis?.key_quotes && video.analysis.key_quotes.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-8 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900">Key Quotes</h3>
                      </div>
                      <div className="space-y-4">
                        {video.analysis.key_quotes.map((quote, i) => (
                          <blockquote key={i} className="relative bg-gradient-to-r from-pink-50 to-rose-50 border-l-4 border-l-pink-400 rounded-r-xl p-6">
                            <div className="absolute top-4 left-4 text-4xl text-pink-300 font-serif">"</div>
                            <p className="text-gray-800 italic text-lg leading-7 ml-8">
                              {quote}
                            </p>
                          </blockquote>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Tone Analysis */}
                  {video.analysis?.tone_analysis && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-8 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900">Tone & Delivery Analysis</h3>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Overall Tone Card */}
                        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                <span className="text-amber-600 text-sm">🎭</span>
                              </div>
                              Overall Tone
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-amber-800 font-medium text-base capitalize leading-6">
                              {video.analysis.tone_analysis.overall_tone}
                            </p>
                          </CardContent>
                        </Card>

                        {/* Delivery Style Card */}
                        <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200 hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-orange-600 text-sm">🎤</span>
                              </div>
                              Delivery Style
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-orange-800 font-medium text-base capitalize leading-6">
                              {video.analysis.tone_analysis.delivery_style}
                            </p>
                          </CardContent>
                        </Card>

                        {/* Audience Engagement Card */}
                        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 hover:shadow-md transition-shadow">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                <span className="text-yellow-600 text-sm">👥</span>
                              </div>
                              Audience Engagement
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-yellow-800 font-medium text-base capitalize leading-6">
                              {video.analysis.tone_analysis.audience_engagement}
                            </p>
                          </CardContent>
                        </Card>

                        {/* Examples Card */}
                        {video.analysis.tone_analysis.examples && video.analysis.tone_analysis.examples.length > 0 && (
                          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200 hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                  <span className="text-red-600 text-sm">💬</span>
                                </div>
                                Example Phrases
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-2">
                                {video.analysis.tone_analysis.examples.map((example, i) => (
                                  <div key={i} className="bg-white/60 rounded-lg p-3 border border-red-100">
                                    <p className="text-red-800 text-sm italic leading-5">
                                      "{example}"
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Actionable Items */}
                  {video.analysis?.actionable_items && video.analysis.actionable_items.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-green-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900">What You Can Do</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {video.analysis.actionable_items.map((item, i) => (
                          <Card key={i} className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Target className="h-4 w-4 text-emerald-600" />
                                </div>
                                <p className="text-gray-700 leading-6">{item}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Custom Charts */}
                  {video.chart_data?.charts && video.chart_data.charts.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900">Data Visualizations</h3>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {video.chart_data.charts.map((chart, chartIndex) => (
                          <Card key={chartIndex} className="border-cyan-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-cyan-600" />
                                {chart.title}
                              </CardTitle>
                              <CardDescription>Based on video content analysis</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  {chart.chartType === 'bar' ? (
                                    <BarChart data={chart.data}>
                                      <XAxis dataKey="symbol" />
                                      <YAxis />
                                      <Tooltip />
                                      <Bar dataKey="price" fill="#0891b2" radius={[4,4,0,0]} />
                                    </BarChart>
                                  ) : chart.chartType === 'line' ? (
                                    <LineChart data={chart.data}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="symbol" />
                                      <YAxis />
                                      <Tooltip />
                                      <Line type="monotone" dataKey="support" stroke="#10b981" strokeWidth={2} name="Support" />
                                      <Line type="monotone" dataKey="current" stroke="#3b82f6" strokeWidth={3} name="Current" />
                                      <Line type="monotone" dataKey="resistance" stroke="#ef4444" strokeWidth={2} name="Resistance" />
                                    </LineChart>
                                  ) : (
                                    <BarChart data={chart.data}>
                                      <XAxis dataKey="name" />
                                      <YAxis />
                                      <Tooltip />
                                      <Bar dataKey="value" fill="#8b5cf6" radius={[4,4,0,0]} />
                                    </BarChart>
                                  )}
                                </ResponsiveContainer>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Topic Analysis */}
                  {video.chart_data?.topicStrengths && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-8 bg-gradient-to-b from-violet-500 to-purple-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900">Topic Analysis</h3>
                      </div>
                      <Card className="border-violet-200">
                        <CardContent className="p-6">
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={video.chart_data.topicStrengths}>
                                <XAxis dataKey="label" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="score" fill="#8b5cf6" radius={[6,6,0,0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </section>
                  )}

                  {/* Tone Analysis */}
                  {video.analysis?.tone_analysis && (
                    <section>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-8 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                        <h3 className="text-xl font-bold text-gray-900">Tone Analysis</h3>
                      </div>
                      <Card className="border-orange-200">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  Overall Tone
                                </h4>
                                <p className="text-gray-600 text-sm bg-orange-50 p-3 rounded-lg">
                                  {video.analysis.tone_analysis.overall_tone}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  Delivery Style
                                </h4>
                                <p className="text-gray-600 text-sm bg-orange-50 p-3 rounded-lg">
                                  {video.analysis.tone_analysis.delivery_style}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                Audience Engagement
                              </h4>
                              <p className="text-gray-600 text-sm bg-orange-50 p-3 rounded-lg">
                                {video.analysis.tone_analysis.audience_engagement}
                              </p>
                            </div>
                            {video.analysis.tone_analysis.examples && video.analysis.tone_analysis.examples.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                  Tone Examples
                                </h4>
                                <div className="space-y-2">
                                  {video.analysis.tone_analysis.examples.map((example, index) => (
                                    <div key={index} className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-400">
                                      <p className="text-gray-700 text-sm italic">"{example}"</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </section>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Transcript Tab */}
            <TabsContent value="transcript" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[70vh] px-6 pr-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-8 bg-gradient-to-b from-gray-500 to-gray-600 rounded-full"></div>
                      <h3 className="text-xl font-bold text-gray-900">Full Transcript</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {video.language || 'en'} • AI Transcribed
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {video.analysis?.estimated_read_time || '5 min read'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
                    <CardContent className="p-6">
                      {video.transcript ? (
                        <div className="space-y-3">
                          {video.transcript.split(/\n\n+/).map((paragraph, index) => {
                            if (!paragraph.trim()) return null;
                            
                            return (
                              <div key={index} className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                                <div className="text-gray-700 leading-relaxed text-xs space-y-2 font-mono">
                                  {paragraph.split('\n').map((line, lineIndex) => {
                                    if (!line.trim()) return null;
                                    
                                    // Check for timestamp pattern
                                    const timestampMatch = line.match(/^\[?([\d:]+)\]?\s*(.*)/);
                                    
                                    if (timestampMatch && timestampMatch[1].includes(':')) {
                                      const [, timestamp, content] = timestampMatch;
                                      return (
                                        <div key={lineIndex} className="flex items-start gap-2 mb-1">
                                          <Badge className="bg-purple-100 text-purple-700 text-xs font-mono shrink-0 mt-0.5">
                                            {timestamp}
                                          </Badge>
                                          <span className="text-gray-700 text-xs leading-relaxed">
                                            {content.trim()}
                                          </span>
                                        </div>
                                      );
                                    }
                                    
                                    // Regular line - display as paragraph text
                                    return (
                                      <p key={lineIndex} className="text-gray-700 text-xs leading-relaxed mb-1">
                                        {line.trim()}
                                      </p>
                                    );
                                  }).filter(Boolean)}
                                </div>
                              </div>
                            );
                          }).filter(Boolean)}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500">Transcript not available for this video.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Transcript Actions */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(video.transcript || '');
                        toast.success('Transcript copied to clipboard!');
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      📋 Copy Transcript
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const element = document.createElement('a');
                        const file = new Blob([video.transcript || ''], {type: 'text/plain'});
                        element.href = URL.createObjectURL(file);
                        element.download = `transcript-${video.title?.substring(0, 30) || 'video'}.txt`;
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                        toast.success('Transcript downloaded!');
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      📥 Download
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Time Range Tab */}
            <TabsContent value="timerange" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[70vh] px-6 pr-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
                      <h3 className="text-xl font-bold text-gray-900">Time Range Analysis</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {timeline?.total_segments || 0} segments
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {timeline?.total_duration_formatted || '0:00'} total
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-center py-4">
                    <p className="text-gray-600 mb-4">
                      Select a time range to generate a focused AI summary of that specific part of the video.
                    </p>
                    
                    {!showTimeRangePicker ? (
                      <Button
                        onClick={() => setShowTimeRangePicker(true)}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Select Time Range
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setShowTimeRangePicker(false)}
                        className="border-purple-200 text-purple-700"
                      >
                        Hide Time Picker
                      </Button>
                    )}
                  </div>
                  
                  {/* Time Range Picker */}
                  {showTimeRangePicker && timeline && (
                    <TimeRangePicker
                      timeline={timeline}
                      onRangeSelect={handleTimeRangeSelect}
                      isGenerating={isGeneratingTimeRange}
                    />
                  )}
                  
                  {/* Time Range Summaries */}
                  {timeRangeSummaries.length > 0 && (
                    <div className="space-y-4">
                      <Separator />
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          Generated Summaries ({timeRangeSummaries.length})
                        </h4>
                      </div>
                      
                      {timeRangeSummaries.map((summary, index) => (
                        <TimeRangeSummary
                          key={index}
                          summary={summary}
                          onClose={() => handleRemoveTimeRangeSummary(index)}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Getting Started Info */}
                  {!timeline && (
                    <Card className="text-center py-12">
                      <CardContent>
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                            <Clock className="h-8 w-8 text-purple-500" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              Loading Timeline...
                            </h3>
                            <p className="text-gray-600">
                              Analyzing video transcript to create timestamp segments
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Q&A Tab */}
            <TabsContent value="qa" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[70vh] px-6 pr-8">
                <VideoQA video={video} />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ----------------------------------------------------
// Mobile Navigation Component
// ----------------------------------------------------
function MobileNavigation({ 
  isOpen, 
  onClose, 
  currentView, 
  onViewChange, 
  followedChannels, 
  stats, 
  user,
  isAuthenticated,
  onShowAuth,
  onLogout
}) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <div className="w-4 h-4 bg-white rounded-md flex items-center justify-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-sm"></div>
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
                <SheetTitle className="text-lg">Whisper</SheetTitle>
              </div>
              
              {/* User info or login button */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{user?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">{user?.name}</span>
                </div>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => { onShowAuth(); onClose(); }}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                >
                  Sign In
                </Button>
              )}
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {/* Navigation */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Navigation</h3>
                <nav className="space-y-1">
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start ${currentView === 'home' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => { onViewChange('home'); onClose(); }}
                  >
                    <Home className="h-4 w-4 mr-3" />Home
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start ${currentView === 'channels' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => { onViewChange('channels'); onClose(); }}
                  >
                    <Users className="h-4 w-4 mr-3" />My Channels
                    {followedChannels.length > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {followedChannels.length}
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start ${currentView === 'topics' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => { onViewChange('topics'); onClose(); }}
                  >
                    <Tag className="h-4 w-4 mr-3" />Topics
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start ${currentView === 'saved' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => { onViewChange('saved'); onClose(); }}
                  >
                    <Bookmark className="h-4 w-4 mr-3" />Saved
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start ${currentView === 'queues' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => { onViewChange('queues'); onClose(); }}
                  >
                    <ListChecks className="h-4 w-4 mr-3" />Queues
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start ${currentView === 'youtube' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                    onClick={() => { onViewChange('youtube'); onClose(); }}
                  >
                    <ExternalLink className="h-4 w-4 mr-3" />YouTube
                  </Button>
                </nav>
              </div>

              <Separator />

              {/* Stats - show for all users (demo mode for non-authenticated) */}
              {stats && (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Your Stats</h3>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Videos processed</span>
                          <span className="font-semibold">{stats.videos_processed}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Hours saved</span>
                          <span className="font-semibold">{stats.hours_saved}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Channels followed</span>
                          <span className="font-semibold">{followedChannels.length}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />
                </>
              )}

              {/* Quick Tips */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Tips</h3>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <span>AI-powered insights</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-purple-500" />
                        <span>Auto-generated charts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-purple-500" />
                        <span>Smart search & filtering</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        <span>Add channels in "My Channels"</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Authentication Section */}
              <div>
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <Button variant="ghost" className="w-full justify-start text-gray-600 hover:bg-gray-50">
                      <Settings className="h-4 w-4 mr-3" />Settings
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-red-600 hover:bg-red-50"
                      onClick={() => { onLogout(); onClose(); }}
                    >
                      <LogOut className="h-4 w-4 mr-3" />Logout
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                    onClick={() => { onShowAuth(); onClose(); }}
                  >
                    <UserCircle className="h-4 w-4 mr-2" />
                    Sign In / Sign Up
                  </Button>
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
function MyChannelsView({ followedChannels, onUnfollow, onAddChannel }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Channels</h2>
          <p className="text-gray-600">Manage your followed YouTube creators</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {followedChannels.length} channels
          </Badge>
          <Button
            onClick={onAddChannel}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        </div>
      </div>
      
      {followedChannels.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center">
                <Users className="h-10 w-10 text-purple-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No channels followed yet</h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Start following your favorite YouTube creators to get their latest videos automatically processed with AI summaries.
                </p>
                <Button
                  onClick={onAddChannel}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Channel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {followedChannels.map((channel) => (
            <Card key={channel.id} className="hover:shadow-lg transition-shadow group">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={channel.avatar_url} alt={channel.channel_name} />
                    <AvatarFallback className="text-lg">{channel.channel_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate text-lg">{channel.channel_name}</h3>
                    <p className="text-sm text-gray-500">{channel.subscriber_count}</p>
                    <p className="text-xs text-gray-400">
                      Followed {new Date(channel.followed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {channel.video_count || 0} videos processed
                    </Badge>
                    <a 
                      href={channel.channel_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUnfollow(channel)}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    Unfollow Channel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// YouTube Videos View Component
// ----------------------------------------------------
function YouTubeView({ 
  youtubeVideos, 
  youtubeSearchQuery, 
  setYoutubeSearchQuery, 
  isLoadingYoutube, 
  setIsLoadingYoutube,
  setYoutubeVideos,
  youtubeSearchInfo,
  setYoutubeSearchInfo,
  isLoadingMoreYoutube,
  setIsLoadingMoreYoutube,
  onProcessVideo 
}) {
  const handleSearch = async (query, isLoadMore = false) => {
    if (!query.trim()) return;
    
    try {
      if (isLoadMore) {
        setIsLoadingMoreYoutube(true);
      } else {
        setIsLoadingYoutube(true);
      }
      
      const nextPageToken = isLoadMore ? youtubeSearchInfo?.next_page_token : null;
      const result = await apiService.getYouTubeVideos(query, 1, 15, nextPageToken);
      
      if (isLoadMore) {
        // Append new videos to existing list
        setYoutubeVideos(prev => [...prev, ...(result.videos || [])]);
      } else {
        // Replace videos list for new search
        setYoutubeVideos(result.videos || []);
      }
      
      // Update search info with pagination data
      setYoutubeSearchInfo(result.search_info || null);
    } catch (error) {
      toast.error('Failed to search YouTube videos');
      console.error('YouTube search error:', error);
    } finally {
      if (isLoadMore) {
        setIsLoadingMoreYoutube(false);
      } else {
        setIsLoadingYoutube(false);
      }
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (youtubeSearchQuery.trim()) {
        handleSearch(youtubeSearchQuery, false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [youtubeSearchQuery]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (
      window.innerHeight + document.documentElement.scrollTop >= 
      document.documentElement.offsetHeight - 1000 && // Load more when 1000px from bottom
      !isLoadingMoreYoutube && 
      !isLoadingYoutube && 
      youtubeSearchInfo?.next_page_token &&
      youtubeSearchQuery.trim()
    ) {
      handleSearch(youtubeSearchQuery, true);
    }
  }, [isLoadingMoreYoutube, isLoadingYoutube, youtubeSearchInfo, youtubeSearchQuery]);

  // Add scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Discover YouTube Videos</h2>
          <p className="text-gray-600">Search and process YouTube videos with AI analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <div className="text-sm text-gray-500">Live search</div>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                placeholder="Search YouTube videos (e.g., 'python tutorial', 'cooking recipes')"
                value={youtubeSearchQuery}
                onChange={(e) => setYoutubeSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              {isLoadingYoutube && (
                <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-purple-500" />
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Search for any topic to discover relevant YouTube videos and process them with AI
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {youtubeVideos.length === 0 && !isLoadingYoutube ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Search className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {youtubeSearchQuery ? 'No videos found' : 'Search YouTube Videos'}
                </h3>
                <p className="text-gray-600">
                  {youtubeSearchQuery 
                    ? 'Try a different search term'
                    : 'Enter a search term above to discover YouTube videos'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search Info */}
          {youtubeSearchInfo && (
            <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-4">
                <span>
                  {youtubeSearchInfo.total_results?.toLocaleString()} videos found
                </span>
                <span>
                  Showing {youtubeVideos.length} videos
                </span>
              </div>
              {youtubeSearchInfo.next_page_token && (
                <div className="flex items-center gap-2 text-purple-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>Scroll down for more</span>
                </div>
              )}
            </div>
          )}

          {/* Videos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {youtubeVideos.map((video) => (
              <motion.div
                key={video.video_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <YouTubeVideoCard 
                  video={video} 
                  onProcess={onProcessVideo}
                />
              </motion.div>
            ))}
          </div>

          {/* Loading More Indicator */}
          {isLoadingMoreYoutube && (
            <div className="flex justify-center py-8">
              <Card className="px-6 py-4">
                <CardContent className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                  <span className="text-gray-600">Loading more videos...</span>
                </CardContent>
              </Card>
            </div>
          )}

          {/* End of Results */}
          {youtubeSearchInfo && !youtubeSearchInfo.next_page_token && youtubeVideos.length > 0 && (
            <div className="text-center py-8">
              <div className="text-sm text-gray-500">
                🎉 You've reached the end! No more videos to load.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Add Channel Modal Component
// ----------------------------------------------------
function AddChannelModal({ open, onOpenChange, onChannelAdded }) {
  const [channelUrl, setChannelUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddChannel = async () => {
    if (!channelUrl.trim()) {
      toast.error('Please enter a channel URL');
      return;
    }

    try {
      setIsAdding(true);
      const result = await apiService.followChannel(channelUrl);
      
      if (result.status === 'success' || result.status === 'already_following') {
        toast.success(`Successfully ${result.status === 'already_following' ? 'already following' : 'added'} channel!`);
        
        if (onChannelAdded) {
          onChannelAdded(result.channel);
        }
        
        setChannelUrl('');
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add YouTube Channel
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Channel URL
            </label>
            <Input
              type="url"
              placeholder="https://youtube.com/@channelname"
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddChannel();
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-2">
              Supported formats:
              <br />• https://youtube.com/@channelname
              <br />• https://youtube.com/channel/UCxxxxx
              <br />• https://youtube.com/c/channelname
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleAddChannel}
              disabled={isAdding || !channelUrl.trim()}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Channel
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
          </div>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-purple-800 mb-1">
                    Auto-Processing
                  </h4>
                  <p className="text-xs text-purple-600">
                    When you add a channel, we'll automatically fetch and process their recent videos with AI summaries and transcripts.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VideoProcessForm({ onVideoProcessed }) {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsProcessing(true);
    try {
      const result = await apiService.processVideo(url);
      
      if (result.status === 'success') {
        toast.success('Video processed successfully!');
        onVideoProcessed(result.video);
        setUrl('');
      } else {
        toast.error(result.error || 'Failed to process video');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Process New Video
        </CardTitle>
        <CardDescription>
          Paste a YouTube URL to get AI-powered transcript and summary
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
            disabled={isProcessing}
          />
          <Button 
            type="submit" 
            disabled={isProcessing || !url.trim()}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Process Video'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------
// Main Dashboard Component
// ----------------------------------------------------
export default function Dashboard() {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState('');
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(false);
  const [youtubeSearchInfo, setYoutubeSearchInfo] = useState(null);
  const [isLoadingMoreYoutube, setIsLoadingMoreYoutube] = useState(false);
  const [followedChannels, setFollowedChannels] = useState([]);
  const [stats, setStats] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // home, channels, topics, saved, queues, youtube

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [processingState, setProcessingState] = useState(null);
  const processedVideoRef = useRef(null);

  // Wait for auth to load before showing dashboard
  useEffect(() => {
    if (!authLoading) {
      loadInitialData();
    }
  }, [authLoading]);

  // Check for processing state from navigation and start processing
  useEffect(() => {
    if (location.state?.processingVideo && !processingState && processedVideoRef.current !== location.state.processingVideo) {
      console.log('🏠 Dashboard: Processing video from navigation state:', location.state.processingVideo);
      processedVideoRef.current = location.state.processingVideo;
      setProcessingState({
        url: location.state.processingVideo,
        title: location.state.videoTitle || 'Processing video...',
        stage: 'starting'
      });
      
      // Start actual video processing
      const processVideo = async () => {
        try {
          console.log('🎥 Dashboard: Calling API for processing video');
          const result = await apiService.processVideo(location.state.processingVideo);
          
          if (result.status === 'success') {
            handleVideoProcessed(result.video);
            processedVideoRef.current = null; // Clear ref after successful processing
          } else {
            toast.error(result.error || 'Failed to process video');
            setProcessingState(null);
            processedVideoRef.current = null; // Clear ref on error
          }
        } catch (error) {
          toast.error(error.message);
          setProcessingState(null);
          processedVideoRef.current = null; // Clear ref on error
        }
      };
      
      processVideo();
      
      // Simulate processing stages with cool messages
      const stages = [
        { stage: 'fetching', message: '🎥 Fetching video metadata...', duration: 2000 },
        { stage: 'transcribing', message: '🎤 Extracting audio transcript...', duration: 4000 },
        { stage: 'analyzing', message: '🧠 Generating AI insights...', duration: 3000 },
        { stage: 'finalizing', message: '✨ Creating visual summaries...', duration: 2000 }
      ];
      
      let currentStageIndex = 0;
      
      const updateStage = () => {
        if (currentStageIndex < stages.length && processingState) {
          const currentStage = stages[currentStageIndex];
          setProcessingState(prev => prev ? ({
            ...prev,
            stage: currentStage.stage,
            message: currentStage.message
          }) : null);
          
          setTimeout(() => {
            currentStageIndex++;
            updateStage();
          }, currentStage.duration);
        }
      };
      
      setTimeout(updateStage, 1000);
      
      // Clear navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load videos, stats, and followed channels in parallel
      const [videosResult, statsResult, channelsResult] = await Promise.all([
        apiService.getVideos(1, 20),
        apiService.getUserStats(),
        apiService.getFollowedChannels()
      ]);
      
      setVideos(videosResult.videos || []);
      setStats(statsResult);
      setFollowedChannels(channelsResult.channels || []);
      
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle video processing completion
  const handleVideoProcessed = (newVideo) => {
    setVideos(prev => [newVideo, ...prev]);
    if (stats) {
      setStats(prev => ({
        ...prev,
        videos_processed: (parseInt(prev.videos_processed) + 1).toString(),
        hours_saved: `${Math.ceil(parseInt(prev.hours_saved.replace('h', '')) + 0.75)}h`
      }));
    }
    
    // Clear processing state and show completion
    setProcessingState(null);
    toast.success('🎉 Video analysis complete! Check it out below.');
  };

  // Refresh videos from followed channels
  const refreshChannelVideos = async () => {
    try {
      setIsRefreshing(true);
      const result = await apiService.refreshChannelVideos();
      
      if (result.status === 'success') {
        toast.success(`Processing videos from ${result.channels_processed} channels...`);
        
        // Reload videos after a delay to let processing complete
        setTimeout(() => {
          loadInitialData();
        }, 5000);
      }
    } catch (error) {
      toast.error('Failed to refresh channel videos');
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle search
  const handleSearch = async (query) => {
    if (!query.trim()) {
      loadInitialData();
      return;
    }

    try {
      setIsSearching(true);
      const result = await apiService.searchVideos(query);
      setVideos(result.videos || []);
    } catch (error) {
      toast.error('Search failed');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle channel added
  const handleChannelAdded = (newChannel) => {
    setFollowedChannels(prev => [newChannel, ...prev]);
    // Optionally refresh videos after adding channel
    setTimeout(() => {
      refreshChannelVideos();
    }, 1000);
  };

  // Handle unfollow channel
  const handleUnfollowChannel = async (channel) => {
    try {
      // Note: We would need an unfollow API endpoint for this
      // For now, just remove from local state
      setFollowedChannels(prev => prev.filter(c => c.id !== channel.id));
      toast.success(`Unfollowed ${channel.channel_name}`);
    } catch (error) {
      toast.error('Failed to unfollow channel');
      console.error('Unfollow error:', error);
    }
  };

  // Handle YouTube video processing
  const handleProcessYouTubeVideo = async (youtubeVideo) => {
    try {
      setCurrentView('home');
      toast.info('Processing YouTube video...');
      const result = await apiService.processVideo(youtubeVideo.url);
      
      if (result.status === 'success') {
        handleVideoProcessed(result.video);
        toast.success('YouTube video processed successfully!');
        // Navigate to home view to show the processed video
      } else {
        toast.error(result.error || 'Failed to process YouTube video');
      }
    } catch (error) {
      toast.error(error.message);
      console.error('YouTube video processing error:', error);
    }
  };

  const openDetail = (video) => {
    setActive(video);
    setOpen(true);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
              <div className="w-4 h-4 bg-purple-500 rounded-sm animate-pulse"></div>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Whisper...</h3>
          <p className="text-gray-600">Setting up your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowMobileMenu(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-4 h-4 bg-white rounded-md flex items-center justify-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-sm"></div>
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <div className="font-semibold text-lg">Whisper</div>
          </div>
          
          <div className="flex-1" />
          
          {/* Search - full width on mobile */}
          <div className="w-full max-w-xl relative">
            <Input 
              placeholder="Search videos, channels, topics" 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            {isSearching && (
              <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-purple-500" />
            )}
          </div>
          
          {/* Desktop-only buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
            
            {isAuthenticated ? (
              <>
                {/* User Menu */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{user?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                <UserCircle className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Body grid: responsive layout */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left nav - desktop only */}
          <aside className="hidden lg:block lg:col-span-2">
            <nav className="space-y-1">
              <Button 
                variant="ghost" 
                className={`w-full justify-start ${currentView === 'home' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setCurrentView('home')}
              >
                <Home className="h-4 w-4 mr-2" />Home
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start ${currentView === 'channels' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setCurrentView('channels')}
              >
                <Users className="h-4 w-4 mr-2" />My Channels
                {followedChannels.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {followedChannels.length}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start ${currentView === 'topics' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setCurrentView('topics')}
              >
                <Tag className="h-4 w-4 mr-2" />Topics
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start ${currentView === 'saved' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setCurrentView('saved')}
              >
                <Bookmark className="h-4 w-4 mr-2" />Saved
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start ${currentView === 'queues' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setCurrentView('queues')}
              >
                <ListChecks className="h-4 w-4 mr-2" />Queues
              </Button>
              <Button 
                variant="ghost" 
                className={`w-full justify-start ${currentView === 'youtube' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setCurrentView('youtube')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />YouTube
              </Button>
              <Separator className="my-2" />
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-600 hover:bg-gray-50"
                onClick={() => navigate('/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />Settings
              </Button>
            </nav>
          </aside>

          {/* Center content - full width on mobile, reduced on desktop */}
          <section className="col-span-1 lg:col-span-8">
            {currentView === 'home' ? (
              <>
                {/* Processing State Card */}
                {processingState && (
                  <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                          <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-purple-800 mb-2">
                            Processing Your Video
                          </h3>
                          <div className="space-y-2">
                            <p className="text-purple-700 font-medium">
                              {processingState.message || '🎥 Analyzing your YouTube video...'}
                            </p>
                            <div className="w-full bg-purple-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-1000 ease-out"
                                style={{
                                  width: processingState.stage === 'starting' ? '10%' :
                                        processingState.stage === 'fetching' ? '25%' :
                                        processingState.stage === 'transcribing' ? '50%' :
                                        processingState.stage === 'analyzing' ? '75%' :
                                        processingState.stage === 'finalizing' ? '90%' :
                                        '100%'
                                }}
                              ></div>
                            </div>
                            <p className="text-sm text-purple-600">
                              Your video will appear below when processing is complete
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Video Processing Form - same as home page */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Process New Video
                    </CardTitle>
                    <CardDescription>
                      Paste a YouTube URL to get AI-powered transcript and comprehensive analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VideoProcessSearch 
                      onVideoProcessed={handleVideoProcessed} 
                      stayOnPage={true}
                    />
                  </CardContent>
                </Card>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {searchQuery ? `Search Results for "${searchQuery}"` : 'Latest from Your Creators'}
                  </h2>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {followedChannels.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshChannelVideos}
                        disabled={isRefreshing}
                        className="border-purple-200 text-purple-700 hover:bg-purple-50"
                      >
                        {isRefreshing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Refresh from Channels
                          </>
                        )}
                      </Button>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="text-sm text-gray-500">Live feed</div>
                    </div>
                  </div>
                </div>

                {videos.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                          <Search className="h-8 w-8 text-purple-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {searchQuery ? 'No videos found' : followedChannels.length === 0 ? 'No videos yet' : 'Videos are being processed...'}
                          </h3>
                          <p className="text-gray-600 text-center">
                            {searchQuery 
                              ? 'Try a different search term or process a new video'
                              : followedChannels.length === 0 
                              ? 'Follow some creators or process YouTube videos to get started!'
                              : 'We\'re processing videos from your followed channels. This may take a few minutes.'
                            }
                          </p>
                        </div>
                        {followedChannels.length === 0 && (
                          <Link to="/">
                            <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
                              <Users className="h-4 w-4 mr-2" />
                              Process Videos
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {videos.map((video) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <VideoCard video={video} onOpen={openDetail} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            ) : currentView === 'channels' ? (
              <MyChannelsView 
                followedChannels={followedChannels} 
                onUnfollow={handleUnfollowChannel}
                onAddChannel={() => setShowAddChannelModal(true)}
              />
            ) : currentView === 'youtube' ? (
              <YouTubeView
                youtubeVideos={youtubeVideos}
                youtubeSearchQuery={youtubeSearchQuery}
                setYoutubeSearchQuery={setYoutubeSearchQuery}
                isLoadingYoutube={isLoadingYoutube}
                setIsLoadingYoutube={setIsLoadingYoutube}
                setYoutubeVideos={setYoutubeVideos}
                youtubeSearchInfo={youtubeSearchInfo}
                setYoutubeSearchInfo={setYoutubeSearchInfo}
                isLoadingMoreYoutube={isLoadingMoreYoutube}
                setIsLoadingMoreYoutube={setIsLoadingMoreYoutube}
                onProcessVideo={handleProcessYouTubeVideo}
              />
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                      <Settings className="h-8 w-8 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
                      <p className="text-gray-600">
                        This section is under development
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Right sidebar - desktop only */}
          <aside className="hidden lg:block lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Quick Tips</CardTitle>
                <CardDescription>
                  Click any video card to explore detailed AI summaries with charts and full transcripts.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>AI-powered insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <span>Auto-generated charts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-purple-500" />
                  <span>Smart search & filtering</span>
                </div>
              </CardContent>
            </Card>

            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Videos processed</span>
                    <span className="font-semibold">{stats.videos_processed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Hours saved</span>
                    <span className="font-semibold">{stats.hours_saved}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Channels followed</span>
                    <span className="font-semibold">{followedChannels.length}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </main>

      {/* Detail Drawer */}
      <VideoDetail open={open} onOpenChange={setOpen} video={active} />
      
      {/* Add Channel Modal */}
      <AddChannelModal 
        open={showAddChannelModal} 
        onOpenChange={setShowAddChannelModal}
        onChannelAdded={handleChannelAdded}
      />

      {/* Mobile Navigation */}
      <MobileNavigation
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        currentView={currentView}
        onViewChange={setCurrentView}
        followedChannels={followedChannels}
        stats={stats}
        user={user}
        isAuthenticated={isAuthenticated}
        onShowAuth={() => setShowAuthModal(true)}
        onLogout={logout}
      />

      {/* Auth Modal */}
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
      />
    </div>
  );
}