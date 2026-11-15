import { createHash } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { relative, resolve } from 'node:path'

export interface DOMDescriptor {
  id: string
  identity: string
  moduleId: string
}

export interface DOMManifest {
  protocolVersion: 1
  buildId: string
  entries: Record<string, string>
}

export class DOMRegistry {
  private descriptors = new Map<string, DOMDescriptor>()
  private graphs = new Map<string, Set<string>>()
  readonly root: string

  constructor(root: string) {
    this.root = realpathSync(root)
  }

  descriptor(moduleId: string): DOMDescriptor {
    const canonical = realpathSync(moduleId.split('?')[0])
    const identity = relative(this.root, canonical).replaceAll('\\', '/')
    const id = `dom-${createHash('sha256').update(identity).digest('hex').slice(0, 32)}`
    return { id, identity, moduleId: canonical }
  }

  register(moduleId: string): DOMDescriptor {
    const descriptor = this.descriptor(moduleId)
    this.descriptors.set(descriptor.id, descriptor)
    return descriptor
  }

  get(id: string): DOMDescriptor | undefined {
    return this.descriptors.get(id)
  }

  // each platform holds its own graph, so a rebuild cannot erase the other.
  replaceGraph(graph: string, entries: DOMDescriptor[]) {
    this.graphs.set(graph, new Set(entries.map((entry) => entry.id)))
    for (const entry of entries) this.descriptors.set(entry.id, entry)
    for (const id of this.descriptors.keys()) {
      if (![...this.graphs.values()].some((ids) => ids.has(id))) {
        this.descriptors.delete(id)
      }
    }
  }

  hasModule(moduleId: string): boolean {
    const file = resolve(moduleId).replaceAll('\\', '/')
    return [...this.descriptors.values()].some(
      (entry) => entry.moduleId.replaceAll('\\', '/') === file
    )
  }

  invalidate(moduleId: string) {
    const file = resolve(moduleId).replaceAll('\\', '/')
    for (const [id, entry] of this.descriptors) {
      if (entry.moduleId.replaceAll('\\', '/') === file) this.descriptors.delete(id)
    }
  }
}
