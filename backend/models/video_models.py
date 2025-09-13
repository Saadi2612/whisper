from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import uuid

class VideoProcessRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL")
    language: Optional[str] = Field(default="en", description="Preferred language for transcript")

class VideoMetric(BaseModel):
    label: str
    value: str
    context: str

class ChartPoint(BaseModel):
    label: str
    score: int

class TimelinePoint(BaseModel):
    step: str
    open: int
    closed: int

class EntityData(BaseModel):
    people: List[str] = []
    companies: List[str] = []
    products: List[str] = []
    locations: List[str] = []

class StockData(BaseModel):
    symbol: str
    price: str
    change: str
    resistance: Optional[str] = None
    support: Optional[str] = None

class MetricData(BaseModel):
    name: str
    value: str
    change: Optional[str] = None

class ProductData(BaseModel):
    name: str
    price: Optional[str] = None
    specs: Dict[str, str] = {}

class DynamicSection(BaseModel):
    type: str  # stock_analysis, product_review, concept_explanation, etc.
    title: str
    content: str
    data: Dict[str, Any] = {}

class EnhancedVideoAnalysis(BaseModel):
    content_type: str
    executive_summary: str
    dynamic_sections: List[DynamicSection] = []
    key_insights: List[str]
    actionable_items: List[str]
    entities: EntityData
    topics: List[str]
    key_quotes: List[str]
    estimated_read_time: str
    confidence_score: float = 0.85

# Update existing VideoAnalysis to use enhanced version
class ToneAnalysis(BaseModel):
    overall_tone: str
    delivery_style: str
    audience_engagement: str
    examples: List[str] = []

class VideoAnalysis(BaseModel):
    executive_summary: str
    key_insights: List[str]
    topics: List[str]
    metrics: List[VideoMetric] = []
    key_quotes: List[str]
    actionable_takeaways: List[str] = []  # Make this optional with default
    content_type: str
    estimated_read_time: str
    # Enhanced fields
    dynamic_sections: List[DynamicSection] = []
    entities: Union[EntityData, Dict[str, Any], List[Any]] = EntityData()
    confidence_score: float = 0.85
    tone_analysis: Optional[ToneAnalysis] = None
    
    @field_validator('entities')
    @classmethod
    def validate_entities(cls, v):
        """Convert various entity formats to EntityData"""
        if isinstance(v, EntityData):
            return v
        
        # Handle list format - convert to EntityData
        if isinstance(v, list):
            entities_data = EntityData()
            for entity in v:
                if isinstance(entity, dict):
                    name = entity.get('name', '')
                    entity_type = entity.get('role', entity.get('type', 'people')).lower()
                    
                    # Map entity types to EntityData fields
                    if 'company' in entity_type or 'corporation' in entity_type or 'business' in entity_type:
                        if name and name not in entities_data.companies:
                            entities_data.companies.append(name)
                    elif 'product' in entity_type or 'device' in entity_type or 'tool' in entity_type:
                        if name and name not in entities_data.products:
                            entities_data.products.append(name)
                    elif 'location' in entity_type or 'place' in entity_type or 'country' in entity_type or 'city' in entity_type:
                        if name and name not in entities_data.locations:
                            entities_data.locations.append(name)
                    else:  # Default to people
                        if name and name not in entities_data.people:
                            entities_data.people.append(name)
                elif isinstance(entity, str):
                    # Simple string entity - default to people
                    if entity not in entities_data.people:
                        entities_data.people.append(entity)
            return entities_data
        
        # Handle dict format - convert to EntityData
        if isinstance(v, dict):
            if hasattr(v, 'people'):  # Already an EntityData object
                return v
            else:
                return EntityData(
                    people=v.get('people', []),
                    companies=v.get('companies', []),
                    products=v.get('products', []),
                    locations=v.get('locations', [])
                )
        
        # Fallback to empty EntityData
        return EntityData()

class StockChartData(BaseModel):
    symbol: str
    price: float
    change: float
    resistance: Optional[float] = None
    support: Optional[float] = None

class CustomChart(BaseModel):
    type: str  # stock_prices, support_resistance, price_comparison, etc.
    title: str
    data: List[Dict[str, Any]]
    chartType: str  # bar, line, area

class ChartData(BaseModel):
    keyPoints: List[ChartPoint] = []
    timeline: List[TimelinePoint] = []
    charts: List[CustomChart] = []
    topicStrengths: List[ChartPoint] = []
    contentType: str = "general"

class ProcessedVideo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    video_id: Optional[str] = None
    title: str
    channel_name: str
    channel_avatar: Optional[str] = None
    thumbnail: Optional[str] = None
    published_at: str
    duration: Optional[str] = None
    transcript: str  # Formatted transcript for display
    raw_transcript: Optional[str] = None  # Raw transcript with timestamps
    analysis: VideoAnalysis
    chart_data: ChartData
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="completed")
    language: str = Field(default="en")
    original_language: str = Field(default="en")

class VideoListResponse(BaseModel):
    videos: List[ProcessedVideo]
    total: int
    page: int
    limit: int

class VideoProcessResponse(BaseModel):
    status: str
    video: Optional[ProcessedVideo] = None
    error: Optional[str] = None
    job_id: Optional[str] = None

class ChannelFollowRequest(BaseModel):
    channel_url: str = Field(..., description="YouTube channel URL or name")
    
class FollowedChannel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    channel_name: str
    channel_url: str
    channel_id: Optional[str] = None
    avatar_url: Optional[str] = None
    subscriber_count: Optional[str] = None
    followed_at: datetime = Field(default_factory=datetime.utcnow)
    last_checked: Optional[datetime] = None
    video_count: int = Field(default=0)

class SearchQuery(BaseModel):
    q: str = Field(..., description="Search query")
    limit: Optional[int] = Field(default=20)
    page: Optional[int] = Field(default=1)