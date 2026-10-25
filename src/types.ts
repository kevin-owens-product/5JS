import type { Object3D } from 'three';

/** A visualization unit. The scene owns and disposes layers added to it. */
export interface FiveLayer<P extends object = Record<string, unknown>> {
  readonly object: Object3D;
  readonly kind: string;
  readonly count: number;
  update(time: number, delta: number): void;
  set(options: Partial<P>): void;
  dispose(): void;
}

export interface ParticleFieldOptions {
  count?: number;
  mode?: 'vortex' | 'galaxy' | 'wave';
  radius?: number;
  speed?: number;
  turbulence?: number;
  pointSize?: number;
  colorA?: string;
  colorB?: string;
  seed?: number;
}

export interface HypercubeOptions {
  dimensions?: 4 | 5;
  size?: number;
  speed?: number;
  color?: string;
  pointSize?: number;
}

export interface GraphNode {
  id: string;
  group?: number;
  value?: number;
  position?: [number, number, number];
}
export interface GraphEdge { source: string; target: string; weight?: number }
export interface GraphData { nodes: GraphNode[]; edges: GraphEdge[] }
export interface NetworkGraphOptions {
  data?: GraphData;
  nodeCount?: number;
  radius?: number;
  nodeSize?: number;
  speed?: number;
  seed?: number;
  edgeOpacity?: number;
  colorA?: string;
  colorB?: string;
}

export interface TerrainOptions {
  resolution?: number;
  size?: number;
  height?: number;
  frequency?: number;
  speed?: number;
  wireframe?: boolean;
  colorA?: string;
  colorB?: string;
  seed?: number;
}
