import * as fs from 'fs-extra'
import * as path from 'node:path'
import { execSync } from 'node:child_process'

async function copyWorkspacePackages() {
  try {
    // Get workspace packages using yarn command
    const workspaces = execSync('yarn workspaces list --json', { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))

    // Process each workspace package
    for (const { name, location } of workspaces) {
      if (name === 'vxrn-monorepo') continue
      if (!name || !location) continue
      if (!location.startsWith('packages')) continue

      const sourceDir = path.resolve(location)
      const targetDir = path.join('node_modules', name)

      // Ensure target directory exists
      await fs.ensureDir(targetDir)

      // Copy package contents
      console.info(`Copying ${name} from ${sourceDir} to ${targetDir}...`)

      try {
        await fs.remove(targetDir)
      } catch {
        // ok
      }

      await fs.copy(sourceDir, targetDir, {
        overwrite: true,
        dereference: true, // This ensures symlinks are resolved
        filter: (src) => {
          // Skip node_modules and other common excludes
          return !src.includes('node_modules') && !src.includes('.git') && !src.endsWith('.log')
        },
      })
    }

    console.info('Successfully copied all workspace packages to node_modules')
  } catch (error) {
    console.error('Error copying workspace packages:', error)
    process.exit(1)
  }
}

// Run the script
copyWorkspacePackages()
