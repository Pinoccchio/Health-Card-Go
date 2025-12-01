/**
 * Translates notification title and message using the provided translation function
 * and interpolates dynamic data
 */

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
      // Try to parse dates
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
        data[key.trim()] = new Date(value.trim());
      } else if (!isNaN(Number(value))) {
        data[key.trim()] = Number(value);
      } else {
        data[key.trim()] = value.trim();
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

    // Translate title
    const title = isTitleKey
      ? t(notification.title, dynamicData)
      : notification.title;

    // Translate message (use richT if available for complex formatting)
    const message = isMessageKey
      ? (richT ? richT(notification.message, dynamicData) : t(notification.message, dynamicData))
      : notification.message;

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
