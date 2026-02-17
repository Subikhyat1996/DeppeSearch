
import React from 'react';
import { GroundingChunk } from '../types';

interface SourceBadgeProps {
  source: GroundingChunk;
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({ source }) => {
  if (!source.web) return null;
  
  const domain = new URL(source.web.uri).hostname.replace('www.', '');

  return (
    <a 
      href={source.web.uri} 
      target="_blank" 
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-colors"
    >
      <i className="fas fa-link text-[10px] opacity-70"></i>
      <span className="max-w-[120px] truncate">{source.web.title || domain}</span>
    </a>
  );
};
