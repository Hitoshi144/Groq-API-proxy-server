import { WebSocketGateway, SubscribeMessage, MessageBody, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io'
import { InitChatDto } from './dto/init-chat.dto';

@WebSocketGateway({
  cors: {
    origin: '*',
  }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: any) {
    console.log(`Client disconnected: ${client.id}`)
  }

  @SubscribeMessage('send_message')
  async handleMessage(client: Socket, message: string, facts: string) {
    try {
      let sentenceCounter = 0
      console.log(`Received message: ${message}`)

      if (facts && facts !== '') {
        console.log(`Recieved facts:\n${facts}`)
      }

      client.emit('response_start', { status: 'started' })

      await this.chatService.streamCompletion(message, facts, (sentence, isFinal) => {
        client.emit('response_chunk', {
          content: sentence,
          isFinal,
          done: false,
          sequence: sentenceCounter
        })
        console.log(`${sentenceCounter} Sentence sended: "${sentence}" ${isFinal ? '(FINAL)' : ''}`)
        sentenceCounter += 1
      })

      client.emit('response_chunk', {
        content: '',
        done: true,
        isFinal: true
      })
    }
    catch (error: any) {
      console.log(`Error processing message: ${error}`)
      client.emit('error', {
        message: `Error processing your request: ${error}`
      })
    }
  }

  @SubscribeMessage('load_config')
  loadConfig(@MessageBody() dto: InitChatDto) {
    return this.chatService.initializeSystemPrompt(dto)
  }

  @SubscribeMessage('clear_history')
  clearHistory() {
    return this.chatService.clearHistory()
  }
}
