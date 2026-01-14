
# Opus 3.0 Infinite Mid - AI Composer Architecture

**Opus Infinite** is a state-of-the-art algorithmic composition and computational musicology platform powered by Google's **Gemini 3 Pro**. It implements a rigorous "Orchestral Reduction-to-Expansion" workflow, mimicking the cognitive processes of professional composers, combined with deep musicological analysis features, instrument range validation, and strict "Anti-Mission Drift" protocols.

---

## 🏗️ Technical Architecture

### Core Stack
*   **Runtime:** React 19 (via ESM imports in `index.html`)
*   **Language:** TypeScript (Strict Mode)
*   **AI Inference:** `@google/genai` SDK (v1.32.0)
*   **Styling:** Tailwind CSS (via CDN)
*   **Visualization:** Recharts (Radar, Bar, Scatter plots)
*   **Icons:** Lucide React
*   **Music Rendering:** Music21j (Client-side rendering & parsing)

### AI Model Strategy
The application utilizes a hybrid model approach:
*   **Logic & Structure:** `gemini-3-pro-preview` (Used for complex orchestration, theory validation, and deep analysis).
*   **Speed & Iteration:** `gemini-3-flash-preview` (Used for rapid prototyping or lower-level tasks).
*   **Prompt Engineering:** Implements "Chain-of-Thought" prompting with strict constraint injection (ABC+ Spec, Instrument Ranges).

---

## 🎼 The "Orchestral Reduction" Workflow

Opus Infinite does not generate music in a single pass. It utilizes a 10-stage **State Machine** to build compositions from the ground up, ensuring structural integrity.

| Stage | ID | Description |
|:---|:---|:---|
| **0** | `PLANNING` | **Deep Strategy:** Analyzes the prompt against datasets (Tegridy, MusicNet) to determine form, key, and texture before writing a note. |
| **1** | `FOUNDATION` | **Short Score:** Generates a Grand Staff (Piano) reduction containing the harmonic skeleton and tempo. |
| **2** | `MOTIF` | **Thematic Definition:** Explicitly defines Theme A and Counter-Melody/Theme B within the reduction. |
| **3** | `CHORDS` | **Harmonic Roadmap:** Defines sophisticated chord progressions (e.g., ii-V-I, Secondary Dominants) with explicit chord symbols. |
| **4** | `RHYTHM` | **Rhythmic Identity:** Refines the sketch with accompaniment patterns (Alberti bass, arpeggios, syncopation). |
| **5** | `HARMONY` | **Voice Leading:** smooths out voice leading and fixes parallel fifths in the sketch. |
| **6** | `FORM` | **Structural Expansion:** Explodes the sketch into full form (A-B-A, Rondo, etc.), ensuring thematic recurrence and modulation. |
| **7** | `TEXTURE` | **Tier 1 Orchestration:** Expands Piano Reduction into Sectional Staves (Woodwinds, Brass, Strings). |
| **8** | `FULL_ORCH` | **Tier 2 Orchestration:** Explodes sections into individual instruments based on the **Strict Instrument Definition List**. |
| **9** | `REFINEMENT` | **Detailing:** Applies dynamics, articulations, and ornaments using the **ABC+ Standard**. |
| **10** | `FINAL_CHECK` | **Validation:** Runs Zed Clef analysis, range checking, and drift verification. |

### 🛡️ Anti-Mission Drift Protocol
To prevent the LLM from hallucinating or changing genres halfway through the workflow, the system implements a strict **Context Injection Mechanism**. 
*   **Prompt Re-Injection:** The original user prompt is injected into *every* stage's system instruction.
*   **Drift Check:** The model is explicitly commanded to compare the current ABC output against the original intent (e.g., "Check: Did the piece become Happy when it should be Sad? Fix it.").

---

## 📜 ABC+ Specification (Custom Standard)

