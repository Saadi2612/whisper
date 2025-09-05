import { Play, FileText, BarChart3, Users, Clock, Target, BookOpen, Zap, Home, Bookmark, Hash, Archive, List } from 'lucide-react';

export const mockData = {
  howItWorks: [
    {
      icon: Play,
      title: "Paste or Follow Channels",
      description: "Simply paste a YouTube URL or follow your favorite creators to get started instantly."
    },
    {
      icon: Zap,
      title: "AI Transcribes & Summarizes", 
      description: "Our AI processes video content and creates intelligent summaries with key insights."
    },
    {
      icon: FileText,
      title: "Read Like an Article",
      description: "Access clean, readable content with timestamps, quotes, and organized insights."
    }
  ],

  features: [
    {
      icon: Target,
      title: "Smart Search",
      description: "Find videos, topics, or people instantly with our powerful search engine."
    },
    {
      icon: BookOpen,
      title: "AI Summaries",
      description: "Choose TL;DR, Reader, or Deep Dive mode based on your time and needs."
    },
    {
      icon: Clock,
      title: "Key Moments",
      description: "Jump straight to time-stamped insights without watching entire videos."
    },
    {
      icon: Users,
      title: "Daily Digest",
      description: "Get a personalized feed delivered by email or WhatsApp daily."
    }
  ],

  sidebarItems: [
    { icon: Home, name: "Home" },
    { icon: Users, name: "My Channels" },
    { icon: Hash, name: "Topics" },
    { icon: Bookmark, name: "Saved" },
    { icon: List, name: "Queues" }
  ],

  videoCards: [
    {
      channel: "TechCrunch",
      title: "The Future of AI in 2025: What Every Entrepreneur Needs to Know",
      duration: "12:34",
      timestamp: "2 hours ago",
      summary: [
        "AI market projected to reach $1.8 trillion by 2030",
        "OpenAI's GPT-5 changes everything for small businesses",
        "3 key strategies for AI implementation in startups"
      ]
    },
    {
      channel: "Y Combinator",
      title: "How to Build a $100M SaaS Company in 3 Years",
      duration: "18:42",
      timestamp: "5 hours ago", 
      summary: [
        "Focus on product-market fit before scaling",
        "Hire slowly, fire quickly in early stages",
        "Customer feedback loop is your growth engine"
      ]
    },
    {
      channel: "First Round",
      title: "The Psychology Behind Viral Content Creation",
      duration: "15:23",
      timestamp: "1 day ago",
      summary: [
        "Emotional triggers drive 80% of viral content",
        "Timing matters more than quality in social media",
        "Building authentic relationships beats algorithms"
      ]
    }
  ],

  trendingTags: [
    "AI", "Startup", "Marketing", "Growth", "Tech", "Business", "SaaS", "Productivity"
  ],

  topQuotes: [
    "The best time to start was yesterday, the second best is now.",
    "Focus on progress, not perfection in your startup journey.",
    "Customer problems are hidden goldmines waiting to be discovered."
  ],

  testimonials: [
    {
      name: "Sarah Chen",
      role: "Product Manager",
      quote: "I save hours each week by reading instead of watching. It's like having a personal assistant that watches videos for me."
    },
    {
      name: "Marcus Rodriguez", 
      role: "Startup Founder",
      quote: "It feels like YouTube but in book form. I can consume 10x more educational content in the same time."
    }
  ]
};