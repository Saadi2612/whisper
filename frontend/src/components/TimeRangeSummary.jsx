import React, { useState } from 'react';
import { Clock, TrendingUp, Target, Quote, Lightbulb, BarChart3, FileText, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

const TimeRangeSummary = ({ summary, onClose }) => {
  const [showFormatted, setShowFormatted] = useState(false);
  
  if (!summary) return null;

  const {
    time_range,
    main_topic,
    content_summary,
    key_points = [],
    concepts_discussed = [],
    data_points = [],
    actionable_items = [],
    key_quotes = [],
    segment_context,
    difficulty_level,
    estimated_value,
    segment_count,
    formatted_content
  } = summary;

  const getDifficultyColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">Time Range Analysis</CardTitle>
            <Badge className="bg-purple-100 text-purple-700">
              {time_range}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {formatted_content && (
              <button
                onClick={() => setShowFormatted(!showFormatted)}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                title={showFormatted ? "Show structured view" : "Show formatted text"}
              >
                {showFormatted ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showFormatted ? "Structured" : "Text"}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </div>
        {main_topic && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-sm">
              📍 {main_topic}
            </Badge>
            {difficulty_level && (
              <Badge className={getDifficultyColor(difficulty_level)}>
                {difficulty_level}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {segment_count} segments
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Show formatted content if toggle is enabled */}
        {showFormatted && formatted_content ? (
          <div className="bg-white rounded-lg p-6 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-purple-600" />
              <h3 className="font-semibold text-gray-800">Formatted Summary</h3>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap font-mono text-sm text-gray-700 bg-gray-50 rounded p-4 border">
                {formatted_content}
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* Main Content Summary */}
        {content_summary && (
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-purple-600" />
              <h3 className="font-semibold text-gray-800">Summary</h3>
            </div>
            <div className="text-gray-700 leading-relaxed space-y-2">
              {content_summary.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph.trim()}</p>
              ))}
            </div>
          </div>
        )}

        {/* Key Points */}
        {key_points.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Key Points</h3>
            </div>
            <ul className="space-y-2">
              {key_points.map((point, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-sm">{index + 1}</span>
                  </div>
                  <span className="text-gray-700 text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concepts Discussed */}
        {concepts_discussed.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold text-gray-800">Concepts & Definitions</h3>
            </div>
            <div className="space-y-3">
              {concepts_discussed.map((concept, index) => (
                <div key={index} className="border-l-4 border-l-green-400 pl-3 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-green-800 text-sm">
                      {concept.concept}
                    </span>
                    {concept.timestamp && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        {concept.timestamp}
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm">{concept.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Points */}
        {data_points.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-yellow-100">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-yellow-600" />
              <h3 className="font-semibold text-gray-800">Data Points</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data_points.map((dataPoint, index) => (
                <div key={index} className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                      {dataPoint.type}
                    </Badge>
                    <span className="font-bold text-yellow-800">
                      {dataPoint.value}
                    </span>
                  </div>
                  <p className="text-yellow-700 text-sm">{dataPoint.context}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Quotes */}
        {key_quotes.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-pink-100">
            <div className="flex items-center gap-2 mb-3">
              <Quote className="h-4 w-4 text-pink-600" />
              <h3 className="font-semibold text-gray-800">Key Quotes</h3>
            </div>
            <div className="space-y-3">
              {key_quotes.map((quote, index) => (
                <blockquote key={index} className="border-l-4 border-l-pink-400 pl-4 py-2 bg-pink-50 rounded-r-lg">
                  <p className="text-gray-800 italic text-sm leading-relaxed">
                    "{quote}"
                  </p>
                </blockquote>
              ))}
            </div>
          </div>
        )}

        {/* Actionable Items */}
        {actionable_items.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold text-gray-800">Action Items</h3>
            </div>
            <div className="space-y-2">
              {actionable_items.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-2 bg-emerald-50 rounded-lg">
                  <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald-600 font-bold text-xs">✓</span>
                  </div>
                  <span className="text-gray-700 text-sm leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Context & Value */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {segment_context && (
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <h4 className="font-semibold text-gray-800 text-sm mb-2">📌 Context</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{segment_context}</p>
            </div>
          )}
          
          {estimated_value && (
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <h4 className="font-semibold text-gray-800 text-sm mb-2">💡 Why This Matters</h4>
              <p className="text-gray-600 text-sm leading-relaxed">{estimated_value}</p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 border border-purple-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-purple-700">{segment_count}</div>
              <div className="text-xs text-purple-600">Segments</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-700">{key_points.length}</div>
              <div className="text-xs text-purple-600">Key Points</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-700">{concepts_discussed.length}</div>
              <div className="text-xs text-purple-600">Concepts</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-700">{actionable_items.length}</div>
              <div className="text-xs text-purple-600">Actions</div>
            </div>
          </div>
        </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeRangeSummary;
