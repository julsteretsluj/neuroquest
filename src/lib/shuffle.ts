export function shuffleIds(ids: string[], avoid?: string[]): string[] {
  const copy = [...ids];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  if (avoid && avoid.length === copy.length && copy.every((id, index) => id === avoid[index])) {
    [copy[0], copy[1]] = [copy[1], copy[0]];
  }
  return copy;
}
