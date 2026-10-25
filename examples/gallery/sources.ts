const files = import.meta.glob<string>('../{scientific,data,cinematic,business,analytics,space,biology,climate,energy,cities,engineering}/*.ts', { query: '?raw', import: 'default', eager: true });
export function sourceFor(id: string): string {
  const path = Object.keys(files).find(key => key.endsWith(`/${id}.ts`));
  return path ? files[path] : '// Source unavailable.';
}
