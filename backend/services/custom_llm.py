import os
import json
import asyncio
import aiohttp
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from enum import Enum

class ModelProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    COHERE = "cohere"
    GROQ = "groq"

@dataclass
class UserMessage:
    """Custom UserMessage class to replace emergentintegrations UserMessage"""
    text: str
    role: str = "user"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "role": self.role,
            "content": self.text
        }

@dataclass
class SystemMessage:
    """System message for chat initialization"""
    text: str
    role: str = "system"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "role": self.role,
            "content": self.text
        }

class CustomLlmChat:
    """Custom LlmChat class to replace emergentintegrations.llm.chat.LlmChat"""
    
    def __init__(self, api_key: str, session_id: str, system_message: Optional[str] = None):
        self.api_key = api_key
        self.session_id = session_id
        self.model_provider = ModelProvider.OPENAI
        self.model_name = "gpt-4o"
        self.system_message = system_message
        self.conversation_history = []
        
        if system_message:
            self.conversation_history.append(SystemMessage(system_message).to_dict())
    
    def with_model(self, provider: str, model: str) -> 'CustomLlmChat':
        """Set the model provider and model name"""
        try:
            self.model_provider = ModelProvider(provider.lower())
        except ValueError:
            self.model_provider = ModelProvider.OPENAI
            
        self.model_name = model
        return self
    
    async def send_message(self, user_message: UserMessage) -> str:
        """Send a message to the LLM and return the response"""
        try:
            # Add user message to conversation history
            self.conversation_history.append(user_message.to_dict())
            
            if self.model_provider == ModelProvider.OPENAI:
                return await self._send_openai_request()
            elif self.model_provider == ModelProvider.ANTHROPIC:
                return await self._send_anthropic_request()
            elif self.model_provider == ModelProvider.GROQ:
                return await self._send_groq_request()
            else:
                # Default to OpenAI
                return await self._send_openai_request()
                
        except Exception as e:
            raise Exception(f"Failed to send message to LLM: {str(e)}")
    
    async def _send_groq_request(self) -> str:
        """Send request to Groq API"""
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model_name,
            "messages": self.conversation_history,
            # "temperature": 0.7,
            # "max_tokens": 4000
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Groq API error {response.status}: {error_text}")
                
                data = await response.json()
                content = data['choices'][0]['message']['content']

                print('data:', data)
                print('content:', content)
                
                # Add assistant response to conversation history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": content
                })
                
                return content
    

    async def _send_openai_request(self) -> str:
        """Send request to OpenAI API"""
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model_name,
            "messages": self.conversation_history,
            "temperature": 0.7,
            "max_tokens": 4000
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"OpenAI API error {response.status}: {error_text}")
                
                data = await response.json()
                content = data['choices'][0]['message']['content']
                
                # Add assistant response to conversation history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": content
                })
                
                return content
    
    async def _send_anthropic_request(self) -> str:
        """Send request to Anthropic API"""
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        # Convert conversation history to Anthropic format
        messages = []
        system_prompt = ""
        
        for msg in self.conversation_history:
            if msg["role"] == "system":
                system_prompt = msg["content"]
            elif msg["role"] == "user":
                messages.append({
                    "role": "user",
                    "content": msg["content"]
                })
            elif msg["role"] == "assistant":
                messages.append({
                    "role": "assistant", 
                    "content": msg["content"]
                })
        
        payload = {
            "model": self.model_name,
            "max_tokens": 4000,
            "messages": messages
        }
        
        if system_prompt:
            payload["system"] = system_prompt
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise Exception(f"Anthropic API error {response.status}: {error_text}")
                
                data = await response.json()
                content = data['content'][0]['text']
                
                # Add assistant response to conversation history
                self.conversation_history.append({
                    "role": "assistant",
                    "content": content
                })
                
                return content
    
    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """Get the current conversation history"""
        return self.conversation_history.copy()
    
    def clear_history(self):
        """Clear conversation history"""
        self.conversation_history = []
        if self.system_message:
            self.conversation_history.append(SystemMessage(self.system_message).to_dict())
