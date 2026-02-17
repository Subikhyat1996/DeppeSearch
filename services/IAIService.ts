/**
 * Abstract interface for AI LLM services.
 * All providers (Gemini, MiniMax, Ollama) must implement this interface.
 */
import { ResearchStep, GroundingChunk } from "../types";

export interface IAIService {
  /**
   * Generates a multi-step research plan for a complex query.
   */
  generateResearchPlan(userQuery: string): Promise<ResearchStep[]>;

  /**
   * Executes a single search step to gather information.
   */
  executeResearchStep(query: string): Promise<{ result: string; sources: GroundingChunk[] }>;

  /**
   * Final synthesis of all researched data.
   */
  synthesizeAnalysis(originalQuery: string, steps: ResearchStep[]): Promise<{ summary: string; deepDive: string }>;

  /**
   * Returns the name of the provider for UI display.
   */
  getProviderName(): string;
}
