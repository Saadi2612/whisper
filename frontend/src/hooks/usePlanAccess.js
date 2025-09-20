import { useAuth } from '../contexts/AuthContext';
import { getPlanConstraints, hasFeatureAccess, getUpgradeMessage, getRequiredPlan } from '../utils/planConstraints';

export const usePlanAccess = () => {
  const { user } = useAuth();
  
  // Get current plan type from user subscription
  const currentPlan = user?.subscription?.plan?.type || 'free';
  const constraints = getPlanConstraints(currentPlan);
  
  // Check if user has access to a specific feature
  const canAccess = (featurePath) => {
    return hasFeatureAccess(currentPlan, featurePath);
  };
  
  // Get upgrade message for a feature
  const getUpgradePrompt = (featurePath) => {
    const requiredPlan = getRequiredPlan(featurePath);
    return getUpgradeMessage(currentPlan, requiredPlan);
  };
  
  // Check if user can access dashboard tab
  const canAccessDashboardTab = (tabName) => {
    return canAccess(`dashboard.${tabName}`);
  };
  
  // Check if user can access analysis feature
  const canAccessAnalysisFeature = (featureName) => {
    return canAccess(`analysis.ai_analysis.${featureName}`);
  };
  
  // Check if user can access video features
  const canAccessVideoFeature = (featureName) => {
    return canAccess(`analysis.${featureName}`);
  };
  
  // Check if user can access general features
  const canAccessFeature = (featureName) => {
    return canAccess(`features.${featureName}`);
  };
  
  // Get plan info
  const getPlanInfo = () => ({
    currentPlan,
    constraints,
    isFree: currentPlan === 'free',
    isBasic: currentPlan === 'basic',
    isPremium: currentPlan === 'premium'
  });
  
  return {
    canAccess,
    canAccessDashboardTab,
    canAccessAnalysisFeature,
    canAccessVideoFeature,
    canAccessFeature,
    getUpgradePrompt,
    getPlanInfo
  };
};
