import assert from "node:assert/strict"
import { test, expect, mock } from "bun:test"

const openStores = new Set<string>()
let closeCalls = 0

class MockOneZeroEngine {
  name = ""
  opened = false
  closed = false
  async open(name: string, _schema: string, _clientID: string) {
    this.name = name
    if (name === "fail-open") {
      throw new Error("simulated open failure")
    }
    if (openStores.has(name)) {
      throw new Error(`native Zero store is already open: /mock/zero-${name}.sqlite`)
    }
    openStores.add(name)
    this.opened = true
  }
  async execute(requestJson: string) {
    const req = JSON.parse(requestJson)
    if (req.op === "state") {
      return JSON.stringify({
        clientID: "mock-client",
        cookie: null,
        nextMutationID: 1,
        lastMutationID: 0,
        queryVersion: 0,
        queries: [],
        recoveryRequired: null,
        completedQueries: [],
        queryErrors: {},
      })
    }
    return JSON.stringify({})
  }
  async close() {
    closeCalls++
    this.closed = true
    if (this.name) openStores.delete(this.name)
  }
}

let lastCreatedEngine: MockOneZeroEngine | null = null

mock.module("react-native-nitro-modules", () => ({
  NitroModules: {
    createHybridObject: (_tag: string) => {
      lastCreatedEngine = new MockOneZeroEngine()
      return lastCreatedEngine
    },
  },
}))

test("Defect 10 & 3: duplicate open immediate rejection and clean cleanup on open failure", async () => {
  const { createNativeZero } = await import("../../src/zero/native/nitro")
  const schema = { tables: { msg: { name: "msg", primaryKey: ["id"], columns: { id: { type: "string" } } } } } as const

  // 1. Open failure triggers clean disposal of engine and client (Defect 10)
  closeCalls = 0
  await expect(
    createNativeZero({
      name: "fail-open",
      schema,
      mutators: {},
    })
  ).rejects.toThrow("simulated open failure")
  expect(closeCalls).toBeGreaterThanOrEqual(1)
  expect(lastCreatedEngine?.closed).toBe(true)

  // 2. Open store A succeeds
  const storeA = await createNativeZero({
    name: "store-dup",
    schema,
    mutators: {},
  })
  expect(openStores.has("store-dup")).toBe(true)

  // 3. Second open of same store path immediately rejects without 5.3s stall (Defect 3)
  const start = Date.now()
  await expect(
    createNativeZero({
      name: "store-dup",
      schema,
      mutators: {},
    })
  ).rejects.toThrow("native Zero store is already open")
  const duration = Date.now() - start
  expect(duration).toBeLessThan(500) // Immediate, NOT 5000ms+

  // 4. Closing store A frees the path and enables clean reopen (Defect 3 & 11)
  await storeA.close()
  expect(openStores.has("store-dup")).toBe(false)

  const storeReopened = await createNativeZero({
    name: "store-dup",
    schema,
    mutators: {},
  })
  expect(openStores.has("store-dup")).toBe(true)
  await storeReopened.close()
  expect(openStores.has("store-dup")).toBe(false)
})
