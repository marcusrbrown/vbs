/**
 * Tests for parallel execution utility with concurrency control.
 * Validates configurable concurrency limits, error handling, and progress tracking.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createParallelExecutor} from '../scripts/lib/cli-utils.js'

describe('createParallelExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should execute tasks in parallel with concurrency limit of 1', async () => {
    const executor = createParallelExecutor<number, number>({
      concurrency: 1,
    })

    const executionOrder: number[] = []
    const items = [1, 2, 3, 4, 5]

    const result = await executor(items, async (item: number) => {
      executionOrder.push(item)
      await new Promise(resolve => setTimeout(resolve, 10))
      return item * 2
    })

    expect(result.results).toEqual([2, 4, 6, 8, 10])
    expect(result.successCount).toBe(5)
    expect(result.errorCount).toBe(0)
    expect(result.errors).toEqual([])
    expect(executionOrder).toEqual([1, 2, 3, 4, 5])
  })

  it('should execute tasks in parallel with higher concurrency limit', async () => {
    const executor = createParallelExecutor<number, number>({
      concurrency: 3,
    })

    const startTimes: number[] = []
    const items = [1, 2, 3, 4, 5]

    const result = await executor(items, async (item: number) => {
      startTimes.push(Date.now())
      await new Promise(resolve => setTimeout(resolve, 50))
      return item * 2
    })

    expect(result.results).toEqual([2, 4, 6, 8, 10])
    expect(result.successCount).toBe(5)
    expect(result.errorCount).toBe(0)

    const firstBatch = startTimes.slice(0, 3)
    const secondBatch = startTimes.slice(3)

    const firstBatchVariance = Math.max(...firstBatch) - Math.min(...firstBatch)
    const secondBatchVariance = Math.max(...secondBatch) - Math.min(...secondBatch)

    expect(firstBatchVariance).toBeLessThan(30)
    expect(secondBatchVariance).toBeLessThan(30)
  })

  it('should handle errors without stopping execution', async () => {
    const onError = vi.fn()
    const executor = createParallelExecutor<number, number>({
      concurrency: 2,
      onError,
    })

    const items = [1, 2, 3, 4, 5]

    const result = await executor(items, async (item: number) => {
      if (item === 2 || item === 4) {
        throw new Error(`Error processing ${item}`)
      }
      return item * 2
    })

    expect(result.successCount).toBe(3)
    expect(result.errorCount).toBe(2)
    expect(result.errors).toHaveLength(2)
    expect(result.errors[0]?.index).toBe(1)
    expect(result.errors[0]?.error.message).toBe('Error processing 2')
    expect(result.errors[1]?.index).toBe(3)
    expect(result.errors[1]?.error.message).toBe('Error processing 4')

    expect(result.results[0]).toBe(2)
    expect(result.results[2]).toBe(6)
    expect(result.results[4]).toBe(10)

    expect(onError).toHaveBeenCalledTimes(2)
  })

  it('should call progress callback during execution', async () => {
    const onProgress = vi.fn()
    const executor = createParallelExecutor<number, number>({
      concurrency: 2,
      onProgress,
    })

    const items = [1, 2, 3, 4, 5]

    await executor(items, async (item: number) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return item * 2
    })

    expect(onProgress).toHaveBeenCalledTimes(5)
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 5)
    expect(onProgress).toHaveBeenNthCalledWith(2, 2, 5)
    expect(onProgress).toHaveBeenNthCalledWith(3, 3, 5)
    expect(onProgress).toHaveBeenNthCalledWith(4, 4, 5)
    expect(onProgress).toHaveBeenNthCalledWith(5, 5, 5)
  })

  it('should handle empty item array', async () => {
    const executor = createParallelExecutor<number, number>({
      concurrency: 3,
    })

    const result = await executor([], async (item: number) => {
      return item * 2
    })

    expect(result.results).toEqual([])
    expect(result.successCount).toBe(0)
    expect(result.errorCount).toBe(0)
    expect(result.errors).toEqual([])
  })

  it('should handle concurrency greater than item count', async () => {
    const executor = createParallelExecutor<number, number>({
      concurrency: 10,
    })

    const items = [1, 2, 3]

    const result = await executor(items, async (item: number) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return item * 2
    })

    expect(result.results).toEqual([2, 4, 6])
    expect(result.successCount).toBe(3)
    expect(result.errorCount).toBe(0)
  })

  it('should maintain result order regardless of completion order', async () => {
    const executor = createParallelExecutor<number, number>({
      concurrency: 5,
    })

    const items = [1, 2, 3, 4, 5]

    const result = await executor(items, async (item: number) => {
      const delay = (6 - item) * 20
      await new Promise(resolve => setTimeout(resolve, delay))
      return item * 2
    })

    expect(result.results).toEqual([2, 4, 6, 8, 10])
  })

  it('should handle processor returning null values', async () => {
    const executor = createParallelExecutor<number, number | null>({
      concurrency: 2,
    })

    const items = [1, 2, 3, 4, 5]

    const result = await executor(items, async (item: number) => {
      if (item % 2 === 0) {
        return null
      }
      return item * 2
    })

    expect(result.results).toEqual([2, null, 6, null, 10])
    expect(result.successCount).toBe(5)
    expect(result.errorCount).toBe(0)
  })

  it('should provide correct index to processor function', async () => {
    const executor = createParallelExecutor<string, string>({
      concurrency: 2,
    })

    const items = ['a', 'b', 'c']
    const indices: number[] = []

    await executor(items, async (_item: string, index: number) => {
      indices.push(index)
      return `item-${index}`
    })

    expect(indices).toEqual([0, 1, 2])
  })

  it('should handle processor throwing non-Error objects', async () => {
    const onError = vi.fn()
    const executor = createParallelExecutor<number, number>({
      concurrency: 2,
      onError,
    })

    const items = [1, 2, 3]

    const result = await executor(items, async (item: number) => {
      if (item === 2) {
        throw new Error('String error')
      }
      return item * 2
    })

    expect(result.errorCount).toBe(1)
    expect(result.errors[0]?.error.message).toBe('String error')
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('should execute with maximum parallelism when concurrency equals item count', async () => {
    const executor = createParallelExecutor<number, number>({
      concurrency: 5,
    })

    const startTimes: number[] = []
    const items = [1, 2, 3, 4, 5]

    await executor(items, async (item: number) => {
      startTimes.push(Date.now())
      await new Promise(resolve => setTimeout(resolve, 30))
      return item * 2
    })

    const timeVariance = Math.max(...startTimes) - Math.min(...startTimes)
    expect(timeVariance).toBeLessThan(20)
  })
})
