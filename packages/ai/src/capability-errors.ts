export class AiCapabilityUnsupportedError extends Error {
  constructor(
    readonly provider: string,
    readonly capability: string,
  ) {
    super(`Provider ${provider} does not support ${capability}`);
    this.name = "AiCapabilityUnsupportedError";
  }
}
