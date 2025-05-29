"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, Upload, Eraser, Plus, Minus, Scissors } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useStickerStore } from "@/lib/sticker-store"
import {
  initTinySam,
  createSession,
  precomputeEmbedding,
  type ClickType,
  type SimpleSegmentationSession,
} from "@/lib/tinysam-loader"

type Click = {
  x: number
  y: number
  type: ClickType
}

export function StudioWorkspace() {
  const { toast } = useToast()
  const { addSticker } = useStickerStore()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [clicks, setClicks] = useState<Click[]>([])
  const [clickMode, setClickMode] = useState<ClickType>("include")
  const [mask, setMask] = useState<ImageData | null>(null)
  const [session, setSession] = useState<SimpleSegmentationSession | null>(null)

  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize TinySAM
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true)
        await initTinySam()
        setIsInitialized(true)
        toast({
          title: "TinySAM initialized",
          description: "Ready to extract stickers!",
        })
      } catch (error) {
        console.error("Failed to initialize TinySAM:", error)
        toast({
          title: "Initialization failed",
          description: "Could not load segmentation models",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [toast])

  // Handle file upload
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setIsLoading(true)
      const reader = new FileReader()

      reader.onload = async (event) => {
        if (!event.target?.result) return

        // Create image element
        const img = new Image()
        img.onload = async () => {
          setImage(img)

          // Reset state
          setClicks([])
          setMask(null)

          // Draw image on canvas
          const canvas = imageCanvasRef.current
          if (canvas) {
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext("2d")
            ctx?.drawImage(img, 0, 0)
          }

          try {
            // Precompute embedding for faster segmentation
            await precomputeEmbedding(img)

            // Create new session
            const newSession = createSession(img)
            setSession(newSession)

            setIsLoading(false)
          } catch (error) {
            console.error("Error preparing image:", error)
            toast({
              title: "Error",
              description: "Failed to process the image",
              variant: "destructive",
            })
            setIsLoading(false)
          }
        }

        img.src = event.target.result as string
      }

      reader.readAsDataURL(file)
    },
    [toast],
  )

  // Handle canvas click
  const handleCanvasClick = useCallback(
    async (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!image || !session || isLoading) return

      const canvas = imageCanvasRef.current
      if (!canvas) return

      // Get click coordinates relative to the original image
      const rect = canvas.getBoundingClientRect()
      const scaleX = image.width / rect.width
      const scaleY = image.height / rect.height

      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      // Add click to state
      const newClick = { x, y, type: clickMode }
      setClicks((prev) => [...prev, newClick])

      // Add click to session
      session.addClick(x, y, clickMode)

      setIsLoading(true)
      try {
        // Perform segmentation
        const maskData = await session.segment(image)
        setMask(maskData)

        // Draw mask on mask canvas
        const maskCanvas = maskCanvasRef.current
        if (maskCanvas && maskData) {
          maskCanvas.width = maskData.width
          maskCanvas.height = maskData.height
          const ctx = maskCanvas.getContext("2d")
          ctx?.putImageData(maskData, 0, 0)
        }
      } catch (error) {
        console.error("Segmentation error:", error)
        toast({
          title: "Segmentation failed",
          description: "Could not generate mask",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [image, session, isLoading, clickMode, toast],
  )

  // Reset workspace
  const resetWorkspace = useCallback(() => {
    if (session) {
      session.reset()
    }
    setClicks([])
    setMask(null)

    // Clear mask canvas
    const maskCanvas = maskCanvasRef.current
    if (maskCanvas) {
      const ctx = maskCanvas.getContext("2d")
      ctx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
    }
  }, [session])

  // Extract sticker
  const extractSticker = useCallback(() => {
    if (!image || !mask) return

    try {
      // Create a temporary canvas for the extracted sticker
      const tempCanvas = document.createElement("canvas")
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true })
      if (!tempCtx) return

      // Set canvas size to match the original image
      tempCanvas.width = image.width
      tempCanvas.height = image.height

      // Draw the original image
      tempCtx.drawImage(image, 0, 0)

      // Get image data
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)

      // Create a scaled-up version of the mask
      const scaledMaskCanvas = document.createElement("canvas")
      scaledMaskCanvas.width = image.width
      scaledMaskCanvas.height = image.height
      const scaledMaskCtx = scaledMaskCanvas.getContext("2d")
      if (!scaledMaskCtx) return

      // Draw the mask scaled to match the image dimensions
      const maskCanvas = maskCanvasRef.current
      if (maskCanvas) {
        scaledMaskCtx.drawImage(maskCanvas, 0, 0, image.width, image.height)
      }

      // Get the scaled mask data
      const scaledMaskData = scaledMaskCtx.getImageData(0, 0, image.width, image.height)

      // Apply the mask to the image (set alpha to 0 for non-masked areas)
      for (let i = 0; i < imageData.data.length; i += 4) {
        // Check if this pixel is part of the mask (mask is grayscale, so we just check the red channel)
        // Threshold at 128 (half of 255)
        if (scaledMaskData.data[i] < 128) {
          // Set alpha to 0 for non-masked areas
          imageData.data[i + 3] = 0
        }
      }

      // Put the masked image data back on the canvas
      tempCtx.putImageData(imageData, 0, 0)

      // Trim the canvas to the content bounds
      const trimmedCanvas = trimCanvas(tempCanvas)

      // Convert to data URL
      const stickerDataUrl = trimmedCanvas.toDataURL("image/png")

      // Add to sticker collection
      addSticker({
        id: `sticker-${Date.now()}`,
        dataUrl: stickerDataUrl,
        width: trimmedCanvas.width,
        height: trimmedCanvas.height,
        createdAt: new Date().toISOString(),
      })

      toast({
        title: "Sticker extracted!",
        description: "Your sticker has been added to the collection",
      })

      // Reset workspace for next extraction
      resetWorkspace()
    } catch (error) {
      console.error("Error extracting sticker:", error)
      toast({
        title: "Extraction failed",
        description: "Could not extract the sticker",
        variant: "destructive",
      })
    }
  }, [image, mask, addSticker, resetWorkspace, toast])

  // Trim canvas to content bounds
  const trimCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return canvas

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const l = pixels.data.length
    const bound = {
      top: null as number | null,
      left: null as number | null,
      right: null as number | null,
      bottom: null as number | null,
    }

    // Find bounds
    for (let i = 0; i < l; i += 4) {
      if (pixels.data[i + 3] !== 0) {
        const x = (i / 4) % canvas.width
        const y = ~~(i / 4 / canvas.width)

        if (bound.top === null) {
          bound.top = y
        }

        if (bound.left === null) {
          bound.left = x
        } else if (x < bound.left) {
          bound.left = x
        }

        if (bound.right === null) {
          bound.right = x
        } else if (bound.right < x) {
          bound.right = x
        }

        if (bound.bottom === null) {
          bound.bottom = y
        } else if (bound.bottom < y) {
          bound.bottom = y
        }
      }
    }

    // Create trimmed canvas
    const trimmedCanvas = document.createElement("canvas")
    const trimmedCtx = trimmedCanvas.getContext("2d")

    // Check if we have valid bounds
    if (bound.top === null || bound.left === null || bound.right === null || bound.bottom === null) {
      return canvas // Return original if no content found
    }

    // Add some padding
    const padding = 10
    bound.top = Math.max(0, bound.top - padding)
    bound.left = Math.max(0, bound.left - padding)
    bound.right = Math.min(canvas.width, bound.right + padding)
    bound.bottom = Math.min(canvas.height, bound.bottom + padding)

    const trimWidth = bound.right - bound.left + 1
    const trimHeight = bound.bottom - bound.top + 1

    trimmedCanvas.width = trimWidth
    trimmedCanvas.height = trimHeight

    if (trimmedCtx) {
      trimmedCtx.drawImage(canvas, bound.left, bound.top, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight)
    }

    return trimmedCanvas
  }

  // Undo last click
  const undoLastClick = useCallback(() => {
    if (!session) return

    session.removeLastClick()
    setClicks((prev) => prev.slice(0, -1))

    // Re-run segmentation if there are still clicks
    if (clicks.length > 1) {
      session
        .segment(image)
        .then((maskData: ImageData) => {
          setMask(maskData)

          // Draw mask on mask canvas
          const maskCanvas = maskCanvasRef.current
          if (maskCanvas && maskData) {
            maskCanvas.width = maskData.width
            maskCanvas.height = maskData.height
            const ctx = maskCanvas.getContext("2d")
            ctx?.putImageData(maskData, 0, 0)
          }
        })
        .catch((error: any) => {
          console.error("Segmentation error:", error)
        })
    } else {
      setMask(null)

      // Clear mask canvas
      const maskCanvas = maskCanvasRef.current
      if (maskCanvas) {
        const ctx = maskCanvas.getContext("2d")
        ctx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
      }
    }
  }, [session, clicks, image])

  return (
    <div className="flex flex-1 flex-col p-4 lg:w-2/3">
      <Card className="flex flex-1 flex-col">
        <Tabs defaultValue="workspace" className="flex flex-1 flex-col">
          <div className="border-b px-4">
            <TabsList className="my-2">
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
              <TabsTrigger value="help">Help</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="workspace" className="flex-1 p-4 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || !isInitialized}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isLoading || !isInitialized}
              />

              <Button
                variant={clickMode === "include" ? "default" : "outline"}
                onClick={() => setClickMode("include")}
                disabled={!image || isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Include
              </Button>

              <Button
                variant={clickMode === "exclude" ? "default" : "outline"}
                onClick={() => setClickMode("exclude")}
                disabled={!image || isLoading}
              >
                <Minus className="mr-2 h-4 w-4" />
                Exclude
              </Button>

              <Button variant="outline" onClick={undoLastClick} disabled={!image || clicks.length === 0 || isLoading}>
                <Eraser className="mr-2 h-4 w-4" />
                Undo Click
              </Button>

              <Button variant="outline" onClick={resetWorkspace} disabled={!image || clicks.length === 0 || isLoading}>
                <Trash2 className="mr-2 h-4 w-4" />
                Reset
              </Button>

              <Button onClick={extractSticker} disabled={!mask || isLoading} className="ml-auto">
                <Scissors className="mr-2 h-4 w-4" />
                Extract Sticker
              </Button>
            </div>

            <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/50">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <div className="text-center">
                    <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                    <p className="text-sm text-muted-foreground">Processing...</p>
                  </div>
                </div>
              )}

              {!image && !isLoading && (
                <div className="text-center p-8">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">
                    {isInitialized ? "Upload an image to get started" : "Initializing segmentation models..."}
                  </p>
                </div>
              )}

              <div className="relative max-h-full max-w-full">
                <canvas
                  ref={imageCanvasRef}
                  onClick={handleCanvasClick}
                  className={`max-h-[70vh] max-w-full ${image ? "cursor-pointer" : "hidden"}`}
                  style={{ maxWidth: "100%", height: "auto" }}
                />

                <canvas
                  ref={maskCanvasRef}
                  className="absolute inset-0 pointer-events-none opacity-40"
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    display: mask ? "block" : "none",
                  }}
                />

                {/* Render click markers */}
                {image &&
                  clicks.map((click, index) => (
                    <div
                      key={index}
                      className={`absolute rounded-full border-2 pointer-events-none ${
                        click.type === "include" ? "border-green-500 bg-green-500/20" : "border-red-500 bg-red-500/20"
                      }`}
                      style={{
                        width: "20px",
                        height: "20px",
                        left: `${(click.x / image.width) * 100}%`,
                        top: `${(click.y / image.height) * 100}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="help" className="p-6">
            <h2 className="text-xl font-bold mb-4">How to Use the Sticker Extractor</h2>

            <ol className="list-decimal pl-5 space-y-3">
              <li>
                <strong>Upload an image</strong> - Click the "Upload Image" button to select an image from your device.
              </li>
              <li>
                <strong>Click on objects</strong> - Click on the object you want to extract. Use the "Include" mode
                (default) to select areas to keep.
              </li>
              <li>
                <strong>Refine selection</strong> - Use "Exclude" mode to remove areas from your selection if needed.
              </li>
              <li>
                <strong>Extract the sticker</strong> - Once you're happy with the selection, click "Extract Sticker" to
                add it to your collection.
              </li>
              <li>
                <strong>Repeat</strong> - You can extract multiple stickers from the same image by resetting and
                selecting different objects.
              </li>
            </ol>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">Tips:</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Click on areas with similar colors for best results.</li>
                <li>You can add multiple clicks to expand the selection.</li>
                <li>If the selection includes unwanted areas, use "Exclude" mode to remove them.</li>
                <li>The extracted stickers will automatically have transparent backgrounds.</li>
                <li>This version uses a simple flood-fill algorithm for segmentation.</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
