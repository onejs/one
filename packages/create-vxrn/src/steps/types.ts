export type ExtraSteps = (args: CreateTemplateProps) => Promise<void>
export type PreInstall = (args: CreateTemplateProps) => Promise<void>

export type CreateTemplateProps = {
  projectName: string
  isFullClone?: boolean
  packageManager?: string
  projectPath?: string
}
