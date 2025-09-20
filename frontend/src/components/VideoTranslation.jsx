import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Languages, 
  Globe, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';

const VideoTranslation = ({ video, onVideoUpdate, onTimelineUpdate }) => {
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationType, setTranslationType] = useState('full'); // 'full', 'analysis', 'transcript'
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');

  useEffect(() => {
    loadSupportedLanguages();
  }, []);

  const loadSupportedLanguages = async () => {
    setIsLoadingLanguages(true);
    try {
      const response = await apiService.getSupportedLanguages();
      console.log('Languages API response:', response);
      if (response.status === 'success') {
        const languages = response.languages || [];
        console.log('Loaded languages count:', languages.length);
        console.log('First 10 languages:', languages.slice(0, 10));
        
        // Check for duplicate language codes
        const codes = languages.map(lang => lang.code);
        const uniqueCodes = new Set(codes);
        if (codes.length !== uniqueCodes.size) {
          console.warn('Duplicate language codes detected:', codes.filter((code, index) => codes.indexOf(code) !== index));
        }
        
        setSupportedLanguages(languages);
      } else {
        console.error('API returned error status:', response);
        toast.error('Failed to load supported languages');
      }
    } catch (error) {
      // console.error('Error loading supported languages:', error);
      toast.error('Failed to load supported languages');
    } finally {
      setIsLoadingLanguages(false);
    }
  };

  const handleTranslation = async () => {
    if (!selectedLanguage) {
      toast.error('Please select a language');
      return;
    }

    if (selectedLanguage === video.language) {
      toast.info('Video is already in the selected language');
      return;
    }

    setIsTranslating(true);
    try {
      let result;
      
      switch (translationType) {
        case 'full':
          result = await apiService.translateVideo(video.id, selectedLanguage);
          break;
        case 'analysis':
          result = await apiService.translateVideoAnalysis(video.id, selectedLanguage);
          break;
        case 'transcript':
          result = await apiService.translateVideoTranscript(video.id, selectedLanguage);
          break;
        default:
          throw new Error('Invalid translation type');
      }

      // console.log('Translation result:', result);
      
      if (result.status === 'success') {
        toast.success(`Video successfully translated to ${selectedLanguage}!`);
        if (onVideoUpdate && result.video) {
          onVideoUpdate(result.video);
        }
        // Refresh timeline after successful translation
        if (onTimelineUpdate) {
          onTimelineUpdate();
        }
        setSelectedLanguage('');
      } else {
        // console.error('Translation failed:', result);
        toast.error(result.error || 'Translation failed');
      }
    } catch (error) {
      // console.error('Translation error:', error);
      toast.error('Failed to translate video');
    } finally {
      setIsTranslating(false);
    }
  };

  const getCurrentLanguageName = () => {
    const currentLang = supportedLanguages.find(lang => lang.code === video.language);
    return currentLang ? currentLang.name : video.language;
  };

  const translationTypes = [
    { value: 'full', label: 'Full Video', description: 'Translate title, transcript, and analysis' },
    { value: 'analysis', label: 'Analysis Only', description: 'Translate only the AI analysis' },
    { value: 'transcript', label: 'Transcript Only', description: 'Translate only the transcript' }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Languages className="h-5 w-5 text-blue-500" />
          <span>Video Translation</span>
        </CardTitle>
        <CardDescription>
          Translate this video to a different language. Choose what parts to translate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Language */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Current Language:</span>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <CheckCircle className="h-3 w-3" />
              <span>{getCurrentLanguageName()}</span>
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Translation Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Translation Type</label>
          <div className="grid grid-cols-1 gap-2">
            {translationTypes.map((type) => (
              <div
                key={type.value}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  translationType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setTranslationType(type.value)}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    checked={translationType === type.value}
                    onChange={() => setTranslationType(type.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div>
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Language Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Target Language</label>
          
          {/* Language Search Input */}
          {/*<div className="relative">
            <input
              type="text"
              placeholder="Search languages..."
              value={languageSearch}
              onChange={(e) => setLanguageSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>*/}
          
          <Select
            value={selectedLanguage}
            onValueChange={setSelectedLanguage}
            disabled={isLoadingLanguages || isTranslating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select target language" />
            </SelectTrigger>
            <SelectContent className="max-h-80 overflow-y-auto">
              {isLoadingLanguages ? (
                <SelectItem value="loading" disabled>
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading languages...</span>
                  </div>
                </SelectItem>
              ) : (
                supportedLanguages.map((language, index) => (
                    <SelectItem key={`${language.code}-${index}`} value={language.code}>
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
          
          {/* Language Count Display */}
          {!isLoadingLanguages && (
            <div className="text-xs text-gray-500">
              {supportedLanguages.filter(lang => {
                if (lang.code === video.language) return false;
                if (languageSearch) {
                  const searchTerm = languageSearch.toLowerCase();
                  return lang.name.toLowerCase().includes(searchTerm) || 
                         lang.code.toLowerCase().includes(searchTerm);
                }
                return true;
              }).length} languages available
            </div>
          )}
        </div>

        {/* Translation Button */}
        <Button
          onClick={handleTranslation}
          disabled={!selectedLanguage || isTranslating || isLoadingLanguages}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          {isTranslating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Translate {translationType === 'full' ? 'Video' : translationType === 'analysis' ? 'Analysis' : 'Transcript'}
            </>
          )}
        </Button>

        {/* Info Message */}
        <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Translation Info:</p>
            <ul className="mt-1 space-y-1 text-xs">
              <li>• Full translation creates a new video entry in the selected language</li>
              <li>• Analysis/transcript translation updates the current video</li>
              <li>• Translation may take a few moments to complete</li>
              <li>• Original video data is preserved</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoTranslation;
