import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import * as React from "react"


const SearchInpt = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className={cn("flex w-full items-center border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20", className)}>
        <SearchIcon className="h-4 w-4 mr-2.5 opacity-50 shrink-0" />
        <Input {...props} ref={ref} className="w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent h-auto p-0" />
      </div>
    )
  })

function SearchIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export default SearchInpt