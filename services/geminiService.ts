import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SchematicAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the schema for the structured response
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A concise title for the schematic circuit" },
    overview: { type: Type.STRING, description: "A high-level summary of what the circuit does" },
    components: {
      type: Type.ARRAY,
      description: "List of all identifiable components",
      items: {
        type: Type.OBJECT,
        properties: {
          designator: { type: Type.STRING, description: "e.g., R1, C1, U1" },
          type: { type: Type.STRING, description: "e.g., Resistor, Capacitor, Op-Amp" },
          value: { type: Type.STRING, description: "e.g., 10k, 100nF, NE555" },
          notes: { type: Type.STRING, description: "Any specific observations about this component" },
          boundingBox: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "The bounding box of the visual symbol for this component in [ymin, xmin, ymax, xmax] format, normalized to 0-1 coordinates.",
          },
        },
        required: ["designator", "type"],
      },
    },
    functionalBlocks: {
      type: Type.ARRAY,
      description: "Breakdown of the circuit into functional stages",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the block, e.g., Power Supply, Amplifier Stage" },
          description: { type: Type.STRING, description: "What this block does" },
          componentsInvolved: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of designators involved in this block"
          },
        },
      },
    },
    connectivityLogic: { type: Type.STRING, description: "A description of the signal flow and key connections in a way an AI or engineer would understand structure." },
    netlist: {
      type: Type.ARRAY,
      description: "Structured list of electrical connections (nets) between component pins.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Name of the net (e.g. VCC, GND, Net_1)" },
          connectedPins: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "List of component pins connected to this net (e.g. ['R1-2', 'U1-3'])" 
          }
        },
        required: ["id", "connectedPins"]
      }
    },
    potentialIssues: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Potential design flaws, things to check, or safety warnings" 
    },
  },
  required: ["title", "overview", "components", "functionalBlocks", "connectivityLogic", "netlist"],
};

const mapTypeToIcon = (type: string): string => {
  const t = type.toLowerCase();
  if (t.includes('resistor')) return 'resistor';
  if (t.includes('cap')) return 'capacitor';
  if (t.includes('induct') || t.includes('coil')) return 'inductor';
  if (t.includes('diode') || t.includes('led') || t.includes('rectifier')) return 'diode';
  if (t.includes('transistor') || t.includes('fet') || t.includes('bjt') || t.includes('igbt')) return 'transistor';
  if (t.includes('ic') || t.includes('chip') || t.includes('processor') || t.includes('controller') || t.includes('op-amp') || t.includes('opamp')) return 'chip';
  if (t.includes('switch') || t.includes('button') || t.includes('relay')) return 'switch';
  if (t.includes('conn') || t.includes('head') || t.includes('jack') || t.includes('plug') || t.includes('socket')) return 'connector';
  if (t.includes('gnd') || t.includes('ground')) return 'ground';
  if (t.includes('volt') || t.includes('sourc') || t.includes('batt') || t.includes('cell') || t.includes('pwr') || t.includes('vcc')) return 'power';
  return 'generic';
};

/**
 * Rapidly scans a list of images to determine which ones are likely schematics.
 * Uses Gemini Flash for speed and cost efficiency.
 */
export const detectSchematicPages = async (images: string[]): Promise<number[]> => {
  // If only 1 image, assume it's the one we want.
  if (images.length === 1) return [0];

  const validIndices: number[] = [];
  
  // We process in batches of 5 to avoid payload limits if the manual is huge
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    
    // Construct parts: Images + Prompt
    const parts: any[] = batch.map(img => ({
      inlineData: { mimeType: "image/jpeg", data: img.split(',')[1] }
    }));

    parts.push({
      text: `Look at these ${batch.length} images (ordered 0 to ${batch.length - 1}). 
      Identify which images contain visual technical content like:
      - Electronic Schematics
      - Wiring Diagrams
      - Circuit Blueprints
      - PCB Layouts
      
      Ignore pages that are primarily text, table of contents, legal warnings, or cover pages.
      
      Return JSON: { "indices": [0, 2] }`
    });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
             type: Type.OBJECT,
             properties: {
                indices: { type: Type.ARRAY, items: { type: Type.INTEGER } }
             }
          }
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        // Map batch-relative indices back to global indices
        const globalIndices = result.indices.map((idx: number) => idx + i);
        validIndices.push(...globalIndices);
      }
    } catch (e) {
      console.warn(`Batch detection failed for indices ${i}-${i+BATCH_SIZE}`, e);
      // Fallback: If detection fails, maybe skip or include? Let's skip to be safe.
    }
  }

  return validIndices;
};

export const analyzeSchematicImage = async (base64Image: string): Promise<SchematicAnalysis> => {
  try {
    // Remove header if present (e.g., "data:image/png;base64,")
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png", // generic handling usually works or detect mime
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this electronic schematic or wiring diagram. 
            
            Your goal is to structure the visual information into a machine-understandable format and a human-readable explanation.
            
            1. Identify all components, their values, and designators. IMPORTANT: Provide the bounding box [ymin, xmin, ymax, xmax] (0-1) for every component symbol detected.
            2. Break down the circuit into functional blocks (e.g., "Input Stage", "Filter", "Output Driver").
            3. Explain the connectivity logic: how does the signal flow? What connects to what?
            4. Extract a structured netlist mapping Net IDs (e.g. "VCC", "N1") to a list of connected pins (e.g. "U1-1", "R1-2").
            5. Identify potential issues or notable design features.
            
            Provide the output strictly as JSON matching the requested schema.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are an expert Electronics Engineer and AI Data Structuring Specialist. You are capable of reading complex schematics, wiring diagrams, and blueprints. You extract high-fidelity technical data including precise spatial locations of components.",
      },
    });

    if (response.text) {
      const analysis = JSON.parse(response.text) as SchematicAnalysis;
      
      // Post-process to map icons
      analysis.components = analysis.components.map(c => ({
        ...c,
        icon: mapTypeToIcon(c.type)
      }));
      
      // Ensure netlist exists (backwards compatibility if logic changes or model fails partial)
      if (!analysis.netlist) analysis.netlist = [];

      return analysis;
    } else {
      throw new Error("No response text generated");
    }
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const chatWithSchematicContext = async (
  currentHistory: { role: 'user' | 'model', text: string }[],
  newMessage: string,
  analysisContext: SchematicAnalysis
): Promise<string> => {
  // We use the Pro model for deep reasoning in chat as well
  const contextPrompt = `
    Context: You are discussing a schematic that has been analyzed.
    Circuit Title: ${analysisContext.title}
    Overview: ${analysisContext.overview}
    Components: ${analysisContext.components.map(c => `${c.designator} (${c.type}, ${c.value})`).join(', ')}
    Functional Blocks: ${analysisContext.functionalBlocks.map(b => b.name).join(', ')}
    Netlist: ${JSON.stringify(analysisContext.netlist)}
    
    User Question: ${newMessage}
  `;

  try {
     const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        ...currentHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: contextPrompt }] }
      ],
    });
    return response.text || "I couldn't generate a response.";
  } catch (e) {
    console.error("Chat error", e);
    return "Error communicating with the AI assistant.";
  }
};
