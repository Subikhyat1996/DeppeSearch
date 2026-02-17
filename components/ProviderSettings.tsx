import React, { useState, useEffect } from 'react';
import { ProviderType, ProviderConfig } from '../types';

interface ProviderSettingsProps {
  config: ProviderConfig;
  onConfigChange: (config: ProviderConfig) => void;
  onValidate: () => Promise<boolean>;
  isValidating: boolean;
}

const PROVIDERS: { id: ProviderType; name: string; description: string; needsSearch: boolean }[] = [
  { 
    id: 'gemini', 
    name: 'Google Gemini', 
    description: 'Built-in web search, no extra setup needed',
    needsSearch: false 
  },
  { 
    id: 'minimax', 
    name: 'MiniMax M2.5', 
    description: 'Advanced reasoning, requires API key + Tavily for search',
    needsSearch: true 
  },
  { 
    id: 'ollama', 
    name: 'Ollama (Llama 3.2)', 
    description: 'Local running, requires Ollama installed + Tavily for search',
    needsSearch: true 
  },
];

export const ProviderSettings: React.FC<ProviderSettingsProps> = ({
  config,
  onConfigChange,
  onValidate,
  isValidating
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const handleProviderChange = (provider: ProviderType) => {
    onConfigChange({
      ...config,
      provider,
      isValid: false
    });
  };

  const handleSave = () => {
    onValidate();
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Settings Toggle Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
          config.isValid 
            ? 'bg-green-600/20 border border-green-500/30 text-green-400' 
            : 'bg-amber-600/20 border border-amber-500/30 text-amber-400'
        }`}
      >
        <i className={`fas fa-${config.isValid ? 'check-circle' : 'exclamation-circle'}`}></i>
        <span className="text-sm font-medium">{PROVIDERS.find(p => p.id === config.provider)?.name}</span>
        <i className={`fas fa-chevron-${showSettings ? 'up' : 'down'} ml-2`}></i>
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-14 right-0 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <i className="fas fa-cog"></i>
            AI Provider Settings
          </h3>

          {/* Provider Selection */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-400 mb-2">Select Provider</label>
            <div className="space-y-2">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderChange(provider.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    config.provider === provider.id
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-600 bg-slate-700/30 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-medium text-sm">{provider.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{provider.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Inputs based on provider */}
          {config.provider === 'gemini' && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Google AI API Key
              </label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => onConfigChange({ ...config, apiKey: e.target.value, isValid: false })}
                placeholder="Enter your Gemini API key"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Get key from ai.google.dev</p>
            </div>
          )}

          {config.provider === 'minimax' && (
            <>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  MiniMax API Key
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => onConfigChange({ ...config, apiKey: e.target.value, isValid: false })}
                  placeholder="Enter your MiniMax API key"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  MiniMax Group ID
                </label>
                <input
                  type="text"
                  value={config.groupId || ''}
                  onChange={(e) => onConfigChange({ ...config, groupId: e.target.value, isValid: false })}
                  placeholder="Enter your Group ID"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Tavily Search API Key
                </label>
                <input
                  type="password"
                  value={config.searchApiKey || ''}
                  onChange={(e) => onConfigChange({ ...config, searchApiKey: e.target.value, isValid: false })}
                  placeholder="Enter Tavily API key for search"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Get from tavily.com</p>
              </div>
            </>
          )}

          {config.provider === 'ollama' && (
            <>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Ollama Base URL
                </label>
                <input
                  type="text"
                  value={config.model || 'http://localhost:11434'}
                  onChange={(e) => onConfigChange({ ...config, model: e.target.value, isValid: false })}
                  placeholder="http://localhost:11434"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  Tavily Search API Key
                </label>
                <input
                  type="password"
                  value={config.searchApiKey || ''}
                  onChange={(e) => onConfigChange({ ...config, searchApiKey: e.target.value, isValid: false })}
                  placeholder="Enter Tavily API key for search"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Get from tavily.com</p>
              </div>
            </>
          )}

          {/* Validate Button */}
          <button
            onClick={handleSave}
            disabled={isValidating || (!config.apiKey && !config.searchApiKey)}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isValidating ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Validating...
              </>
            ) : (
              <>
                <i className="fas fa-check"></i>
                {config.isValid ? 'Update Settings' : 'Validate & Save'}
              </>
            )}
          </button>

          {config.isValid && (
            <div className="mt-3 text-xs text-green-400 flex items-center gap-1">
              <i className="fas fa-check-circle"></i>
              Provider configured successfully
            </div>
          )}
        </div>
      )}
    </div>
  );
};
