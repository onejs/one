import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ForegroundHandler,
  normalizeBehavior,
  showAllBehavior,
  suppressBehavior,
} from '../src/notifications/handlerState'
import type { Notification } from '../src/notifications/types'

const notification = {
  request: {
    identifier: 'test-id',
    content: {
      title: 'hi',
      subtitle: null,
      body: null,
      data: {},
      sound: false,
      badge: null,
    },
    trigger: { type: 'timeInterval', seconds: 0, repeats: false },
  },
  date: 0,
} as Notification

function settled() {
  return vi.advanceTimersByTimeAsync(0)
}

describe('normalizeBehavior', () => {
  it('passes a full behavior through', () => {
    expect(normalizeBehavior({ ...showAllBehavior })).toEqual(showAllBehavior)
  })

  it('coerces missing and non-boolean fields to false', () => {
    expect(normalizeBehavior({ shouldShowBanner: true })).toEqual({
      shouldShowBanner: true,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    })
    expect(normalizeBehavior({ shouldShowBanner: 1 })).toEqual(suppressBehavior)
  })

  it('suppresses garbage', () => {
    expect(normalizeBehavior(null)).toEqual(suppressBehavior)
    expect(normalizeBehavior(undefined)).toEqual(suppressBehavior)
    expect(normalizeBehavior('show')).toEqual(suppressBehavior)
  })
})

describe('ForegroundHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows everything until a handler is set', () => {
    const present = vi.fn()
    const runner = new ForegroundHandler(present)
    expect(runner.receive('a', notification)).toBe(true)
    expect(present).toHaveBeenCalledTimes(1)
    expect(present).toHaveBeenCalledWith('a', showAllBehavior)
  })

  it('stays quiet once the handler is nulled', () => {
    const present = vi.fn()
    const runner = new ForegroundHandler(present)
    runner.setHandler(null)
    expect(runner.receive('a', notification)).toBe(true)
    expect(present).toHaveBeenCalledWith('a', suppressBehavior)
  })

  it('presents the handler answer', async () => {
    const present = vi.fn()
    const runner = new ForegroundHandler(present)
    runner.setHandler({
      handleNotification: () =>
        Promise.resolve({ ...suppressBehavior, shouldPlaySound: true }),
    })
    expect(runner.receive('a', notification)).toBe(true)
    expect(present).not.toHaveBeenCalled()
    await settled()
    expect(present).toHaveBeenCalledTimes(1)
    expect(present).toHaveBeenCalledWith('a', {
      ...suppressBehavior,
      shouldPlaySound: true,
    })
  })

  it('shows everything when the handler throws', async () => {
    const present = vi.fn()
    const runner = new ForegroundHandler(present)
    runner.setHandler({
      handleNotification: () => Promise.reject(new Error('boom')),
    })
    runner.receive('a', notification)
    await settled()
    expect(present).toHaveBeenCalledWith('a', showAllBehavior)
  })

  it('waits for the handler without timing out, and settles once', async () => {
    const present = vi.fn()
    const runner = new ForegroundHandler(present)
    let answer!: (behavior: typeof showAllBehavior) => void
    runner.setHandler({
      handleNotification: () => new Promise((resolve) => void (answer = resolve)),
    })
    runner.receive('a', notification)
    // a duplicate of the in-flight id delivers nothing new.
    expect(runner.receive('a', notification)).toBe(false)
    await settled()
    // native owns the 3s backstop: js presents nothing on its own.
    expect(present).not.toHaveBeenCalled()
    // the late answer still presents exactly once.
    answer({ ...suppressBehavior })
    await settled()
    expect(present).toHaveBeenCalledTimes(1)
    expect(present).toHaveBeenCalledWith('a', suppressBehavior)
  })

  it('ignores duplicates of an in-flight request id', async () => {
    const present = vi.fn()
    const runner = new ForegroundHandler(present)
    runner.setHandler({
      handleNotification: () => Promise.resolve({ ...showAllBehavior }),
    })
    expect(runner.receive('a', notification)).toBe(true)
    expect(runner.receive('a', notification)).toBe(false)
    await settled()
    expect(present).toHaveBeenCalledTimes(1)
  })

  it('pairs concurrent arrivals with their own answers', async () => {
    const present = vi.fn()
    const runner = new ForegroundHandler(present)
    const answers = new Map<string, (behavior: typeof showAllBehavior) => void>()
    runner.setHandler({
      handleNotification: (item) =>
        new Promise((resolve) => void answers.set(item.request.identifier, resolve)),
    })
    const first = {
      ...notification,
      request: { ...notification.request, identifier: 'first' },
    }
    const second = {
      ...notification,
      request: { ...notification.request, identifier: 'second' },
    }
    runner.receive('id-1', first)
    runner.receive('id-2', second)
    await settled()
    answers.get('second')?.({ ...suppressBehavior })
    await settled()
    answers.get('first')?.({ ...showAllBehavior })
    await settled()
    expect(present).toHaveBeenCalledTimes(2)
    expect(present).toHaveBeenCalledWith('id-2', suppressBehavior)
    expect(present).toHaveBeenCalledWith('id-1', showAllBehavior)
  })
})
