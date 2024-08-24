export type ExtraSteps = (args: {
  packageManager: string
  isFullClone: boolean
  projectPath: string
  projectName: string
}) => Promise<void>
