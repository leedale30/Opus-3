
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisData, GeminiResponse, WorkflowStage } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const MODEL_NAME = "gemini-3-pro-preview";
export const MODEL_NAME_FAST = "gemini-3-flash-preview";

export const JAZZ_DRUM_MAP = `
%%drummap BD   C2   36   % Bass Drum
%%drummap SN   D2   38   % Snare
%%drummap CH   F#2  42   % Closed Hi-Hat
%%drummap OH   A#2  46   % Open Hi-Hat
%%drummap CC   C#3  49   % Crash Cymbal
%%drummap RC   D#3  51   % Ride Cymbal
%%drummap TM   D3   47   % High Tom
%%drummap FT   F2   41   % Floor Tom
%%drummap PH   G#2  44   % Pedal Hi-Hat
%%drummap CS   C#2  37   % Cross-stick
%%drummap RB   F3   53   % Ride Bell
%%drummap SB   A6   91   % Snare Brush
%%drummap ST   G#6  92   % Snare Brush Stir
`;

// --- ABC+ SPECIFICATION DICTIONARY ---
export const ABC_PLUS_SPEC = `
# ABC+ Command Dictionary for Algorithmic Composition
### Machine-friendly + Musically meaningful + MusicXML-aligned

## 1. Articulations (Attack/Shape)
| ABC+ | Musical Meaning | MusicXML Target |
|---|---|---|
| !staccato! | Light, detached playing | <staccato/> |
| !tenuto! | Smooth, full-value emphasis | <tenuto/> |
| !accent! | Strong attack | <accent/> |
| !marcato! | Very forceful attack | <strong-accent/> |
| !pizz! | Plucked string sound | <pizzicato/> |
| !arco! | Return to bowing | <arco/> |
| !mute! | Softer, filtered tone | <mute/> |
| !open! | Open string/brass | <open-string/> |
| !harmonic! | Flute-like overtone | <harmonic/> |

## 2. Dynamics (Loudness/Shape)
| ABC+ | Musical Meaning | MusicXML Target |
|---|---|---|
| !p! | Soft (Piano) | <p/> |
| !mp! | Moderately soft | <mp/> |
| !mf! | Moderately loud | <mf/> |
| !f! | Loud (Forte) | <f/> |
| !ff! | Very loud | <ff/> |
| !subito-p! | Dramatic soft entry | <p/> + text |
| !subito-f! | Dramatic loud entry | <f/> + text |
| !cresc(start)! | Gradually louder | <wedge type="crescendo"/> |
| !cresc(end)! | End of swell | <wedge type="stop"/> |
| !dim(start)! | Gradually softer | <wedge type="diminuendo"/> |
| !dim(end)! | End of fade | <wedge type="stop"/> |

## 3. Placement (Engraving)
| ABC+ | Function |
|---|---|
| !p@above! | Place dynamic above staff |
| !f@below! | Place dynamic below staff |
| !text("sul G")@above! | Technique instruction above |
| !text("dolce")@x=10,y=20! | Absolute offset positioning |

## 4. Slurs (Phrasing)
| ABC+ | Function |
|---|---|
| (1slur-start | Start phrase (Slur 1) |
| (1slur-end | End phrase (Slur 1) |
| (2slur-start | Start nested sub-phrase |
| (2slur-end | End nested sub-phrase |

## 5. Beam Grouping
| ABC+ | Function |
|---|---|
| %%beam begin | Force beam start |
| %%beam end | Force beam end |

## 6. Tuplets
| ABC+ | Function |
|---|---|
| (3:2 tuplet-start | Start tuplet (3 in time of 2) |
| tuplet-end | End tuplet grouping |

## 7. Layout & Engraving
| ABC+ | Function |
|---|---|
| %%system-break | New line of music |
| %%page-break | Page turn |
| %%staff-spacing N | Vertical spacing |
| %%measure-numbering on | Show bar numbers |
| %%hide-rests | Hide rests (Cue notation) |
| %%cue-size on | Small notes |
| %%transpose N | Instrument transposition |

## 8. Instrument Metadata
| ABC+ | Function |
|---|---|
| %%instrument V1 violin | Set instrument timbre |
| %%midi-program V1 41 | Set MIDI playback sound |
| %%sound V1 strings.violin | Detailed sound ID |

## 9. Percussion Mapping
| ABC+ | Function |
|---|---|
| %%perc V3 hi-hat x | Map hi-hat to 'x' notehead |
| %%perc V3 snare o | Map snare to normal notehead |
| %%perc V3 kick o | Map kick to normal notehead |
| JAZZ DRUMS | See system instructions for specific map |

## 10. Lyrics Enhancements
| ABC+ | Function |
|---|---|
| _melisma-start | One syllable over many notes |
| _melisma-end | End of melisma |
| "IPA:[tʃaː]" | Accurate phonetics |
| ~ | Elision (Two syllables as one) |

## 11. Expressive Text
| ABC+ | Function |
|---|---|
| !dolce! | Sweetly |
| !espressivo! | With expression |
| !rit.! | Slow down (Ritardando) |
`;

