// installs a react-native with npm's package.json and Fabric renderer and stand-ins for its main entry and
// the two runtime entries the renderer requires
import { cpSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { npmPackage } from '../../scripts/lib'

const npm = npmPackage('react-native', '0.88.0')
const out = join(process.cwd(), 'node_modules/react-native')
const renderer = 'Libraries/Renderer/implementations/ReactFabric-prod.js'
mkdirSync(join(out, 'src'), { recursive: true })
cpSync(join(npm, 'package.json'), join(out, 'package.json'))
cpSync(join(npm, renderer), join(out, renderer))
writeFileSync(join(out, 'src/setup-env.js'), '')
cpSync(join(import.meta.dir, 'react-private-interface.js'), join(out, 'src/react-private-interface.js'))
cpSync(join(import.meta.dir, 'react-native-index.js'), join(out, 'index.js'))
