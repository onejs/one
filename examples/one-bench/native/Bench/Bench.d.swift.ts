export declare const Bench: {
  arguments(): Promise<string[]>
  environment(): Promise<Record<string, string>>
  processElapsed(): Promise<number>
  footprint(): Promise<number>
  frame(): Promise<number>
  finish(): Promise<void>
}
