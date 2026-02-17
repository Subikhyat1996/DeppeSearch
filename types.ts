
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ResearchStep {
  id: string;
  query: string;
  status: 'pending' | 'searching' | 'analyzing' | 'completed' | 'failed';
  result?: string;
  sources?: GroundingChunk[];
}

export interface AnalysisResult {
  summary: string;
  deepDive: string;
  steps: ResearchStep[];
  allSources: GroundingChunk[];
}

export enum AppState {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  RESEARCHING = 'RESEARCHING',
  SYNTHESIZING = 'SYNTHESIZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type ProviderType = 'gemini' | 'minimax' | 'ollama';

export interface ProviderConfig {
  provider: ProviderType;
  apiKey: string;
  groupId?: string; // For MiniMax
  model?: string;   // For Ollama base URL
  ollamaModel?: string; // For Ollama model selection
  minimaxModel?: string; // For MiniMax model selection
  searchApiKey?: string; // For Tavily
  isValid: boolean;
}
