import { fileURLToPath } from 'node:url'
import path, { dirname } from 'node:path'
import FSExtra from 'fs-extra'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const root = dirname(__dirname)
export const appDir = path.join(root, 'app')

const createdFilesJsonPath = path.join(root, '_created_files.json')

export function createRouteFile(fileName: string, content: string) {
  const filePath = path.join(appDir, fileName)

  if (FSExtra.existsSync(filePath)) {
    throw new Error(`File already exists: ${filePath}`)
  }

  if (process.env.DEBUG) {
    console.info(`Creating file: ${filePath}`)
  }

  const createdFiles = FSExtra.readJSONSync(createdFilesJsonPath, { throws: false }) || []
  createdFiles.push(filePath)
  FSExtra.writeJSONSync(createdFilesJsonPath, createdFiles)

  FSExtra.writeFileSync(filePath, content)
}

export function renameRouteFile(oldFileName: string, newFileName: string) {
  const oldPath = path.join(appDir, oldFileName)
  const newPath = path.join(appDir, newFileName)

  if (!FSExtra.existsSync(oldPath)) {
    throw new Error(`File does not exist: ${oldPath}`)
  }

  if (process.env.DEBUG) {
    console.info(`Renaming file: ${oldPath} -> ${newPath}`)
  }

  // Track the new file for cleanup
  const createdFiles = FSExtra.readJSONSync(createdFilesJsonPath, { throws: false }) || []
  // Remove old path if tracked, add new path
  const index = createdFiles.indexOf(oldPath)
  if (index > -1) {
    createdFiles.splice(index, 1)
  }
  createdFiles.push(newPath)
  FSExtra.writeJSONSync(createdFilesJsonPath, createdFiles)

  FSExtra.renameSync(oldPath, newPath)
}

export function deleteRouteFile(fileName: string) {
  const filePath = path.join(appDir, fileName)

  if (!FSExtra.existsSync(filePath)) {
    return // Already deleted
  }

  if (process.env.DEBUG) {
    console.info(`Deleting file: ${filePath}`)
  }

  FSExtra.removeSync(filePath)

  // Remove from tracking
  const createdFiles = FSExtra.readJSONSync(createdFilesJsonPath, { throws: false }) || []
  const index = createdFiles.indexOf(filePath)
  if (index > -1) {
    createdFiles.splice(index, 1)
    FSExtra.writeJSONSync(createdFilesJsonPath, createdFiles)
  }
}

export function cleanupCreatedFiles() {
  const createdFiles = FSExtra.readJSONSync(createdFilesJsonPath, { throws: false }) || []

  if (process.env.DEBUG) {
    console.info('Cleaning up created files:', JSON.stringify(createdFiles))
  }

  for (const filePath of createdFiles) {
    if (FSExtra.existsSync(filePath)) {
      FSExtra.removeSync(filePath)
    }
  }

  FSExtra.removeSync(createdFilesJsonPath)
}

export const specificRouteContent = `export default function Specific() {
  return (
    <div>
      <h1 data-testid="page-title">Specific Page</h1>
      <p data-testid="route-type">static</p>
    </div>
  )
}
`

export const anotherRouteContent = `export default function Another() {
  return (
    <div>
      <h1 data-testid="page-title">Another Page</h1>
      <p data-testid="route-type">static</p>
    </div>
  )
}
`
