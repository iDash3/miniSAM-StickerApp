"use client";

import { useState, createContext, useContext } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Download,
  Trash2,
  X,
  Images,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useStickerStore } from "@/lib/sticker-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Create context for panel state
const PanelContext = createContext<{
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
} | null>(null);

export function StickerCollectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <PanelContext.Provider value={{ isExpanded, setIsExpanded }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanelState() {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error(
      "usePanelState must be used within StickerCollectionProvider"
    );
  }
  return context;
}

export function StickerCollection() {
  const { stickers, removeSticker, clearStickers } = useStickerStore();
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const { isExpanded, setIsExpanded } = usePanelState();

  // Download sticker
  const downloadSticker = (dataUrl: string, id: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `sticker-${id.substring(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div
        className={`flex-shrink-0 bg-background border-l lg:border-l lg:border-t-0 border-t transition-all duration-300 ease-in-out
          ${
            // Mobile: always show full collection
            // Desktop: show thin panel when collapsed, full when expanded
            isExpanded
              ? "w-full lg:w-80 h-auto lg:h-auto"
              : "w-full lg:w-16 h-auto lg:h-auto"
          }
        `}
      >
        <Card className="h-full border-0 rounded-none shadow-lg">
          {/* Desktop collapsed state - just the icon button */}
          {!isExpanded && (
            <div className="flex flex-col h-full lg:flex hidden">
              <div className="p-4 border-b">
                <Button
                  onClick={() => setIsExpanded(true)}
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 relative"
                >
                  <Images className="h-5 w-5" />
                  {stickers.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {stickers.length > 9 ? "9+" : stickers.length}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Mobile: always show full collection */}
          <div className="lg:hidden block">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Images className="h-5 w-5" />
                  Sticker Collection
                </CardTitle>
                <CardDescription>
                  {stickers.length === 0
                    ? "Extract stickers to see them here"
                    : `${stickers.length} sticker${
                        stickers.length === 1 ? "" : "s"
                      } extracted`}
                </CardDescription>
              </div>

              {stickers.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearStickers}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              )}
            </CardHeader>

            <CardContent>
              {stickers.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                  <div className="text-center">
                    <Images className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No stickers yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Extract objects from images to add stickers
                    </p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                    {stickers.map((sticker) => (
                      <div key={sticker.id} className="group relative">
                        <Dialog>
                          <DialogTrigger asChild>
                            <div
                              className="flex aspect-square items-center justify-center rounded-lg border bg-background p-2 cursor-pointer hover:border-primary transition-colors"
                              onClick={() => setSelectedSticker(sticker.id)}
                            >
                              <img
                                src={sticker.dataUrl || "/placeholder.svg"}
                                alt="Sticker"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          </DialogTrigger>

                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Sticker Preview</DialogTitle>
                            </DialogHeader>
                            <div className="flex justify-center p-6 bg-muted/50 rounded-lg">
                              <img
                                src={sticker.dataUrl || "/placeholder.svg"}
                                alt="Sticker preview"
                                className="max-h-[60vh] max-w-full object-contain"
                              />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                              <Button
                                variant="outline"
                                onClick={() => removeSticker(sticker.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                              <Button
                                onClick={() =>
                                  downloadSticker(sticker.dataUrl, sticker.id)
                                }
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -right-2 -top-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeSticker(sticker.id)}
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </div>

          {/* Desktop expanded state - full collection */}
          {isExpanded && (
            <div className="lg:block hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Images className="h-5 w-5" />
                    Stickers
                  </CardTitle>
                  <CardDescription>
                    {stickers.length === 0
                      ? "Extract stickers to see them here"
                      : `${stickers.length} sticker${
                          stickers.length === 1 ? "" : "s"
                        } extracted`}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {stickers.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearStickers}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(false)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {stickers.length === 0 ? (
                  <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                    <div className="text-center">
                      <Images className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No stickers yet
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Extract objects from images to add stickers
                      </p>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="grid grid-cols-2 gap-4">
                      {stickers.map((sticker) => (
                        <div key={sticker.id} className="group relative">
                          <Dialog>
                            <DialogTrigger asChild>
                              <div
                                className="flex aspect-square items-center justify-center rounded-lg border bg-background p-2 cursor-pointer hover:border-primary transition-colors"
                                onClick={() => setSelectedSticker(sticker.id)}
                              >
                                <img
                                  src={sticker.dataUrl || "/placeholder.svg"}
                                  alt="Sticker"
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                            </DialogTrigger>

                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Sticker Preview</DialogTitle>
                              </DialogHeader>
                              <div className="flex justify-center p-6 bg-muted/50 rounded-lg">
                                <img
                                  src={sticker.dataUrl || "/placeholder.svg"}
                                  alt="Sticker preview"
                                  className="max-h-[60vh] max-w-full object-contain"
                                />
                              </div>
                              <div className="flex justify-end gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  onClick={() => removeSticker(sticker.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                                <Button
                                  onClick={() =>
                                    downloadSticker(sticker.dataUrl, sticker.id)
                                  }
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Download
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -right-2 -top-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeSticker(sticker.id)}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
