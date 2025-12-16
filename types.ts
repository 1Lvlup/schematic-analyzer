export interface SchematicComponent {
  designator: string;
  type: string;
  value: string;
  notes: string;
  boundingBox?: number[]; // [ymin, xmin, ymax, xmax] normalized 0-1
  icon?: string; // Key for visual icon representation (e.g., 'resistor', 'chip')
}

export interface FunctionalBlock {
  name: string;
  description: string;
  componentsInvolved: string[];
}

export interface Net {
  id: string; // e.g., "VCC", "GND", "Net_1"
  connectedPins: string[]; // e.g., ["U1-1", "R1-2"]
}

export interface SchematicAnalysis {
  title: string;
  overview: string;
  components: SchematicComponent[];
  functionalBlocks: FunctionalBlock[];
  connectivityLogic: string; // Text description of key nets/flows
  netlist: Net[];
  potentialIssues: string[];
}

export interface PageResult {
  id: string;
  pageNumber: number;
  image: string; // Base64
  analysis: SchematicAnalysis;
}

export interface ProjectData {
  id: string;
  name: string;
  timestamp: number;
  pages: PageResult[];
}

export type AnalysisStatus = 'idle' | 'rendering_pdf' | 'filtering' | 'analyzing' | 'complete' | 'error';