// STRICT INSTRUMENT DEFINITION FOR MUSESCORE COMPATIBILITY
const VALID_INSTRUMENTS_LIST = `
🎻 STRINGS:
   - Solo: Violin 1 (Solo), Violin 2 (Solo), Viola (Solo), Violoncello (Solo)
   - Section: Violins 1, Violins 2, Violas, Violoncellos, Contrabasses

🎺 BRASS:
   - Horns: Horn in F, Horns a6
   - Trumpets: Trumpet, Trumpets a4
   - Trombones: Trombone, Trombones a3, Bass Trombone, Bass Trombones a9
   - Low Brass: Cimbasso, Tuba

🎶 WOODWINDS:
   - Flutes: Flute 1, Flute 2, Piccolo, Alto Flute, Bass Flute, Contrabass Flute
   - Double Reeds: Oboe, English Horn, Bassoon, Contrabassoon
   - Clarinets: Clarinet in Eb, Clarinet in Bb, Bass Clarinet
   - Saxophones: Soprano Sax, Alto Sax, Tenor Sax, Baritone Sax

🥁 PERCUSSION (UNPITCHED):
   - Kits: Drum Kit, GM Drum Kit, Mixed Percussion (MUST USE CUSTOM MAP BELOW)
   - Drums: Bass Drum, Snare Drum, Field Drum, Marching Snares, Marching Bass Drums, Marching Tenors, Show Style Tenors, Bongos, Congas, Timbales, Toms, Taikos
   - Metals: Suspended Cymbal, Splash Cymbal, Tam-tam, Gong, China Cymbal, Piatti, Hand Cymbals, Triangle, Cowbell, Mark Tree, Sleigh Bells, Agogô
   - Woods/Shakers: Claves, Castanets, Wood Blocks, Temple Blocks, Tambourine, Shaker, Maracas, Cabasa, Guiro, Vibraslap, Cuica

🔔 PERCUSSION (PITCHED/MALLETS):
   - Glockenspiel, Xylophone, Marimba, Vibraphone, Tubular Bells, Crotales, Handbells, Handchimes, Music Box

🎹 KEYBOARDS:
   - Grand Piano, Upright Piano, Soft Piano, Dream Piano, Wurly 200A, Celesta, Harpsichord, Hammond Organ

🎸 GUITARS & BASSES:
   - Acoustic Nylon, Acoustic Steel, Electric Bass, Electric LP (Clean/Heavy), Electric SC (Clean/Heavy)

🎤 CHOIR:
   - Sopranos, Altos, Tenors, Basses, Full Choir, Women, Men
`;

// Helper to handle generation with strict model constraint
const generateContentStrict = async (params: { contents: any, config?: any, model?: string }) => {
    try {
        const response = await genAI.models.generateContent({
            model: params.model || MODEL_NAME,
            contents: params.contents,
            config: params.config
        });
        return response;
    } catch (error: any) {
        // Robust error parsing
        const errorCode = error.code || error.error?.code || error.status;
        const errorMessage = error.message || error.error?.message || JSON.stringify(error);
        
        const isQuotaError = 
            errorCode === 429 || 
            errorCode === 'RESOURCE_EXHAUSTED' || 
            (typeof errorMessage === 'string' && (
                errorMessage.includes('429') || 
                errorMessage.includes('quota') ||
                errorMessage.includes('RESOURCE_EXHAUSTED')
            ));

        if (isQuotaError) {
             console.error(`CRITICAL: Model ${params.model || MODEL_NAME} quota/rate limit hit.`);
             throw new Error(`Gemini service is currently unavailable due to quota limits. Please try again later.`);
        }
        throw error;
    }
};

