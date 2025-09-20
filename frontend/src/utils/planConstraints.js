// Plan-based access control configuration
export const PLAN_CONSTRAINTS = {
  free: {
    dashboard: {
      home: true,
      my_channels: false,
      topics: false,
      saved: false,
      queues: false,
      youtube: false
    },
    analysis: {
      ai_analysis: {
        executive_summary: true,
        summary_to_speech: false,
        detailed_analysis: true,
        key_insights: false,
        people_companies_mentioned: false,
        topic_analysis: false,
        tone_analysis: false
      },
      transcript: true,
      time_range: false,
      q_and_a: false,
      translation: false
    },
    features: {
      video_processing: true,
      basic_analysis: true,
      transcript_access: true,
      channel_following: false,
      youtube_search: false,
      time_range_summary: false,
      qa_features: false,
      translation: false,
      tts: false
    }
  },
  basic: {
    dashboard: {
      home: true,
      my_channels: true,
      topics: false,
      saved: false,
      queues: false,
      youtube: false
    },
    analysis: {
      ai_analysis: {
        executive_summary: true,
        summary_to_speech: true,
        detailed_analysis: true,
        key_insights: true,
        people_companies_mentioned: true,
        topic_analysis: true,
        tone_analysis: false
      },
      transcript: true,
      time_range: true,
      q_and_a: true,
      translation: false
    },
    features: {
      video_processing: true,
      basic_analysis: true,
      transcript_access: true,
      channel_following: true,
      youtube_search: false,
      time_range_summary: true,
      qa_features: true,
      translation: false,
      tts: true
    }
  },
  premium: {
    dashboard: {
      home: true,
      my_channels: true,
      topics: true,
      saved: true,
      queues: true,
      youtube: true
    },
    analysis: {
      ai_analysis: {
        executive_summary: true,
        summary_to_speech: true,
        detailed_analysis: true,
        key_insights: true,
        people_companies_mentioned: true,
        topic_analysis: true,
        tone_analysis: true
      },
      transcript: true,
      time_range: true,
      q_and_a: true,
      translation: true
    },
    features: {
      video_processing: true,
      basic_analysis: true,
      transcript_access: true,
      channel_following: true,
      youtube_search: true,
      time_range_summary: true,
      qa_features: true,
      translation: true,
      tts: true
    }
  }
};

// Helper function to get plan constraints
export const getPlanConstraints = (planType) => {
  return PLAN_CONSTRAINTS[planType] || PLAN_CONSTRAINTS.free;
};

// Helper function to check if a feature is available
export const hasFeatureAccess = (planType, featurePath) => {
  const constraints = getPlanConstraints(planType);
  const pathParts = featurePath.split('.');
  let current = constraints;
  
  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }
  
  return Boolean(current);
};

// Helper function to get upgrade message for locked features
export const getUpgradeMessage = (currentPlan, requiredPlan) => {
  const planNames = {
    free: 'Free',
    basic: 'Basic',
    premium: 'Premium'
  };
  
  return `This feature is available in ${planNames[requiredPlan]} plan and above. Upgrade to unlock this feature.`;
};

// Helper function to determine required plan for a feature
export const getRequiredPlan = (featurePath) => {
  // Check each plan level to find the minimum required plan
  for (const [planType, constraints] of Object.entries(PLAN_CONSTRAINTS)) {
    if (hasFeatureAccess(planType, featurePath)) {
      return planType;
    }
  }
  return 'premium'; // fallback
};
