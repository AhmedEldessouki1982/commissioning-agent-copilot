import type { ComponentProps, ReactNode } from 'react'
import * as SheetPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetPortal = SheetPrimitive.Portal

function SheetOverlay({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Overlay>): ReactNode {
  return (
    <SheetPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  )
}

const sheetVariants = cva(
  [
    'fixed z-50 flex flex-col gap-4 border-border bg-background shadow-lg',
    'transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:duration-200 data-[state=open]:duration-300',
  ].join(' '),
  {
    variants: {
      side: {
        right:
          'inset-y-0 right-0 h-full w-[92vw] max-w-md border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
        left: 'inset-y-0 left-0 h-full w-[92vw] max-w-md border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
      },
    },
    defaultVariants: { side: 'right' },
  },
)

export interface SheetContentProps
  extends ComponentProps<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  showClose?: boolean
}

function SheetContent({
  side = 'right',
  className,
  children,
  showClose = true,
  ...props
}: SheetContentProps): ReactNode {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        {showClose ? (
          <SheetPrimitive.Close
            className="absolute top-4 right-4 rounded-sm p-1 text-muted-foreground opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X className="size-4" />
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: ComponentProps<'div'>): ReactNode {
  return <div className={cn('flex flex-col gap-1 pr-8', className)} {...props} />
}

function SheetFooter({ className, ...props }: ComponentProps<'div'>): ReactNode {
  return <div className={cn('mt-auto flex flex-col gap-2', className)} {...props} />
}

function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>): ReactNode {
  return (
    <SheetPrimitive.Title
      className={cn('text-sm font-semibold tracking-wide text-foreground uppercase', className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>): ReactNode {
  return (
    <SheetPrimitive.Description
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
