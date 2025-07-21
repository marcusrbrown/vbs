import type {ProgressExportData} from './types.js'

const STORAGE_KEY = 'starTrekProgress'

export const saveProgress = (watchedItems: string[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(watchedItems))
}

export const loadProgress = (): string[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading progress:', error)
    return []
  }
}

export const exportProgress = (watchedItems: string[]): void => {
  const data: ProgressExportData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    progress: watchedItems,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'})
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `star-trek-progress-${new Date().toISOString().split('T')[0]}.json`
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const importProgressFromFile = async (file: File): Promise<string[]> => {
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    if (data.progress && Array.isArray(data.progress)) {
      return data.progress
    } else {
      throw new Error('Invalid progress file format')
    }
  } catch {
    throw new Error('Error reading progress file')
  }
}
