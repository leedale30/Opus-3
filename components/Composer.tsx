
import React, { useState, useMemo } from 'react';
import { Play, Download, Wand2, BarChart2, Save, RefreshCw, Sparkles, Copy, FileCode, Cpu, Layers, CheckCircle, ArrowRight, Zap, Eye, EyeOff, TrendingUp, Plus, PlusCircle, Scale, Book, X, Wrench, MessageSquareWarning, FileJson, FileType, GitMerge, GraduationCap } from 'lucide-react';
import { generateComposition, analyzeComposition, enhanceComposition, addInstrumentsToComposition, convertToMusicXML, executeWorkflowStage, MODEL_NAME, ABC_PLUS_SPEC } from '../services/geminiService';
import { Composition, AppState, WorkflowStage, EditEvent } from '../types';
import { AnalysisDashboard } from './AnalysisDashboard';

interface Props {
  onSave: (comp: Composition) => void;
}

// Updated Stages Definition including CHORDS
const STAGES = [
  { id: WorkflowStage.PLANNING, label: 'Planning', desc: 'Strategy & Dataset Selection' },
  { id: WorkflowStage.FOUNDATION, label: 'Sketch', desc: 'Piano Reduction (Grand Staff)' },
  { id: WorkflowStage.MOTIF, label: 'Themes', desc: 'Melody & Counterpoint Definition' },
  { id: WorkflowStage.CHORDS, label: 'Chords', desc: 'Harmonic Structure & Progression' },
  { id: WorkflowStage.RHYTHM, label: 'Rhythm', desc: 'Rhythmic Identity' },
  { id: WorkflowStage.HARMONY, label: 'Voicing', desc: 'Voice Leading & Counterpoint' },
  { id: WorkflowStage.FORM, label: 'Form', desc: 'Structure & Thematic Return' },
  { id: WorkflowStage.TEXTURE, label: 'Sections', desc: 'Expand to WW/Brass/Str Sections' },
  { id: WorkflowStage.DYNAMICS, label: 'Full Orch', desc: 'Explode to Individual Insts' },
  { id: WorkflowStage.REFINEMENT, label: 'Detailing', desc: 'Dynamics, Articulations, Ornaments' },
  { id: WorkflowStage.FINAL_CHECK, label: 'Final', desc: 'Theory & Syntax Check' },
];

