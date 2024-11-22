"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ThemeChanger() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="w-full justify-start pl-4">
        <Button variant="ghost" size="icon">
          <Sun className="h-[1.2rem] w-full rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" /><span className="ml-2 block dark:hidden text-foreground">Light</span>
          <Moon className="absolute h-[1.2rem] w-full rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" /><span className="ml-2 hidden dark:block text-foreground">Dark</span>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
