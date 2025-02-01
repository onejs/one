import { fileURLToPath } from 'node:url'
import path, { dirname } from 'node:path'
import FSExtra from 'fs-extra'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = dirname(__dirname)
const layoutFilePath = path.join(root, 'app', '_layout.tsx')
const routeFilePath = path.join(root, 'app', 'index.tsx')
const componentFilePath = path.join(root, 'components', 'TestComponent.tsx')

const layoutOrigFilePath = layoutFilePath + '.orig'
const routeOrigFilePath = routeFilePath + '.orig'
const componentOrigFilePath = componentFilePath + '.orig'

export function editComponentFile() {
  if (FSExtra.existsSync(componentOrigFilePath)) {
    throw new Error('Component file already edited, please revert it first')
  }

  FSExtra.copyFileSync(componentFilePath, componentOrigFilePath)

  let componentFileContent = FSExtra.readFileSync(componentFilePath, 'utf-8')
  componentFileContent = componentFileContent.replace(
    "const text = 'Some text'",
    "const text = 'Some edited text in component file'"
  )
  FSExtra.writeFileSync(componentFilePath, componentFileContent)
}

export function editRouteFile() {
  if (FSExtra.existsSync(routeOrigFilePath)) {
    throw new Error('Route file already edited, please revert it first')
  }

  FSExtra.copyFileSync(routeFilePath, routeOrigFilePath)

  let routeFileContent = FSExtra.readFileSync(routeFilePath, 'utf-8')
  routeFileContent = routeFileContent.replace(
    "const text = 'Some text'",
    "const text = 'Some edited text in route file'"
  )
  FSExtra.writeFileSync(routeFilePath, routeFileContent)
}

export function editLayoutFile() {
  if (FSExtra.existsSync(layoutOrigFilePath)) {
    throw new Error('Layout file already edited, please revert it first')
  }

  FSExtra.copyFileSync(layoutFilePath, layoutOrigFilePath)

  let layoutFileContent = FSExtra.readFileSync(layoutFilePath, 'utf-8')
  layoutFileContent = layoutFileContent.replace(
    "const text = 'Some text'",
    "const text = 'Some edited text in layout file'"
  )
  FSExtra.writeFileSync(layoutFilePath, layoutFileContent)
}

export function revertEditedFiles() {
  if (FSExtra.existsSync(componentOrigFilePath)) {
    FSExtra.moveSync(componentOrigFilePath, componentFilePath, { overwrite: true })
  }

  if (FSExtra.existsSync(routeOrigFilePath)) {
    FSExtra.moveSync(routeOrigFilePath, routeFilePath, { overwrite: true })
  }

  if (FSExtra.existsSync(layoutOrigFilePath)) {
    FSExtra.moveSync(layoutOrigFilePath, layoutFilePath, { overwrite: true })
  }
}
