import type { ComponentProps, ReactNode } from 'react'
import type { VariantProps } from 'class-variance-authority'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps): ReactNode {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
