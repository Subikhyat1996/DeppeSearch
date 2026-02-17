/**
 * MiniMax M2.5 Cloud service implementation.
 * Uses MiniMax API for LLM responses and Tavily for search.
 */
import { IAIService } from "./IAIService";
import { ResearchStep, GroundingChunk } from "../types";
import { SearchService } from "./searchService";

interface MiniMaxMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface MiniMaxRequest {
  model: string;
  messages: MiniMaxMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface MiniMaxResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class MiniMaxService implements IAIService {
  private apiKey: string;
  private groupId: string;
  private model: string;
  private search: SearchService;

  constructor() {
    this.apiKey = process.env.MINIMAX_API_KEY || "";
    this.groupId = process.env.MINIMAX_GROUP_ID || "";
    this.model = process.env.MINIMAX_MODEL || "MiniMax-M2.5";
    this.search = new SearchService();
  }

  getProviderName(): string {
    return "MiniMax M2.5";
  }

  /**
   * Helper method to call MiniMax API.
   */
  private async callAPI(messages: MiniMaxMessage[], temperature: number = 0.7): Promise<string> {
    if (!this.apiKey || !this.groupId) {
      throw new Error("MiniMax API key or Group ID not configured");
    }

    const url = `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${this.groupId}`;

    const request: MiniMaxRequest = {
      model: this.model,
      messages,
      temperature,
      max_tokens: 4096,
      stream: false,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax API error: ${error}`);
    }

    const data: MiniMaxResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from MiniMax API");
    }

    return data.choices[0].message.content;
  }

  /**
   * Generates a multi-step research plan.
   */
  async generateResearchPlan(userQuery: string): Promise<ResearchStep[]> {
    const messages: MiniMaxMessage[] = [
      {
        role: "system",
        content: `You are a research coordinator. Break down complex queries into 3-4 distinct research steps/sub-questions for deep analysis. 
        
Return ONLY a JSON array of objects with this exact format:
[{"query": "specific sub-question to research"}]

Do not include any other text or formatting.`
      },
      {
        role: "user",
        content: `Break down this query into research steps: "${userQuery}"`
      }
    ];

    try {
      const response = await this.callAPI(messages, 0.5);
      // Extract JSON from response (in case model adds formatting)
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
    const searchContext = this.search.summarizeResults(query, results);

    // Ask LLM to analyze and synthesize the findings
    const messages: MiniMaxMessage[] = [
      {
        role: "system",
        content: `You are a research analyst. Based on the web search results provided, analyze and synthesize the information to answer the user's query.

Provide a comprehensive, factual response based ONLY on the search results. 
Cite information appropriately in your analysis.`
      },
      {
        role: "user",
        content: `Query: ${query}

Search Results:
${searchContext}

Please provide a detailed analysis answering the query.`
      }
    ];

    try {
      const analysis = await this.callAPI(messages, 0.7);
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

    const messages: MiniMaxMessage[] = [
      {
        role: "system",
        content: `You are a research report writer. Based on the research findings provided, create a comprehensive report.

Return ONLY a JSON object with this exact format:
{"summary": "executive summary (2-3 sentences)", "deepDive": "detailed markdown analysis with multiple sections"}

The deep dive should be thorough, well-structured with headers, and include all key findings.`
      },
      {
        role: "user",
        content: `Original Query: ${originalQuery}

Research Findings:
${researchData}

Create the final research report in JSON format.`
      }
    ];

    try {
      const response = await this.callAPI(messages, 0.7);
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
}

export const minimax = new MiniMaxService();
