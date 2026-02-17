
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, ResearchStep, AnalysisResult, GroundingChunk, ProviderConfig, ProviderType } from './types';
import { StepIndicator } from './components/StepIndicator';
import { SourceBadge } from './components/SourceBadge';
import { ProviderSettings } from './components/ProviderSettings';
import { gemini } from './services/geminiService';
import { minimax } from './services/minimaxService';
import { ollama } from './services/ollamaService';
import { IAIService } from './services/IAIService';

const STORAGE_KEY = 'insightflow_provider_config';

// Default config
const getDefaultConfig = (): ProviderConfig => ({
  provider: 'gemini',
  apiKey: '',
  groupId: '',
  model: 'http://localhost:11434',
  searchApiKey: '',
  isValid: false
});

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [steps, setSteps] = useState<ResearchStep[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate the parsed config has required fields
        if (parsed && parsed.provider) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error loading config from localStorage:", e);
    }
    return getDefaultConfig();
  });
  const [isValidating, setIsValidating] = useState(false);
  const [aiServiceInstance, setAiServiceInstance] = useState<IAIService>(gemini);
  const resultsEndRef = useRef<HTMLDivElement>(null);

  // Save config to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providerConfig));
  }, [providerConfig]);

  // Get provider display name
  const getProviderDisplayName = () => {
    switch (providerConfig.provider) {
      case 'gemini': return 'Gemini 3 Pro';
      case 'minimax': return 'MiniMax M2.5';
      case 'ollama': return `Ollama ${providerConfig.model || 'llama3.2'}`;
      default: return 'Unknown';
    }
  };

  // Validate and set up the AI service
  const handleValidate = async (): Promise<boolean> => {
    setIsValidating(true);
    let isValid = false;
    let service: IAIService = gemini;

    try {
      switch (providerConfig.provider) {
        case 'gemini':
          if (providerConfig.apiKey) {
            // Test Gemini by making a simple call
            service = gemini;
            isValid = true;
          }
          break;

        case 'minimax':
          if (providerConfig.apiKey && providerConfig.groupId) {
            // Test MiniMax - temporarily set env vars
            const originalApiKey = process.env.MINIMAX_API_KEY;
            const originalGroupId = process.env.MINIMAX_GROUP_ID;
            const originalSearchKey = process.env.TAVILY_API_KEY;

            process.env.MINIMAX_API_KEY = providerConfig.apiKey;
            process.env.MINIMAX_GROUP_ID = providerConfig.groupId;
            process.env.TAVILY_API_KEY = providerConfig.searchApiKey || '';

            try {
              await minimax.generateResearchPlan("test");
              isValid = true;
            } catch (e) {
              console.error("MiniMax validation failed:", e);
            }

            // Restore original values if needed
            if (originalApiKey) process.env.MINIMAX_API_KEY = originalApiKey;
            if (originalGroupId) process.env.MINIMAX_GROUP_ID = originalGroupId;
            if (originalSearchKey) process.env.TAVILY_API_KEY = originalSearchKey;
          }
          break;

        case 'ollama':
          // Test Ollama - temporarily set env vars
          const originalOllamaUrl = process.env.OLLAMA_BASE_URL;
          const originalOllamaModel = process.env.OLLAMA_MODEL;
          const originalSearchKey = process.env.TAVILY_API_KEY;

          process.env.OLLAMA_BASE_URL = providerConfig.model || 'http://localhost:11434';
          process.env.OLLAMA_MODEL = 'llama3.2';
          process.env.TAVILY_API_KEY = providerConfig.searchApiKey || '';

          try {
            await ollama.generateResearchPlan("test");
            isValid = true;
          } catch (e) {
            console.error("Ollama validation failed:", e);
          }

          // Restore original values
          if (originalOllamaUrl) process.env.OLLAMA_BASE_URL = originalOllamaUrl;
          if (originalOllamaModel) process.env.OLLAMA_MODEL = originalOllamaModel;
          if (originalSearchKey) process.env.TAVILY_API_KEY = originalSearchKey;
          break;
      }
    } catch (e) {
      console.error("Validation error:", e);
    }

    setIsValidating(false);

    if (isValid) {
      setProviderConfig(prev => ({ ...prev, isValid: true }));
      
      // Set the service instance
      switch (providerConfig.provider) {
        case 'gemini':
          setAiServiceInstance(gemini);
          break;
        case 'minimax':
          process.env.MINIMAX_API_KEY = providerConfig.apiKey;
          process.env.MINIMAX_GROUP_ID = providerConfig.groupId;
          process.env.TAVILY_API_KEY = providerConfig.searchApiKey || '';
          setAiServiceInstance(minimax);
          break;
        case 'ollama':
          process.env.OLLAMA_BASE_URL = providerConfig.model || 'http://localhost:11434';
          process.env.OLLAMA_MODEL = 'llama3.2';
          process.env.TAVILY_API_KEY = providerConfig.searchApiKey || '';
          setAiServiceInstance(ollama);
          break;
      }
    }

    return isValid;
  };

  const scrollToBottom = () => {
    resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Export to Markdown
  const exportToMarkdown = () => {
    if (!result) return;

    const markdown = `# Research Report: ${query}

## Executive Summary
${result.summary}

## Detailed Analysis
${result.deepDive}

## Sources
${result.allSources.map(s => `- [${s.web?.title || 'Source'}](${s.web?.uri})`).join('\n')}

---
*Generated by InsightFlow AI - ${getProviderDisplayName()}*
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to Text
  const exportToText = () => {
    if (!result) return;

    const text = `RESEARCH REPORT: ${query.toUpperCase()}
${'='.repeat(50)}

EXECUTIVE SUMMARY
${'-'.repeat(20)}
${result.summary}

DETAILED ANALYSIS
${'-'.repeat(20)}
${result.deepDive}

SOURCES
${'-'.repeat(20)}
${result.allSources.map(s => `${s.web?.title || 'Source'}: ${s.web?.uri}`).join('\n')}

---
Generated by InsightFlow AI - ${getProviderDisplayName()}
`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !providerConfig.isValid) return;

    setAppState(AppState.PLANNING);
    setError(null);
    setResult(null);
    
    try {
      // 1. Plan
      const planSteps = await aiServiceInstance.generateResearchPlan(query);
      setSteps(planSteps);
      setAppState(AppState.RESEARCHING);

      // 2. Research (Iterative)
      const finalSteps: ResearchStep[] = [...planSteps];
      let allSources: GroundingChunk[] = [];

      for (let i = 0; i < finalSteps.length; i++) {
        const currentStep = finalSteps[i];
        
        // Update state to 'searching'
        finalSteps[i] = { ...currentStep, status: 'searching' };
        setSteps([...finalSteps]);

        const researchData = await aiServiceInstance.executeResearchStep(currentStep.query);
        
        // Update step with result
        finalSteps[i] = { 
          ...finalSteps[i], 
          status: 'completed', 
          result: researchData.result,
          sources: researchData.sources
        };
        allSources = [...allSources, ...researchData.sources];
        setSteps([...finalSteps]);
        scrollToBottom();
      }

      // 3. Synthesize
      setAppState(AppState.SYNTHESIZING);
      const synthesis = await aiServiceInstance.synthesizeAnalysis(query, finalSteps);
      
      // Deduplicate sources
      const uniqueSources = Array.from(new Map(allSources.map(s => [s.web?.uri, s])).values());

      setResult({
        summary: synthesis.summary,
        deepDive: synthesis.deepDive,
        steps: finalSteps,
        allSources: uniqueSources
      });
      setAppState(AppState.COMPLETED);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during research.');
      setAppState(AppState.ERROR);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Provider Settings */}
      <ProviderSettings
        config={providerConfig}
        onConfigChange={setProviderConfig}
        onValidate={handleValidate}
        isValidating={isValidating}
      />

      {/* Header */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <i className="fas fa-brain text-white text-xl"></i>
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            InsightFlow
          </h1>
        </div>
        <div className="hidden md:block">
          <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-400">
            AI-Agent Researcher ({getProviderDisplayName()})
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-5xl space-y-8 flex-1">
        {/* Search Bar Area */}
        <div className={`transition-all duration-700 ease-in-out ${appState === AppState.IDLE ? 'mt-24' : 'mt-0'}`}>
          {appState === AppState.IDLE && (
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold mb-4">Deep Research, Simplified.</h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto">
                Ask a complex question and our agent will browse, analyze, and synthesize a comprehensive report for you.
              </p>
              {!providerConfig.isValid && (
                <p className="text-amber-400 text-sm mt-4">
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  Please configure your AI provider using the settings button (top right)
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSearch} className="relative group search-glow rounded-2xl overflow-hidden shadow-2xl">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <i className="fas fa-search text-slate-500"></i>
            </div>
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={appState !== AppState.IDLE && appState !== AppState.COMPLETED && appState !== AppState.ERROR}
              placeholder="Enter a topic for deep analysis (e.g., 'Evolution of quantum computing in the next decade')"
              className="w-full bg-slate-800/80 border-2 border-slate-700/50 focus:border-blue-500/50 py-5 pl-14 pr-32 outline-none text-lg transition-all text-slate-100 placeholder:text-slate-500"
            />
            <button 
              type="submit"
              disabled={!providerConfig.isValid || (appState !== AppState.IDLE && appState !== AppState.COMPLETED && appState !== AppState.ERROR)}
              className="absolute right-3 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              {appState === AppState.IDLE || appState === AppState.COMPLETED || appState === AppState.ERROR ? 'Research' : 'Busy...'}
            </button>
          </form>
        </div>

        {/* Dashboard Grid */}
        {(appState !== AppState.IDLE) && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Sidebar (Pipeline & Sources) */}
            <aside className="lg:col-span-1 space-y-6">
              <div className="glass-panel p-5 rounded-2xl shadow-sm">
                <StepIndicator steps={steps} />
              </div>

              {result && (
                <div className="glass-panel p-5 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Verified Sources</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.allSources.map((source, idx) => (
                      <SourceBadge key={idx} source={source} />
                    ))}
                    {result.allSources.length === 0 && (
                      <span className="text-xs text-slate-500 italic">No direct links available.</span>
                    )}
                  </div>
                </div>
              )}
            </aside>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-6">
              {/* Progress View */}
              {(appState === AppState.PLANNING || appState === AppState.RESEARCHING || appState === AppState.SYNTHESIZING) && (
                <div className="glass-panel p-8 rounded-2xl text-center space-y-6 animate-pulse-slow">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <i className="fas fa-microscope text-blue-500"></i>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-100">
                      {appState === AppState.PLANNING && 'Structuring research objectives...'}
                      {appState === AppState.RESEARCHING && 'Executing search steps & analyzing data...'}
                      {appState === AppState.SYNTHESIZING && 'Synthesizing final report...'}
                    </h3>
                    <p className="text-slate-400 mt-2">Our agent is cross-referencing sources and evaluating details.</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-start gap-4">
                  <i className="fas fa-exclamation-triangle text-red-400 mt-1"></i>
                  <div>
                    <h3 className="font-semibold text-red-400">Analysis Halted</h3>
                    <p className="text-sm text-red-300/80 mt-1">{error}</p>
                    <button onClick={() => setAppState(AppState.IDLE)} className="mt-4 text-xs font-bold text-red-400 underline hover:no-underline">Reset and Try Again</button>
                  </div>
                </div>
              )}

              {/* Result View */}
              {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  {/* Executive Summary */}
                  <div className="bg-blue-600/10 border border-blue-500/30 p-8 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <i className="fas fa-bolt text-white text-xs"></i>
                      </div>
                      <h3 className="text-lg font-bold text-blue-100 uppercase tracking-wide">Executive Summary</h3>
                    </div>
                    <p className="text-slate-200 text-lg leading-relaxed font-medium italic">
                      "{result.summary}"
                    </p>
                  </div>

                  {/* Deep Dive (Markdown-like rendering) */}
                  <div className="glass-panel p-8 md:p-12 rounded-2xl shadow-xl prose prose-invert max-w-none">
                    <h2 className="text-3xl font-bold mb-8 border-b border-slate-700 pb-4">Detailed Analysis</h2>
                    <div className="whitespace-pre-wrap text-slate-300 leading-8 text-lg">
                      {result.deepDive.split('\n').map((line, i) => {
                        if (line.startsWith('# ')) return <h1 key={i} className="text-4xl font-bold mt-8 mb-4 text-blue-100">{line.replace('# ', '')}</h1>;
                        if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold mt-8 mb-3 text-blue-200">{line.replace('## ', '')}</h2>;
                        if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold mt-6 mb-2 text-blue-300">{line.replace('### ', '')}</h3>;
                        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 mb-2">{line.substring(2)}</li>;
                        if (line.trim() === '') return <div key={i} className="h-4" />;
                        return <p key={i} className="mb-4">{line}</p>;
                      })}
                    </div>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex items-center justify-between p-6 glass-panel rounded-2xl">
                    <p className="text-sm text-slate-400">Analysis complete. Ready for another query?</p>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={exportToMarkdown}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-file-export"></i>
                        Export MD
                      </button>
                      <button 
                        onClick={exportToText}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-file-alt"></i>
                        Export TXT
                      </button>
                      <button 
                        onClick={() => { setAppState(AppState.IDLE); setQuery(''); setResult(null); }}
                        className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-all"
                      >
                        New Search
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={resultsEndRef} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mt-12 py-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between text-slate-500 text-sm gap-4">
        <p>&copy; 2024 InsightFlow AI. Powered by {getProviderDisplayName()} Reasoning.</p>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
          <a href="#" className="hover:text-slate-300 transition-colors">Terms</a>
          <a href="#" className="hover:text-slate-300 transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
};

export default App;
