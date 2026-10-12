export type BackgroundRequest<Input> = { revision: number; input: Input }

export type BackgroundResult<Output> = { revision: number; value: Output }

export type BackgroundResponse<Output> =
  | { ok: true; result: BackgroundResult<Output> }
  | { ok: false; revision: number; error: string }

export type BackgroundState<Output> =
  | { phase: 'idle'; revision: number }
  | { phase: 'computing'; revision: number }
  | { phase: 'ready'; result: BackgroundResult<Output> }
  | { phase: 'failed'; revision: number; error: Error }

export type BackgroundExecutor<Input, Output> = {
  execute: (
    request: BackgroundRequest<Input>,
    isCurrent: (revision: number) => boolean
  ) => Promise<BackgroundResult<Output> | null>
  dispose: () => void
}

export type BackgroundComputation<Input, Output> = {
  readonly createExecutor: () => BackgroundExecutor<Input, Output>
}
