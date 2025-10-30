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

interface CharacterConfig {
    name: string
    personality: string
    backstory?: string
    speechStyle: string
    behavior: string
}

interface UserConfig {
    name: string
    relationship?: string
}

interface ChatContext {
    currentSituation: string
    location?: string
    mood?: string
}