
export interface Composition {
  id: string;
  title: string;
  prompt: string;
  abcContent: string;
  createdAt: number;
  analysis?: AnalysisData;
  isAnalyzed: boolean;
  fullReport?: string; // Markdown content of the deep musicological timeline/report
  editHistory: EditEvent[]; // Full audit trail
}

export interface EditEvent {
  id: string;
  timestamp: number;
  type: 'CREATION' | 'REFINEMENT' | 'EXTENSION' | 'FIX' | 'RECTIFICATION' | 'ORCHESTRATION' | 'ANALYSIS' | 'WORKFLOW_STAGE' | 'IMPORT' | 'VARIATION' | 'ANNOTATION';
  description: string;
  versionLabel: string; // e.g. "Rev 1", "Stage 2"
  abcSnapshot?: string; // Optional: Store state for rollback capability
}

export enum WorkflowStage {
  PLANNING = 'PLANNING',     // Deep Thought, Strategy, Dataset Selection
  FOUNDATION = 'FOUNDATION', // Concept, Form, Key, Header
  MOTIF = 'MOTIF',           // Thematic Definition (Melody & Counter-Melody)
  CHORDS = 'CHORDS',         // NEW: Harmonic Structure & Progression (Roadmap)
  RHYTHM = 'RHYTHM',         // Meter, Motifs, Phrase Structure
  HARMONY = 'HARMONY',       // Voice Leading, Counterpoint (Renamed to "Voicing" in UI)
  FORM = 'FORM',             // Structure Expansion (Intro, Outro, Repeats)
  TEXTURE = 'TEXTURE',       // Instrumentation, Voices, Bass line
  DYNAMICS = 'DYNAMICS',     // Articulations, Dynamics, Expression
  REFINEMENT = 'REFINEMENT', // Extension, Variation, Polish
  FINAL_CHECK = 'FINAL_CHECK' // Theory Validation, Syntax Check
}

export interface InstrumentRangeAnalysis {
    instrument: string;
    percentInRange: number; // 0-100
    percentProfessional: number; // 0-100 (Comfortable range)
    issues: string[]; // Specific notes that are out of range e.g. "Bar 4: High C is out of range for Oboe"
    overallRating: 'PERFECT' | 'GOOD' | 'STRAINED' | 'IMPOSSIBLE';
}

export interface ZedClefAnalysis {
    isCompliant: boolean;
    balanceScore: number; // 0-100
    intervalSpread: string; // e.g., "10th (Unbalanced)" or "6th (Balanced)"
    issues: string[];
    rectificationPlan: string; // Specific instructions on how to re-voice chords to fix it
    abcVisualization?: string; // The generated Zed Staff ABC code
}

export interface AnalysisData {
  keyLikelihood: { key: string; confidence: number }[];
  noteDistribution: { note: string; count: number }[];
  intervalJumps: { interval: string; count: number }[];
  musicalAttributes: {
    complexity: number;
    dissonance: number;
    rhythmicVariety: number;
    melodicContour: number;
    tonalStability: number;
  };
  genreFit: string;
  suggestions: string[];
  
  // New Technical Analysis Fields
  instrumentRanges?: InstrumentRangeAnalysis[];
  zedClefData?: ZedClefAnalysis;

  statisticalAnalysis?: {
    chiSquared: string;
    correlation: string;
    anova: string;
    variance: string;
  };
  datasetBenchmarks?: {
    tegridySimilarity: number;
    millionSongSimilarity: number;
    structuralRarity: number;
    closestTegridyMatch: string;
    // Extended Datasets
    maestroExpressivity: number; // 0-100, Piano performance alignment
    lakhMidiCorrelation: number; // 0-100, Structural alignment with pop/rock MIDI
    gtzanGenreMatch: string; // Genre classification based on GTZAN
    musicNetComplexity: number; // 0-100, Classical density/counterpoint
    weimarJazzImprovRating: number; // 0-100, Jazz vocabulary alignment
    magnaTagATuneLabels: string[]; // Semantic tags
  };
  deepAnalysis?: {
    emotionalProfile: {
        valence: number; // -1 to 1
        arousal: number; // 0 to 1
        dominantEmotion: string;
    };
    theoreticalFrameworks: {
        schenkerian: string; // Urlinie/Ursatz
        gttm: string; // Generative Theory of Tonal Music
        neoRiemannian: string; // Transformational theory
    };
    impliedAudioFeatures: {
        estimatedTempo: number;
        spectralCentroid: string;
        onsetDensity: number;
    };
  };
  advancedTraitModeling?: {
    jSymbolic: {
        melodicIntervalHistogram: number[]; // 12 bins for intervals
        verticalIntervalHistogram: number[]; // 12 bins for chord intervals
        chordDensity: number; // Chords per measure
        rhythmicSyncopation: number; // 0-1
    };
    stylisticFingerprint: {
        harmonicEntropy: number; // Complexity of chord progressions
        voiceLeadingSmoothness: number; // 0-100 (100 = smooth)
        chromaticismIndex: number; // 0-100
        orchestralTexture: string; // Description of implied texture
    };
  };
  comprehensiveLexiconAnalysis?: {
      expertCommentary: string; // The "Team" voice summary
      actionableFeedback: string; // Direct instructions for improvement
      
      // 1. Core Musical Elements
      coreElements: {
          rhythmAndMetre: string;
          melodyAndHarmony: string;
          timbreAndTexture: string;
          structureAndForm: string;
          dynamicsAndTonality: string; // Expanded
      };
      
      // 2. Sound Sources and Techniques
      soundSourcesAndTechniques: {
          instrumentationAndOrganology: string; // Instruments, construction, history
          techniquesAndImprovisation: string; // Vocal styles, extended techniques, improv
      };

      // 3. Cultural and Historical Context
      culturalContext: {
          historicalBackground: string;
          socialFunction: string;
          performancePractice: string; // Staging, ritual, attire
          economicsAndPatronage: string; // Funding, market, support
          keyInfluences: string; // Key Works, Key Composers
      };

      // 4. Language, Literacy, and Theory
      theoreticalFramework: {
          keyTerminology: string[];
          theoreticalSystem: string;
          notationAndOralTradition: string; // How it's recorded/transmitted
      };

      // 5. Technology and Innovation
      technologyAndInnovation: {
          productionAndDistribution: string; // Recording, media, streaming
          hybridizationAndTech: string; // Fusion, synthesis
      };

      // 6. Analytical Perspectives
      analyticalPerspectives: {
          genreAndAesthetics: string; // Style classification, beauty values
          socialPoliticalContext: string; // Commentary, movements
          audienceAndReception: string; // How listeners engage
      };

      illustrativeAbcSnippets: {
          concept: string; // What is being shown
          explanation: string; // Why it matters
          abcCode: string; // The raw ABC code demonstrating it
      }[];
  };
}

export interface LexiconAnalysis {
  // ... existing fields if any, mapped into comprehensiveLexiconAnalysis above
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  ANALYZING = 'ANALYZING',
  ERROR = 'ERROR',
}

export interface GeminiResponse {
    text: string;
    groundingMetadata?: any;
}

declare global {
  interface Window {
    music21: any;
  }
}
