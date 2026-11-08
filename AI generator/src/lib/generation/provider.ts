import type { AspectRatioId, StyleId } from "@/lib/constants";

export type ProviderCreateInput = {
  prompt: string;
  composedPrompt: string;
  style: StyleId;
  aspectRatio: AspectRatioId;
  webhookUrl?: string;
};

export type ProviderPrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  outputUrl?: string;
  error?: string;
};

export interface ImageGenerationProvider {
  readonly name: string;
  isConfigured(): boolean;
  setupMessage(): string;
  createPrediction(input: ProviderCreateInput): Promise<ProviderPrediction>;
  getPrediction(id: string): Promise<ProviderPrediction>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function isTerminalProviderStatus(status: ProviderPrediction["status"]): boolean {
  return status === "succeeded" || status === "failed" || status === "canceled";
}

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollPrediction(
  provider: ImageGenerationProvider,
  id: string,
  timeoutMs: number,
  now = () => Date.now(),
): Promise<ProviderPrediction> {
  const deadline = now() + timeoutMs;
  let delay = 750;
  let last: ProviderPrediction | undefined;

  while (now() < deadline) {
    last = await provider.getPrediction(id);
    if (isTerminalProviderStatus(last.status)) {
      return last;
    }
    await sleep(Math.min(delay, Math.max(0, deadline - now())));
    delay = Math.min(delay * 1.4, 4000);
  }

  throw new ProviderError("Image generation timed out", "provider_timeout", true);
}
