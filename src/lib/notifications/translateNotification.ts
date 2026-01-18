/**
 * Translates notification title and message using the provided translation function
 * and interpolates dynamic data
 */

import { formatTime24To12, isTimeFormat } from '@/lib/utils/timeFormatters';

interface TranslationData {
  [key: string]: string | number | Date;
}

export interface NotificationTranslation {
  title: string;
  message: string;
  type: string;
}

/**
 * Checks if a string is a translation key (starts with 'notifications.')
 */
function isTranslationKey(text: string): boolean {
  return text.startsWith('notifications.');
}

/**
 * Parses dynamic data from notification message
 * Format: "key1=value1|key2=value2"
 */
function parseNotificationData(dataString: string | null): TranslationData {
  if (!dataString) return {};

  const data: TranslationData = {};
  const pairs = dataString.split('|');

  pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    if (key && value) {
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();

      // Format dates as readable strings for next-intl
      if (trimmedValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        const date = new Date(trimmedValue);
        // Format as "January 26, 2026" for better readability
        data[trimmedKey] = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }
      // Format times (HH:MM:SS or HH:MM) to 12-hour format with AM/PM
      else if (isTimeFormat(trimmedValue)) {
        data[trimmedKey] = formatTime24To12(trimmedValue);
      }
      // Convert numbers
      else if (!isNaN(Number(trimmedValue))) {
        data[trimmedKey] = Number(trimmedValue);
      }
      // Keep everything else as-is
      else {
        data[trimmedKey] = trimmedValue;
      }
    }
  });

  return data;
}

/**
 * Translates notification title and message
 * @param notification - Raw notification object
 * @param t - Translation function from next-intl
 * @param richT - Rich translation function for complex formatting (optional)
 * @returns Translated notification
 */
export function translateNotification(
  notification: {
    title: string;
    message: string;
    type: string;
    link?: string | null;
    [key: string]: any;
  },
  t: (key: string, values?: any) => string,
  richT?: (key: string, values?: any) => string
): NotificationTranslation {
  try {
    // Check if title and message are translation keys
    const isTitleKey = isTranslationKey(notification.title);
    const isMessageKey = isTranslationKey(notification.message);

    // Parse dynamic data from link or dedicated data field
    const dynamicData = parseNotificationData(notification.data || null);

    // Ensure all data values are strings or numbers (not objects)
    const sanitizedData: Record<string, string | number> = {};
    Object.entries(dynamicData).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number') {
        sanitizedData[key] = value;
      } else if (value instanceof Date) {
        sanitizedData[key] = value.toLocaleDateString();
      } else {
        sanitizedData[key] = String(value || '');
      }
    });

    // Debug logging for translation issues
    if (isMessageKey && process.env.NODE_ENV === 'development') {
      console.log('Translating notification:', {
        key: notification.message,
        data: sanitizedData
      });
    }

    // Translate title with fallback
    let title: string;
    if (isTitleKey) {
      try {
        title = t(notification.title, sanitizedData);
      } catch (err) {
        console.warn('Failed to translate notification title:', err);
        title = notification.title;
      }
    } else {
      title = notification.title;
    }

    // Translate message with fallback
    let message: string;
    if (isMessageKey) {
      try {
        message = richT
          ? richT(notification.message, sanitizedData)
          : t(notification.message, sanitizedData);
      } catch (err) {
        console.warn('Failed to translate notification message:', err);
        message = notification.message;
      }
    } else {
      message = notification.message;
    }

    // Translate type label
    const type = t(`notifications.types.${notification.type}`, { defaultValue: notification.type });

    return {
      title,
      message,
      type,
    };
  } catch (error) {
    console.error('Error translating notification:', error);
    // Fallback to original values
    return {
      title: notification.title,
      message: notification.message,
      type: notification.type,
    };
  }
}

/**
 * Format notification type for display
 */
export function getNotificationTypeLabel(
  type: string,
  t: (key: string, values?: any) => string
): string {
  const typeKey = `notifications.types.${type}`;
  return t(typeKey, { defaultValue: type.replace(/_/g, ' ') });
}

/**
 * Creates a translation-ready notification object
 * Used when creating new notifications
 */
export function createTranslatableNotification(
  type: string,
  data: TranslationData = {}
): { title: string; message: string; data: string } {
  // Convert data object to string format
  const dataString = Object.entries(data)
    .map(([key, value]) => {
      if (value instanceof Date) {
        return `${key}=${value.toISOString()}`;
      }
      return `${key}=${value}`;
    })
    .join('|');

  return {
    title: `notifications.${type}.title`,
    message: `notifications.${type}.message`,
    data: dataString,
  };
}
