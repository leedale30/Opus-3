
import React, { useState } from 'react';
import { Composer } from './components/Composer';
import { Composition, EditEvent } from './types';
import { Music, LayoutGrid, Info, Github, FileText, Download, BookOpen, Loader2, History, ChevronDown, ChevronUp, Clock, GitCommit } from 'lucide-react';
import { generateDeepMusicologyReport } from './services/geminiService';

export default function App() {
  const [view, setView] = useState<'composer' | 'library'>('composer');
  const [library, setLibrary] = useState<Composition[]>([]);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const handleSave = (comp: Composition) => {
    // Check if ID exists, update if so, else add
    const exists = library.find(c => c.id === comp.id);
    if (exists) {
        setLibrary(library.map(c => c.id === comp.id ? comp : c));
    } else {
        setLibrary([comp, ...library]);
    }
  };

  const handleGenerateReport = async (comp: Composition) => {
      setGeneratingReportId(comp.id);
      try {
          const report = await generateDeepMusicologyReport(comp.abcContent, comp.title);
          const updatedComp = { ...comp, fullReport: report };
          handleSave(updatedComp);
      } catch (e) {
          console.error("Failed to generate report", e);
      } finally {
          setGeneratingReportId(null);
      }
  };

  const handleDownloadReport = (comp: Composition) => {
      if (!comp.fullReport) return;
      const blob = new Blob([comp.fullReport], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${comp.title.replace(/[^a-z0-9]/gi, '_')}_Commentary.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleExportLibrary = () => {
      let fullContent = `# OPUS INFINITE LIBRARY EXPORT\n`;
      fullContent += `Generated: ${new Date().toLocaleString()}\n`;
      fullContent += `Total Compositions: ${library.length}\n\n`;
      fullContent += `---\n\n`;

      library.forEach((comp, index) => {
          fullContent += `# ${index + 1}. ${comp.title}\n`;
          fullContent += `**Date:** ${new Date(comp.createdAt).toLocaleString()}\n`;
          fullContent += `**Prompt:** ${comp.prompt}\n\n`;
          
          if (comp.fullReport) {
              fullContent += `## FULL COMPOSITION COMMENTARY & ANALYSIS\n`;
              fullContent += `${comp.fullReport}\n\n`;
          } else {
              fullContent += `*No detailed commentary generated for this piece.*\n\n`;
          }

          fullContent += `## ABC NOTATION SOURCE\n`;
          fullContent += `\`\`\`abc\n${comp.abcContent}\n\`\`\`\n\n`;
          
          fullContent += `## EDIT HISTORY (AUDIT LOG)\n`;
          if (comp.editHistory && comp.editHistory.length > 0) {
              comp.editHistory.forEach(event => {
                  fullContent += `- [${new Date(event.timestamp).toLocaleTimeString()}] **${event.type}**: ${event.description}\n`;
              });
          } else {
              fullContent += `No history available.\n`;
          }

          fullContent += `\n---\n\n`;
      });

      const blob = new Blob([fullContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Opus_Infinite_Full_Library_Export.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 flex items-center gap-2">
            <Music className="w-8 h-8 text-indigo-500" />
            Opus
          </h1>
          <p className="text-xs text-gray-500 mt-2">Powered by Gemini 3 Pro</p>
        </div>

        <div className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setView('composer')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'composer' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
          >
            <Music className="w-5 h-5" />
            <span>Composer</span>
          </button>
          
          <button 
            onClick={() => setView('library')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'library' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span>Library ({library.length})</span>
          </button>
        </div>

        <div className="p-4 border-t border-gray-800">
           <div className="bg-gray-800/50 p-3 rounded-lg text-xs text-gray-500 leading-relaxed max-h-48 overflow-y-auto">
              <Info className="w-4 h-4 mb-2 text-gray-400" />
              Uses Gemini 3 Pro for composition & simulated Music21 analysis.
              <br/><br/>
              <span className="text-indigo-400">Music21j</span> & <span className="text-cyan-400">jSymbolic 2.2</span> loaded.
              <br/><br/>
              <span className="text-emerald-400">NotaGen</span> weights & <span className="text-lime-400">MelSpy</span> fingerprinting integrated.
              <br/><br/>
              <span className="font-semibold text-gray-300">Dynamic Context:</span>
              <p className="mt-1 text-[10px] text-gray-400 leading-normal">
                Datasets are now auto-selected based on genre (e.g. MusicNet for Classical, Lakh for Pop) to prevent style conflicts and save tokens.
              </p>
           </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-gray-950 to-gray-950 pointer-events-none" />
        
        <div className="relative z-10">
          {view === 'composer' && (
            <Composer onSave={handleSave} />
          )}

          {view === 'library' && (
            <div className="max-w-6xl mx-auto p-8">
              <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold text-white">Your Compositions</h2>
                  {library.length > 0 && (
                      <button 
                        onClick={handleExportLibrary}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm border border-gray-700 transition-colors"
                      >
                          <FileText className="w-4 h-4" />
                          Export Full Library Report (.md)
                      </button>
                  )}
              </div>
              
              {library.length === 0 ? (
                <div className="text-center py-20 text-gray-600">
                  <Music className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>No compositions yet. Go create something!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {library.map((comp) => (
                    <div key={comp.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-indigo-500/50 transition-colors group flex flex-col h-full">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-200 mb-2 truncate">{comp.title}</h3>
                        <p className="text-xs text-gray-500 mb-4 font-mono line-clamp-2">{comp.prompt}</p>
                        
                        <div className="h-32 bg-gray-950 rounded-lg p-2 overflow-hidden mb-4 opacity-50 group-hover:opacity-80 transition-opacity">
                            <pre className="text-[8px] text-gray-600 font-mono leading-none">
                                {comp.abcContent.slice(0, 300)}
                            </pre>
                        </div>
                        
                        {/* History Timeline Toggle */}
                        {comp.editHistory && comp.editHistory.length > 0 && (
                            <div className="mb-4">
                                <button 
                                    onClick={() => setExpandedHistoryId(expandedHistoryId === comp.id ? null : comp.id)}
                                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium w-full"
                                >
                                    <History className="w-3 h-3" />
                                    {expandedHistoryId === comp.id ? 'Hide Timeline' : `View Timeline (${comp.editHistory.length} events)`}
                                    {expandedHistoryId === comp.id ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                                </button>
                                
                                {expandedHistoryId === comp.id && (
                                    <div className="mt-3 pl-2 border-l-2 border-indigo-900 space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                                        {comp.editHistory.map((event, idx) => (
                                            <div key={event.id} className="relative">
                                                <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-gray-900" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                    <span className="text-xs text-indigo-300 font-bold">{event.type}</span>
                                                    <p className="text-[10px] text-gray-400 leading-tight">{event.description}</p>
                                                    {event.versionLabel && (
                                                        <span className="text-[9px] text-gray-600 font-mono mt-0.5">{event.versionLabel}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                      </div>

                      <div className="border-t border-gray-800 pt-4 mt-2 space-y-3">
                        <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>{new Date(comp.createdAt).toLocaleDateString()}</span>
                            {comp.isAnalyzed && <span className="text-green-500">Analyzed</span>}
                        </div>
                        
                        {/* Report Generation Section */}
                        {comp.fullReport ? (
                            <button
                                onClick={() => handleDownloadReport(comp)}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold transition-all"
                            >
                                <Download className="w-3 h-3" />
                                Download Full Commentary
                            </button>
                        ) : (
                            <button
                                onClick={() => handleGenerateReport(comp)}
                                disabled={generatingReportId === comp.id}
                                className="w-full flex items-center justify-center gap-2 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded text-xs font-medium transition-all disabled:opacity-50"
                            >
                                {generatingReportId === comp.id ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Analyzing History...
                                    </>
                                ) : (
                                    <>
                                        <BookOpen className="w-3 h-3" />
                                        Generate Full Commentary
                                    </>
                                )}
                            </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
