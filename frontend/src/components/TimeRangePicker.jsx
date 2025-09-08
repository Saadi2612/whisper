import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';

const TimeRangePicker = ({ 
  timeline, 
  onRangeSelect, 
  isGenerating = false,
  selectedRange = null 
}) => {
  const [startTime, setStartTime] = useState('0:00');
  const [endTime, setEndTime] = useState('1:00');
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [sliderRange, setSliderRange] = useState([0, 60]); // in seconds

  useEffect(() => {
    if (timeline && timeline.timeline && timeline.timeline.length > 0) {
      const totalDuration = timeline.total_duration_seconds;
      setEndTime(formatTime(Math.min(totalDuration, 300))); // Default to 5 minutes or total duration
      setSliderRange([0, Math.min(totalDuration, 300)]);
    }
  }, [timeline]);

  useEffect(() => {
    if (selectedRange) {
      setStartTime(selectedRange.start_time);
      setEndTime(selectedRange.end_time);
      updateSliderFromTime(selectedRange.start_time, selectedRange.end_time);
    }
  }, [selectedRange]);

  const parseTime = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const updateSliderFromTime = (startTimeStr, endTimeStr) => {
    const startSeconds = parseTime(startTimeStr);
    const endSeconds = parseTime(endTimeStr);
    setSliderRange([startSeconds, endSeconds]);
  };

  const handleSliderChange = (range) => {
    setSliderRange(range);
    setStartTime(formatTime(range[0]));
    setEndTime(formatTime(range[1]));
    updateSelectedSegments(range[0], range[1]);
  };

  const handleTimeInputChange = (type, value) => {
    if (type === 'start') {
      setStartTime(value);
      const startSeconds = parseTime(value);
      const endSeconds = parseTime(endTime);
      if (startSeconds < endSeconds) {
        setSliderRange([startSeconds, endSeconds]);
        updateSelectedSegments(startSeconds, endSeconds);
      }
    } else {
      setEndTime(value);
      const startSeconds = parseTime(startTime);
      const endSeconds = parseTime(value);
      if (startSeconds < endSeconds) {
        setSliderRange([startSeconds, endSeconds]);
        updateSelectedSegments(startSeconds, endSeconds);
      }
    }
  };

  const updateSelectedSegments = (startSeconds, endSeconds) => {
    if (!timeline?.timeline) return;
    
    const segments = timeline.timeline.filter(segment => {
      const segmentStart = segment.start_time;
      const segmentEnd = segment.end_time;
      return segmentStart < endSeconds && segmentEnd > startSeconds;
    });
    setSelectedSegments(segments);
  };

  const handleGenerateSummary = () => {
    if (parseTime(startTime) >= parseTime(endTime)) {
      alert('Start time must be before end time');
      return;
    }
    
    onRangeSelect({
      start_time: startTime,
      end_time: endTime,
      segments: selectedSegments
    });
  };

  const handlePresetRange = (minutes) => {
    const endSeconds = Math.min(parseTime(startTime) + (minutes * 60), timeline?.total_duration_seconds || 3600);
    const newEndTime = formatTime(endSeconds);
    setEndTime(newEndTime);
    setSliderRange([parseTime(startTime), endSeconds]);
    updateSelectedSegments(parseTime(startTime), endSeconds);
  };

  const handleSegmentClick = (segment) => {
    setStartTime(formatTime(segment.start_time));
    setEndTime(formatTime(segment.end_time));
    setSliderRange([segment.start_time, segment.end_time]);
    setSelectedSegments([segment]);
  };

  const totalDuration = timeline?.total_duration_seconds || 3600;
  const selectedDuration = parseTime(endTime) - parseTime(startTime);

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg">Time Range Summary</CardTitle>
          <Badge variant="outline" className="text-xs">
            AI-Powered Analysis
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Time Range Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Select Time Range</label>
            <div className="text-xs text-gray-500">
              Duration: {formatTime(selectedDuration)} | {selectedSegments.length} segments
            </div>
          </div>
          
          <div className="px-2">
            <Slider
              value={sliderRange}
              onValueChange={handleSliderChange}
              min={0}
              max={totalDuration}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0:00</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>
        </div>

        {/* Manual Time Input */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Start Time</label>
            <Input
              type="text"
              placeholder="0:00"
              value={startTime}
              onChange={(e) => handleTimeInputChange('start', e.target.value)}
              className="text-center font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">End Time</label>
            <Input
              type="text"
              placeholder="1:00"
              value={endTime}
              onChange={(e) => handleTimeInputChange('end', e.target.value)}
              className="text-center font-mono"
            />
          </div>
        </div>

        {/* Preset Ranges */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Quick Ranges</label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetRange(1)}
              className="text-xs"
            >
              +1 min
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetRange(2)}
              className="text-xs"
            >
              +2 min
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetRange(5)}
              className="text-xs"
            >
              +5 min
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartTime('0:00');
                setEndTime(formatTime(Math.min(600, totalDuration)));
                setSliderRange([0, Math.min(600, totalDuration)]);
                updateSelectedSegments(0, Math.min(600, totalDuration));
              }}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Selected Segments Preview */}
        {selectedSegments.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Selected Segments ({selectedSegments.length})
            </label>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedSegments.slice(0, 3).map((segment, index) => (
                <div key={index} className="bg-white rounded-lg p-2 border border-gray-200 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-purple-100 text-purple-700 text-xs">
                      {segment.timestamp}
                    </Badge>
                  </div>
                  <div className="text-gray-600 text-xs leading-relaxed">
                    {segment.text_preview}
                  </div>
                </div>
              ))}
              {selectedSegments.length > 3 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  ... and {selectedSegments.length - 3} more segments
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Generate Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateSummary}
            disabled={isGenerating || parseTime(startTime) >= parseTime(endTime)}
            className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Summary
              </>
            )}
          </Button>
        </div>

        {/* Timeline Segments (Optional Quick Select) */}
        {timeline?.timeline && timeline.timeline.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Quick Segment Selection
            </label>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
              {timeline.timeline.slice(0, 10).map((segment, index) => (
                <button
                  key={index}
                  onClick={() => handleSegmentClick(segment)}
                  className="text-left p-2 bg-white rounded border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-gray-100 text-gray-700 text-xs">
                      {segment.timestamp}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      ({formatTime(segment.duration_seconds)})
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 leading-tight">
                    {segment.text_preview}
                  </div>
                </button>
              ))}
              {timeline.timeline.length > 10 && (
                <div className="text-xs text-gray-500 text-center py-2">
                  ... and {timeline.timeline.length - 10} more segments
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeRangePicker;
