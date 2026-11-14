export async function flashCells(
  setInverted: (inverted: boolean) => void,
  wait: (milliseconds: number, signal: AbortSignal) => Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  for (const inverted of [true, false, true, false]) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    setInverted(inverted);
    await wait(125, signal);
  }
}