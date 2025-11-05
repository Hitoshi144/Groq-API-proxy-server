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
    this.logger.debug(`dto: ${initDto}`)

    this.logger.debug(`proccessed dto: ${JSON.stringify(initDto)}`)
    
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
    onSentence: (sentence: string, isFinal: boolean) => void
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
      max_completion_tokens: 1024,
      top_p: 0.9,
      stream: true,
      stop: null,
    }

    let accumulatedText = ''
    let buffer = ''

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
              if (buffer.trim()) {
                onSentence(buffer.trim(), false)
              }
              if (accumulatedText) {
                this.addAssistantMessage(accumulatedText)
                accumulatedText = ''
              }
              resolve()
              return
            }
            
            try {
              const data = JSON.parse(event.data)
              const content = data.choices[0].delta.content
              if (content) {
                accumulatedText += content
                buffer += content

                const sentences = this.extractCompleteSentences(buffer)

                if (sentences.complete.length > 0) {
                  sentences.complete.forEach(sentence => {
                    onSentence(sentence, false)
                  })
                  buffer = sentences.remaining
                }
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
          if (buffer.trim()) {
            // onSentence(buffer.trim(), true)
            const history = this.conversationHistory.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
            this.logger.debug(`Current chat history:\n ${JSON.stringify(history)}`)
            this.logger.debug(`Last sendence ignored: ${buffer.trim()}`)
          }
          if (accumulatedText) {
            this.addAssistantMessage(accumulatedText)
            accumulatedText = ''
          }
          resolve()
        })
        response.data.on('error', reject)
      })
    } catch (error: any) {
      console.log('Groq API error: ', error)
      throw new Error(`Failed to get response from Groq API: ${error}`)
    }
  }

  private extractCompleteSentences(text): { complete: string[], remaining: string } {
    const sentenceEnders = ['. ', '! ', '? ']
    let remaining = text
    const complete: string[] = []

    let found = true
    while (found) {
      found = false

      for (const ender of sentenceEnders) {
        const index = remaining.indexOf(ender)
        if (index !== -1) {
          const sentence = remaining.substring(0, index + 1).trim()
          if (sentence.length > 2) {
            complete.push(sentence)
          }
          remaining = remaining.substring(index + 2)
          found = true
          break
        }
      }
    }

    return { complete, remaining}
  }

  clearHistory() {
    this.conversationHistory.filter(msg => msg.role == 'system')
    this.logger.log(`Chat history cleared!`)
  }
}
