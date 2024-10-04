export type ExtraSteps = (args: Required<CreateTemplateProps>) => Promise<void>
export type PreInstall = (args: Required<CreateTemplateProps>) => Promise<void>

export type CreateTemplateProps = {
  projectName: string
  isFullClone?: boolean
  packageManager?: string
  projectPath?: string
}
