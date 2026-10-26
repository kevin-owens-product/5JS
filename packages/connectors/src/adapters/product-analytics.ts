import { ConnectorError } from '../core.js';
import { createHttpClient } from '../http.js';
import type { Cell, ConnectorIdentity, DataConnector, Field, HttpOptions } from '../types.js';
import { basicHeader, changingResults, configIdentifier, dateWindow, invalidProductResponse, productConnector, productHttp, productObject, productRecords, productString, queryObject, recordFields } from './product-support.js';
import type { BasicCredentials } from './product-support.js';

export interface GoogleAnalyticsOptions extends HttpOptions { propertyId: string }
export interface GoogleAnalyticsQuery { dimensions: string[]; metrics: string[]; startDate: string; endDate: string }
/** GA4 Data API aggregates; never raw events or session-level records. */
export function googleAnalyticsConnector(options: GoogleAnalyticsOptions): DataConnector<GoogleAnalyticsQuery> {
  const property = configIdentifier(options.propertyId, /^\d+$/);
  const http = createHttpClient({ ...options, baseUrl: 'https://analyticsdata.googleapis.com' });
  return productConnector(options, 'google-analytics-4', query => {
    queryObject(query, ['dimensions', 'metrics', 'startDate', 'endDate']);
    const names = (values: unknown, maximum: number) => Array.isArray(values) && values.length > 0 && values.length <= maximum && new Set(values).size === values.length && values.every(name => typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_:]{0,127}$/.test(name));
    if (!names(query.dimensions, 9) || !names(query.metrics, 10)) throw new ConnectorError('INVALID_QUERY', 'Select 1–9 GA4 dimensions and 1–10 metrics.');
    dateWindow(query.startDate, query.endDate, 366);
    return query;
  }, async (query, next, limit, signal) => {
    const offset = next === undefined ? 0 : Number(next);
    if (!Number.isSafeInteger(offset) || offset < 0) throw invalidProductResponse();
    const result = productObject(await http.request(`/v1beta/properties/${property}:runReport`, { method: 'POST', signal, body: {
      dimensions: query.dimensions.map(name => ({ name })), metrics: query.metrics.map(name => ({ name })),
      dateRanges: [{ startDate: query.startDate, endDate: query.endDate }], limit: String(limit), offset: String(offset),
      orderBys: query.dimensions.map(dimensionName => ({ dimension: { dimensionName }, desc: false })), returnPropertyQuota: true,
    } }));
    // ProtoJSON may omit scalar fields whose value is the protobuf default (zero).
    const rowCount = result.rowCount === undefined ? 0 : result.rowCount;
    if (!Array.isArray(result.dimensionHeaders) || !Array.isArray(result.metricHeaders) || !Number.isSafeInteger(rowCount) || rowCount < 0) throw invalidProductResponse();
    const dimensions = result.dimensionHeaders.map((value: unknown) => productObject(value)), metrics = result.metricHeaders.map((value: unknown) => productObject(value));
    if (metrics.some((field: any) => !productString(field.type, 128))) throw invalidProductResponse();
    if (JSON.stringify(dimensions.map((field: any) => field.name)) !== JSON.stringify(query.dimensions) || JSON.stringify(metrics.map((field: any) => field.name)) !== JSON.stringify(query.metrics)) throw invalidProductResponse();
    const fields: Field[] = [
      ...dimensions.map((field: any) => ({ name: field.name, type: 'string' as const })),
      ...metrics.map((field: any) => ({ name: field.name, type: field.type === 'TYPE_INTEGER' ? 'integer' as const : 'decimal' as const, nativeType: String(field.type) })),
    ];
    const rawRows = result.rows ?? [];
    if (!Array.isArray(rawRows) || rawRows.length > limit) throw invalidProductResponse();
    const rows = rawRows.map((value: unknown) => {
      const row = productObject(value);
      if (!Array.isArray(row.dimensionValues) || !Array.isArray(row.metricValues) || row.dimensionValues.length !== dimensions.length || row.metricValues.length !== metrics.length) throw invalidProductResponse();
      return [...row.dimensionValues, ...row.metricValues].map(cell => {
        const value = productObject(cell).value;
        if (typeof value !== 'string') throw invalidProductResponse();
        return value;
      });
    });
    if (offset + rows.length > rowCount) throw invalidProductResponse();
    const metadata = result.metadata === undefined ? {} : productObject(result.metadata);
    const warnings = [changingResults, 'One row per dimension combination, with aggregated metrics. Unique-user and session metrics are not generally additive across rows or dates.'];
    if (metadata.subjectToThresholding) warnings.push('GA4 reports thresholding; absence or small counts must not be interpreted as complete underlying event data.');
    if (metadata.dataLossFromOtherRow) warnings.push('GA4 reports data loss from aggregation into the other row.');
    if (metadata.samplingMetadatas) warnings.push('GA4 reports sampling metadata; metric values may be estimates.');
    return { fields, rows, next: offset + rows.length < rowCount ? offset + rows.length : undefined, warnings };
  });
}

