import { fileURLToPath } from 'node:url'
import path, { dirname } from 'node:path'
import FSExtra from 'fs-extra'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const root = dirname(__dirname)

const editedFilesJsonPath = path.join(root, '_edited_files.json')

export function editFile(filePath: string, oldText: string, newText: string) {
  const origFilePath = filePath + '.orig'

  if (FSExtra.existsSync(origFilePath)) {
    throw new Error(
      `File already edited (${origFilePath} exists), please revert the edits first.`
    )
  }

  if (process.env.DEBUG) {
    console.info(`Editing file: ${filePath}`)
  }

  FSExtra.copyFileSync(filePath, origFilePath)

  const editedFiles = FSExtra.readJSONSync(editedFilesJsonPath, { throws: false }) || []
  editedFiles.push(filePath)
  FSExtra.writeJSONSync(editedFilesJsonPath, editedFiles)

  let fileContent = FSExtra.readFileSync(filePath, 'utf-8')
  fileContent = fileContent.replace(oldText, newText)
  FSExtra.writeFileSync(filePath, fileContent)
}

export function editComponentFile() {
  editFile(
    path.join(root, 'components', 'TestComponent.tsx'),
    "const text = 'Some text'",
    "const text = 'Some edited text in component file'"
  )
}

export function editRouteFile() {
  editFile(
    path.join(root, 'app', 'index.tsx'),
    "const text = 'Some text'",
    "const text = 'Some edited text in route file'"
  )
}

export function editLayoutFile() {
  editFile(
    path.join(root, 'app', '_layout.tsx'),
    "const text = 'Some text'",
    "const text = 'Some edited text in layout file'"
  )
}

export function editTestComponentContainingRelativeImportFile() {
  editFile(
    path.join(root, 'components', 'TestComponentContainingRelativeImport.tsx'),
    "const text = 'Some text in TestComponentContainingRelativeImport'",
    "const text = 'Some edited text in TestComponentContainingRelativeImport'"
  )
}

export function editCSSFileA() {
  editFile(
    path.join(root, 'components', 'css-a.css'),
    'rgb(255, 0, 0)',
    'rgb(255, 255, 0)' // red -> yellow
  )
}

export function editCSSFileB() {
  editFile(
    path.join(root, 'components', 'css-b.css'),
    'rgb(0, 255, 0)',
    'rgb(255, 165, 0)' // green -> orange
  )
}

export function editCSSFileC() {
  editFile(
    path.join(root, 'components', 'css-c.css'),
    'rgb(0, 0, 255)',
    'rgb(128, 0, 128)' // blue -> purple
  )
}

export function revertEditedFiles() {
  const editedFiles = FSExtra.readJSONSync(editedFilesJsonPath, { throws: false }) || []

  if (process.env.DEBUG) {
    console.info('Reverting edited files:', JSON.stringify(editedFiles))
  }

  for (const filePath of editedFiles) {
    const origFilePath = filePath + '.orig'

    if (!FSExtra.existsSync(origFilePath)) {
      console.warn(`Cannot revert: ${origFilePath} does not exist.`)
      continue
    }

    FSExtra.moveSync(origFilePath, filePath, { overwrite: true })
  }

  FSExtra.removeSync(editedFilesJsonPath)
}
