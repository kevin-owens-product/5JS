import type { FiveApp } from '../src/index.js';

export const exampleCategories = ['Space', 'Biology', 'Climate', 'Energy', 'Cities', 'Engineering', 'Business', 'Analytics', 'Scientific', 'Data', 'Cinematic'] as const;
export type ExampleCategory = typeof exampleCategories[number];
export interface ExampleControl {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format?(value: number): string;
  apply(value: number): void;
}
export interface ExampleReadout {
  metrics: { label: string; value: string; detail?: string }[];
  legend?: { label: string; color: string }[];
  table: { caption: string; columns: string[]; rows: (string | number)[][] };
}
export interface ExampleInstance {
  controls?: ExampleControl[];
  /** Computed from the same current data that drives the chart. */
  readout?(): ExampleReadout;
  /** Release callbacks/resources beyond the layers owned by app. */
  dispose?(): void;
}
export interface ExampleDefinition {
  id: string;
  title: string;
  category: ExampleCategory;
  summary: string;
  description: string;
  tags: string[];
  difficulty: 'Starter' | 'Intermediate' | 'Advanced';
  accent: string;
  camera: [number, number, number];
  target?: [number, number, number];
  bloom: number;
  /** Preview phase in seconds, integrated by the gallery for still thumbnails. */
  previewTime?: number;
  dataNote?: string;
  setup(app: FiveApp): ExampleInstance;
}