export interface MixpanelOptions extends ConnectorIdentity { credentials: BasicCredentials; projectId: string; region?: 'US' | 'EU'; fetch?: typeof globalThis.fetch }
export interface MixpanelQuery { fromDate: string; toDate: string; events?: string[] }
/** A bounded raw-event export. No offset cursor is invented for this unpaginated API. */
export function mixpanelConnector(options: MixpanelOptions): DataConnector<MixpanelQuery> {
  options = { ...options };
  const projectId = configIdentifier(options.projectId, /^\d+$/), region = options.region ?? 'US';
  if (!['US', 'EU'].includes(region)) throw new ConnectorError('INVALID_CONFIG', 'Choose a supported Mixpanel region.');
  const http = productHttp({ ...options, origin: region === 'EU' ? 'https://data-eu.mixpanel.com' : 'https://data.mixpanel.com', headers: () => basicHeader(options.credentials) });
  return productConnector(options, 'mixpanel', query => {
    queryObject(query, ['fromDate', 'toDate', 'events']); dateWindow(query.fromDate, query.toDate);
    if (query.events !== undefined && (!Array.isArray(query.events) || !query.events.length || query.events.length > 50 || !query.events.every(value => productString(value, 256)))) throw new ConnectorError('INVALID_QUERY', 'Select up to 50 event names.');
    return query;
  }, async (query, _next, limit, signal) => {
    const params = new URLSearchParams({ project_id: projectId, from_date: query.fromDate, to_date: query.toDate, limit: String(limit + 1), time_in_ms: 'true' });
    if (query.events) params.set('event', JSON.stringify(query.events));
    const text = await http(`/api/2.0/export?${params}`, signal, undefined, true);
    let records: unknown[];
    try { records = text.split('\n').filter((line: string) => line.trim()).map((line: string) => JSON.parse(line)); } catch { throw invalidProductResponse(); }
    for (const value of records) {
      const record = productObject(value);
      if (!productString(record.event)) throw invalidProductResponse();
      productObject(record.properties);
    }
    return { fields: recordFields, rows: productRecords(records, limit + 1), warnings: ['Raw event records in an inclusive date window of at most 31 days. Date boundaries use the provider’s project/timezone rules. Export order is not a resumable checkpoint. If truncated, narrow the date/event query or use an external export pipeline.'] };
  }, 'none');
}

