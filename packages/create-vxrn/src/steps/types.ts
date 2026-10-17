export type ExtraSteps = (args: CreateTemplateProps) => Promise<void>
export type PreInstall = (args: CreateTemplateProps) => Promise<void>

export type CreateTemplateProps = {
  projectName: string
  // the directory as the user typed it, for the cd hint
  projectDir?: string
  isFullClone?: boolean
  packageManager?: string
  projectPath?: string
}
