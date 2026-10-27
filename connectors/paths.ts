/** Stable URLs for catalog cards, without importing documentation into the homepage bundle. */
const aliases: Record<string, string> = {
  'MySQL / MariaDB': 'mysql', 'Elasticsearch / OpenSearch': 'elasticsearch',
  'Amazon Redshift': 'redshift', 'Amazon Athena': 'athena',
  'Google Analytics 4': 'google-analytics', 'Zendesk / Intercom': 'zendesk',
  'dbt / Cube': 'dbt', 'CSV / Parquet / Arrow': 'csv',
};
export function connectorSlug(name: string): string {
  return aliases[name] ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
