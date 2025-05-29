# TinySAM Sticker App

A web application that uses **TinySAM** to extract stickers from images directly in the browser. This app provides an interactive interface for precise object segmentation using Meta AI's SAM technology, optimized for web use.

## Features

- **AI-Powered Segmentation**: Uses TinySAM, a lightweight version of Meta AI's Segment Anything Model
- **Interactive Click Interface**: Add include/exclude clicks to refine selections
- **Real-time Preview**: See segmentation masks as you click
- **Sticker Collection**: Save and manage extracted stickers
- **In-Browser Processing**: No server required - everything runs client-side

## How It Works

1. **Upload an Image**: Select any image from your device
2. **Initialize TinySAM**: The app loads the segmentation models
3. **Click to Select**: Click on objects you want to extract (green = include, red = exclude)
4. **Real-time Segmentation**: See the AI-generated mask overlay
5. **Extract Sticker**: Save the object with transparent background
6. **Collect & Reuse**: Build your sticker collection