// Helper for retrying transient errors
const withRetry = async <T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        // Check for specific error codes or generic network/server errors
        const errorCode = error.code || error.error?.code || error.status;
        const errorMessage = error.message || error.error?.message || JSON.stringify(error);

        const isRetryable = 
            errorCode === 500 || 
            (typeof errorMessage === 'string' && (
                errorMessage.includes('xhr error') || 
                errorMessage.includes('fetch failed') ||
                errorMessage.includes('Rpc failed')
            )) ||
            error.status === 'UNKNOWN';

        if (retries > 0 && isRetryable) {
            console.warn(`API Error (${errorMessage}). Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(operation, retries - 1, delay * 2); // Exponential backoff
        }
        throw error;
    }
};

// Helper to clean ABC output (Remove markdown, fix blank lines)
const cleanAbcOutput = (text: string): string => {
    if (!text) return "";
    
    // Remove markdown code blocks
    let clean = text.replace(/^```abc\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
    
    // FIX: Replace completely blank lines with % to prevent parsers from treating them as end-of-tune
    // Regex matches start of line, zero or more whitespace, end of line, globally, multiline
    clean = clean.replace(/^\s*$/gm, "%");
    
    // Remove multiple consecutive spacer comments to avoid clutter
    clean = clean.replace(/(^%\n){2,}/gm, "%\n");

    return clean.trim();
};

// Smart Dataset Selector
const getContextualDatasets = (prompt: string): string => {
  const p = prompt.toLowerCase();
  let selected = ["Tegridy MIDI (Structural Patterns)"]; // Always include base symbolic logic

  const isClassical = p.match(/classical|orchestr|symphon|piano|baroque|chamber|sonata|mozart|bach|beethoven/);
  const isJazz = p.match(/jazz|blues|swing|bebop|improv|sax|coltrane/);
  const isPop = p.match(/pop|rock|dance|electronic|beat|song|metal|guitar|drum/);

  if (isClassical) {
    selected.push("MusicNet (Classical Harmony)", "MAESTRO (Expressive Timing)");
  } 
  
  if (isJazz) {
     selected.push("Weimar Jazz Database (Improvisation)", "GTZAN (Jazz Features)");
  }
  
  if (isPop) {
     selected.push("Lakh MIDI (Pop/Rock Structure)", "Million Song Dataset (Sequencing)");
  }
  
  // If no specific genre detected, add a balanced general set
  if (!isClassical && !isJazz && !isPop) {
     selected.push("Lakh MIDI (General)", "GTZAN (General Genres)");
  }

  return selected.join(", ");
};

const STAGE_LABELS: Record<WorkflowStage, string> = {
    [WorkflowStage.PLANNING]: "(Stage 0: Planning)",
    [WorkflowStage.FOUNDATION]: "(Stage 1: Piano Sketch)",
    [WorkflowStage.MOTIF]: "(Stage 2: Thematic Definition)",
    [WorkflowStage.CHORDS]: "(Stage 3: Harmonic Structure)",
    [WorkflowStage.RHYTHM]: "(Stage 4: Rhythm Dev)",
    [WorkflowStage.HARMONY]: "(Stage 5: Voice Leading)",
    [WorkflowStage.FORM]: "(Stage 6: Form Expansion)",
    [WorkflowStage.TEXTURE]: "(Stage 7: Sectional Expansion)",
    [WorkflowStage.DYNAMICS]: "(Stage 8: Full Orchestration)",
    [WorkflowStage.REFINEMENT]: "(Stage 9: Detailing)",
    [WorkflowStage.FINAL_CHECK]: "(Stage 10: Final Check)"
};

export const executeWorkflowStage = async (stage: WorkflowStage, currentAbc: string, userPrompt: string): Promise<string> => {
    return withRetry(async () => {
        const activeDatasets = getContextualDatasets(userPrompt);

        let systemInstruction = `
            You are an expert AI Composer running a strict "Orchestral Reduction-to-Expansion" Workflow.
            Your output must be valid ABC Notation only.
            
            CONTEXTUAL DATASETS ACTIVE: ${activeDatasets}.

            =============================================================
            🚨 CRITICAL MISSION CONTROL - ANTI-DRIFT PROTOCOL 🚨
            ORIGINAL USER PROMPT: "${userPrompt}"
            
            YOU MUST ADHERE TO THIS PROTOCOL:
            1. RE-READ THE ORIGINAL PROMPT ABOVE RIGHT NOW.
            2. COMPARE the current music to this Original Prompt.
            3. CHECK FOR DRIFT: Has the mood, genre, or instrumentation strayed? 
            4. CORRECTION: If the current state has drifted (e.g. became happy when it should be sad), YOU MUST FIX IT IN THIS STAGE.
            5. ALIGNMENT: Every new note, chord, or instrument choice must strictly serve the Original Mission: "${userPrompt}".
            =============================================================

            GLOBAL RULES:
            1. COMPOSER: Always set 'C: Antony Leedale'.
            2. HISTORY PRESERVATION: The input ABC contains a history of AI decisions in '%' comments. YOU MUST RETAIN THESE COMMENTS. Do not delete them. Append your new stage decisions as new '%' comments below the existing ones.
            3. SYNTAX: Ensure all ABC syntax is valid and engraving-safe.
            4. THEORY: Adhere to strict music theory rules (voice leading, form). STRICTLY respect the playable range of the assigned instruments. Do not write notes that are physically impossible.
            5. SPACING: No blank lines. Use '%' for spacers.
            6. SCORE LAYOUT: When using '%%score', always use SQUARE BRACKETS [ ] to group staves. Never use parentheses ( ). Example: %%score [V1 V2] [V3 V4].
            7. PERCUSSION/DRUMS: 
               - If adding drums, YOU MUST assign them to MIDI Channel 10 using '%%midi channel 10' in the voice definition.
               - Use 'clef=perc'.
               - STRICTLY FORBIDDEN: Do NOT use voice IDs 'V:HvyPerc' or 'V:AuxPerc'. These are invalid. Use 'V:Percussion', 'V:Drums', or 'V:Perc1'.
               - JAZZ DRUM MAPPING (If composing Jazz, you MUST include these lines in the ABC header and use these notes):
                 ${JAZZ_DRUM_MAP}
               - CUSTOM KEY MAPPING (For "Mixed Percussion" on one stave, USE THIS EXACTLY):
                 * D#1=Closed Hi-Hat, E1=Pedal Hi-Hat, F1=Open Hi-Hat, F#1=Ride Cymbal, G1=Stick Click
                 * C2=Bass Drum, C#2=Snare Rim, D2=Snare, F2=Low Tom, G2=Mid Tom, A2=High Tom
                 * E3=Tam-Tam, F#3=Tambourine, G3=Splash Cymbal, G#3=Cowbell, A3=Suspended Cymbal, A#3=Vibraslap, B3=Hand Cymbals
                 * C4=Hi Bongo, C#4=Lo Bongo, D4=Mute Hi Conga, D#4=Hi Conga, E4=Lo Conga
                 * F4=Hi Timbale, F#4=Lo Timbale, G4=Hi Agogo, G#4=Lo Agogo, A4=Cabasa, A#4=Maracas, B4=Long Whistle
                 * C5=Short Whistle, C#5=Short Guiro, D5=Long Guiro, D#5=Claves, E5=Hi Woodblock, F5=Lo Woodblock
                 * F#5=Mute Cuica, G5=Open Cuica, G#5=Mute Triangle, A5=Triangle, A#5=Shaker, B5=Sleigh Bells
                 * C6=Mark Tree, C#6=Castanets, D6=Taiko Rim, D#6=Taiko
            8. CHORD SYMBOLS: You MUST include explicit chord symbols (e.g. "C", "Dm7", "G7") in double quotes above the staff for every bar or harmonic change. This is critical for the editing workflow.
            9. CONCERT PITCH: ALL OUTPUT MUST BE IN CONCERT PITCH (C SCORE). Do not transpose parts for transposing instruments (e.g. Horn in F, Bb Clarinet). Write all notes exactly as they sound. The user will handle transposition later.

            STRICT ABC+ COMPLIANCE PROTOCOL:
            1. PREFER ABC+ SYNTAX: You MUST use the ABC+ dictionary below for all dynamics, articulations, and technical marks.
            2. NO LEGACY DYNAMICS: Do NOT use quoted text for dynamics (e.g., use !f! instead of "f").
            3. NO STANDARD SHORTCUTS: If an ABC+ command exists (like !staccato!), use it instead of shortcuts (like .).
            4. REASON: This ensures compatibility with downstream XML converters and educational tools.

            ABC+ COMMAND SPECIFICATION (STRICT ADHERENCE REQUIRED):
            ${ABC_PLUS_SPEC}
        `;

        let stagePrompt = "";

        switch (stage) {
            case WorkflowStage.PLANNING:
                systemInstruction += `
                    STAGE 0: DEEP THOUGHT PLANNING.
                    - Do not write music notes yet.
                    - Analyze the user request deeply using your knowledge of: ${activeDatasets}.
                    - Plan the Structure (Forms), Key, Instrumentation, and Texture.
                    - Strategize on Rhythm and Motif.
                    - CALCULATE TIMINGS: If user gave duration, calculate total bars needed now.
                    - OUTPUT: A block of '%' comments detailing this plan. E.g. "% STAGE PLANNING: Selected C Minor for gravitas..."
                `;
                stagePrompt = `Create a deep strategic plan for: ${userPrompt}. Output ONLY ABC comments (starting with %) describing this plan.`;
                break;

            case WorkflowStage.FOUNDATION:
                systemInstruction += `
                    STAGE 1: FOUNDATION (Piano Reduction / Sketch).
                    - Create a GRAND STAFF (V:1 Treble, V:2 Bass) Piano Sketch.
                    - Do NOT write for full orchestra yet. Write a condensed "Short Score" containing all musical information.
                    - Set Key (K:), Meter (M:), Default Length (L:), Title (T:).
                    - Define the main themes and harmonic skeleton.
                    - Include CHORD SYMBOLS ("Cm", "G7") above the staff.
                    - CHECK AGAINST ORIGINAL PROMPT ("${userPrompt}"): Does this sketch capture the essence?
                    - OUTPUT: ABC Header + Piano Grand Staff Skeleton.
                    - COMMENTARY: Append '% STAGE FOUNDATION: Created Piano Short Score'.
                `;
                stagePrompt = `Create the foundational Piano Reduction (Short Score) for: ${userPrompt}. Preserve existing % comments.`;
                break;

            case WorkflowStage.MOTIF:
                 systemInstruction += `
                    STAGE 2: THEMATIC DEFINITION (Melody & Counter-Melody).
                    - Working within the Piano Reduction (V:1, V:2), explicitly DEFINE the melodic identity.
                    - Write the "Theme A" (Main Subject).
                    - Write a distinct "Counter-Melody" or "Theme B" (Secondary Subject).
                    - Ensure they have distinct rhythmic profiles.
                    - You may harmonize them loosely, but the focus here is on the LINE.
                    - CHECK AGAINST ORIGINAL PROMPT: Is the melody in the requested style?
                    - OUTPUT: Piano Reduction with clear Melodic Lines.
                    - COMMENTARY: Append '% STAGE MOTIF: Defined Theme A and Counter-Melody'.
                 `;
                 stagePrompt = `Define the Main Melody (Theme A) and a Counter-Melody for this sketch. Ensure they are catchy and distinct: \n${currentAbc}`;
                 break;

            case WorkflowStage.CHORDS:
                systemInstruction += `
                    STAGE 3: HARMONIC STRUCTURE (Chord Progression).
                    - Focus ONLY on the Chords/Harmony.
                    - You have the Melody (Motif). Now harmonize it.
                    - DO NOT just use I-IV-V-I. Use genre-appropriate complexity (e.g., Jazz = ii-V-I, extensions; Classical = Secondary Dominants, Diminished 7ths).
                    - WRITE THE CHORD SYMBOLS ("Cm7", "F9") explicitly in the ABC using double quotes.
                    - The notes on the staff should reflect these chords (block chords or simple arpeggios are fine here, focusing on the VERTICAL structure).
                    - PREPARE FOR FORM: If you plan a B section later, define its key/mode here in comments (e.g. "% PLAN: Section B will modulate to Eb Major").
                    - CHECK AGAINST ORIGINAL PROMPT: Is the harmony too simple or too complex for the requested genre?
                    - OUTPUT: Piano Sketch with DEFINITIVE Chord Symbols.
                    - COMMENTARY: Append '% STAGE CHORDS: Defined harmonic progression'.
                `;
                stagePrompt = `Harmonize this melody with a sophisticated Chord Progression. Write explicit Chord Symbols ("Dm7") above the staff. Avoid generic loops: \n${currentAbc}`;
                break;

            case WorkflowStage.RHYTHM:
                systemInstruction += `
                    STAGE 4: RHYTHMIC DEVELOPMENT (Piano Sketch).
                    - Working within the Piano Reduction (V:1, V:2), refine the rhythmic identity.
                    - Add accompaniment patterns (Albertibass, Arpeggios) or rhythmic motifs to the sketch.
                    - Ensure the sketch is rhythmically solid before orchestration.
                    - Maintain all CHORD SYMBOLS.
                    - CHECK AGAINST ORIGINAL PROMPT: Does the rhythm have the correct energy/tempo?
                    - OUTPUT: Refined Piano Reduction ABC.
                    - COMMENTARY: Append '% STAGE RHYTHM: Refined motivic rhythm in sketch'.
                `;
                stagePrompt = `Apply rhythmic structure to this Piano Reduction: \n${currentAbc}`;
                break;

            case WorkflowStage.HARMONY:
                systemInstruction += `
                    STAGE 5: VOICE LEADING & COUNTERPOINT (Piano Sketch).
                    - Working within the Piano Reduction, fill in the full harmony.
                    - Ensure voice leading is smooth (no parallel fifths).
                    - This is your last chance to fix notes before orchestration.
                    - Ensure explicit CHORD SYMBOLS are present for every bar.
                    - OUTPUT: Completed Piano Reduction ready for expansion.
                    - COMMENTARY: Append '% STAGE HARMONY: Completed harmonic framework'.
                `;
                stagePrompt = `Complete the harmony and counterpoint for this Piano Reduction: \n${currentAbc}`;
                break;

            case WorkflowStage.FORM:
                systemInstruction += `
                    STAGE 6: FORM EXPANSION (Piano Sketch).
                    - You have the basic themes and harmony (Short Score).
                    - Now EXPAND this into a full-length piece (e.g. Intro -> A -> B -> A' -> C -> Outro).
                    - CRITICAL RULE 1 (THEMATIC RECURRENCE): If the form is A-B-A, the final 'A' MUST be the return of the original Theme A.
                    - CRITICAL RULE 2 (HARMONIC VARIETY): 
                      * When adding Section B or Bridge, you MUST use a DIFFERENT chord progression than Section A.
                      * Modulate to the Relative Major/Minor or Dominant. 
                      * Do NOT copy-paste the chords from A to B.
                    - Use Repeats (!::!) where appropriate to save space, or write out variations (A').
                    - KEEP IT AS A PIANO REDUCTION (Grand Staff). Do not orchestrate yet.
                    - Maintain correct CHORD SYMBOLS throughout the expanded form.
                    - OUTPUT: Full-length Piano Reduction.
                    - COMMENTARY: Append '% STAGE FORM: Expanded sketch to full length structure'.
                `;
                stagePrompt = `Expand the structure of this Piano Reduction into a full-length piece. IMPORTANT: Ensure Section B uses a NEW Chord Progression (Contrast), and Main Theme (A Section) RETURNS at the end: \n${currentAbc}`;
                break;

            case WorkflowStage.TEXTURE:
                systemInstruction += `
                    STAGE 7: SECTIONAL EXPANSION (Orchestration Tier 1).
                    - EXPAND the Piano Reduction into SECTIONAL STAVES.
                    - Instead of V:1/V:2, create voices for the main sections using these names:
                      V:Woodwinds
                      V:Brass
                      V:Strings
                    - Assign the notes from the piano sketch to these sections based on timbre.
                    - Distribute the MELODY (Theme A) between sections. Do not let one section have it all.
                    - KEEP THE CHORD SYMBOLS (usually on the top staff/Woodwinds or a dedicated Chord voice).
                    - ANTI-LAZINESS: Do not just give the Strings whole notes. Give them movement!
                    - CHECK AGAINST ORIGINAL PROMPT: Is the orchestration density correct for the request?
                    - OUTPUT: ABC with Sectional Staves (e.g., %%score [Woodwinds] [Brass] [Strings]).
                    - COMMENTARY: Append '% STAGE TEXTURE: Expanded to Sectional Staves'.
                `;
                stagePrompt = `Orchestrate this Piano Reduction into Sections (Woodwinds, Brass, Strings). AVOID STATIC PADS. Give each section independent movement: \n${currentAbc}`;
                break;

            case WorkflowStage.DYNAMICS:
                // NOTE: We repurpose the "DYNAMICS" enum slot for "FULL ORCHESTRATION" to fit the user's requested pipeline
                systemInstruction += `
                    STAGE 8: FULL ORCHESTRAL EXPLOSION (Orchestration Tier 2).
                    - EXPLODE the Sectional Staves into INDIVIDUAL INSTRUMENTS.
                    - YOU MUST USE INSTRUMENT NAMES FROM THIS VALID LIST ONLY:
                    ${VALID_INSTRUMENTS_LIST}
                    
                    - Example: instead of "Violin", use "Violin 1 (Solo)" or "Violins 1".
                    - Example: instead of "Horns", use "Horns a6" or "Horn in F".
                    
                    - ADD PERCUSSION on Channel 10. If using "Mixed Percussion", apply the Custom Map.
                    - DO NOT USE 'V:HvyPerc' or 'V:AuxPerc'. Use 'V:Percussion', 'V:Drums', or 'V:Perc1'.
                    - Ensure every instrument is in its correct playable range (in CONCERT PITCH).
                    - Ensure CHORD SYMBOLS are preserved at the top of the system (usually V:1).
                    - ANTI-LAZINESS: Ensure 2nd Violins and Violas have interesting parts, not just 'footballs' (whole notes).
                    - CHECK AGAINST ORIGINAL PROMPT: Are the chosen instruments correct for the genre?
                    - OUTPUT: Full Orchestral Score with individual staves.
                    - COMMENTARY: Append '% STAGE FULL_ORCH: Exploded to full instrumentation'.
                `;
                stagePrompt = `Explode these sections into a Full Orchestral Score using the specific instrument list provided. Ensure rhythmic vitality in ALL parts: \n${currentAbc}`;
                break;

            case WorkflowStage.REFINEMENT:
                systemInstruction += `
                    STAGE 9: DETAILING & POLISH.
                    - Now that the notes are assigned, add EXPRESSION.
                    - USE ABC+ COMMANDS FOR ALL MARKINGS.
                    - IMPLEMENT THE FULL MUSICALITY CHECKLIST:
                      1. EXPRESSIVE MARKINGS:
                         - Tempo: "rit." (ritardando), "accel." (accelerando), "rubato", "a tempo" (Text annotations above staff, e.g. "^rit.").
                         - Dynamics: !pp!, !f!, !cresc(start)!, !cresc(end)!.
                      2. ARTICULATIONS & ORNAMENTS (MANDATORY):
                         - Staccato: !staccato!
                         - Legato: (1slur-start ... (1slur-end
                         - Accent: !accent!
                         - Marcato: !marcato!
                         - Trills: !trill!
                         - Mordents: !mordent!
                      3. PERFORMANCE GUIDANCE:
                         - Strings: !upbow!, !downbow!, !pizz!, !arco!.
                         - Winds: Breath marks (!breath!).
                    - Refine specific instrument idioms (e.g. pizzicato for strings).
                    - CHECK CHORD SYMBOLS: Ensure they are still present and aligned.
                    - CONVERSION: If you see old-style dynamics like "f" or staccato dots, CONVERT them to !f! and !staccato!.
                    - OUTPUT: Detailed Full Score.
                    - COMMENTARY: Append '% STAGE DETAILING: Added dynamics, articulations, and tempo changes'.
                `;
                stagePrompt = `Add dynamics, articulations (!staccato!, !accent!), and ornaments (!trill!) using ABC+ Syntax to this full score. Convert any legacy markings to ABC+: \n${currentAbc}`;
                break;

            case WorkflowStage.FINAL_CHECK:
                systemInstruction += `
                    STAGE 10: FINAL CHECK & LEVEL-UP.
                    - Run a strict Music Theory Validation on the Full Score.
                    - ZED CLEF CHECK: Ensure tessitural balance across the orchestra.
                    - RANGE CHECK: Ensure no instrument is playing out of bounds (Check CONCERT PITCH ranges).
                    - PERC CHECK: Verify Channel 10 for drums and CUSTOM MAPPING usage. Verify NO 'V:HvyPerc' or 'V:AuxPerc' are used.
                    - CHORD SYMBOL CHECK: Verify chords are displayed.
                    - THEMATIC CHECK: Verify the main theme returns at the end if the form requires it.
                    - DRIFT CHECK: Final comparison against Original Prompt ("${userPrompt}").
                    - SYNTAX CHECK: Ensure all dynamics use !...! syntax (ABC+) and not quotes.
                    - OUTPUT: The Final, Finished ABC Score.
                    - COMMENTARY: Append '% STAGE FINAL CHECK: Confirmed orchestral validity'.
                `;
                stagePrompt = `Perform final theory, syntax (ABC+), and range validation on this orchestral score: \n${currentAbc}`;
                break;
        }

        const response = await generateContentStrict({
            contents: stagePrompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.5, // Lower temperature for structural adherence
            }
        });

        let text = response.text || "";
        
        // Clean ABC output (Blank lines -> comments)
        text = cleanAbcOutput(text);

        // FIX: %%score syntax - enforce [] instead of ()
        text = text.replace(/^%%score\s+(.*)$/gm, (match, args) => {
             return "%%score " + args.replace(/\(/g, "[").replace(/\)/g, "]");
        });

        // Ensure Composer
        if (!text.match(/^C:.*Antony Leedale.*$/m)) {
             if (text.match(/^C:.*$/m)) {
                text = text.replace(/^C:.*$/m, "C:Antony Leedale");
            } else if (text.match(/^T:.*$/m)) {
                 text = text.replace(/^(T:.*)$/m, "$1\nC:Antony Leedale");
            }
        }

        // Update Title with Stage info
        const stageLabel = STAGE_LABELS[stage];
        if (stageLabel && text.match(/^T:/m)) {
             text = text.replace(/^T:(.*?)(\s*\(Stage \d+:.*?\))?\s*$/m, (match, title) => {
                return `T:${title.trim()} ${stageLabel}`;
            });
        }

        return text;
    });
};

