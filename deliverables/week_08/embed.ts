import "./env.ts";

export const MODEL = "gemini-embedding-001";
export const DIMS = 768;

export function normalize(values: number[]): number[] {
  const length = Math.hypot(...values);
  if (!length) return values;
  return values.map((value) => value / length);
}

export async function embedText(text: string, taskType: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not loaded");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        taskType,
        output_dimensionality: DIMS,
        content: { parts: [{ text: text.slice(0, 8000) }] },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini embed failed (${response.status}): ${await response.text()}`);
  }

  const body = (await response.json()) as { embedding?: { values?: number[] } };
  const values = body.embedding?.values;
  if (!values?.length) throw new Error("Gemini embed response had no vector");
  return normalize(values);
}
