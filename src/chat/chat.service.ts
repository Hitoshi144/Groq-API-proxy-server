import { Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import axios, { AxiosResponse } from 'axios';

@Injectable()
export class ChatService {
  private readonly groqClient
  private readonly apiKey?: string

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
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'user',
          content: message,
        }
      ],
      temperature: 1,
      max_completion_tokens: 8192,
      top_p: 1,
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
        let buffer = ''

        response.data.on('data', (chunk: Buffer) => {
          const chunks = chunk.toString().split('\n')

          for (const chunk of chunks) {
            const line = chunk.trim()

            if (line === '') continue
            if (line === 'data: [DONE]') {
              resolve()
              return
            }

            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                const content = data.choices[0]?.delta?.content

                if (content) {
                  onChunk(content)
                }
              } catch (e) {}
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
