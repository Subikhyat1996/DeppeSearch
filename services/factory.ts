/**
 * AI Service Factory
 * Creates the appropriate AI service based on environment configuration.
 * 
 * Configuration (via .env.local):
 * - LLM_PROVIDER: "gemini" | "minimax" | "ollama"
 * 
 * Provider-specific env vars:
 * - Gemini: API_KEY (already set)
 * - MiniMax: MINIMAX_API_KEY, MINIMAX_GROUP_ID, MINIMAX_MODEL
 * - Ollama: OLLAMA_BASE_URL, OLLAMA_MODEL
 * - Search (for MiniMax/Ollama): TAVILY_API_KEY
 */
import { IAIService } from "./IAIService";
import { gemini } from "./geminiService";
import { minimax } from "./minimaxService";
import { ollama } from "./ollamaService";

export type ProviderType = "gemini" | "minimax" | "ollama";

class AIServiceFactory {
  private static instance: IAIService | null = null;
  private static provider: ProviderType = "gemini";

  /**
   * Gets the current provider type from environment.
   */
  static getProviderType(): ProviderType {
    const provider = process.env.LLM_PROVIDER?.toLowerCase();
    if (provider === "minimax" || provider === "ollama") {
      return provider;
    }
    return "gemini"; // Default to Gemini
  }

  /**
   * Gets the configured AI service instance.
   * Uses singleton pattern to return the same instance.
   */
  static getService(): IAIService {
    if (this.instance) {
      return this.instance;
    }

    const providerType = this.getProviderType();
    this.provider = providerType;

    switch (providerType) {
      case "minimax":
        // Check if MiniMax is configured
        if (!process.env.MINIMAX_API_KEY || !process.env.MINIMAX_GROUP_ID) {
          console.warn("MiniMax not configured, falling back to Gemini");
          this.instance = gemini;
          this.provider = "gemini";
        } else {
          this.instance = minimax;
        }
        break;

      case "ollama":
        // Check if Ollama is accessible
        this.instance = ollama;
        break;

      case "gemini":
      default:
        this.instance = gemini;
        break;
    }

    console.log(`Using AI provider: ${this.instance.getProviderName()}`);
    return this.instance;
  }

  /**
   * Gets the name of the currently active provider for UI display.
   */
  static getProviderName(): string {
    const service = AIServiceFactory.getService();
    return service.getProviderName();
  }

  /**
   * Resets the singleton (useful for testing or switching providers at runtime).
   */
  static reset(): void {
    this.instance = null;
  }
}

export const aiService = AIServiceFactory.getService();
export const getProviderName = AIServiceFactory.getProviderName;
