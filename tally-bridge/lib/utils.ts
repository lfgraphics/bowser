import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to conditionally merge class names
 */
export function classNames(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleString()
  } catch (error) {
    return timestamp
  }
}

/**
 * Validate sync interval input
 */
export function validateSyncInterval(minutes: number): { isValid: boolean; error?: string } {
  if (typeof minutes !== 'number' || isNaN(minutes)) {
    return { isValid: false, error: 'Interval must be a valid number' }
  }
  
  if (minutes < 10) {
    return { isValid: false, error: 'Interval must be at least 10 minutes' }
  }
  
  if (minutes > 1440) { // 24 hours
    return { isValid: false, error: 'Interval cannot exceed 24 hours' }
  }
  
  return { isValid: true }
}

/**
 * Get Tailwind color class based on log level
 */
export function getLogLevelColor(level: 'INFO' | 'WARN' | 'ERROR'): string {
  switch (level) {
    case 'INFO':
      return 'text-white'
    case 'WARN':
      return 'text-orange-400'
    case 'ERROR':
      return 'text-red-400'
    default:
      return 'text-white'
  }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}