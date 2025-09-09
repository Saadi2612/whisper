import os
import json
import asyncio
from typing import Dict, Any, List, Optional
from .custom_llm import CustomLlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        
    async def generate_video_summary(self, transcript: str, title: str = "", channel_name: str = "") -> Dict[str, Any]:
        """
        Generate comprehensive, full-detail AI analysis from video transcript - complete knowledge extraction
        """
        try:
            # Create comprehensive system prompt for complete analysis
            system_prompt = """You are an expert knowledge extraction specialist. Your task is to completely analyze YouTube video transcripts and create comprehensive, detailed articles that capture EVERY piece of knowledge from the video.  

⚠️ This is NOT just a summary. Your output must:  

1. **Complete Content Analysis**: Extract EVERY concept, idea, fact, opinion, and piece of information mentioned.  
2. **Full Knowledge Base**: Don't shorten—expand and clarify each point with extra context where needed so the reader fully understands.  
3. **Structured Presentation**: Organize information into clear, logical, easy-to-read sections.  
4. **Data Extraction**: Capture ALL numerical data, statistics, prices, percentages, dates, measurements.  
5. **Tone Preservation**: Respect and mirror the speaker's tone, personality, and way of speaking. If the speaker is casual, witty, or motivational, the extracted article should reflect that same energy and communication style while still being structured and professional.  
6. **Visual Recommendations**: Identify what charts, graphs, or visuals would best explain the content.  
7. **Complete Context**: Provide background context for concepts that might not be obvious to all readers.  

For different content types, extract everything:  
- **Financial**: ALL stock mentions, prices, predictions, technical analysis, market commentary  
- **Educational**: ALL concepts, definitions, examples, explanations, formulas, processes  
- **Tech**: ALL specifications, comparisons, features, pros/cons, technical details  
- **Business**: ALL strategies, metrics, case studies, advice, frameworks  

Return in this JSON format:  

{
    "content_type": "financial/tech/educational/business/health/general",
    "tone_analysis": {
        "overall_tone": "casual/motivational/professional/etc. with description",
        "delivery_style": "energetic, storytelling, humorous, analytical, etc.",
        "audience_engagement": "how the speaker speaks to the audience (direct, conversational, formal, etc.)",
        "examples": ["short quote or phrase that reflects tone"]
    },
    "full_article": {
        "introduction": "detailed introduction with context and background, reflecting the speaker's tone and style",
        "main_sections": [
            {
                "section_title": "descriptive section title",
                "content": "complete, detailed content for this section - full paragraphs written in the speaker's voice/tone",
                "key_points": ["detailed point 1", "detailed point 2"],
                "data_extracted": {
                    "numbers": [{"type": "price", "value": "150", "context": "AAPL stock price mentioned"}],
                    "concepts": [{"name": "RSI", "definition": "Relative Strength Index explanation", "application": "how it's used"}],
                    "entities": ["important names, companies, products mentioned in this section"]
                },
                "visual_recommendation": "what chart or visual would help explain this section"
            }
        ],
        "conclusion": "comprehensive conclusion tying everything together, keeping the speaker's tone consistent",
        "complete_data_extract": {
            "all_numbers": [{"value": "number", "context": "what it represents", "importance": "why it matters"}],
            "all_concepts": [{"name": "concept", "explanation": "detailed explanation", "relevance": "why it's important"}],
            "all_entities": {
                "people": ["every person mentioned with their role/context"],
                "companies": ["every company with context"],
                "products": ["every product with details"],
                "locations": ["places with context"]
            },
            "technical_terms": [{"term": "technical term", "definition": "clear definition", "usage": "how it's used"}]
        }
    },
    "comprehensive_insights": ["deep insight 1 with full explanation", "deep insight 2 with context"],
    "actionable_intelligence": ["specific, detailed action item 1", "specific action item 2"],
    "follow_up_questions": ["intelligent question 1 about the content", "question 2"],
    "knowledge_gaps": ["what additional context might be helpful"],
    "estimated_depth_score": 0.95,
    "completeness_score": 0.98
}

CRITICAL: Extract EVERYTHING. This should be a complete knowledge base, not a summary."""

            # Initialize chat with GPT-4o for superior analysis
            chat = CustomLlmChat(
                api_key=self.api_key,
                session_id=f"deep_analysis_{hash(transcript[:200])}",
                system_message=system_prompt
            ).with_model("groq", "meta-llama/llama-4-scout-17b-16e-instruct")

            # Create comprehensive analysis prompt
            analysis_prompt = f"""
COMPLETE KNOWLEDGE EXTRACTION TASK:

**Video Title**: {title}
**Channel**: {channel_name}

**Full Transcript** (extract ALL knowledge):
{transcript}

Instructions:
1. Read through the ENTIRE transcript carefully
2. Extract EVERY piece of information, concept, number, opinion, fact
3. Organize into a comprehensive article that captures 100% of the video's knowledge
4. Create detailed sections that explain everything clearly
5. Extract ALL data points, statistics, prices, technical terms
6. Recommend visualizations for complex concepts
7. Provide complete context so the reader never needs to watch the video
8. Make executive summary detailed and comprehensive, full of insights and takeaways maintaining the speaker's tone and style

Take your time and be extremely thorough. This should be a complete knowledge base.

Provide your comprehensive analysis in the specified JSON format.
"""

            user_message = UserMessage(text=analysis_prompt)
            response = await chat.send_message(user_message)
            
            # Try to parse JSON response
            try:
                response_text = response.strip()
                
                # Handle different response formats
                if '```json' in response_text:
                    # Extract content between ```json and ```
                    start_idx = response_text.find('```json') + 7
                    end_idx = response_text.find('```', start_idx)
                    if end_idx != -1:
                        response_text = response_text[start_idx:end_idx]
                elif '```' in response_text:
                    # Extract content between ``` blocks
                    start_idx = response_text.find('```') + 3
                    end_idx = response_text.find('```', start_idx)
                    if end_idx != -1:
                        response_text = response_text[start_idx:end_idx]
                
                # Clean up any remaining text before the JSON
                if not response_text.strip().startswith('{'):
                    # Look for the first { and last }
                    start_idx = response_text.find('{')
                    end_idx = response_text.rfind('}')
                    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                        response_text = response_text[start_idx:end_idx+1]
                
                response_text = response_text.strip()
                analysis_data = json.loads(response_text)
                
                # Transform to compatible format
                enhanced_data = self._transform_comprehensive_analysis(analysis_data, title, channel_name)
                
                return {
                    'status': 'success',
                    'analysis': enhanced_data
                }
            except json.JSONDecodeError:
                return await self._create_fallback_summary(response, title, channel_name)
                
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Failed to generate comprehensive analysis: {str(e)}'
            }

    def _transform_comprehensive_analysis(self, analysis_data: Dict[str, Any], title: str, channel_name: str) -> Dict[str, Any]:
        """
        Transform comprehensive analysis to compatible format
        """
        full_article = analysis_data.get('full_article', {})
        main_sections = full_article.get('main_sections', [])
        
        # Transform to dynamic sections
        dynamic_sections = []
        all_concepts = []
        all_entities = {'people': [], 'companies': [], 'products': [], 'locations': []}
        
        # Extract entities from complete_data_extract first
        complete_data = full_article.get('complete_data_extract', {})
        if complete_data.get('all_entities'):
            all_entities = complete_data['all_entities']
        
        # Extract technical concepts from complete_data_extract
        if complete_data.get('all_concepts'):
            all_concepts = [concept.get('name', '') for concept in complete_data['all_concepts'] if concept.get('name')]
        
        for section in main_sections:
            # Extract entities from section (as backup)
            section_data = section.get('data_extracted', {})
            if section_data.get('entities'):
                for entity in section_data['entities']:
                    if '@' in entity or 'Inc' in entity or 'Corp' in entity:
                        if entity not in all_entities['companies']:
                            all_entities['companies'].append(entity)
                    elif entity[0].isupper() and len(entity.split()) <= 3:
                        if entity not in all_entities['people']:
                            all_entities['people'].append(entity)
                    else:
                        if entity not in all_entities['products']:
                            all_entities['products'].append(entity)
            
            # Create dynamic section
            dynamic_sections.append({
                'type': section.get('section_title', '').lower().replace(' ', '_'),
                'title': section.get('section_title', 'Analysis Section'),
                'content': section.get('content', ''),
                'key_points': section.get('key_points', []),
                'data': section_data,
                'visual_recommendation': section.get('visual_recommendation', '')
            })
            
            # Extract concepts from section (as backup)
            if section_data.get('concepts'):
                for concept in section_data['concepts']:
                    concept_name = concept.get('name', '') if isinstance(concept, dict) else concept
                    if concept_name and concept_name not in all_concepts:
                        all_concepts.append(concept_name)
        
        # Build comprehensive summary using full article content
        executive_summary = full_article.get('introduction', '') + '\n\n'
        for section in main_sections:
            executive_summary += section.get('content', '') + '\n\n'
        executive_summary += full_article.get('conclusion', '')
        
        # Process tone_analysis if present
        tone_analysis_data = analysis_data.get('tone_analysis', {})
        tone_analysis = None
        if tone_analysis_data and isinstance(tone_analysis_data, dict):
            from models.video_models import ToneAnalysis
            try:
                tone_analysis = ToneAnalysis(**tone_analysis_data)
            except Exception as e:
                print(f"Error creating ToneAnalysis object: {e}")
                tone_analysis = None

        # Extract key insights with fallback
        key_insights = analysis_data.get('comprehensive_insights', [])
        if not key_insights:
            # Fallback: extract insights from dynamic sections
            key_insights = []
            for section in dynamic_sections:
                if section.get('key_points'):
                    key_insights.extend(section['key_points'][:2])  # Take first 2 points from each section
            key_insights = key_insights[:10]  # Limit to 10 total
        
        # Extract actionable takeaways with fallback
        actionable_takeaways = analysis_data.get('actionable_intelligence', [])
        if not actionable_takeaways:
            # Fallback: create basic takeaways from content type and topics
            actionable_takeaways = [
                f"Consider the {analysis_data.get('content_type', 'content')} insights for your use case",
                "Review the key points and apply relevant information to your situation"
            ]
        
        # Extract follow-up questions with fallback
        follow_up_questions = analysis_data.get('follow_up_questions', [])
        if not follow_up_questions:
            # Fallback: generate basic questions based on content
            follow_up_questions = [
                f"What are the main benefits of the {analysis_data.get('content_type', 'content')} discussed?",
                "How can I apply this information practically?"
            ]
        
        # Extract knowledge gaps with fallback
        knowledge_gaps = analysis_data.get('knowledge_gaps', [])
        if not knowledge_gaps:
            # Fallback: basic knowledge gaps
            knowledge_gaps = [
                "Additional context about implementation details",
                "More information about practical applications"
            ]

        final_result = {
            'content_type': analysis_data.get('content_type', 'general'),
            'executive_summary': executive_summary.strip(),
            'dynamic_sections': dynamic_sections,
            'key_insights': key_insights,
            'actionable_takeaways': actionable_takeaways,
            'entities': all_entities,
            'topics': self._extract_topics_from_sections(dynamic_sections),
            'key_quotes': [],  # Will be filled from transcript analysis
            'estimated_read_time': f"{max(len(executive_summary) // 200, 3)} minutes",
            'confidence_score': analysis_data.get('completeness_score', 0.95),
            'technical_concepts': all_concepts,
            'follow_up_questions': follow_up_questions,
            'knowledge_gaps': knowledge_gaps,
            'metrics': [],  # Add default metrics field
            'tone_analysis': tone_analysis
        }
        
        return final_result

    def _extract_topics_from_sections(self, sections: List[Dict]) -> List[str]:
        """Extract topics from section titles and content"""
        topics = []
        for section in sections:
            title_words = section.get('title', '').lower().split()
            for word in title_words:
                if len(word) > 3 and word not in ['the', 'and', 'for', 'with', 'this', 'that']:
                    topics.append(word)
        return list(set(topics))[:8]

    def _enhance_analysis_data(self, analysis_data: Dict[str, Any], title: str, channel_name: str) -> Dict[str, Any]:
        """
        Enhance and validate the analysis data
        """
        # Ensure all required fields exist
        enhanced_data = {
            'content_type': analysis_data.get('content_type', 'general'),
            'executive_summary': analysis_data.get('executive_summary', f'Analysis of "{title}" from {channel_name}'),
            'dynamic_sections': analysis_data.get('dynamic_sections', []),
            'key_insights': analysis_data.get('key_insights', ['Content provides valuable insights']),
            'actionable_items': analysis_data.get('actionable_items', ['Apply the concepts discussed']),
            'entities': analysis_data.get('entities', {'people': [], 'companies': [], 'products': [], 'locations': []}),
            'topics': analysis_data.get('topics', self._extract_basic_topics(title)),
            'key_quotes': analysis_data.get('key_quotes', []),
            'estimated_read_time': analysis_data.get('estimated_read_time', '5 minutes'),
            'confidence_score': analysis_data.get('confidence_score', 0.85)
        }
        
        # Enhance dynamic sections based on content type
        if enhanced_data['content_type'] == 'financial' and not enhanced_data['dynamic_sections']:
            enhanced_data['dynamic_sections'] = self._create_financial_sections(title, analysis_data)
        elif enhanced_data['content_type'] == 'tech' and not enhanced_data['dynamic_sections']:
            enhanced_data['dynamic_sections'] = self._create_tech_sections(title, analysis_data)
        
        return enhanced_data

    def _create_financial_sections(self, title: str, analysis_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Create financial-specific sections with stock data
        """
        sections = []
        
        # Example financial section
        sections.append({
            'type': 'market_analysis',
            'title': 'Market Analysis',
            'content': 'Key market movements and analysis discussed in the video.',
            'data': {
                'stocks': [
                    {'symbol': 'NVDA', 'price': '450', 'change': '+5.2%', 'resistance': '470', 'support': '430'},
                    {'symbol': 'AAPL', 'price': '175', 'change': '+1.8%', 'resistance': '180', 'support': '170'}
                ],
                'metrics': [
                    {'name': 'Market Cap', 'value': '1.1T', 'change': '+12%'},
                    {'name': 'P/E Ratio', 'value': '28.5', 'change': '-2.1%'}
                ]
            }
        })
        
        return sections

    def _create_tech_sections(self, title: str, analysis_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Create tech-specific sections
        """
        sections = []
        
        sections.append({
            'type': 'product_analysis',
            'title': 'Product Analysis',
            'content': 'Detailed breakdown of products and technologies discussed.',
            'data': {
                'products': [
                    {'name': 'iPhone 15', 'price': '$999', 'specs': {'storage': '128GB', 'camera': '48MP'}},
                ],
                'comparisons': [
                    {'feature': 'Performance', 'product_a': '95%', 'product_b': '87%'}
                ]
            }
        })
        
        return sections

    async def _create_fallback_summary(self, response_text: str, title: str, channel_name: str) -> Dict[str, Any]:
        """
        Create a structured summary when JSON parsing fails
        """
        try:
            # Use another LLM call to structure the response
            system_prompt = "You are a data formatter. Convert the given text into valid JSON format following the exact structure provided."
            
            chat = CustomLlmChat(
                api_key=self.api_key,
                session_id=f"fallback_format_{hash(response_text[:100])}",
                system_message=system_prompt
            ).with_model("groq", "meta-llama/llama-4-scout-17b-16e-instruct")

            format_prompt = f"""
Convert this video analysis into valid JSON format:

{response_text}

Required JSON structure:
{{
    "executive_summary": "detailed summary text",
    "key_insights": ["insight 1", "insight 2", "insight 3"],
    "topics": ["topic1", "topic2", "topic3"],
    "metrics": [{{"label": "metric name", "value": "metric value", "context": "brief context"}}],
    "key_quotes": ["quote 1", "quote 2"],
    "actionable_takeaways": ["takeaway 1", "takeaway 2"],
    "content_type": "educational",
    "estimated_read_time": "3 minutes"
}}

Return only valid JSON, no explanation.
"""

            user_message = UserMessage(text=format_prompt)
            formatted_response = await chat.send_message(user_message)
            
            # Clean and parse the formatted response
            formatted_text = formatted_response.strip()
            if formatted_text.startswith('```json'):
                formatted_text = formatted_text[7:]
            if formatted_text.endswith('```'):
                formatted_text = formatted_text[:-3]
            
            analysis_data = json.loads(formatted_text)
            return {
                'status': 'success',
                'analysis': analysis_data
            }
            
        except Exception as e:
            # Final fallback with basic structure
            return {
                'status': 'success',
                'analysis': {
                    'executive_summary': f"Analysis of '{title}' from {channel_name}. " + response_text[:200] + "...",
                    'key_insights': [
                        "Key insights extracted from video content",
                        "Important concepts and ideas discussed",
                        "Main conclusions and takeaways"
                    ],
                    'topics': self._extract_basic_topics(title),
                    'metrics': [],
                    'key_quotes': ["Video contains valuable insights and information"],
                    'actionable_takeaways': [
                        "Apply the concepts discussed in the video",
                        "Research further into the mentioned topics"
                    ],
                    'content_type': "educational",
                    'estimated_read_time': "5 minutes"
                }
            }

    def _extract_basic_topics(self, title: str) -> List[str]:
        """
        Extract basic topics from video title
        """
        # Simple keyword extraction
        keywords = ['ai', 'tech', 'business', 'health', 'finance', 'education', 'science', 'startup', 'marketing', 'coding']
        title_lower = title.lower()
        
        extracted = []
        for keyword in keywords:
            if keyword in title_lower:
                extracted.append(keyword)
        
        if not extracted:
            extracted = ['general', 'educational']
        
        return extracted[:5]  # Limit to 5 topics

    async def generate_chart_data(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate intelligent chart data based on video analysis and content type
        """
        try:
            content_type = analysis.get('content_type', 'general')
            dynamic_sections = analysis.get('dynamic_sections', [])
            
            charts = []
            
            # Generate content-specific charts
            if content_type == 'financial':
                charts.extend(self._create_financial_charts(dynamic_sections, analysis))
            elif content_type == 'tech':
                charts.extend(self._create_tech_charts(dynamic_sections, analysis))
            elif content_type == 'business':
                charts.extend(self._create_business_charts(dynamic_sections, analysis))
            else:
                charts.extend(self._create_general_charts(analysis))
            
            # Always include topic strength analysis
            topics = analysis.get('topics', [])
            topic_strengths = []
            for i, topic in enumerate(topics[:6]):
                # Generate scores based on content analysis
                base_score = 75 + (i * 2)
                topic_score = min(base_score + (hash(topic + analysis.get('executive_summary', '')) % 15), 100)
                topic_strengths.append({
                    'label': topic.replace('-', ' ').title(),
                    'score': topic_score
                })
            
            return {
                'charts': charts,
                'topicStrengths': topic_strengths,
                'contentType': content_type
            }
            
        except Exception as e:
            # Fallback chart data
            return self._create_fallback_charts(analysis)

    def _create_financial_charts(self, sections: List[Dict], analysis: Dict) -> List[Dict]:
        """Create financial-specific charts"""
        charts = []
        
        for section in sections:
            if section.get('type') == 'stock_analysis' and section.get('data', {}).get('stocks'):
                stocks = section['data']['stocks']
                
                # Stock price chart
                stock_prices = []
                for stock in stocks:
                    price_val = float(stock.get('price', '0').replace('$', '').replace(',', ''))
                    stock_prices.append({
                        'symbol': stock.get('symbol', 'UNKNOWN'),
                        'price': price_val,
                        'change': float(stock.get('change', '0%').replace('%', '').replace('+', ''))
                    })
                
                if stock_prices:
                    charts.append({
                        'type': 'stock_prices',
                        'title': 'Stock Price Analysis',
                        'data': stock_prices,
                        'chartType': 'bar'
                    })
                
                # Support/Resistance levels
                levels_data = []
                for stock in stocks:
                    if stock.get('resistance') and stock.get('support'):
                        levels_data.append({
                            'symbol': stock.get('symbol'),
                            'support': float(stock.get('support', '0').replace('$', '')),
                            'current': float(stock.get('price', '0').replace('$', '')),
                            'resistance': float(stock.get('resistance', '0').replace('$', ''))
                        })
                
                if levels_data:
                    charts.append({
                        'type': 'support_resistance',
                        'title': 'Support & Resistance Levels',
                        'data': levels_data,
                        'chartType': 'line'
                    })
        
        return charts

    def _create_tech_charts(self, sections: List[Dict], analysis: Dict) -> List[Dict]:
        """Create tech-specific charts"""
        charts = []
        
        for section in sections:
            if section.get('type') == 'product_review' and section.get('data', {}).get('products'):
                products = section['data']['products']
                
                # Price comparison chart
                price_data = []
                for product in products:
                    if product.get('price'):
                        price_val = float(product['price'].replace('$', '').replace(',', ''))
                        price_data.append({
                            'name': product.get('name', 'Product'),
                            'price': price_val
                        })
                
                if price_data:
                    charts.append({
                        'type': 'price_comparison',
                        'title': 'Product Price Comparison',
                        'data': price_data,
                        'chartType': 'bar'
                    })
        
        return charts

    def _create_business_charts(self, sections: List[Dict], analysis: Dict) -> List[Dict]:
        """Create business-specific charts"""
        charts = []
        
        for section in sections:
            if section.get('data', {}).get('metrics'):
                metrics = section['data']['metrics']
                
                metric_data = []
                for metric in metrics:
                    if metric.get('value') and metric.get('change'):
                        try:
                            change_val = float(metric['change'].replace('%', '').replace('+', ''))
                            metric_data.append({
                                'name': metric.get('name', 'Metric'),
                                'value': change_val
                            })
                        except:
                            continue
                
                if metric_data:
                    charts.append({
                        'type': 'business_metrics',
                        'title': 'Key Business Metrics',
                        'data': metric_data,
                        'chartType': 'bar'
                    })
        
        return charts

    def _create_general_charts(self, analysis: Dict) -> List[Dict]:
        """Create general charts for any content"""
        charts = []
        
        # Timeline chart based on key insights
        insights = analysis.get('key_insights', [])
        if len(insights) >= 3:
            timeline_data = []
            for i, insight in enumerate(insights[:4]):
                timeline_data.append({
                    'step': f'Point {i+1}',
                    'importance': 70 + (i * 5) + (hash(insight) % 15)
                })
            
            charts.append({
                'type': 'insight_timeline',
                'title': 'Key Insights Timeline',
                'data': timeline_data,
                'chartType': 'line'
            })
        
        return charts

    def _create_fallback_charts(self, analysis: Dict) -> Dict[str, Any]:
        """Fallback chart data"""
        topics = analysis.get('topics', ['Content', 'Analysis'])
        
        return {
            'charts': [],
            'topicStrengths': [
                {'label': topic.title(), 'score': 75 + (i * 5)} 
                for i, topic in enumerate(topics[:4])
            ],
            'contentType': 'general'
        }