export interface AmplitudeOptions extends ConnectorIdentity { credentials: BasicCredentials; region?: 'US' | 'EU'; fetch?: typeof globalThis.fetch }
export interface AmplitudeQuery { event: string; metric: 'uniques' | 'totals'; startDate: string; endDate: string }
/** Supported Dashboard REST event segmentation, one event, daily grain, no group-by top-N loss. */
export function amplitudeConnector(options: AmplitudeOptions): DataConnector<AmplitudeQuery> {
  options = { ...options };
  const region = options.region ?? 'US';
  if (!['US', 'EU'].includes(region)) throw new ConnectorError('INVALID_CONFIG', 'Choose a supported Amplitude region.');
  const http = productHttp({ ...options, origin: region === 'EU' ? 'https://analytics.eu.amplitude.com' : 'https://amplitude.com', headers: () => basicHeader(options.credentials) });
  return productConnector(options, 'amplitude', query => {
    queryObject(query, ['event', 'metric', 'startDate', 'endDate']); dateWindow(query.startDate, query.endDate);
    if (!productString(query.event, 256) || !['uniques', 'totals'].includes(query.metric)) throw new ConnectorError('INVALID_QUERY', 'Choose an event and a supported Amplitude count metric.');
    return query;
  }, async (query, _next, _limit, signal) => {
    const params = new URLSearchParams({ e: JSON.stringify({ event_type: query.event }), m: query.metric, start: query.startDate.replaceAll('-', ''), end: query.endDate.replaceAll('-', ''), i: '1' });
    const result = productObject(await http(`/api/2/events/segmentation?${params}`, signal)), data = productObject(result.data);
    if (!Array.isArray(data.xValues) || !Array.isArray(data.series) || !Array.isArray(data.seriesLabels) || data.series.length !== data.seriesLabels.length || data.series.length > 10 || data.xValues.length > 31) throw invalidProductResponse();
    const rows: unknown[][] = [];
    data.series.forEach((series: unknown, index: number) => {
      if (!Array.isArray(series) || series.length !== data.xValues.length) throw invalidProductResponse();
      series.forEach((value, day) => {
        if (typeof data.xValues[day] !== 'string' || (value !== null && typeof value !== 'number' && typeof value !== 'string')) throw invalidProductResponse();
        rows.push([data.xValues[day], data.seriesLabels[index], value]);
      });
    });
    return { fields: [{ name: 'date', type: 'date' }, { name: 'series', type: 'json' }, { name: query.metric, type: 'number', nullable: true }], rows,
      warnings: ['One row per daily event metric and returned series. Unique-user counts are not additive across days. The date interval is at most 31 days in the project timezone; this is aggregate analytics, not a raw-event export. Local continuation pages reuse this fetched response.'] };
  });
}

export interface PostHogOptions extends HttpOptions { host: string; projectId: string; endpoint: string; version: number }
export interface PostHogQuery { variables?: Record<string, string | number | boolean | null> }
/** Named SQL Endpoints only, pinned to a saved version. General /query exports are not supported. */
export function posthogConnector(options: PostHogOptions): DataConnector<PostHogQuery> {
  const project = configIdentifier(options.projectId, /^\d+$/), endpoint = configIdentifier(options.endpoint);
  const version = options.version;
  if (!Number.isSafeInteger(version) || version < 1) throw new ConnectorError('INVALID_CONFIG', 'Pin a positive PostHog endpoint version.');
  const http = createHttpClient({ ...options, baseUrl: options.host });
  return productConnector(options, 'posthog', query => {
    queryObject(query, ['variables']);
    if (query.variables !== undefined) {
      const variables = queryObject(query.variables, Object.keys(query.variables));
      if (Object.keys(variables).length > 100 || Object.entries(variables).some(([key, value]) => !productString(key, 128) || !(value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))))) throw new ConnectorError('INVALID_QUERY', 'Provide bounded scalar endpoint variables.');
    }
    return query;
  }, async (query, next, limit, signal) => {
    const offset = next === undefined ? 0 : Number(next);
    const result = productObject(await http.request(`/api/projects/${project}/endpoints/${endpoint}/run/`, { method: 'POST', signal, body: { version, variables: query.variables ?? {}, limit, offset } }));
    if (result.endpoint_version !== undefined && result.endpoint_version !== version) throw new ConnectorError('SCHEMA_CHANGED', 'The endpoint returned a different version than the configured version.');
    if (result.query_status && productObject(result.query_status).complete !== true) throw new ConnectorError('QUERY_PENDING', 'The named endpoint has not completed. No partial data is returned; inspect its execution server-side.');
    if (!Array.isArray(result.columns) || !result.columns.every((column: unknown) => typeof column === 'string') || !Array.isArray(result.results) || result.results.length > limit || typeof result.hasMore !== 'boolean') throw invalidProductResponse();
    const rows: Cell[][] = result.results.map((record: unknown) => {
      if (Array.isArray(record)) {
        if (record.length !== result.columns.length) throw invalidProductResponse();
        return record;
      }
      const object = productObject(record);
      if (new Set(result.columns).size !== result.columns.length || result.columns.some((column: string) => !Object.hasOwn(object, column))) throw invalidProductResponse();
      return result.columns.map((column: string) => object[column]);
    });
    return { fields: result.columns.map((name: string) => ({ name, type: 'unknown' as const })), rows, next: result.hasMore ? offset + rows.length : undefined,
      warnings: [changingResults, 'Named SQL Endpoint API is in beta. Grain, ordering and execution cost come from the saved endpoint; configure stable ordering and source access there. General /query is not used. No automatic async polling or job cancellation is performed.'] };
  });
}
