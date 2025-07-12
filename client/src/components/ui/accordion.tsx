import * as React from "react"
// import * as AccordionPrimitive from "@radix-ui/react-accordion" // TODO: Install @radix-ui/react-accordion
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

// Placeholder components until @radix-ui/react-accordion is installed
const Accordion = ({ children, ...props }: any) => <div {...props}>{children}</div>
const AccordionItem = ({ children, className, ...props }: any) => (
  <div className={cn("border-b", className)} {...props}>{children}</div>
)
const AccordionTrigger = ({ children, className, ...props }: any) => (
  <button className={cn("flex flex-1 items-center justify-between py-4 font-medium", className)} {...props}>
    {children}
    <ChevronDown className="h-4 w-4" />
  </button>
)
const AccordionContent = ({ children, className, ...props }: any) => (
  <div className={cn("pb-4 pt-0", className)} {...props}>{children}</div>
)

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
