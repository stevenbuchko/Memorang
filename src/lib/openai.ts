import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return _openai;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const openai: OpenAI = new Proxy({} as any, {
  get(_, prop) {
    return (getOpenAI() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
