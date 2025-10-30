import { Injectable, Logger } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import axios, { AxiosResponse } from 'axios';

@Injectable()
export class ChatService {
  private readonly groqClient
  private readonly apiKey?: string
  private readonly logger = new Logger(ChatService.name)

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

  async streamCompletion(
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const requestData: GroqCompletionRequest = {
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: message,
        }
      ],
      temperature: 0.8,
      max_completion_tokens: 2048,
      top_p: 0.9,
      reasoning_effort: 'medium',
      stream: true,
      stop: null,
    }

    try {
      const response: AxiosResponse = await this.groqClient.post(
        '/chat/completions',
        requestData,
        {
          responseType: 'stream',
        }
      )

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const chunkRaw = chunk.toString().split('\n')
          this.logger.debug('Getted chunks:', chunkRaw)

          for (let chunkie of chunkRaw) {
            chunkie = chunkie.trim()

            if (chunkie === '') continue
            if (chunkie === 'data: [DONE]') {
              resolve()
              return
            }

            if (chunkie.startsWith('data: ')) {
              try {
                const data = JSON.parse(chunkie.slice(6))
                const content = data.choices[0].delta.content
                this.logger.debug(`Sended chunk: ${content}`)

                if (content) {
                  onChunk(content)
                }
              } catch (e) {
                this.logger.error(`Error processing chunk: ${e}`)
              }
            }
          }
        })

        response.data.on('end', () => {
          resolve()
        })

        response.data.on('error', (error: Error) => {
          reject(error)
        })
      })
    } catch (error: any) {
      console.log('Groq API error: ', error)
      throw new Error(`Failed to get response from Groq API: ${error}`)
    }
  }
}
