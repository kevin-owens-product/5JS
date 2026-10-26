import { connectorCatalog } from '../../packages/connectors/src/catalog.js';
import { databaseGuides } from './databases.js';
import { applicationGuides } from './applications.js';
import { platformGuides } from './platforms.js';
export type { ConnectorGuide, Outcome } from './types.js';

export const guides = [...databaseGuides, ...applicationGuides, ...platformGuides]
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));
export function catalogFor(guide: (typeof guides)[number]) {
  const entry = connectorCatalog.find(item => item.name === guide.catalogName);
  if (!entry) throw new Error(`Unknown connector catalog entry: ${guide.catalogName}`);
  return entry;
}

export const categories = ['All sources', 'Database', 'Warehouse', 'Application', 'BI / semantic', 'File / transport'] as const;
