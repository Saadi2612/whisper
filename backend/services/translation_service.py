import os
import json
import asyncio
from typing import Dict, Any, List, Optional
from .custom_llm import CustomLlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

class TranslationService:
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        
    async def translate_video_content(self, video_data: Dict[str, Any], target_language: str) -> Dict[str, Any]:
        """
        Translate all text content in a processed video to the target language
        """
        try:
            print(f"🔄 Starting translation to {target_language}")
            print(f"📊 Video data keys: {list(video_data.keys())}")
            print(f"🎯 API Key present: {bool(self.api_key)}")
            # Create system prompt for translation
            system_prompt = f"""You are a professional translator specializing in video content translation. Your task is to translate video analysis content from English to {target_language} while maintaining:

1. **Professional tone and accuracy** - Keep the same level of formality and technical precision
2. **Context preservation** - Maintain the original meaning and context
3. **Cultural adaptation** - Adapt expressions to be natural in the target language
4. **Technical accuracy** - Preserve technical terms and proper names appropriately
5. **Structure consistency** - Keep the same JSON structure and formatting

IMPORTANT JSON FORMATTING RULES:
- Return ONLY valid JSON, no additional text or explanations
- Use double quotes for all strings
- Escape any special characters properly (\\n, \\t, \\", \\\\)
- Remove any control characters or non-printable characters
- Ensure all strings are properly escaped
- Do not include any markdown formatting or code blocks
- For Unicode characters, use proper UTF-8 encoding, NOT \\uXXXX escape sequences
- If you must use Unicode escapes, ensure they are valid \\uXXXX format (4 hex digits)

Translate the following video analysis content to {target_language}. Return only valid JSON in the exact same structure as the input."""

            # Initialize chat
            chat = CustomLlmChat(
                api_key=self.api_key,
                session_id=f"translation_{hash(str(video_data))}",
                system_message=system_prompt
            ).with_model("groq", "meta-llama/llama-4-scout-17b-16e-instruct")

            # Prepare content for translation
            content_to_translate = {
                "title": video_data.get('title', ''),
                "transcript": video_data.get('transcript', ''),
                "analysis": video_data.get('analysis', {}),
                "channel_name": video_data.get('channel_name', '')
            }
            
            print(f"📋 Content to translate keys: {list(content_to_translate.keys())}")
            print(f"📋 Analysis type: {type(content_to_translate['analysis'])}")
            if content_to_translate['analysis']:
                print(f"📋 Analysis keys: {list(content_to_translate['analysis'].keys())}")

            # Try to serialize the content, handle any serialization issues
            try:
                content_json = json.dumps(content_to_translate, ensure_ascii=False, indent=2)
            except (TypeError, ValueError) as e:
                print(f"❌ JSON serialization error: {str(e)}")
                # Fallback: convert to string representation
                content_json = str(content_to_translate)
            
            translation_prompt = f"""Translate this video content to {target_language}:

{content_json}

CRITICAL: Return ONLY valid JSON with the exact same structure. Follow these rules:
1. Use double quotes for all strings
2. Escape special characters: \\n for newlines, \\" for quotes, \\\\ for backslashes
3. Remove any control characters or non-printable characters
4. Do not add any text before or after the JSON
5. Ensure all string values are properly escaped
6. Maintain the exact same JSON structure as the input

Return the translated content as valid JSON:"""

            user_message = UserMessage(text=translation_prompt)
            print(f"📤 Sending translation request to LLM")
            response = await chat.send_message(user_message)
            print(f"📥 Received response from LLM: {len(response) if response else 0} characters")
            
            # Parse the response
            try:
                response_text = response.strip()
                print(f"📄 Raw LLM response: {response_text[:200]}...")
                
                # Clean up response if it has markdown formatting
                if '```json' in response_text:
                    start_idx = response_text.find('```json') + 7
                    end_idx = response_text.find('```', start_idx)
                    if end_idx != -1:
                        response_text = response_text[start_idx:end_idx]
                elif '```' in response_text:
                    start_idx = response_text.find('```') + 3
                    end_idx = response_text.find('```', start_idx)
                    if end_idx != -1:
                        response_text = response_text[start_idx:end_idx]
                
                # Extract JSON if it's wrapped in other text
                if not response_text.strip().startswith('{'):
                    start_idx = response_text.find('{')
                    end_idx = response_text.rfind('}')
                    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                        response_text = response_text[start_idx:end_idx+1]
                
                # Clean up control characters and non-printable characters
                import re
                # Remove control characters except \n, \r, \t
                response_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', response_text)
                
                # Fix invalid Unicode escape sequences
                # Replace invalid \uXXXX patterns with proper Unicode characters
                def fix_unicode_escapes(text):
                    # Find all \uXXXX patterns and convert them to proper Unicode
                    def replace_unicode(match):
                        unicode_str = match.group(0)
                        try:
                            # Try to decode the Unicode escape
                            return unicode_str.encode('utf-8').decode('unicode_escape')
                        except:
                            # If it fails, return the original string
                            return unicode_str
                    
                    # Replace \uXXXX patterns
                    text = re.sub(r'\\u[0-9a-fA-F]{4}', replace_unicode, text)
                    return text
                
                def fix_json_syntax(text):
                    """Fix common JSON syntax errors"""
                    # Fix missing commas between object properties
                    # Look for "value" "key" pattern and add comma
                    text = re.sub(r'("\s*)\n\s*(")', r'\1,\n\2', text)
                    
                    # Fix missing commas between array elements
                    text = re.sub(r'(\])\s*\n\s*(")', r'\1,\n\2', text)
                    
                    # Fix missing commas after closing braces
                    text = re.sub(r'(\})\s*\n\s*(")', r'\1,\n\2', text)
                    
                    # Fix missing commas after closing brackets
                    text = re.sub(r'(\])\s*\n\s*(")', r'\1,\n\2', text)
                    
                    # Fix missing commas between values
                    text = re.sub(r'("\s*)\n\s*(")', r'\1,\n\2', text)
                    
                    return text
                
                response_text = fix_unicode_escapes(response_text)
                response_text = fix_json_syntax(response_text)
                
                # Ensure proper JSON formatting
                response_text = response_text.strip()
                
                print(f"📄 Cleaned response: {response_text[:200]}...")
                
                translated_data = json.loads(response_text)
                
                return {
                    'status': 'success',
                    'translated_content': translated_data
                }
                
            except json.JSONDecodeError as e:
                print(f"❌ JSON parsing error: {str(e)}")
                print(f"📄 Error position: line {e.lineno}, column {e.colno}")
                print(f"📄 Raw response: {response_text[:500]}...")
                print(f"📄 Error context: {response_text[max(0, e.pos-50):e.pos+50]}")
                
                # Try to fix common JSON issues
                try:
                    # Replace common problematic characters
                    fixed_response = response_text
                    fixed_response = fixed_response.replace('\\n', '\\\\n')  # Fix escaped newlines
                    fixed_response = fixed_response.replace('\\t', '\\\\t')  # Fix escaped tabs
                    fixed_response = fixed_response.replace('\\"', '\\\\"')  # Fix escaped quotes
                    
                    # Fix Unicode escape sequences
                    fixed_response = fix_unicode_escapes(fixed_response)
                    
                    # Fix JSON syntax errors
                    fixed_response = fix_json_syntax(fixed_response)
                    
                    # Try parsing again
                    translated_data = json.loads(fixed_response)
                    print("✅ Successfully parsed after fixing common issues")
                    
                    return {
                        'status': 'success',
                        'translated_content': translated_data
                    }
                except json.JSONDecodeError as e2:
                    print(f"❌ Still failed after fixes: {str(e2)}")
                    
                    # Try more aggressive JSON fixing
                    try:
                        # More comprehensive JSON fixing
                        aggressive_fix = response_text
                        
                        # Fix missing commas more aggressively
                        aggressive_fix = re.sub(r'("\s*)\n\s*(")', r'\1,\n\2', aggressive_fix)
                        aggressive_fix = re.sub(r'(\d+)\s*\n\s*(")', r'\1,\n\2', aggressive_fix)
                        aggressive_fix = re.sub(r'(true|false|null)\s*\n\s*(")', r'\1,\n\2', aggressive_fix)
                        aggressive_fix = re.sub(r'(\})\s*\n\s*(")', r'\1,\n\2', aggressive_fix)
                        aggressive_fix = re.sub(r'(\])\s*\n\s*(")', r'\1,\n\2', aggressive_fix)
                        
                        # Remove all \uXXXX patterns and replace with a placeholder
                        aggressive_fix = re.sub(r'\\u[0-9a-fA-F]{4}', '[UNICODE]', aggressive_fix)
                        
                        translated_data = json.loads(aggressive_fix)
                        print("✅ Successfully parsed after aggressive JSON fixing")
                        
                        return {
                            'status': 'success',
                            'translated_content': translated_data
                        }
                    except json.JSONDecodeError as e3:
                        print(f"❌ Aggressive fix failed: {str(e3)}")
                        
                        # Final attempt: try to extract just the essential parts
                        try:
                            # Try to extract just title and transcript as a minimal JSON
                            title_match = re.search(r'"title":\s*"([^"]*)"', response_text)
                            transcript_match = re.search(r'"transcript":\s*"([^"]*)"', response_text)
                            
                            if title_match and transcript_match:
                                minimal_json = {
                                    "title": title_match.group(1),
                                    "transcript": transcript_match.group(1),
                                    "analysis": {},
                                    "channel_name": ""
                                }
                                print("✅ Successfully created minimal JSON from extracted parts")
                                
                                return {
                                    'status': 'success',
                                    'translated_content': minimal_json
                                }
                            else:
                                raise Exception("Could not extract essential parts")
                                
                        except Exception as e4:
                            print(f"❌ Final attempt failed: {str(e4)}")
                            return {
                                'status': 'error',
                                'error': f'Failed to parse translation response: {str(e)}. Raw response: {response_text[:200]}...'
                            }
                
        except Exception as e:
            print(f"❌ Translation error: {str(e)}")
            import traceback
            print(f"📊 Traceback: {traceback.format_exc()}")
            return {
                'status': 'error',
                'error': f'Translation failed: {str(e)}'
            }

    async def translate_analysis_only(self, analysis: Dict[str, Any], target_language: str) -> Dict[str, Any]:
        """
        Translate only the analysis portion of a video
        """
        try:
            system_prompt = f"""You are a professional translator. Translate the following video analysis from English to {target_language} while maintaining the exact JSON structure and preserving technical terms appropriately.

IMPORTANT JSON FORMATTING RULES:
- Return ONLY valid JSON, no additional text or explanations
- Use double quotes for all strings
- Escape any special characters properly (\\n, \\t, \\", \\\\)
- Remove any control characters or non-printable characters
- Ensure all strings are properly escaped
- Do not include any markdown formatting or code blocks
- For Unicode characters, use proper UTF-8 encoding, NEVER use \\uXXXX escape sequences

Return only valid JSON in the same structure as the input."""

            chat = CustomLlmChat(
                api_key=self.api_key,
                session_id=f"analysis_translation_{hash(str(analysis))}",
                system_message=system_prompt
            ).with_model("groq", "meta-llama/llama-4-scout-17b-16e-instruct")

            translation_prompt = f"""Translate this video analysis to {target_language}:

{json.dumps(analysis, ensure_ascii=False, indent=2)}

CRITICAL: Return ONLY valid JSON with the exact same structure. Follow these rules:
1. Use double quotes for all strings
2. Escape special characters: \\n for newlines, \\" for quotes, \\\\ for backslashes
3. Remove any control characters or non-printable characters
4. Do not add any text before or after the JSON
5. Ensure all string values are properly escaped
6. Maintain the exact same JSON structure as the input

Return the translated analysis as valid JSON:"""

            user_message = UserMessage(text=translation_prompt)
            response = await chat.send_message(user_message)
            
            # Parse response
            response_text = response.strip()
            
            # Clean up response
            if '```json' in response_text:
                start_idx = response_text.find('```json') + 7
                end_idx = response_text.find('```', start_idx)
                if end_idx != -1:
                    response_text = response_text[start_idx:end_idx]
            elif '```' in response_text:
                start_idx = response_text.find('```') + 3
                end_idx = response_text.find('```', start_idx)
                if end_idx != -1:
                    response_text = response_text[start_idx:end_idx]
            
            if not response_text.strip().startswith('{'):
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}')
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    response_text = response_text[start_idx:end_idx+1]
            
            # Clean up control characters and non-printable characters
            import re
            response_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', response_text)
            
            # Fix invalid Unicode escape sequences
            def fix_unicode_escapes(text):
                def replace_unicode(match):
                    unicode_str = match.group(0)
                    try:
                        return unicode_str.encode('utf-8').decode('unicode_escape')
                    except:
                        return unicode_str
                text = re.sub(r'\\u[0-9a-fA-F]{4}', replace_unicode, text)
                return text
            
            def fix_json_syntax(text):
                """Fix common JSON syntax errors"""
                # Fix missing commas between object properties
                text = re.sub(r'("\s*)\n\s*(")', r'\1,\n\2', text)
                text = re.sub(r'(\])\s*\n\s*(")', r'\1,\n\2', text)
                text = re.sub(r'(\})\s*\n\s*(")', r'\1,\n\2', text)
                text = re.sub(r'(\])\s*\n\s*(")', r'\1,\n\2', text)
                text = re.sub(r'("\s*)\n\s*(")', r'\1,\n\2', text)
                return text
            
            response_text = fix_unicode_escapes(response_text)
            response_text = fix_json_syntax(response_text)
            response_text = response_text.strip()
            
            try:
                translated_analysis = json.loads(response_text)
                
                return {
                    'status': 'success',
                    'translated_analysis': translated_analysis
                }
            except json.JSONDecodeError as e:
                print(f"❌ Analysis JSON parsing error: {str(e)}")
                print(f"📄 Error position: line {e.lineno}, column {e.colno}")
                print(f"📄 Raw response: {response_text[:500]}...")
                
                # Try to fix common JSON issues
                try:
                    fixed_response = response_text
                    fixed_response = fixed_response.replace('\\n', '\\\\n')
                    fixed_response = fixed_response.replace('\\t', '\\\\t')
                    fixed_response = fixed_response.replace('\\"', '\\\\"')
                    
                    # Fix Unicode escape sequences
                    fixed_response = fix_unicode_escapes(fixed_response)
                    
                    # Fix JSON syntax errors
                    fixed_response = fix_json_syntax(fixed_response)
                    
                    translated_analysis = json.loads(fixed_response)
                    print("✅ Successfully parsed analysis after fixing common issues")
                    
                    return {
                        'status': 'success',
                        'translated_analysis': translated_analysis
                    }
                except json.JSONDecodeError as e2:
                    print(f"❌ Analysis still failed after fixes: {str(e2)}")
                    
                    # Try more aggressive JSON fixing
                    try:
                        aggressive_fix = response_text
                        aggressive_fix = re.sub(r'("\s*)\n\s*(")', r'\1,\n\2', aggressive_fix)
                        aggressive_fix = re.sub(r'(\d+)\s*\n\s*(")', r'\1,\n\2', aggressive_fix)
                        aggressive_fix = re.sub(r'(true|false|null)\s*\n\s*(")', r'\1,\n\2', aggressive_fix)
                        aggressive_fix = re.sub(r'(\})\s*\n\s*(")', r'\1,\n\2', aggressive_fix)
                        aggressive_fix = re.sub(r'(\])\s*\n\s*(")', r'\1,\n\2', aggressive_fix)
                        aggressive_fix = re.sub(r'\\u[0-9a-fA-F]{4}', '[UNICODE]', aggressive_fix)
                        
                        translated_analysis = json.loads(aggressive_fix)
                        print("✅ Successfully parsed analysis after aggressive JSON fixing")
                        
                        return {
                            'status': 'success',
                            'translated_analysis': translated_analysis
                        }
                    except json.JSONDecodeError as e3:
                        print(f"❌ Analysis final attempt failed: {str(e3)}")
                        return {
                            'status': 'error',
                            'error': f'Failed to parse analysis translation response: {str(e)}'
                        }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Analysis translation failed: {str(e)}'
            }

    async def translate_transcript_only(self, transcript: str, target_language: str) -> Dict[str, Any]:
        """
        Translate only the transcript text
        """
        try:
            system_prompt = f"""You are a professional translator specializing in video transcripts. Translate the following transcript from English to {target_language} while:

1. Preserving timestamps in [MM:SS] format
2. Maintaining the speaker's tone and style
3. Keeping technical terms and proper names appropriately
4. Ensuring natural flow in the target language

Return only the translated transcript text."""

            chat = CustomLlmChat(
                api_key=self.api_key,
                session_id=f"transcript_translation_{hash(transcript)}",
                system_message=system_prompt
            ).with_model("groq", "meta-llama/llama-4-scout-17b-16e-instruct")

            translation_prompt = f"""
Translate this video transcript to {target_language}:

{transcript}

Return only the translated transcript with timestamps preserved.
"""

            user_message = UserMessage(text=translation_prompt)
            response = await chat.send_message(user_message)
            
            # Clean up response
            translated_transcript = response.strip()
            
            # Remove any markdown formatting
            if translated_transcript.startswith('```'):
                lines = translated_transcript.split('\n')
                if len(lines) > 2:
                    translated_transcript = '\n'.join(lines[1:-1])
            
            return {
                'status': 'success',
                'translated_transcript': translated_transcript
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': f'Transcript translation failed: {str(e)}'
            }

    def get_supported_languages(self) -> List[Dict[str, str]]:
        """
        Get list of supported languages for translation
        """
        languages = [
            {"code": "en", "name": "English"},
            {"code": "es", "name": "Spanish"},
            {"code": "fr", "name": "French"},
            {"code": "de", "name": "German"},
            {"code": "it", "name": "Italian"},
            {"code": "pt", "name": "Portuguese"},
            {"code": "ru", "name": "Russian"},
            {"code": "ja", "name": "Japanese"},
            {"code": "ko", "name": "Korean"},
            {"code": "zh", "name": "Chinese (Simplified)"},
            {"code": "ar", "name": "Arabic"},
            {"code": "hi", "name": "Hindi"},
            {"code": "nl", "name": "Dutch"},
            {"code": "sv", "name": "Swedish"},
            {"code": "no", "name": "Norwegian"},
            {"code": "da", "name": "Danish"},
            {"code": "fi", "name": "Finnish"},
            {"code": "pl", "name": "Polish"},
            {"code": "tr", "name": "Turkish"},
            {"code": "th", "name": "Thai"},
            {"code": "vi", "name": "Vietnamese"},
            {"code": "id", "name": "Indonesian"},
            {"code": "ms", "name": "Malay"},
            {"code": "tl", "name": "Filipino"},
            {"code": "he", "name": "Hebrew"},
            {"code": "cs", "name": "Czech"},
            {"code": "hu", "name": "Hungarian"},
            {"code": "ro", "name": "Romanian"},
            {"code": "bg", "name": "Bulgarian"},
            {"code": "hr", "name": "Croatian"},
            {"code": "sk", "name": "Slovak"},
            {"code": "sl", "name": "Slovenian"},
            {"code": "et", "name": "Estonian"},
            {"code": "lv", "name": "Latvian"},
            {"code": "lt", "name": "Lithuanian"},
            {"code": "uk", "name": "Ukrainian"},
            {"code": "be", "name": "Belarusian"},
            {"code": "ka", "name": "Georgian"},
            {"code": "hy", "name": "Armenian"},
            {"code": "az", "name": "Azerbaijani"},
            {"code": "kk", "name": "Kazakh"},
            {"code": "ky", "name": "Kyrgyz"},
            {"code": "uz", "name": "Uzbek"},
            {"code": "tg", "name": "Tajik"},
            {"code": "mn", "name": "Mongolian"},
            {"code": "ne", "name": "Nepali"},
            {"code": "si", "name": "Sinhala"},
            {"code": "ta", "name": "Tamil"},
            {"code": "te", "name": "Telugu"},
            {"code": "ml", "name": "Malayalam"},
            {"code": "kn", "name": "Kannada"},
            {"code": "gu", "name": "Gujarati"},
            {"code": "pa", "name": "Punjabi"},
            {"code": "bn", "name": "Bengali"},
            {"code": "or", "name": "Odia"},
            {"code": "as", "name": "Assamese"},
            {"code": "mr", "name": "Marathi"},
            {"code": "ur", "name": "Urdu"},
            {"code": "fa", "name": "Persian"},
            {"code": "ps", "name": "Pashto"},
            {"code": "sd", "name": "Sindhi"},
            {"code": "sw", "name": "Swahili"},
            {"code": "am", "name": "Amharic"},
            {"code": "yo", "name": "Yoruba"},
            {"code": "ig", "name": "Igbo"},
            {"code": "ha", "name": "Hausa"},
            {"code": "zu", "name": "Zulu"},
            {"code": "af", "name": "Afrikaans"},
            {"code": "is", "name": "Icelandic"},
            {"code": "ga", "name": "Irish"},
            {"code": "cy", "name": "Welsh"},
            {"code": "mt", "name": "Maltese"},
            {"code": "eu", "name": "Basque"},
            {"code": "ca", "name": "Catalan"},
            {"code": "gl", "name": "Galician"},
            {"code": "sq", "name": "Albanian"},
            {"code": "mk", "name": "Macedonian"},
            {"code": "sr", "name": "Serbian"},
            {"code": "bs", "name": "Bosnian"},
            {"code": "me", "name": "Montenegrin"},
            {"code": "el", "name": "Greek"}
        ]
        
        # Ensure unique languages by code to prevent React key conflicts
        unique_languages = []
        seen_codes = set()
        for lang in languages:
            if lang["code"] not in seen_codes:
                unique_languages.append(lang)
                seen_codes.add(lang["code"])
        
        return unique_languages