The application defines a custom superset of ABC Notation called **ABC+** (`ABC_PLUS_SPEC`) to bridge the gap between text generation and professional engraving/XML conversion.

**Key Features:**
*   **Strict Dynamics:** Replaces ambiguous `"f"` with `!f!`, `!mp!`, `!cresc(start)!`.
*   **Articulations:** Enforces `!staccato!`, `!tenuto!`, `!marcato!` syntax.
*   **Percussion Mapping:** Includes a dedicated **Jazz Drum Map** and **Mixed Percussion Map** (GM Mapping on Channel 10).
*   **Metadata:** Enforces `%%instrument`, `%%midi-program`, and `%%score` grouping with square brackets `[]`.

---

## 📊 Computational Musicology & Analysis

The application includes a `AnalysisDashboard` component that acts as a visual interface for the AI's "Musicologist Persona".

### 1. Technical Validation
*   **Instrument Range Rectification:** Calculates the percentage of notes falling within professional vs. playable ranges for specific instruments.
*   **Zed Clef Analysis:** Evaluates the "Tessitural Balance" of the orchestration, checking for muddy low-end intervals (Rule of the Sixth) or unbalanced voicing.

### 2. Contextual Benchmarking (Simulated)
The AI analyzes the generated score against vector representations of famous datasets:
*   **Tegridy MIDI:** Structural pattern matching.
*   **MAESTRO:** Expressive timing and dynamic consistency.
*   **MusicNet:** Classical harmony complexity.
*   **Weimar Jazz Database:** Improvisation vocabulary alignment.
*   **GTZAN:** Genre feature classification.

### 3. Feature Extraction (jSymbolic)
The system simulates the extraction of `jSymbolic` features:
*   **Melodic Interval Histogram:** Distribution of intervals (steps vs. leaps).
*   **Chord Density:** Vertical density per measure.
*   **Harmonic Entropy:** Complexity of the chord progression.

---

## 🗄️ Data Structures

### `Composition`
The core data model for a piece of music.
```typescript
interface Composition {
  id: string;
  title: string;
  prompt: string;
  abcContent: string;
  analysis?: AnalysisData; // Deep nested analysis object
  editHistory: EditEvent[]; // Full audit trail of all AI actions
  fullReport?: string; // Markdown generated musicology paper
}
```

### `EditEvent`
Maintains a full version history (Git-style) of the composition process.
```typescript
interface EditEvent {
  type: 'CREATION' | 'WORKFLOW_STAGE' | 'FIX' | 'RECTIFICATION' | ...;
  abcSnapshot: string; // Allows for rollback (conceptually)
  description: string; // The AI's reasoning for the change
}
```

---

## 🎹 Supported Instruments

The Orchestration engine (`addInstrumentsToComposition` & `FULL_ORCH` stage) supports a strict whitelist of instruments mapped to standard MIDI programs:

*   **Strings:** Violin (Solo/Sec), Viola, Cello, Contrabass.
*   **Woodwinds:** Flute, Oboe, Clarinet (Bb/Eb/Bass), Bassoon, Saxophones.
*   **Brass:** Horn (F), Trumpet, Trombone, Tuba.
*   **Percussion:** Drum Kit (Jazz/Rock), Orchestral Percussion (Timpani, Cymbals, Gong).
*   **Keyboards:** Piano, Celesta, Harpsichord, Organ.

---

## 🚀 Usage

1.  **Workflow Mode:** Toggle "Workflow Mode" to guide the AI through the 10-stage composition process manually.
2.  **Quick Compose:** Enter a prompt for a "One-Shot" generation (uses `gemini-3-pro` directly).
3.  **Analysis:** Paste existing ABC code to run the deep musicology report.
4.  **Rectification:** Use the "Rectify Ranges" or "Fix Issue" tools to have the AI strictly edit the ABC string for technical errors.
5.  **Export:** Compositions can be downloaded as `.txt` snapshots (auto-download enabled), MusicXML, or a full Markdown library report.
