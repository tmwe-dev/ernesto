import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx + tailwind-merge
 * Handles both conditional classes and Tailwind conflicts
 * @example
 * cn('px-2 py-1', condition && 'px-4 py-2') // px-4 py-2 wins
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
