export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const GREETING_REGEX =
  /^(hi|hello|hey|hii+|hola|namaste|good\s*(morning|afternoon|evening)|how\s*are\s*you|what'?s\s*up|sup)[!.?\s]*$/i;