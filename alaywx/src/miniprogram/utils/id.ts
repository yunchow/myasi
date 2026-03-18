export function createId(prefix: string): string {
  const rnd = Math.random().toString(16).slice(2);
  const ts = Date.now().toString(16);
  return `${prefix}_${ts}_${rnd}`;
}
