'use client'

import imageCompression from 'browser-image-compression'

export async function capturePhoto (): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1) Create a hidden <input type="file" capture="environment" />
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // Requests the rear camera on mobile devices
    input.style.display = 'none'

    // 2) Listen for user file selection
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        reject('No file selected (user canceled or no file).')
        cleanup()
        return
      }

      try {
        // 3) Compress the image
        const compressedBlob = await compressImage(file)

        // 4) Convert the compressed Blob to Base64
        const base64 = await blobToBase64(compressedBlob)
        resolve(base64)
      } catch (err) {
        reject(err)
      } finally {
        cleanup()
      }
    }

    // 5) Append to DOM & trigger click
    document.body.appendChild(input)
    input.click()

    // Clean up DOM element after done
    function cleanup () {
      if (input.parentNode) {
        input.parentNode.removeChild(input)
      }
    }
  })
}

/**
 * Compress the image file using browser-image-compression.
 * Adjust options as you see fit (maxSizeMB, maxWidthOrHeight, etc.).
 */
async function compressImage (file: File): Promise<Blob> {
  const options = {
    maxSizeMB: 1, // 1 MB max
    maxWidthOrHeight: 1280, // e.g. limit dimension
    useWebWorker: true
  }
  const compressedBlob = await imageCompression(file, options)
  return compressedBlob
}

/**
 * Convert a Blob or File to a Base64 data URL
 */
function blobToBase64 (blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject('Failed to convert blob to base64')
      }
    }
    reader.readAsDataURL(blob)
  })
}