export const generateComposition = async (prompt: string): Promise<GeminiResponse> => {
    const systemInstruction = `
      You are an expert AI Composer. Your task is to generate valid ABC Notation based on the user's prompt.
      Adhere to strict music theory rules.
      Output ONLY the ABC notation.
      Include metadata headers (T:, C: Antony Leedale, M:, L:, K:).
      CRITICAL: ALL OUTPUT MUST BE IN CONCERT PITCH (C SCORE). Do not transpose parts. Write all notes as they sound.
      
      FOR JAZZ DRUMS, USE THIS MAPPING:
      ${JAZZ_DRUM_MAP}

      STRICT ABC+ COMPLIANCE:
      1. For Dynamics, you MUST use the !...! syntax (e.g., !mf!, !cresc(start)!). Do NOT use quoted text like "mf".
      2. For Articulations, you MUST use the !...! syntax (e.g., !staccato!).
      3. Refer to the ABC+ Command Dictionary below for the exact codes.

      Use the following ABC+ specifications for dynamics and articulations:
      ${ABC_PLUS_SPEC}
    `;
  
    const activeDatasets = getContextualDatasets(prompt);
  
    const response = await generateContentStrict({
      contents: `Compose a piece based on this prompt: "${prompt}". \nContextual Datasets: ${activeDatasets}`,
      config: {
        systemInstruction,
        temperature: 0.7,
        tools: [{googleSearch: {}}],
      }
    });
  
    let text = response.text || "";
    // Clean Output
    text = cleanAbcOutput(text);
  
    return {
      text,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata
    };
  };
  
  export const analyzeComposition = async (abcContent: string): Promise<AnalysisData> => {
      const systemInstruction = `
          You are a computational musicologist. Analyze the provided ABC notation.
          Return a valid JSON object matching the following structure exactly.
          Do not return Markdown formatting. Just the JSON string.
          
          Structure:
          {
            "keyLikelihood": [{"key": string, "confidence": number}],
            "noteDistribution": [{"note": string, "count": number}],
            "intervalJumps": [{"interval": string, "count": number}],
            "musicalAttributes": {
              "complexity": number (0-1),
              "dissonance": number (0-1),
              "rhythmicVariety": number (0-1),
              "melodicContour": number (0-1),
              "tonalStability": number (0-1)
            },
            "genreFit": string,
            "suggestions": string[],
            "instrumentRanges": [
               { "instrument": string, "percentInRange": number, "percentProfessional": number, "issues": string[], "overallRating": "PERFECT"|"GOOD"|"STRAINED"|"IMPOSSIBLE" }
            ],
            "zedClefData": {
               "isCompliant": boolean, "balanceScore": number, "intervalSpread": string, "issues": string[], "rectificationPlan": string
            },
            "datasetBenchmarks": {
              "tegridySimilarity": number,
              "millionSongSimilarity": number,
              "structuralRarity": number,
              "closestTegridyMatch": string,
              "maestroExpressivity": number,
              "lakhMidiCorrelation": number,
              "gtzanGenreMatch": string,
              "musicNetComplexity": number,
              "weimarJazzImprovRating": number,
              "magnaTagATuneLabels": string[]
            },
            "deepAnalysis": {
              "emotionalProfile": { "valence": number, "arousal": number, "dominantEmotion": string },
              "theoreticalFrameworks": { "schenkerian": string, "gttm": string, "neoRiemannian": string },
              "impliedAudioFeatures": { "estimatedTempo": number, "spectralCentroid": string, "onsetDensity": number }
            },
            "advancedTraitModeling": {
               "jSymbolic": {
                  "melodicIntervalHistogram": number[],
                  "verticalIntervalHistogram": number[],
                  "chordDensity": number,
                  "rhythmicSyncopation": number
               },
               "stylisticFingerprint": {
                  "harmonicEntropy": number,
                  "voiceLeadingSmoothness": number,
                  "chromaticismIndex": number,
                  "orchestralTexture": string
               }
            },
            "comprehensiveLexiconAnalysis": {
                "expertCommentary": string,
                "actionableFeedback": string,
                "coreElements": { "rhythmAndMetre": string, "melodyAndHarmony": string, "timbreAndTexture": string, "structureAndForm": string, "dynamicsAndTonality": string },
                "soundSourcesAndTechniques": { "instrumentationAndOrganology": string, "techniquesAndImprovisation": string },
                "culturalContext": { "historicalBackground": string, "socialFunction": string, "performancePractice": string, "economicsAndPatronage": string, "keyInfluences": string },
                "theoreticalFramework": { "keyTerminology": string[], "theoreticalSystem": string, "notationAndOralTradition": string },
                "technologyAndInnovation": { "productionAndDistribution": string, "hybridizationAndTech": string },
                "analyticalPerspectives": { "genreAndAesthetics": string, "socialPoliticalContext": string, "audienceAndReception": string },
                "illustrativeAbcSnippets": []
            }
          }
      `;
  
      const response = await generateContentStrict({
          contents: `Analyze this ABC notation:\n${abcContent}`,
          config: {
              systemInstruction,
              responseMimeType: "application/json"
          }
      });
  
      try {
          const text = response.text || "{}";
          return JSON.parse(text) as AnalysisData;
      } catch (e) {
          console.error("Failed to parse analysis JSON", e);
          throw new Error("Analysis failed to produce valid JSON.");
      }
  };
  
  export const enhanceComposition = async (abcContent: string, instruction: string, originalPrompt: string): Promise<string> => {
      const systemInstruction = `
          You are an expert Composer/Arranger.
          Modify the provided ABC notation based on the user's instruction.
          Preserve the original musical intent unless asked to change it.
          Ensure valid ABC syntax.
          If asked to fix ranges, check strict instrument ranges.
          CRITICAL: ALL OUTPUT MUST BE IN CONCERT PITCH (C SCORE). Do not transpose parts.
          
          FOR JAZZ DRUMS, USE THIS MAPPING:
          ${JAZZ_DRUM_MAP}

          STRICT ABC+ COMPLIANCE:
          1. For Dynamics, you MUST use the !...! syntax (e.g., !mf!, !cresc(start)!). Do NOT use quoted text like "mf".
          2. For Articulations, you MUST use the !...! syntax (e.g., !staccato!).
          3. Refer to the ABC+ Command Dictionary below for the exact codes.

          Use ABC+ syntax:
          ${ABC_PLUS_SPEC}
      `;
  
      const response = await generateContentStrict({
          contents: `Original Request: ${originalPrompt}\nInstruction: ${instruction}\n\nCurrent ABC:\n${abcContent}`,
          config: { systemInstruction }
      });
      
      let text = response.text || "";
      // Clean Output
      text = cleanAbcOutput(text);
      
      return text;
  };
  
  export const addInstrumentsToComposition = async (abcContent: string, instruments: string, originalPrompt: string): Promise<string> => {
       const systemInstruction = `
          You are an expert Orchestrator.
          Add the requested instruments to the existing ABC score.
          Write appropriate parts for these instruments that complement the existing music.
          Maintain the same Key and Meter.
          Use standard instrument names from this list:
          ${VALID_INSTRUMENTS_LIST}
          CRITICAL: ALL OUTPUT MUST BE IN CONCERT PITCH (C SCORE). Do not transpose parts.
          
          FOR JAZZ DRUMS, USE THIS MAPPING:
          ${JAZZ_DRUM_MAP}
      `;
  
      const response = await generateContentStrict({
          contents: `Original Request: ${originalPrompt}\nAdd Instruments: ${instruments}\n\nCurrent ABC:\n${abcContent}`,
          config: { systemInstruction }
      });
  
      let text = response.text || "";
      // Clean Output
      text = cleanAbcOutput(text);

      return text;
  };
  
  export const convertToMusicXML = async (abcContent: string): Promise<string> => {
      // Since we don't have a local converter, we ask Gemini to do it.
      // Ideally this should be done by a library like abc2xml, but for this exercise we use the LLM.
      const systemInstruction = `
          Convert the provided ABC notation to valid MusicXML 3.0 format.
          Return ONLY the XML code.
      `;
      
      const response = await generateContentStrict({
          contents: abcContent,
          config: { systemInstruction }
      });
      
      let text = response.text || "";
       if (text.startsWith("```xml")) text = text.replace(/^```xml\s*/, "").replace(/\s*```$/, "");
      else if (text.startsWith("```")) text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
      return text;
  };
  
  export const generateDeepMusicologyReport = async (abcContent: string, title: string): Promise<string> => {
       const systemInstruction = `
          You are a world-renowned musicologist.
          Write a comprehensive, deep-dive Markdown report on the provided piece of music.
          Cover:
          1. Structural Analysis (Form, Phrasing)
          2. Harmonic Analysis (Progressions, Modulations, Schenkerian overview)
          3. Texture & Orchestration
          4. Historical Stylistic Context (even if generated, analyze its style)
          5. Detailed Measure-by-Measure commentary for key moments.
          
          Format as clear Markdown.
      `;
      
      const response = await generateContentStrict({
          contents: `Title: ${title}\n\nScore:\n${abcContent}`,
          config: { systemInstruction }
      });
      
      return response.text || "";
  };