export const Composer: React.FC<Props> = ({ onSave }) => {
  const [prompt, setPrompt] = useState('');
  const [abcContent, setAbcContent] = useState('');
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [groundingUrls, setGroundingUrls] = useState<string[]>([]);
  const [instrumentInput, setInstrumentInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState(''); // New state for issue reporting
  const [showSyntaxGuide, setShowSyntaxGuide] = useState(false);
  
  // Workflow State
  const [isWorkflowMode, setIsWorkflowMode] = useState(false);
  const [currentStage, setCurrentStage] = useState<WorkflowStage>(WorkflowStage.PLANNING);

  // View Mode: 'timeline' shows all comments, 'clean' hides comments
  const [viewMode, setViewMode] = useState<'timeline' | 'clean'>('timeline');

  // Detect if the input looks like ABC notation (Standard start with X: or containing Header fields)
  const isAbcInput = useMemo(() => {
    return /^\s*X:\s*[0-9]+/m.test(prompt) || (/^\s*T:/m.test(prompt) && /^\s*K:/m.test(prompt));
  }, [prompt]);

  const displayedAbc = useMemo(() => {
    if (viewMode === 'timeline') return abcContent;
    // Remove lines starting with % and cleanup empty lines resulting from it
    return abcContent.replace(/^%.*$/gm, '').replace(/^\s*[\r\n]/gm, '');
  }, [abcContent, viewMode]);

  // --- AUTO DOWNLOADER HELPER ---
  const autoDownloadSnapshot = (comp: Composition) => {
      const versionIndex = comp.editHistory.length; 
      const lastEvent = comp.editHistory[comp.editHistory.length - 1];
      
      // Sanitized Title
      const titleSlug = comp.title.replace(/[^a-z0-9]/gi, '_').substring(0, 40);
      
      // Process Name
      const processSlug = lastEvent.type.replace(/_/g, '-');
      
      // Analysis Flag
      const analysisSlug = comp.analysis ? '_ANALYZED' : '';
      
      const filename = `${titleSlug}_v${versionIndex}_${processSlug}${analysisSlug}.txt`;
      
      let content = `METADATA\n`;
      content += `TITLE: ${comp.title}\n`;
      content += `VERSION: v${versionIndex}\n`;
      content += `TIMESTAMP: ${new Date().toISOString()}\n`;
      content += `PROCESS: ${lastEvent.type} - ${lastEvent.description}\n`;
      content += `PROMPT: ${comp.prompt}\n`;
      content += `==================================================\n\n`;
      
      if (comp.analysis) {
          content += `[ANALYSIS DATA]\n`;
          content += JSON.stringify(comp.analysis, null, 2);
          content += `\n\n==================================================\n\n`;
      }
      
      content += `[ABC NOTATION]\n`;
      content += comp.abcContent;
      
      // Trigger Download
      try {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
          console.error("Auto-download failed", e);
      }
  };

  const handleAction = async () => {
    if (!prompt.trim()) return;
    
    if (isAbcInput) {
        await handleAnalyzeInput();
    } else if (isWorkflowMode) {
        await handleWorkflowRun();
    } else {
        await handleGenerate();
    }
  };

  const createHistoryEvent = (
      type: EditEvent['type'], 
      description: string, 
      currentHistory: EditEvent[] = [], 
      snapshot: string
  ): EditEvent => {
      return {
          id: Date.now().toString(),
          timestamp: Date.now(),
          type,
          description,
          versionLabel: `Rev ${currentHistory.length + 1}`,
          abcSnapshot: snapshot
      };
  };

  const handleGenerate = async () => {
    setStatus(AppState.GENERATING);
    setGroundingUrls([]);
    try {
      const result = await generateComposition(prompt);
      setAbcContent(result.text);
      
      const initialEvent: EditEvent = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          type: 'CREATION',
          description: `Initial Generation: ${prompt}`,
          versionLabel: 'Rev 1',
          abcSnapshot: result.text
      };

      const newComp: Composition = {
        id: Date.now().toString(),
        title: prompt.slice(0, 30) + (prompt.length > 30 ? '...' : ''),
        prompt: prompt,
        abcContent: result.text,
        createdAt: Date.now(),
        isAnalyzed: false,
        editHistory: [initialEvent]
      };
      setComposition(newComp);
      autoDownloadSnapshot(newComp); // Auto-download
      setStatus(AppState.IDLE);

      // Extract URLs if available
      if (result.groundingMetadata?.groundingChunks) {
        const urls: string[] = [];
        result.groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri) urls.push(chunk.web.uri);
        });
        setGroundingUrls(Array.from(new Set(urls))); // Unique URLs
      }

    } catch (error) {
      console.error(error);
      setStatus(AppState.ERROR);
      // Reset after 3 seconds
      setTimeout(() => setStatus(AppState.IDLE), 3000);
    }
  };

  const handleWorkflowRun = async () => {
      setStatus(AppState.GENERATING);
      try {
          // If starting from foundation, we don't necessarily need existing ABC
          // But for subsequent stages, we pass the current abcContent
          const result = await executeWorkflowStage(currentStage, abcContent, prompt);
          setAbcContent(result);
          
          const stageLabel = STAGES.find(s => s.id === currentStage)?.label || currentStage;
          
          let newHistory: EditEvent[] = [];
          if (composition) {
              const event = createHistoryEvent('WORKFLOW_STAGE', `Completed Stage: ${stageLabel}`, composition.editHistory, result);
              newHistory = [...composition.editHistory, event];
          } else {
               const initialEvent: EditEvent = {
                  id: Date.now().toString(),
                  timestamp: Date.now(),
                  type: 'WORKFLOW_STAGE',
                  description: `Started Workflow at ${stageLabel}: ${prompt}`,
                  versionLabel: 'Stage 0',
                  abcSnapshot: result
              };
              newHistory = [initialEvent];
          }

          const newComp: Composition = {
            id: composition?.id || Date.now().toString(),
            title: composition?.title || prompt.slice(0, 30),
            prompt: prompt,
            abcContent: result,
            createdAt: composition?.createdAt || Date.now(),
            isAnalyzed: false,
            editHistory: newHistory
          };
          setComposition(newComp);
          onSave(newComp); // Auto-save on stage completion
          autoDownloadSnapshot(newComp); // Auto-download
          
          setStatus(AppState.IDLE);
      } catch (error) {
          console.error(error);
          setStatus(AppState.ERROR);
          setTimeout(() => setStatus(AppState.IDLE), 3000);
      }
  };

  const advanceStage = () => {
      const currentIndex = STAGES.findIndex(s => s.id === currentStage);
      if (currentIndex < STAGES.length - 1) {
          setCurrentStage(STAGES[currentIndex + 1].id);
      }
  };

  const handleAnalyzeInput = async () => {
      setStatus(AppState.ANALYZING);
      setGroundingUrls([]);
      
      const content = prompt;
      setAbcContent(content);
      
      const initialEvent: EditEvent = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          type: 'IMPORT',
          description: `Imported ABC Notation`,
          versionLabel: 'Import',
          abcSnapshot: content
      };

      // Create a temp composition object so the UI shows it immediately
      const newComp: Composition = {
        id: Date.now().toString(),
        title: 'Imported Analysis',
        prompt: 'Imported ABC Notation',
        abcContent: content,
        createdAt: Date.now(),
        isAnalyzed: false,
        editHistory: [initialEvent]
      };
      setComposition(newComp);

      try {
        const data = await analyzeComposition(content);
        
        // Append analysis summary to ABC content history
        const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const summaryLog = `\n% ANALYSIS [${timestamp}]: ${data.comprehensiveLexiconAnalysis?.expertCommentary?.slice(0, 300).replace(/\n/g, ' ')}...`;
        const updatedAbc = content + summaryLog;
        
        setAbcContent(updatedAbc);
        
        const analysisEvent = createHistoryEvent('ANALYSIS', 'Performed Deep Analysis', newComp.editHistory, updatedAbc);

        const updatedComp = { 
            ...newComp, 
            analysis: data, 
            isAnalyzed: true, 
            abcContent: updatedAbc,
            editHistory: [...newComp.editHistory, analysisEvent]
        };
        setComposition(updatedComp);
        onSave(updatedComp);
        autoDownloadSnapshot(updatedComp); // Auto-download only after full analysis
        
        setStatus(AppState.IDLE);
      } catch (error) {
        console.error(error);
        setStatus(AppState.ERROR);
        setTimeout(() => setStatus(AppState.IDLE), 3000);
      }
  };

  const handleAnalyze = async () => {
    if (!composition) return;
    setStatus(AppState.ANALYZING);
    try {
      const data = await analyzeComposition(composition.abcContent);
      
      // Append analysis summary to ABC content history
      const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const summaryLog = `\n% ANALYSIS [${timestamp}]: ${data.comprehensiveLexiconAnalysis?.expertCommentary?.slice(0, 300).replace(/\n/g, ' ')}...`;
      const updatedAbc = composition.abcContent + summaryLog;
      setAbcContent(updatedAbc);

      const event = createHistoryEvent('ANALYSIS', 'Re-analyzed composition', composition.editHistory, updatedAbc);

      const updatedComp = { 
          ...composition, 
          analysis: data, 
          isAnalyzed: true, 
          abcContent: updatedAbc,
          editHistory: [...composition.editHistory, event]
      };
      setComposition(updatedComp);
      onSave(updatedComp);
      autoDownloadSnapshot(updatedComp); // Auto-download
      setStatus(AppState.IDLE);
    } catch (error) {
        setStatus(AppState.ERROR);
        setTimeout(() => setStatus(AppState.IDLE), 3000);
    }
  };

  const handleUpgrade = async () => {
      if (!composition) return;
      setStatus(AppState.GENERATING);
      try {
          const instruction = "Iteratively UPGRADE this piece. Analyze its current state and apply the next logical improvement (e.g., enhanced harmony, counterpoint, richer texture, or expressive dynamics). Do not simply change it, make it BETTER and more professional. Build upon the existing structure.";
          
          const newAbc = await enhanceComposition(composition.abcContent, instruction, composition.prompt);
          setAbcContent(newAbc);
          
          const event = createHistoryEvent('REFINEMENT', 'Applied Iterative Upgrade (Gemini 3 Pro)', composition.editHistory, newAbc);

          const updatedComp = { 
              ...composition, 
              abcContent: newAbc, 
              isAnalyzed: false, 
              analysis: undefined,
              editHistory: [...composition.editHistory, event]
          };
          setComposition(updatedComp);
          onSave(updatedComp); // Auto-save on upgrade
          autoDownloadSnapshot(updatedComp); // Auto-download
          
          setStatus(AppState.IDLE);
      } catch (error) {
          setStatus(AppState.ERROR);
          setTimeout(() => setStatus(AppState.IDLE), 3000);
      }
  };

  // NEW: Handle user-reported issues
  const handleCustomFix = async () => {
      if (!composition || !feedbackInput.trim()) return;
      setStatus(AppState.GENERATING);
      try {
          // Pass the user's specific feedback as the instruction
          const newAbc = await enhanceComposition(composition.abcContent, feedbackInput, composition.prompt);
          setAbcContent(newAbc);
          
          const event = createHistoryEvent('FIX', `User Reported Issue: ${feedbackInput}`, composition.editHistory, newAbc);

          const updatedComp = { 
              ...composition, 
              abcContent: newAbc, 
              isAnalyzed: false, 
              analysis: undefined,
              editHistory: [...composition.editHistory, event]
          };
          setComposition(updatedComp);
          onSave(updatedComp); 
          setFeedbackInput('');
          autoDownloadSnapshot(updatedComp); // Auto-download
          
          setStatus(AppState.IDLE);
      } catch (error) {
          setStatus(AppState.ERROR);
          setTimeout(() => setStatus(AppState.IDLE), 3000);
      }
  };

  const handleAddInstrument = async () => {
      if (!composition || !instrumentInput.trim()) return;
      setStatus(AppState.GENERATING);
      try {
          const newAbc = await addInstrumentsToComposition(composition.abcContent, instrumentInput, composition.prompt);
          setAbcContent(newAbc);
          
          const event = createHistoryEvent('ORCHESTRATION', `Added Instruments: ${instrumentInput}`, composition.editHistory, newAbc);

          const updatedComp = { 
              ...composition, 
              abcContent: newAbc, 
              isAnalyzed: false, 
              analysis: undefined,
              editHistory: [...composition.editHistory, event]
          };
          setComposition(updatedComp);
          onSave(updatedComp); 
          setInstrumentInput('');
          autoDownloadSnapshot(updatedComp); // Auto-download
          
          setStatus(AppState.IDLE);
      } catch (error) {
          setStatus(AppState.ERROR);
          setTimeout(() => setStatus(AppState.IDLE), 3000);
      }
  };

  const handleFixOrExtend = async (type: 'FIX' | 'EXTEND') => {
      if (!composition) return;
      setStatus(AppState.GENERATING);
      try {
          const instruction = type === 'FIX' 
            ? "Fix any rhythm errors, check bar lines, and ensure the key signature matches the notes."
            : "Extend this piece by adding another section (B part) or variation that complements the original melody.";
          
          const newAbc = await enhanceComposition(composition.abcContent, instruction, composition.prompt);
          setAbcContent(newAbc);
          
          const event = createHistoryEvent(
              type === 'FIX' ? 'FIX' : 'EXTENSION', 
              type === 'FIX' ? 'Fixed rhythm/syntax errors' : 'Extended composition (Section B/Variation)', 
              composition.editHistory, 
              newAbc
          );

          const updatedComp = { 
              ...composition, 
              abcContent: newAbc, 
              isAnalyzed: false, 
              analysis: undefined,
              editHistory: [...composition.editHistory, event]
          };
          setComposition(updatedComp);
          onSave(updatedComp); // Auto-save on refinement
          autoDownloadSnapshot(updatedComp); // Auto-download
          
          setStatus(AppState.IDLE);
      } catch (error) {
          setStatus(AppState.ERROR);
          setTimeout(() => setStatus(AppState.IDLE), 3000);
      }
  };
  
  // NEW: Handle variation/theme development
  const handleVariation = async () => {
      if (!composition) return;
      setStatus(AppState.GENERATING);
      try {
          const instruction = "Introduce a variation of the main melodic theme in a new section or as a development of an existing theme, ensuring it complements the original while offering contrast. Retain the core identity but explore new harmonic or rhythmic territory.";
          
          const newAbc = await enhanceComposition(composition.abcContent, instruction, composition.prompt);
          setAbcContent(newAbc);
          
          const event = createHistoryEvent('VARIATION', 'Created Thematic Variation', composition.editHistory, newAbc);

          const updatedComp = { 
              ...composition, 
              abcContent: newAbc, 
              isAnalyzed: false, 
              analysis: undefined,
              editHistory: [...composition.editHistory, event]
          };
          setComposition(updatedComp);
          onSave(updatedComp); 
          autoDownloadSnapshot(updatedComp); // Auto-download
          
          setStatus(AppState.IDLE);
      } catch (error) {
          setStatus(AppState.ERROR);
          setTimeout(() => setStatus(AppState.IDLE), 3000);
      }
  };
  
  // NEW: Handle Full Study Score Annotation
  const handleFullAnnotation = async () => {
      if (!composition) return;
      setStatus(AppState.GENERATING);
      try {
          const instruction = "TRANSFORM THIS INTO A STUDY SCORE: Add detailed educational annotations throughout the score. 1. Mark sections (Theme A, Bridge, etc.) using boxed text ('^Boxed Text'). 2. Add harmonic analysis comments or chord symbols if missing. 3. Add performance notes as text annotations ('^Play lightly'). 4. Explain interesting theoretical moments using comments (%) or text. Make it perfect for music students to analyze.";
          
          const newAbc = await enhanceComposition(composition.abcContent, instruction, composition.prompt);
          setAbcContent(newAbc);
          
          const event = createHistoryEvent('ANNOTATION', 'Generated Full Educational Study Score', composition.editHistory, newAbc);

          const updatedComp = { 
              ...composition, 
              abcContent: newAbc, 
              isAnalyzed: false, 
              analysis: undefined,
              editHistory: [...composition.editHistory, event]
          };
          setComposition(updatedComp);
          onSave(updatedComp); 
          autoDownloadSnapshot(updatedComp); // Auto-download
          
          setStatus(AppState.IDLE);
      } catch (error) {
          setStatus(AppState.ERROR);
          setTimeout(() => setStatus(AppState.IDLE), 3000);
      }
  };
  
  const handleRectifyRanges = async () => {
      if (!composition) return;
      setStatus(AppState.GENERATING);
      try {
          const instruction = "PERFORM RIGOROUS RANGE CHECK: Check every single note for every instrument against professional ranges. If out of range, transpose to the nearest valid octave. Document EVERY change with a comment (e.g. % RECTIFIED: Flute C8 -> C7).";
          
          const newAbc = await enhanceComposition(composition.abcContent, instruction, composition.prompt);
          setAbcContent(newAbc);
          
          const event = createHistoryEvent('RECTIFICATION', 'Rigorous Instrument Range Rectification', composition.editHistory, newAbc);

          const updatedComp = { 
              ...composition, 
              abcContent: newAbc, 
              isAnalyzed: false, 
              analysis: undefined,
              editHistory: [...composition.editHistory, event]
          };
          setComposition(updatedComp);
          onSave(updatedComp); 
          autoDownloadSnapshot(updatedComp); // Auto-download
          
          setStatus(AppState.IDLE);
      } catch (error) {
          setStatus(AppState.ERROR);
          setTimeout(() => setStatus(AppState.IDLE), 3000);
      }
  };

  const handleExpertApply = async (instruction: string) => {
    if (!composition) return;
    setStatus(AppState.GENERATING);
    try {
        const newAbc = await enhanceComposition(composition.abcContent, instruction, composition.prompt);
        setAbcContent(newAbc);
        
        const event = createHistoryEvent('RECTIFICATION', `Applied Expert Fix: ${instruction.slice(0, 50)}...`, composition.editHistory, newAbc);

        const updatedComp = { 
            ...composition, 
            abcContent: newAbc, 
            isAnalyzed: false, 
            analysis: undefined,
            editHistory: [...composition.editHistory, event]
        };
        setComposition(updatedComp);
        onSave(updatedComp); // Auto-save on expert fix
        autoDownloadSnapshot(updatedComp); // Auto-download
        
        setStatus(AppState.IDLE);
    } catch (error) {
        setStatus(AppState.ERROR);
        setTimeout(() => setStatus(AppState.IDLE), 3000);
    }
  };

  const handleDownloadMusicXML = async () => {
      if (!abcContent || !composition) return;
      setStatus(AppState.GENERATING);
      try {
          const xmlContent = await convertToMusicXML(abcContent);
          
          const blob = new Blob([xmlContent], { type: 'application/vnd.recordare.musicxml+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const safeTitle = composition.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          
          a.href = url;
          a.download = `${safeTitle}.musicxml`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          setStatus(AppState.IDLE);
      } catch (e) {
          console.error(e);
          setStatus(AppState.ERROR);
          setTimeout(() => setStatus(AppState.IDLE), 3000);
      }
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(abcContent);
  };

  const handleCopySpec = () => {
      navigator.clipboard.writeText(ABC_PLUS_SPEC);
  };

  const handleCopySpecJson = () => {
      // Basic parser to convert markdown table to JSON
      const lines = ABC_PLUS_SPEC.split('\n');
      const jsonSpec: any = {};
      let currentSection = '';

      lines.forEach(line => {
          if (line.startsWith('## ')) {
              currentSection = line.replace('## ', '').trim();
              jsonSpec[currentSection] = [];
          } else if (line.startsWith('|') && !line.includes('---')) {
              // Parse table row
              const parts = line.split('|').map(p => p.trim()).filter(p => p);
              if (parts.length >= 2 && parts[0] !== 'ABC+' && parts[0] !== 'Command') {
                  // Skip headers
                  jsonSpec[currentSection].push({
                      command: parts[0],
                      meaning: parts[1],
                      xmlTarget: parts[2] || undefined
                  });
              }
          }
      });
      
      navigator.clipboard.writeText(JSON.stringify(jsonSpec, null, 2));
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-8 pb-20">
      
      {/* Input Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
                <label className="block text-sm font-medium text-gray-400">
                    {isWorkflowMode ? 'Workflow Foundation' : 'Composition Prompt'}
                    {!isWorkflowMode && <span className="text-gray-500 font-normal ml-2">or paste ABC notation</span>}
                </label>
                
                {/* Workflow Toggle */}
                <button 
                    onClick={() => setIsWorkflowMode(!isWorkflowMode)}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all border ${isWorkflowMode ? 'bg-purple-900/40 text-purple-300 border-purple-500/50' : 'bg-gray-800 text-gray-500 border-gray-700'}`}
                >
                    <Layers className="w-3 h-3" />
                    {isWorkflowMode ? 'WORKFLOW MODE ON' : 'QUICK COMPOSE'}
                </button>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-950/80 px-2 py-1 rounded border border-gray-800">
                    <Cpu className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-mono tracking-wider">
                        NOTAGEN WEIGHTS (L20/H1280)
                    </span>
                </div>
                <div className="flex items-center gap-1 bg-gray-950/80 px-2 py-1 rounded border border-gray-800">
                    <Zap className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] text-indigo-400 font-mono tracking-wider uppercase">
                        {MODEL_NAME}
                    </span>
                </div>
            </div>
        </div>

        {/* WORKFLOW STEPPER */}
        {isWorkflowMode && (
            <div className="mb-6 overflow-x-auto pb-2 custom-scrollbar">
                <div className="flex items-center min-w-max gap-2">
                    {STAGES.map((stage, idx) => {
                        const isActive = currentStage === stage.id;
                        const isPast = STAGES.findIndex(s => s.id === currentStage) > idx;
                        
                        return (
                            <div 
                                key={stage.id} 
                                onClick={() => setCurrentStage(stage.id as WorkflowStage)}
                                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all cursor-pointer select-none
                                    ${isActive ? 'bg-purple-900/30 border-purple-500 text-purple-200' : 
                                      isPast ? 'bg-gray-800/50 border-gray-700 text-gray-400 opacity-70 hover:opacity-100' : 'bg-transparent border-transparent text-gray-600'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    {isPast ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <div className={`w-3 h-3 rounded-full border-2 ${isActive ? 'border-purple-400 bg-purple-400' : 'border-gray-600'}`} />}
                                    <span className="text-xs font-bold uppercase">{stage.label}</span>
                                </div>
                                <span className="text-[9px] opacity-70">{stage.desc}</span>
                            </div>
                        )
                    })}
                </div>
                <div className="h-px bg-gray-800 mt-2 mx-2" />
            </div>
        )}

        <div className="flex gap-4 items-start">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={isWorkflowMode ? "Define your foundation: e.g., 'A brooding String Quartet in C Minor, Largo tempo, ABA Form'" : "e.g., 'A melancholic violin solo in D minor' OR paste standard ABC code..."}
            className="flex-1 bg-gray-950 border border-gray-700 text-gray-100 rounded-xl p-4 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-24 transition-all font-mono"
            disabled={status !== AppState.IDLE}
          />
          
          <div className="flex flex-col gap-2">
              <button
                onClick={handleAction}
                disabled={status !== AppState.IDLE || !prompt.trim()}
                className={`
                    h-24 w-32 rounded-xl flex flex-col items-center justify-center gap-2 font-semibold transition-all relative overflow-hidden
                    ${status !== AppState.IDLE 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                        : isAbcInput
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50 hover:scale-105'
                            : isWorkflowMode
                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/50 hover:scale-105'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 hover:scale-105'
                    }
                    active:scale-95
                `}
              >
                {status === AppState.GENERATING || status === AppState.ANALYZING ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                ) : isAbcInput ? (
                    <BarChart2 className="w-6 h-6" />
                ) : isWorkflowMode ? (
                    <Layers className="w-6 h-6" />
                ) : (
                    <Sparkles className="w-6 h-6" />
                )}
                <span className="text-xs text-center px-1">
                    {status === AppState.GENERATING ? 'Working...' : 
                     status === AppState.ANALYZING ? 'Analyzing...' :
                     isAbcInput ? 'Analyze ABC' : 
                     isWorkflowMode ? `Run ${STAGES.find(s => s.id === currentStage)?.label}` : 'Compose'}
                </span>
              </button>
          </div>
        </div>
        
        {isWorkflowMode && (
             <div className="flex justify-end mt-2">
                <button 
                    onClick={advanceStage}
                    disabled={status !== AppState.IDLE || STAGES.findIndex(s => s.id === currentStage) === STAGES.length - 1}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
                >
                    Next Stage <ArrowRight className="w-3 h-3" />
                </button>
            </div>
        )}

        {groundingUrls.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 flex items-center">
                    <img src="https://www.google.com/favicon.ico" className="w-3 h-3 mr-1 opacity-50" />
                    Sources:
                </span>
                {groundingUrls.map((url, idx) => (
                    <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline truncate max-w-[200px]"
                    >
                        {new URL(url).hostname}
                    </a>
                ))}
            </div>
        )}
      </div>

      {/* Results Section */}
      {abcContent && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Toolbar */}
            <div className="bg-gray-900/50 p-2 rounded-lg border border-gray-800 backdrop-blur-sm sticky top-4 z-10 space-y-2 shadow-2xl">
                 <div className="flex flex-wrap items-center gap-4">
                     {/* Upgrade / Refine */}
                     <button 
                        onClick={handleUpgrade}
                        disabled={status !== AppState.IDLE}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-colors border border-gray-700/50 shadow-sm"
                    >
                        <TrendingUp className="w-4 h-4 text-yellow-400" />
                        Refine / Upgrade
                    </button>

                    {/* Add Instrument Box */}
                    <div className="flex items-center gap-2 bg-gray-950 p-1.5 rounded-lg border border-gray-700 shadow-inner">
                        <PlusCircle className="w-4 h-4 text-emerald-400 ml-1" />
                        <input 
                            type="text" 
                            value={instrumentInput}
                            onChange={(e) => setInstrumentInput(e.target.value)}
                            placeholder="Add Instrument (e.g. Oboe)..."
                            className="bg-transparent border-none text-xs text-white placeholder-gray-500 focus:ring-0 outline-none w-48 font-mono"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddInstrument()}
                            disabled={status !== AppState.IDLE}
                        />
                        <button 
                            onClick={handleAddInstrument}
                            disabled={status !== AppState.IDLE || !instrumentInput.trim()}
                            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 hover:text-white rounded text-xs text-gray-400 transition-colors border border-gray-700"
                        >
                            Add
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-700 mx-2" />

                    <button 
                        onClick={() => handleFixOrExtend('EXTEND')}
                        disabled={status !== AppState.IDLE}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-colors"
                    >
                        <Wand2 className="w-4 h-4 text-purple-400" />
                        Extend
                    </button>
                    
                    <button 
                        onClick={handleVariation}
                        disabled={status !== AppState.IDLE}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-colors"
                    >
                        <GitMerge className="w-4 h-4 text-cyan-400" />
                        Develop Theme
                    </button>

                     <button 
                        onClick={() => handleFixOrExtend('FIX')}
                        disabled={status !== AppState.IDLE}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 text-emerald-400" />
                        Fix Errors
                    </button>
                    
                    {/* NEW: Annotate Button */}
                     <button 
                        onClick={handleFullAnnotation}
                        disabled={status !== AppState.IDLE}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-colors"
                    >
                        <GraduationCap className="w-4 h-4 text-pink-400" />
                        Annotate for Study
                    </button>
                    
                    <button 
                        onClick={handleRectifyRanges}
                        disabled={status !== AppState.IDLE}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-colors"
                    >
                        <Scale className="w-4 h-4 text-orange-400" />
                        Rectify Ranges
                    </button>
                    <div className="h-6 w-px bg-gray-700 mx-2" />
                    <button 
                        onClick={handleAnalyze}
                        disabled={status !== AppState.IDLE}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-200 transition-colors"
                    >
                        <BarChart2 className="w-4 h-4 text-blue-400" />
                        Re-Analyze
                    </button>
                    <div className="flex-1" />
                    
                    <button 
                        onClick={handleDownloadMusicXML}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title="Download MusicXML"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleCopy}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title="Copy ABC"
                    >
                        <Copy className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => composition && onSave(composition)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title="Save to Library"
                    >
                        <Save className="w-5 h-5" />
                    </button>
                 </div>
                 
                 {/* FEEDBACK & FIX BOX */}
                 <div className="flex items-center gap-2 w-full bg-gray-950/50 p-2 rounded-lg border border-gray-700/50">
                    <MessageSquareWarning className="w-4 h-4 text-orange-400 ml-2" />
                    <input 
                        type="text" 
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder="Report an issue to fix (e.g. 'Bar 12 violins are out of range', 'Make the ending louder')..."
                        className="flex-1 bg-transparent border-none text-xs text-gray-200 placeholder-gray-500 focus:ring-0 outline-none font-mono"
                        onKeyDown={(e) => e.key === 'Enter' && handleCustomFix()}
                        disabled={status !== AppState.IDLE}
                    />
                    <button 
                        onClick={handleCustomFix}
                        disabled={status !== AppState.IDLE || !feedbackInput.trim()}
                        className="px-3 py-1.5 bg-orange-900/20 hover:bg-orange-900/40 text-orange-400 border border-orange-500/30 rounded text-xs font-bold transition-all flex items-center gap-2"
                    >
                        <Wrench className="w-3 h-3" />
                        Fix Issue
                    </button>
                </div>
            </div>

            {/* Analysis Dashboard */}
            {composition?.analysis && (
                <AnalysisDashboard 
                    data={composition.analysis} 
                    onApplyFixes={handleExpertApply}
                    isApplying={status === AppState.GENERATING}
                />
            )}

            <div className="flex flex-col gap-6">
                
                {/* Raw ABC Editor */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col h-[600px] shadow-lg relative">
                    <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2">
                        <div className="flex items-center gap-4">
                             <span className="text-xs font-mono text-gray-500">RAW ABC NOTATION</span>
                             <button 
                                onClick={() => setViewMode(viewMode === 'timeline' ? 'clean' : 'timeline')}
                                className="flex items-center gap-1 text-[10px] bg-gray-800 px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                             >
                                {viewMode === 'timeline' ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 text-gray-400" />}
                                <span className={viewMode === 'timeline' ? 'text-emerald-400' : 'text-gray-400'}>
                                    {viewMode === 'timeline' ? 'Full Timeline & History' : 'Clean Notation'}
                                </span>
                             </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowSyntaxGuide(!showSyntaxGuide)}
                                className="text-[10px] text-indigo-400 flex items-center gap-1 hover:text-indigo-300"
                            >
                                <Book className="w-3 h-3" />
                                ABC+ Syntax Guide
                            </button>
                            <span className="text-[10px] text-gray-600">Editable</span>
                        </div>
                    </div>
                    
                    <textarea 
                        value={displayedAbc}
                        onChange={(e) => {
                            // Only allow editing in timeline mode to prevent accidental deletion of hidden history
                            if (viewMode === 'timeline') {
                                setAbcContent(e.target.value)
                            }
                        }}
                        readOnly={viewMode === 'clean'}
                        className={`abc-editor flex-1 bg-gray-950 text-emerald-400 font-mono text-xs p-4 rounded-lg resize-none outline-none border border-gray-800 focus:border-emerald-500/50 ${viewMode === 'clean' ? 'opacity-80' : ''}`}
                        spellCheck={false}
                    />
                     {viewMode === 'clean' && (
                        <div className="mt-2 text-[10px] text-gray-500 italic text-center">
                            Note: Switch to Timeline view to edit or see history logs.
                        </div>
                    )}

                    {/* Syntax Guide Modal Overlay */}
                    {showSyntaxGuide && (
                        <div className="absolute inset-4 bg-gray-900/95 backdrop-blur-md z-20 rounded-lg border border-indigo-500/50 flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center p-4 border-b border-gray-800">
                                <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                                    <Book className="w-4 h-4" />
                                    ABC+ Command Dictionary
                                </h3>
                                
                                <div className="flex items-center gap-2">
                                     <button 
                                        onClick={handleCopySpec}
                                        className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs border border-gray-700"
                                        title="Copy as Markdown for AI Prompts"
                                    >
                                        <FileType className="w-3 h-3 text-emerald-400" />
                                        Copy Spec (Markdown)
                                    </button>
                                    <button 
                                        onClick={handleCopySpecJson}
                                        className="flex items-center gap-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs border border-gray-700"
                                        title="Copy as JSON for Code Parsers"
                                    >
                                        <FileJson className="w-3 h-3 text-orange-400" />
                                        Copy Spec (JSON)
                                    </button>
                                    <div className="w-px h-4 bg-gray-700 mx-2" />
                                    <button onClick={() => setShowSyntaxGuide(false)} className="text-gray-400 hover:text-white">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar text-xs font-mono text-gray-300 whitespace-pre-wrap">
                                {ABC_PLUS_SPEC}
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
      )}
    </div>
  );
};
