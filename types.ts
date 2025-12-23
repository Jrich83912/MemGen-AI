export interface MemeCaption {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  isDragging?: boolean;
}

export interface GeneratedCaption {
  text: string;
  category: 'Funny' | 'Sarcastic' | 'Dark' | 'Wholesome' | 'Relatable';
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  EDITING = 'EDITING',
  ERROR = 'ERROR'
}

export interface MemeTemplate {
  id: string;
  url: string;
  name: string;
}

export interface MemeCanvasHandle {
  generateMemeBlob: () => Promise<Blob | null>;
}
