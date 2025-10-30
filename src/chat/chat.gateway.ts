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
  async handleMessage(client: Socket, message: string) {
    try {
      console.log(`Received message: ${message}`)

      client.emit('response_start', { status: 'started' })

      await this.chatService.streamCompletion(message, (chunk) => {
        client.emit('response_chunk', {
          content: chunk,
          done: false
        })
      })

      client.emit('response_chunk', {
        content: '',
        done: true
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
  loadConfig(dto: InitChatDto) {
    return this.chatService.initializeSystemPrompt(dto)
  }

}
