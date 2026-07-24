export function hasProfileFieldContent(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}
