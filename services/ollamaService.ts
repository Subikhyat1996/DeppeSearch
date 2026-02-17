/**
 * Ollama Llama 3.2 service implementation.
 * Uses local Ollama server for LLM responses and Tavily for search.
 */
import { IAIService } from "./IAIService";
import { ResearchStep, GroundingChunk } from "../types";
import { SearchService, TavilySearchResult } from "./searchService";

interface OllamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
  temperature?: number;
}

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

export class OllamaService implements IAIService {
  private baseUrl: string;
  private model: string;
  private search: SearchService;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.model = process.env.OLLAMA_MODEL || "llama3.2";
    this.search = new SearchService();
  }

  getProviderName(): string {
    return `Ollama ${this.model}`;
  }

  /**
   * Helper method to call Ollama API.
   */
  private async generate(prompt: string, temperature: number = 0.7): Promise<string> {
    const url = `${this.baseUrl}/api/generate`;

    const request: OllamaRequest = {
      model: this.model,
      prompt,
      stream: false,
      temperature,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }

    const data: OllamaResponse = await response.json();
    return data.response;
  }

  /**
   * Generates a multi-step research plan.
   */
  async generateResearchPlan(userQuery: string): Promise<ResearchStep[]> {
    const prompt = `You are a research coordinator. Break down complex queries into 3-4 distinct research steps/sub-questions for deep analysis. 

Return ONLY a JSON array of objects with this exact format:
[{"query": "specific sub-question to research"}]

Do not include any other text or formatting.

Query: "${userQuery}"`;

    try {
      const response = await this.generate(prompt, 0.5);
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const plan = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
      
      return plan.map((p: any, index: number) => ({
        id: `step-${index}`,
        query: p.query,
        status: 'pending' as const
      }));
    } catch (e) {
      console.error("Failed to parse research plan", e);
      return [{ id: 'step-0', query: userQuery, status: 'pending' }];
    }
  }

  /**
   * Executes a research step using Tavily search + LLM analysis.
   */
  async executeResearchStep(query: string): Promise<{ result: string; sources: GroundingChunk[] }> {
    // First, perform web search
    const { results, sources } = await this.search.search(query, 5, process.env.TAVILY_API_KEY || undefined);

    // If no results, return early
    if (results.length === 0) {
      return {
        result: "No information found for this query.",
        sources: []
      };
    }

    // Create context from search results
    const searchContext = this.summarizeResults(query, results);

    // Ask LLM to analyze and synthesize the findings
    const prompt = `You are a research analyst. Based on the web search results provided, analyze and synthesize the information to answer the user's query.

Provide a comprehensive, factual response based ONLY on the search results.

Query: ${query}

Search Results:
${searchContext}

Please provide a detailed analysis answering the query.`;

    try {
      const analysis = await this.generate(prompt, 0.7);
      return {
        result: analysis,
        sources
      };
    } catch (e) {
      console.error("Analysis failed", e);
      return {
        result: searchContext,
        sources
      };
    }
  }

  /**
   * Synthesizes all research steps into a final report.
   */
  async synthesizeAnalysis(originalQuery: string, steps: ResearchStep[]): Promise<{ summary: string; deepDive: string }> {
    const researchData = steps
      .map(s => `Query: ${s.query}\nFindings: ${s.result}`)
      .join("\n\n---\n\n");

    const prompt = `You are a research report writer. Based on the research findings provided, create a comprehensive report.

Return ONLY a JSON object with this exact format:
{"summary": "executive summary (2-3 sentences)", "deepDive": "detailed markdown analysis with multiple sections"}

The deep dive should be thorough, well-structured with headers, and include all key findings.

Original Query: ${originalQuery}

Research Findings:
${researchData}

Create the final research report in JSON format.`;

    try {
      const response = await this.generate(prompt, 0.7);
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
      return {
        summary: result.summary || "Analysis complete.",
        deepDive: result.deepDive || response
      };
    } catch (e) {
      return {
        summary: "Analysis complete.",
        deepDive: researchData
      };
    }
  }

  /**
   * Helper to summarize search results.
   */
  private summarizeResults(query: string, results: TavilySearchResult[]): string {
    if (results.length === 0) {
      return "No information found.";
    }

    const formattedResults = results
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.content.substring(0, 500)}...`)
      .join("\n\n");

    return `Search Query: ${query}\n\nFound ${results.length} relevant sources:\n\n${formattedResults}`;
  }
}

export const ollama = new OllamaService();
