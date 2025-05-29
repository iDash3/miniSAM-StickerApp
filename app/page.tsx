import { StudioHeader } from "@/components/studio-header"
import { StudioWorkspace } from "@/components/studio-workspace"
import { StickerCollection } from "@/components/sticker-collection"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <StudioHeader />
      <div className="flex flex-1 flex-col lg:flex-row">
        <StudioWorkspace />
        <StickerCollection />
      </div>
    </main>
  )
}
