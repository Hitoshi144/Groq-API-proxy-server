interface GroqMessage {
    role: string
    content: string
}

interface GroqCompletionRequest {
    model: string
    messages: GroqMessage[]
    temperature: number
    max_completion_tokens: number
    top_p: number
    reasoning_effort?: string
    stream: boolean
    stop?: any
}