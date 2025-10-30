import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { createParser } from 'eventsource-parser';
import { InitChatDto } from './dto/init-chat.dto';

@Injectable()
export class ChatService {
  private readonly groqClient
  private readonly apiKey?: string
  private readonly logger = new Logger(ChatService.name)

  private characterConfig: CharacterConfig
  private userConfig: UserConfig
  private chatContext: ChatContext
  private chatRules: string

  private conversationHistory: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
    timestamp?: Date
  }> = []

  private isInited = false

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY
    this.groqClient = axios.create({
      baseURL: 'https://api.groq.com/openai/v1',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      }
    })
  }

  public initializeSystemPrompt(initDto: InitChatDto): void {
    const systemPrompt = this.createSystemPrompt(initDto);
    
    this.conversationHistory = [
      {
        role: 'system',
        content: systemPrompt,
        timestamp: new Date()
      }
    ];

    this.isInited = true;
    this.logger.log(`Chat initialized for character: ${initDto.characterName}`);
  }

  private createSystemPrompt(initDto: InitChatDto): string {
    // Сохраняем конфигурацию
    this.characterConfig = {
      name: initDto.characterName,
      personality: initDto.characterPersonality,
      speechStyle: initDto.characterSpeechStyle,
      behavior: initDto.characterBehavior,
      backstory: initDto.characterBackstory,
    }

    this.userConfig = {
      name: initDto.userName,
      relationship: initDto.relationship,
    }

    this.chatContext = {
      currentSituation: initDto.currentSituation,
      location: initDto.location,
      mood: initDto.mood,
    }

    this.chatRules = initDto.chatRules;

    return `Ты - ${this.characterConfig.name}.

О СЕБЕ:
- Личность: ${this.characterConfig.personality}
- Стиль речи: ${this.characterConfig.speechStyle}
- Поведение: ${this.characterConfig.behavior}
${this.characterConfig.backstory ? `- Предыстория: ${this.characterConfig.backstory}` : ''}

О СОБЕСЕДНИКЕ:
- Имя: ${this.userConfig.name}
${this.userConfig.relationship ? `- Отношения: ${this.userConfig.relationship}` : ''}

ТЕКУЩАЯ СИТУАЦИЯ:
${this.chatContext.currentSituation}
${this.chatContext.location ? `- Место: ${this.chatContext.location}` : ''}
${this.chatContext.mood ? `- Настроение: ${this.chatContext.mood}` : ''}

ВАЖНЫЕ ПРАВИЛА:
${this.chatRules}`;
  }

  private addUserMessage(message: string): void {
    this.conversationHistory.push({
      role: 'user',
      content: message,
    })

    this.trimConversationHistory()
    this.logger.debug(`Message added to history: ${message.substring(0, 50)}...`)
  }

  private addAssistantMessage(message: string): void {
    this.conversationHistory.push({
      role: 'assistant',
      content: message,
    })

    this.trimConversationHistory()
    this.logger.debug(`Message added to history: ${message.substring(0, 50)}...`)
  }

  private trimConversationHistory(): void {
    const MAX_HISTORY_LENGTH = 30

    if (this.conversationHistory.length > MAX_HISTORY_LENGTH) {
      const systemMessage = this.conversationHistory[0]
      const recentMessages = this.conversationHistory.slice(-(MAX_HISTORY_LENGTH - 1))

      this.conversationHistory = [systemMessage, ...recentMessages]
    }
  }

  async streamCompletion(
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    if (!this.isInited) {
      throw new Error('Chat service not inited...')
    }

    this.addUserMessage(message)

    const requestData: GroqCompletionRequest = {
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: this.conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: 0.8,
      max_completion_tokens: 2048,
      top_p: 0.9,
      stream: true,
      stop: null,
    }

    let fullResponse = ''

    try {
      const response: AxiosResponse = await this.groqClient.post(
        '/chat/completions',
        requestData,
        {
          responseType: 'stream',
        }
      )

      return new Promise((resolve, reject) => {
        const parser = createParser({
          onEvent: (event) => {
            if (event.data === '[DONE]') {
              if (fullResponse) {
                this.addAssistantMessage(fullResponse)
                fullResponse = ''
              }
              resolve()
              return
            }
            
            try {
              const data = JSON.parse(event.data)
              const content = data.choices[0].delta.content
              if (content) {
                fullResponse += content
                onChunk(content)
              }
            } catch (e) {
              this.logger.error(`Error parsing event: ${e}`)
            }
          }
        })
      
        response.data.on('data', (chunk: Buffer) => {
          parser.feed(chunk.toString())
        })
      
        response.data.on('end', () => {
          if (fullResponse) {
            this.addAssistantMessage(fullResponse)
            fullResponse = ''
            resolve()
          }
        })
        response.data.on('error', reject)
      })
    } catch (error: any) {
      console.log('Groq API error: ', error)
      throw new Error(`Failed to get response from Groq API: ${error}`)
    }
  }
}
