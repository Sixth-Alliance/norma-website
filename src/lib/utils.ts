import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { logger } from "@/src/utils/logger"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number or numeric string as Nigerian Naira currency with thousands separators
 * and two decimal places. Examples:
 *  - 70000 => "70,000.00"
 *  - "12000" => "12,000.00"
 */
export function formatCurrency(value: number | string | undefined | null) {
  try {
    if (value === undefined || value === null || value === "") return "0.00";
    
    // Enhanced safety: Multiple layers of protection
    let stringValue: string;
    
    if (typeof value === "number") {
      stringValue = value.toString();
    } else if (typeof value === "string") {
      stringValue = value;
    } else {
      // For objects, arrays, or other types - ensure safe conversion
      stringValue = String(value || "0");
    }
    
    // Safe string operations with additional protection
    if (typeof stringValue !== 'string') {
      stringValue = String(stringValue);
    }
    
    const cleanValue = stringValue.replace(/,/g, "");
    const num = parseFloat(cleanValue);
    
    if (isNaN(num)) return "0.00";
    
    // Use toLocaleString to insert thousands separators and ensure two decimals
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch (error) {
    logger.error('Error in formatCurrency:', error, 'Value:', value, 'Type:', typeof value);
    return "0.00";
  }
}
