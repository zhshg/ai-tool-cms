/** Extract JSON object or array from LLM text (handles optional markdown fences). */
export function parseJsonFromLlm<T>(text: string): T {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch?.[1]?.trim() ?? trimmed;

  const start = candidate.search(/[[{]/);
  if (start < 0) {
    throw new Error("No JSON found in LLM response");
  }

  const jsonSlice = candidate.slice(start);
  const endObj = jsonSlice.lastIndexOf("}");
  const endArr = jsonSlice.lastIndexOf("]");
  const end = Math.max(endObj, endArr);
  if (end < 0) {
    throw new Error("Incomplete JSON in LLM response");
  }

  return JSON.parse(jsonSlice.slice(0, end + 1)) as T;
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
