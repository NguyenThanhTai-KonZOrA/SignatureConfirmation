export const makeId = (): string => {
  // modern browsers support crypto.randomUUID, fallback to Date.now
  // keep simple, predictable id for demo
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString();
};
