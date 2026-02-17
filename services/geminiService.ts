
import { GoogleGenAI, Type } from "@google/genai";
import { ResearchStep, GroundingChunk } from "../types";

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private apiKey: string = '';

  private getAI(): GoogleGenAI {
    // Use user-provided API key from localStorage if available
    if (!this.apiKey) {
      try {
        const config = localStorage.getItem('insightflow_provider_config');
        if (config) {
          const parsed = JSON.parse(config);
          this.apiKey = parsed.apiKey || '';
        }
      } catch (e) {
        console.error('Error loading config:', e);
      }
    }
    
    if (!this.apiKey) {
      throw new Error('Please configure your Gemini API key in settings');
    }
    
    if (!this.ai) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.ai;
  }

  getProviderName(): string {
    return "Gemini 3 Pro";
  }

  /**
   * Generates a multi-step research plan for a complex query.
   */
  async generateResearchPlan(userQuery: string): Promise<ResearchStep[]> {
    const response = await this.getAI().models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `You are a research coordinator. Break down this query into 3-4 distinct research steps/sub-questions to perform a deep analysis: "${userQuery}". Return ONLY a JSON array of objects with a 'query' field.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              query: { type: Type.STRING, description: "The specific sub-query to research" }
            },
            required: ["query"]
          }
        }
      }
    });

    try {
      const plan = JSON.parse(response.text || "[]");
      return plan.map((p: any, index: number) => ({
        id: `step-${index}`,
        query: p.query,
        status: 'pending'
      }));
    } catch (e) {
      console.error("Failed to parse research plan", e);
      return [{ id: 'step-0', query: userQuery, status: 'pending' }];
    }
  }

  /**
   * Executes a single search step using Google Search grounding.
   */
  async executeResearchStep(query: string): Promise<{ result: string, sources: GroundingChunk[] }> {
    const response = await this.getAI().models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Perform a detailed search and provide facts/data for: "${query}". Be concise but thorough.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const rawSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingChunk[] = rawSources.map((s: any) => ({
      web: {
        uri: s.web?.uri || s.uri || "",
        title: s.web?.title || s.title || ""
      }
    }));
    return {
      result: response.text || "No information found.",
      sources: sources
    };
  }

  /**
   * Final synthesis of all researched data.
   */
  async synthesizeAnalysis(originalQuery: string, steps: ResearchStep[]): Promise<{ summary: string, deepDive: string }> {
    const researchData = steps.map(s => `Query: ${s.query}\nFindings: ${s.result}`).join("\n\n---\n\n");
    
    const response = await this.getAI().models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Original Request: ${originalQuery}\n\nBased on these research findings:\n${researchData}\n\nProvide a comprehensive "Deep Analysis" in two parts: 1. A executive summary (JSON field: summary). 2. A detailed multi-section deep dive analysis in Markdown (JSON field: deepDive).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            deepDive: { type: Type.STRING }
          },
          required: ["summary", "deepDive"]
        }
      }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { 
        summary: "Analysis complete.", 
        deepDive: response.text || "Analysis could not be formatted correctly." 
      };
    }
  }
}

export const gemini = new GeminiService();
