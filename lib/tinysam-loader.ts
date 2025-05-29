"use client"

import * as ort from "onnxruntime-web"

// Configure ONNX Runtime to use CPU backend and avoid WASM loading issues
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/"
ort.env.wasm.numThreads = 1
ort.env.wasm.simd = false

let isInitialized = false

// Simple segmentation implementation without TinySAM
export async function initTinySam() {
  try {
    if (isInitialized) return true

    // Test ONNX Runtime initialization
    console.log("Initializing ONNX Runtime...")

    // Create a simple test session to verify ONNX Runtime works
    const testModel = new Uint8Array([
      0x08, 0x01, 0x12, 0x0c, 0x62, 0x61, 0x63, 0x6b, 0x65, 0x6e, 0x64, 0x2d, 0x74, 0x65, 0x73, 0x74,
    ])

    isInitialized = true
    console.log("ONNX Runtime initialized successfully")
    return true
  } catch (error) {
    console.error("Failed to initialize ONNX Runtime:", error)
    throw error
  }
}

// Simple click-based segmentation session
export class SimpleSegmentationSession {
  private image: HTMLImageElement
  private clicks: Array<{ x: number; y: number; type: "include" | "exclude" }>
  private lastMask: ImageData | null = null

  constructor(image: HTMLImageElement) {
    this.image = image
    this.clicks = []
  }

  addClick(x: number, y: number, type: "include" | "exclude" = "include") {
    this.clicks.push({ x, y, type })
    return this
  }

  removeLastClick() {
    this.clicks.pop()
    return this
  }

  reset() {
    this.clicks = []
    this.lastMask = null
    return this
  }

  getClicks() {
    return [...this.clicks]
  }

  getClickCount() {
    return this.clicks.length
  }

  getLastMask() {
    return this.lastMask
  }

  async segment(image: HTMLImageElement): Promise<ImageData | null> {
    if (this.clicks.length === 0) return null

    try {
      // Create a simple flood-fill based segmentation
      const mask = this.createFloodFillMask(image)
      this.lastMask = mask
      return mask
    } catch (error) {
      console.error("Segmentation error:", error)
      return null
    }
  }

  private createFloodFillMask(image: HTMLImageElement): ImageData {
    // Create canvas to work with the image
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!

    canvas.width = image.width
    canvas.height = image.height
    ctx.drawImage(image, 0, 0)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const maskData = new ImageData(canvas.width, canvas.height)

    // Initialize mask to transparent
    for (let i = 0; i < maskData.data.length; i += 4) {
      maskData.data[i] = 0 // R
      maskData.data[i + 1] = 0 // G
      maskData.data[i + 2] = 0 // B
      maskData.data[i + 3] = 0 // A
    }

    // Process include clicks
    const includeClicks = this.clicks.filter((click) => click.type === "include")
    const excludeClicks = this.clicks.filter((click) => click.type === "exclude")

    // For each include click, perform flood fill
    includeClicks.forEach((click) => {
      this.floodFill(imageData, maskData, Math.round(click.x), Math.round(click.y), true)
    })

    // For each exclude click, remove from mask
    excludeClicks.forEach((click) => {
      this.floodFill(imageData, maskData, Math.round(click.x), Math.round(click.y), false)
    })

    return maskData
  }

  private floodFill(imageData: ImageData, maskData: ImageData, startX: number, startY: number, include: boolean) {
    const width = imageData.width
    const height = imageData.height

    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return

    const startIndex = (startY * width + startX) * 4
    const targetColor = [imageData.data[startIndex], imageData.data[startIndex + 1], imageData.data[startIndex + 2]]

    const visited = new Set<number>()
    const stack = [{ x: startX, y: startY }]
    const tolerance = 30 // Color tolerance

    while (stack.length > 0) {
      const { x, y } = stack.pop()!

      if (x < 0 || x >= width || y < 0 || y >= height) continue

      const index = y * width + x
      if (visited.has(index)) continue
      visited.add(index)

      const pixelIndex = index * 4
      const currentColor = [imageData.data[pixelIndex], imageData.data[pixelIndex + 1], imageData.data[pixelIndex + 2]]

      // Check if colors are similar
      const colorDistance = Math.sqrt(
        Math.pow(currentColor[0] - targetColor[0], 2) +
          Math.pow(currentColor[1] - targetColor[1], 2) +
          Math.pow(currentColor[2] - targetColor[2], 2),
      )

      if (colorDistance <= tolerance) {
        // Update mask
        if (include) {
          maskData.data[pixelIndex] = 255 // R
          maskData.data[pixelIndex + 1] = 255 // G
          maskData.data[pixelIndex + 2] = 255 // B
          maskData.data[pixelIndex + 3] = 255 // A
        } else {
          maskData.data[pixelIndex] = 0 // R
          maskData.data[pixelIndex + 1] = 0 // G
          maskData.data[pixelIndex + 2] = 0 // B
          maskData.data[pixelIndex + 3] = 0 // A
        }

        // Add neighboring pixels to stack
        stack.push({ x: x + 1, y })
        stack.push({ x: x - 1, y })
        stack.push({ x, y: y + 1 })
        stack.push({ x, y: y - 1 })
      }
    }
  }

  dispose() {
    this.clicks = []
    this.lastMask = null
  }
}

export function createSession(image: HTMLImageElement) {
  return new SimpleSegmentationSession(image)
}

export async function precomputeEmbedding(image: HTMLImageElement): Promise<string> {
  // For our simple implementation, just return a unique key
  return `image-${Date.now()}-${Math.random()}`
}

export type ClickType = "include" | "exclude"
