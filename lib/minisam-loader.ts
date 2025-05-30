"use client";

import {
  initSegmentation,
  createSession as createMinissamSession,
  precomputeEmbedding as precomputeMinissamEmbedding,
  type SegmentationSession,
  type ClickType,
} from "minisam";

let isInitialized = false;

// Initialize MiniSAM with default CDN models
export async function initMiniSam() {
  try {
    if (isInitialized) return true;

    console.log("Initializing MiniSAM...");

    // Initialize with default CDN models
    await initSegmentation();

    isInitialized = true;
    console.log("MiniSAM initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize MiniSAM:", error);
    throw error;
  }
}

// MiniSAM segmentation session wrapper
export class SimpleSegmentationSession {
  private session: SegmentationSession;
  private lastMask: ImageData | null = null;

  constructor(image: HTMLImageElement) {
    this.session = createMinissamSession(image);
  }

  addClick(x: number, y: number, type: ClickType = "include") {
    this.session.addClick(x, y, type);
    return this;
  }

  removeLastClick() {
    this.session.removeLastClick();
    return this;
  }

  reset() {
    this.session.reset();
    this.lastMask = null;
    return this;
  }

  getClicks() {
    return this.session.getClicks();
  }

  getClickCount() {
    return this.session.getClickCount();
  }

  getLastMask() {
    return this.lastMask;
  }

  async segment(image: HTMLImageElement): Promise<ImageData | null> {
    try {
      const maskData = await this.session.segment(image);
      this.lastMask = maskData;
      return maskData;
    } catch (error) {
      console.error("Segmentation error:", error);
      return null;
    }
  }

  dispose() {
    this.session.dispose();
    this.lastMask = null;
  }
}

export function createSession(image: HTMLImageElement) {
  return new SimpleSegmentationSession(image);
}

export async function precomputeEmbedding(
  image: HTMLImageElement
): Promise<string> {
  try {
    return await precomputeMinissamEmbedding(image);
  } catch (error) {
    console.error("Error precomputing embedding:", error);
    throw error;
  }
}

export type { ClickType };
