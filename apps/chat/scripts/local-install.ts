import { writeFileSync, readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Run a command to replace all dependencies and devDependencies with workspace:* in current package.json
// with the version number found in the package.json.version:
for (const depType of ['dependencies', 'devDependencies']) {
  if (pkg[depType]) {
    Object.keys(pkg[depType]).forEach((dep) => {
      if (pkg[depType][dep].startsWith('workspace:')) {
        pkg[depType][dep] = pkg.version
      }
    })
  }
}

writeFileSync('./package.json', JSON.stringify(pkg, null, 2))
