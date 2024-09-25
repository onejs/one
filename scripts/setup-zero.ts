import { promises as fs } from 'node:fs'
import * as path from 'node:path'

console.info(`Linking in zero`)

// Function to check if a file or directory exists
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

// Function to create a symlink in the node_modules directory
async function createSymlink(targetPath: string, linkName: string): Promise<void> {
  const nodeModulesPath = path.resolve('node_modules', linkName)
  try {
    await fs.symlink(targetPath, nodeModulesPath, 'junction')
    console.info(`Symlink created: ${linkName} -> ${targetPath}`)
  } catch (err) {
    console.error(`Failed to create symlink for ${linkName}:`, err)
  }
}

// Main function to process the zeroDeps in package.json
async function processZeroDeps() {
  const packageJsonPath = path.resolve('package.json')
  let packageJson

  try {
    const packageJsonData = await fs.readFile(packageJsonPath, 'utf-8')
    packageJson = JSON.parse(packageJsonData)
  } catch (err) {
    console.error('Error reading package.json:', err)
    return
  }

  const zeroDeps = packageJson.zeroDeps

  if (!zeroDeps || typeof zeroDeps !== 'object') {
    console.error('No zeroDeps found in package.json')
    return
  }

  for (const [depName, depPath] of Object.entries(zeroDeps)) {
    const resolvedDepPath = path.resolve(depPath as string)
    const exists = await pathExists(resolvedDepPath)

    if (exists) {
      await createSymlink(resolvedDepPath, depName)
    } else {
      console.warn(`Path does not exist: ${resolvedDepPath}`)
    }
  }
}

// Run the script
processZeroDeps().catch((err) => console.error('Error processing zeroDeps:', err))
