"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

// Exported as before for use in your app
const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    btcPrice?: string
    currency?: string
    price?: string
    gain?: string
    percent?: string
    date?: string
  }
>(
  (
    {
      className,
      btcPrice = "BTC Price",
      currency = "US Dollar",
      price = "$13.38",
      gain = "+13.33",
      percent = "(+26660.00%)",
      date = "Dec 5, 2012",
      sideOffset = 4,
      ...props
    },
    ref
  ) => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-4 py-3 w-72 text-popover-foreground shadow-md relative",
        className
      )}
      {...props}
    >
      {/* Header Row */}
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-xs text-muted-foreground">{btcPrice}</span>
        <span className="font-semibold text-xs text-muted-foreground">{currency}</span>
      </div>
      {/* Price */}
      <div className="text-3xl font-bold text-foreground mb-1">{price}</div>
      {/* Gain & Percent */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-green-500 font-medium">{gain}</span>
        <span className="text-green-500 text-xs font-medium">{percent}</span>
      </div>
      {/* Date */}
      <div className="absolute left-4 bottom-2 text-xs text-muted-foreground">{date}</div>
    </TooltipPrimitive.Content>
  )
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
