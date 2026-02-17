/**
 * Search service using Tavily API.
 * Used by MiniMax and Ollama providers for web search functionality.
 */
import { GroundingChunk } from "../types";

export interface TavilySearchResult {
  url: string;
  title: string;
  content: string;
}

export class SearchService {
  private apiKey: string;
  private baseUrl = "https://api.tavily.com/search";

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || "";
  }

  /**
   * Performs a web search and returns results with content.
   */
  async search(searchTerm: string, maxResults: number = 5, apiKey?: string): Promise<{ results: TavilySearchResult[], sources: GroundingChunk[] }> {
    const key = apiKey || this.apiKey;
    if (!key) {
      throw new Error("TAVILY_API_KEY is not configured");
    }

    const searchPayload = {
      api_key: key,
      query: searchTerm,
      search_depth: "basic",
      max_results: maxResults,
      include_answer: true,
      include_raw_content: false,
      include_images: false,
    };
    
    console.log("Tavily request:", JSON.stringify(searchPayload));

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(searchPayload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tavily search failed: ${error}`);
    }

    const data = await response.json();
    
    const results: TavilySearchResult[] = (data.results || []).map((r: any) => ({
      url: r.url || "",
      title: r.title || "",
      content: r.content || "",
    }));

    const sources: GroundingChunk[] = results.map((r) => ({
      web: {
        uri: r.url,
        title: r.title,
      },
    }));

    return { results, sources };
  }

  /**
   * Summarizes search results into a coherent response for research.
   */
  summarizeResults(query: string, results: TavilySearchResult[]): string {
    if (results.length === 0) {
      return "No information found.";
    }

    const formattedResults = results
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.content.substring(0, 500)}...`)
      .join("\n\n");

    return `Search Query: ${query}\n\nFound ${results.length} relevant sources:\n\n${formattedResults}`;
  }
}

export const searchService = new SearchService();
