"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronDown, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"

const SidebarContext = React.createContext<{
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}>({
  isOpen: false,
  setIsOpen: () => undefined,
})

export function SidebarProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const isMobile = useMobile()

  React.useEffect(() => {
    if (!isMobile) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [isMobile])

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="flex h-full w-full">{children}</div>
    </SidebarContext.Provider>
  )
}

export function SidebarTrigger() {
  const { isOpen, setIsOpen } = React.useContext(SidebarContext)

  return (
    <button
      className="inline-flex h-9 w-9 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      onClick={() => setIsOpen(!isOpen)}
    >
      <Menu className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  )
}

export function SidebarInset({
  children,
}: {
  children: React.ReactNode
}) {
  const { isOpen } = React.useContext(SidebarContext)
  const isMobile = useMobile()

  return <div className={cn("flex flex-1 flex-col", isOpen && !isMobile && "ml-[240px]")}>{children}</div>
}

export function Sidebar({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isOpen } = React.useContext(SidebarContext)
  const isMobile = useMobile()

  return (
    <div
      className={cn(
        "fixed inset-y-0 z-50 flex w-[240px] flex-col bg-sidebar border-r transition-transform",
        isOpen ? "translate-x-0" : "-translate-x-full",
        !isMobile && isOpen && "shadow-sm",
        isMobile && isOpen && "shadow-xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex h-14 items-center border-b px-4", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 overflow-auto py-2", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center border-t p-4", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarGroup({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("pb-4", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarGroupLabel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-4 py-2", className)} {...props}>
      <h4 className="text-xs font-semibold text-sidebar-foreground/70">{children}</h4>
    </div>
  )
}

export function SidebarMenu({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-1 px-2", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarMenuItem({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-0.5", className)} {...props}>
      {children}
    </div>
  )
}

const sidebarMenuButtonVariants = cva(
  "flex items-center gap-2 rounded-md px-2 text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-hover-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      size: {
        sm: "h-8 text-xs",
        md: "h-9 text-sm",
        lg: "h-10 text-base",
      },
      isActive: {
        true: "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active hover:text-sidebar-active-foreground",
        false: "",
      },
    },
    defaultVariants: {
      size: "md",
      isActive: false,
    },
  },
)

export interface SidebarMenuButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarMenuButtonVariants> {
  asChild?: boolean
}

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, size, isActive, asChild = false, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : "button"
    const WrapperComp = asChild ? "div" : React.Fragment
    const wrapperProps = asChild ? { className: cn(sidebarMenuButtonVariants({ size, isActive, className })) } : {}

    return (
      <WrapperComp {...wrapperProps}>
        <Comp
          ref={ref}
          className={asChild ? undefined : cn(sidebarMenuButtonVariants({ size, isActive, className }))}
          {...props}
        />
      </WrapperComp>
    )
  },
)
SidebarMenuButton.displayName = "SidebarMenuButton"

export function SidebarMenuSub({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-0.5 pl-4", className)} {...props}>
      {children}
    </div>
  )
}

export function SidebarMenuSubItem({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid", className)} {...props}>
      {children}
    </div>
  )
}

const sidebarMenuSubButtonVariants = cva(
  "flex items-center gap-2 rounded-md px-2 text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-hover-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
  {
    variants: {
      size: {
        sm: "h-7 text-xs",
        md: "h-8 text-xs",
        lg: "h-9 text-sm",
      },
      isActive: {
        true: "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active hover:text-sidebar-active-foreground",
        false: "",
      },
    },
    defaultVariants: {
      size: "md",
      isActive: false,
    },
  },
)

export interface SidebarMenuSubButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarMenuSubButtonVariants> {
  asChild?: boolean
}

export const SidebarMenuSubButton = React.forwardRef<HTMLButtonElement, SidebarMenuSubButtonProps>(
  ({ className, size, isActive, asChild = false, ...props }, ref) => {
    const Comp = asChild ? React.Fragment : "button"
    const WrapperComp = asChild ? "div" : React.Fragment
    const wrapperProps = asChild ? { className: cn(sidebarMenuSubButtonVariants({ size, isActive, className })) } : {}

    return (
      <WrapperComp {...wrapperProps}>
        <Comp
          ref={ref}
          className={asChild ? undefined : cn(sidebarMenuSubButtonVariants({ size, isActive, className }))}
          {...props}
        />
      </WrapperComp>
    )
  },
)
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export function SidebarMenuTrigger({ className, children, ...props }: React.HTMLAttributes<HTMLButtonElement>) {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="grid gap-0.5">
      <button
        className={cn(
          "flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-hover-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          className,
        )}
        onClick={() => setIsOpen(!isOpen)}
        {...props}
      >
        <span>{children}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="grid gap-0.5 pl-4">
          <div className="grid gap-0.5">
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-hover-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              Item 1
            </button>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-hover-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              Item 2
            </button>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-hover-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              Item 3
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SidebarRail({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isOpen, setIsOpen } = React.useContext(SidebarContext)
  const isMobile = useMobile()

  if (isMobile) {
    return (
      <div
        className={cn("fixed inset-0 z-40 bg-background/80 backdrop-blur-sm", isOpen ? "block" : "hidden", className)}
        onClick={() => setIsOpen(false)}
        {...props}
      />
    )
  }

  return null
}
