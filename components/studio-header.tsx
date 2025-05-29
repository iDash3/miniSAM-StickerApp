import { Scissors } from "lucide-react"

export function StudioHeader() {
  return (
    <header className="border-b bg-background">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center gap-2">
          <Scissors className="h-6 w-6" />
          <h1 className="text-xl font-bold">Sticker Extractor</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Extract stickers from any image</span>
        </div>
      </div>
    </header>
  )
}
