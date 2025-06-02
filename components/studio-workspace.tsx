"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trash2,
  Upload,
  Eraser,
  Plus,
  Minus,
  Scissors,
  RotateCcw,
  Undo2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStickerStore } from "@/lib/sticker-store";
import {
  initMiniSam,
  createSession,
  precomputeEmbedding,
  type ClickType,
  type SimpleSegmentationSession,
} from "@/lib/minisam-loader";

type Click = {
  x: number;
  y: number;
  type: ClickType;
};

export function StudioWorkspace() {
  const { toast } = useToast();
  const { addSticker } = useStickerStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [clickMode, setClickMode] = useState<ClickType>("include");
  const [mask, setMask] = useState<ImageData | null>(null);
  const [session, setSession] = useState<SimpleSegmentationSession | null>(
    null
  );
  const [isDragOver, setIsDragOver] = useState(false);

  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize MiniSAM
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        await initMiniSam();
        setIsInitialized(true);
        toast({
          title: "MiniSAM initialized",
          description: "Ready to extract stickers!",
        });
      } catch (error) {
        console.error("Failed to initialize MiniSAM:", error);
        toast({
          title: "Initialization failed",
          description: "Could not load segmentation models",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [toast]);

  // Handle file upload (reusable for both drag/drop and file input)
  const processFile = useCallback(
    (file: File) => {
      if (!file) return;

      setIsLoading(true);
      const reader = new FileReader();

      reader.onload = async (event) => {
        if (!event.target?.result) return;

        // Create image element
        const img = new Image();
        img.onload = async () => {
          setImage(img);

          // Reset state
          setClicks([]);
          setMask(null);

          // Draw image on canvas
          const canvas = imageCanvasRef.current;
          if (canvas) {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);
          }

          try {
            // Precompute embedding for faster segmentation
            await precomputeEmbedding(img);

            // Create new session
            const newSession = createSession(img);
            setSession(newSession);

            setIsLoading(false);
          } catch (error) {
            console.error("Error preparing image:", error);
            toast({
              title: "Error",
              description: "Failed to process the image",
              variant: "destructive",
            });
            setIsLoading(false);
          }
        };

        img.src = event.target.result as string;
      };

      reader.readAsDataURL(file);
    },
    [toast]
  );

  // Handle file upload from input
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile]
  );

  // Handle drag and drop events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith("image/"));

      if (imageFile) {
        processFile(imageFile);
      }
    },
    [processFile]
  );

  // Handle canvas click
  const handleCanvasClick = useCallback(
    async (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!image || !session || isLoading) return;

      const canvas = imageCanvasRef.current;
      if (!canvas) return;

      // Get click coordinates relative to the original image
      const rect = canvas.getBoundingClientRect();
      const scaleX = image.width / rect.width;
      const scaleY = image.height / rect.height;

      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // Add click to state
      const newClick = { x, y, type: clickMode };
      setClicks((prev) => [...prev, newClick]);

      // Add click to session
      session.addClick(x, y, clickMode);

      setIsLoading(true);
      try {
        // Perform segmentation
        const maskData = await session.segment(image);
        setMask(maskData);

        // Draw mask on mask canvas
        const maskCanvas = maskCanvasRef.current;
        if (maskCanvas && maskData) {
          maskCanvas.width = maskData.width;
          maskCanvas.height = maskData.height;
          const ctx = maskCanvas.getContext("2d");
          ctx?.putImageData(maskData, 0, 0);
        }
      } catch (error) {
        console.error("Segmentation error:", error);
        toast({
          title: "Segmentation failed",
          description: "Could not generate mask",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [image, session, isLoading, clickMode, toast]
  );

  // Reset workspace
  const resetWorkspace = useCallback(() => {
    if (session) {
      session.reset();
    }
    setClicks([]);
    setMask(null);

    // Clear mask canvas
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const ctx = maskCanvas.getContext("2d");
      ctx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
  }, [session]);

  // Extract sticker
  const extractSticker = useCallback(() => {
    if (!image || !mask) return;

    try {
      console.log("Extracting sticker...");
      console.log("Image dimensions:", image.width, "x", image.height);
      console.log("Mask dimensions:", mask.width, "x", mask.height);

      // Log a sample of mask data to understand the format
      const sampleMaskData = Array.from(mask.data.slice(0, 20));
      console.log("Sample mask data:", sampleMaskData);
      console.log(
        "Original mask format - width:",
        mask.width,
        "height:",
        mask.height,
        "data length:",
        mask.data.length
      );
      console.log("Expected length for RGBA:", mask.width * mask.height * 4);
      console.log("Expected length for grayscale:", mask.width * mask.height);

      // Create a temporary canvas for the extracted sticker
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
      if (!tempCtx) return;

      // Set canvas size to match the original image
      tempCanvas.width = image.width;
      tempCanvas.height = image.height;

      // Draw the original image
      tempCtx.drawImage(image, 0, 0);

      // Get image data
      const imageData = tempCtx.getImageData(
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );

      let maskedPixels = 0;
      let totalPixels = imageData.data.length / 4;

      // Check if the original mask is single-channel (grayscale)
      const isOriginalSingleChannel =
        mask.data.length === mask.width * mask.height;

      if (isOriginalSingleChannel) {
        console.log("Original mask appears to be single-channel (grayscale)");

        // For single-channel masks, apply directly
        for (let i = 0; i < imageData.data.length; i += 4) {
          const pixelIndex = i / 4;
          const x = pixelIndex % image.width;
          const y = Math.floor(pixelIndex / image.width);

          // Scale coordinates to mask dimensions
          const maskX = Math.floor((x * mask.width) / image.width);
          const maskY = Math.floor((y * mask.height) / image.height);
          const maskIndex = maskY * mask.width + maskX;

          const maskValue = mask.data[maskIndex] || 0;

          if (maskValue > 128) {
            maskedPixels++;
          } else {
            imageData.data[i + 3] = 0; // Set alpha to 0 (transparent)
          }
        }

        console.log(
          `Direct single-channel: Masked pixels: ${maskedPixels} out of ${totalPixels} (${(
            (maskedPixels / totalPixels) *
            100
          ).toFixed(1)}%)`
        );
      } else {
        console.log("Original mask appears to be multi-channel (RGBA)");

        // Continue with the scaled mask approach
        // Create a temporary canvas to hold the original mask
        const originalMaskCanvas = document.createElement("canvas");
        originalMaskCanvas.width = mask.width;
        originalMaskCanvas.height = mask.height;
        const originalMaskCtx = originalMaskCanvas.getContext("2d");
        if (!originalMaskCtx) return;

        // Put the original mask data on the temporary canvas
        originalMaskCtx.putImageData(mask, 0, 0);

        // Create a scaled version of the mask to match image dimensions
        const scaledMaskCanvas = document.createElement("canvas");
        scaledMaskCanvas.width = image.width;
        scaledMaskCanvas.height = image.height;
        const scaledMaskCtx = scaledMaskCanvas.getContext("2d");
        if (!scaledMaskCtx) return;

        // Scale the mask to match the image dimensions
        scaledMaskCtx.drawImage(
          originalMaskCanvas,
          0,
          0,
          image.width,
          image.height
        );

        // Get the scaled mask data
        const scaledMaskData = scaledMaskCtx.getImageData(
          0,
          0,
          image.width,
          image.height
        );

        // Apply the mask to the image (set alpha to 0 for non-masked areas)
        maskedPixels = 0;
        totalPixels = imageData.data.length / 4;

        // First, let's understand the mask format better
        console.log(
          "First 40 mask values:",
          Array.from(scaledMaskData.data.slice(0, 40))
        );

        // Check if mask is in RGBA format or grayscale
        let isGrayscale = true;
        for (
          let i = 0;
          i < Math.min(1000, scaledMaskData.data.length);
          i += 4
        ) {
          const r = scaledMaskData.data[i];
          const g = scaledMaskData.data[i + 1];
          const b = scaledMaskData.data[i + 2];
          if (r !== g || g !== b) {
            isGrayscale = false;
            break;
          }
        }
        console.log("Mask is grayscale:", isGrayscale);

        for (let i = 0; i < imageData.data.length; i += 4) {
          const pixelIndex = i / 4;
          const maskPixelIndex = pixelIndex * 4;

          // Get mask values
          const maskR = scaledMaskData.data[maskPixelIndex] || 0;
          const maskG = scaledMaskData.data[maskPixelIndex + 1] || 0;
          const maskB = scaledMaskData.data[maskPixelIndex + 2] || 0;
          const maskA = scaledMaskData.data[maskPixelIndex + 3] || 0;

          // For MiniSAM masks, check multiple interpretations:
          // 1. Grayscale in RGB channels where white = foreground
          // 2. Alpha channel contains the mask
          // 3. Any non-zero value indicates foreground

          let isForeground = false;

          // MiniSAM masks appear to store mask information in the ALPHA channel!
          // Alpha = 255 means foreground, Alpha = 0 means background
          if (maskA > 128) {
            isForeground = true;
          } else if (isGrayscale && maskR > 128) {
            // Fallback: check RGB for traditional grayscale masks
            isForeground = true;
          } else if (
            !isGrayscale &&
            (maskR > 128 || maskG > 128 || maskB > 128)
          ) {
            // Fallback: check for any bright RGB values
            isForeground = true;
          }

          if (isForeground) {
            // Keep the original pixel (this is foreground)
            maskedPixels++;
          } else {
            // Make pixel transparent (this is background)
            imageData.data[i + 3] = 0; // Set alpha to 0
          }
        }

        console.log(
          `Masked pixels: ${maskedPixels} out of ${totalPixels} (${(
            (maskedPixels / totalPixels) *
            100
          ).toFixed(1)}%)`
        );

        // Put the masked image data back on the canvas
        tempCtx.putImageData(imageData, 0, 0);

        // Debug: Check if we have any opaque pixels after masking
        const debugImageData = tempCtx.getImageData(
          0,
          0,
          tempCanvas.width,
          tempCanvas.height
        );
        let opaquePixels = 0;
        for (let i = 3; i < debugImageData.data.length; i += 4) {
          if (debugImageData.data[i] > 0) opaquePixels++;
        }
        console.log("Opaque pixels after masking:", opaquePixels);

        // Trim the canvas to the content bounds
        const trimmedCanvas = trimCanvas(tempCanvas);
        console.log(
          "Trimmed canvas dimensions:",
          trimmedCanvas.width,
          "x",
          trimmedCanvas.height
        );

        // Convert to data URL
        const stickerDataUrl = trimmedCanvas.toDataURL("image/png");

        // Add to sticker collection
        addSticker({
          id: `sticker-${Date.now()}`,
          dataUrl: stickerDataUrl,
          width: trimmedCanvas.width,
          height: trimmedCanvas.height,
          createdAt: new Date().toISOString(),
        });

        toast({
          title: "Sticker extracted!",
          description: "Your sticker has been added to the collection",
        });

        // Reset workspace for next extraction
        resetWorkspace();
      }
    } catch (error) {
      console.error("Error extracting sticker:", error);
      toast({
        title: "Extraction failed",
        description: "Could not extract the sticker",
        variant: "destructive",
      });
    }
  }, [image, mask, addSticker, resetWorkspace, toast]);

  // Trim canvas to content bounds
  const trimCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return canvas;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const l = pixels.data.length;
    const bound = {
      top: null as number | null,
      left: null as number | null,
      right: null as number | null,
      bottom: null as number | null,
    };

    // Find bounds
    for (let i = 0; i < l; i += 4) {
      if (pixels.data[i + 3] !== 0) {
        const x = (i / 4) % canvas.width;
        const y = ~~(i / 4 / canvas.width);

        if (bound.top === null) {
          bound.top = y;
        }

        if (bound.left === null) {
          bound.left = x;
        } else if (x < bound.left) {
          bound.left = x;
        }

        if (bound.right === null) {
          bound.right = x;
        } else if (bound.right < x) {
          bound.right = x;
        }

        if (bound.bottom === null) {
          bound.bottom = y;
        } else if (bound.bottom < y) {
          bound.bottom = y;
        }
      }
    }

    // Create trimmed canvas
    const trimmedCanvas = document.createElement("canvas");
    const trimmedCtx = trimmedCanvas.getContext("2d");

    // Check if we have valid bounds
    if (
      bound.top === null ||
      bound.left === null ||
      bound.right === null ||
      bound.bottom === null
    ) {
      return canvas; // Return original if no content found
    }

    // Add some padding
    const padding = 10;
    bound.top = Math.max(0, bound.top - padding);
    bound.left = Math.max(0, bound.left - padding);
    bound.right = Math.min(canvas.width, bound.right + padding);
    bound.bottom = Math.min(canvas.height, bound.bottom + padding);

    const trimWidth = bound.right - bound.left + 1;
    const trimHeight = bound.bottom - bound.top + 1;

    trimmedCanvas.width = trimWidth;
    trimmedCanvas.height = trimHeight;

    if (trimmedCtx) {
      trimmedCtx.drawImage(
        canvas,
        bound.left,
        bound.top,
        trimWidth,
        trimHeight,
        0,
        0,
        trimWidth,
        trimHeight
      );
    }

    return trimmedCanvas;
  };

  // Undo last click
  const undoLastClick = useCallback(() => {
    if (!session || !image) return;

    session.removeLastClick();
    setClicks((prev) => prev.slice(0, -1));

    // Re-run segmentation if there are still clicks
    if (clicks.length > 1) {
      session
        .segment(image)
        .then((maskData: ImageData | null) => {
          if (maskData) {
            setMask(maskData);

            // Draw mask on mask canvas
            const maskCanvas = maskCanvasRef.current;
            if (maskCanvas && maskData) {
              maskCanvas.width = maskData.width;
              maskCanvas.height = maskData.height;
              const ctx = maskCanvas.getContext("2d");
              ctx?.putImageData(maskData, 0, 0);
            }
          } else {
            setMask(null);
            // Clear mask canvas
            const maskCanvas = maskCanvasRef.current;
            if (maskCanvas) {
              const ctx = maskCanvas.getContext("2d");
              ctx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            }
          }
        })
        .catch((error: any) => {
          console.error("Segmentation error:", error);
        });
    } else {
      setMask(null);

      // Clear mask canvas
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        const ctx = maskCanvas.getContext("2d");
        ctx?.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    }
  }, [session, clicks, image]);

  return (
    <div className="flex flex-1 flex-col p-4">
      <Card className="flex flex-1 flex-col">
        <Tabs defaultValue="workspace" className="flex flex-1 flex-col">
          <div className="border-b px-4">
            <TabsList className="my-2">
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
              <TabsTrigger value="help">Help</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="workspace"
            className="flex-1 p-4 data-[state=active]:flex data-[state=active]:flex-col"
          >
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

              <Button
                variant="outline"
                onClick={undoLastClick}
                disabled={!image || clicks.length === 0 || isLoading}
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Undo Click
              </Button>

              <Button
                variant="outline"
                onClick={resetWorkspace}
                disabled={!image || clicks.length === 0 || isLoading}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>

              <Button
                onClick={extractSticker}
                disabled={!mask || isLoading}
                className="ml-auto"
              >
                <Scissors className="mr-2 h-4 w-4" />
                Extract Sticker
              </Button>
            </div>

            <div
              className={`relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border ${
                isDragOver
                  ? "border-primary border-2 bg-primary/5"
                  : "bg-muted/50"
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <div className="text-center">
                    <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                    <p className="text-sm text-muted-foreground">
                      Processing...
                    </p>
                  </div>
                </div>
              )}

              {!image && !isLoading && (
                <div className="text-center p-8">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">
                    {isInitialized
                      ? "Upload an image to get started"
                      : "Initializing segmentation models..."}
                  </p>
                </div>
              )}

              <div className="relative max-h-full max-w-full">
                <canvas
                  ref={imageCanvasRef}
                  onClick={handleCanvasClick}
                  className={`max-h-[70vh] max-w-full ${
                    image ? "cursor-pointer" : "hidden"
                  }`}
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
                        click.type === "include"
                          ? "border-green-500 bg-green-500/20"
                          : "border-red-500 bg-red-500/20"
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

          <TabsContent
            value="help"
            className="p-6 flex items-center justify-center"
          >
            <div className="mt-24 max-w-2xl mx-auto space-y-12">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-3">
                  SAM Powered Segmentation!
                </h2>
                <p className="text-lg text-muted-foreground">
                  Extract perfect stickers from any image using Meta's Segment
                  Anything Model, running entirely in your browser
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">
                    Powered by miniSAM
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Our open-source JavaScript library that brings Meta's
                    Segment Anything Model to the browser. Everything runs
                    locally on your device.
                  </p>
                  <a
                    href="https://github.com/iDash3/miniSAM"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    View miniSAM on GitHub →
                  </a>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">
                    Open Source App
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    This app is completely open source. Fork it, customize it,
                    or use it as inspiration for your projects.
                  </p>
                  <a
                    href="https://github.com/iDash3/miniSAM-StickerApp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                  >
                    View App Source Code →
                  </a>
                </div>
              </div>

              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Start by uploading an image and clicking on objects to extract
                  them as stickers
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
