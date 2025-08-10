/**
 * Download utility functions for file exports.
 * Provides cross-browser compatible methods for downloading Blob data as files.
 */

/**
 * Downloads a Blob as a file with the specified filename.
 * Uses the modern File System Access API if available, falls back to download links.
 *
 * @param blob - The Blob data to download
 * @param filename - The desired filename (including extension)
 * @param mimeType - Optional MIME type for the file
 *
 * @example
 * ```typescript
 * const blob = new Blob(['Hello, World!'], { type: 'text/plain' })
 * await downloadBlob(blob, 'hello.txt', 'text/plain')
 * ```
 */
export const downloadBlob = async (
  blob: Blob,
  filename: string,
  mimeType?: string,
): Promise<void> => {
  // Use File System Access API if available (modern browsers)
  if ('showSaveFilePicker' in window) {
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: mimeType
          ? [
              {
                description: `${mimeType.split('/')[1]?.toUpperCase() || 'Unknown'} files`,
                accept: {[mimeType]: [`.${filename.split('.').pop()}`]},
              },
            ]
          : undefined,
      })

      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      // User cancelled or API not available, fall back to download link
      console.warn('[VBS] File System Access API failed, using fallback:', error)
    }
  }

  // Fallback: Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  // Add to DOM, click, and remove
  document.body.append(link)
  link.click()
  link.remove()

  // Clean up the URL
  URL.revokeObjectURL(url)
}

/**
 * Creates a download link element for a Blob.
 * Useful when you want to provide a download button rather than immediate download.
 *
 * @param blob - The Blob data to download
 * @param filename - The desired filename (including extension)
 * @param linkText - Text content for the download link
 * @returns HTMLAnchorElement configured for download
 *
 * @example
 * ```typescript
 * const blob = new Blob(['Hello, World!'], { type: 'text/plain' })
 * const link = createDownloadLink(blob, 'hello.txt', 'Download File')
 * document.body.appendChild(link)
 * ```
 */
export const createDownloadLink = (
  blob: Blob,
  filename: string,
  linkText: string,
): HTMLAnchorElement => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.textContent = linkText
  link.className = 'download-link'

  // Clean up URL when link is clicked
  link.addEventListener('click', () => {
    setTimeout(() => URL.revokeObjectURL(url), 100)
  })

  return link
}

/**
 * Downloads multiple files as a ZIP archive.
 * Note: This requires a ZIP library to be available.
 *
 * @param files - Array of {blob, filename} objects
 * @param _zipFilename - Name for the ZIP file (unused in current implementation)
 */
export const downloadAsZip = async (
  files: {blob: Blob; filename: string}[],
  _zipFilename: string,
): Promise<void> => {
  // This would require a ZIP library like JSZip
  // For now, just download files individually
  console.warn('[VBS] ZIP download not implemented, downloading files individually')

  for (const file of files) {
    await downloadBlob(file.blob, file.filename)
    // Add small delay between downloads to prevent browser blocking
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

/**
 * Utility function to get appropriate file extension for MIME type.
 *
 * @param mimeType - The MIME type string
 * @returns File extension (including dot)
 */
export const getFileExtensionFromMimeType = (mimeType: string): string => {
  const mimeMap: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/svg+xml': '.svg',
    'text/plain': '.txt',
    'application/json': '.json',
    'text/csv': '.csv',
    'application/pdf': '.pdf',
  }

  return mimeMap[mimeType] || ''
}

/**
 * Checks if the browser supports the File System Access API.
 * @returns True if the modern API is available
 */
export const supportsFileSystemAccess = (): boolean => {
  return 'showSaveFilePicker' in window
}
