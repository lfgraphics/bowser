import moment from 'moment';
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatDate = (dateInput: string | Date): string => {
    const date = moment(dateInput);
    return `${date.format('DD-MM-YY')}, ${date.format('hh:mm A')}`;
};