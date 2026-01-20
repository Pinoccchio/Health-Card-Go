/**
 * Laboratory Request PDF Generator
 *
 * Generates downloadable PDF laboratory request forms for health cards
 * Uses jsPDF and html2canvas to convert React template to PDF
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getCardTypeFromHealthCardType } from '@/lib/config/labFees';

export type HealthCardType = 'food_handler' | 'non_food' | 'pink';
export type CardType = 'yellow' | 'green' | 'pink';

/**
 * Generate and download laboratory request PDF
 * @param healthCardType - Type of health card (food_handler, non_food, or pink)
 * @returns Promise that resolves when PDF is generated and download starts
 */
export async function generateLabRequestPDF(healthCardType: HealthCardType): Promise<void> {
  try {
    // Convert health card type to card type
    const cardType = getCardTypeFromHealthCardType(healthCardType);

    // Dynamically import the template component
    const { default: LabRequestTemplate } = await import('@/components/patient/LabRequestTemplate');
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');

    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    // Render the template
    const root = ReactDOM.createRoot(container);
    const element = React.createElement(LabRequestTemplate, { cardType });
    root.render(element);

    // Wait for render to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Get the rendered element
    const templateElement = container.querySelector('#lab-request-template') as HTMLElement;
    if (!templateElement) {
      throw new Error('Lab request template element not found');
    }

    // Convert to canvas
    const canvas = await html2canvas(templateElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Generate filename
    const cardName = cardType === 'yellow' ? 'Yellow_Card' : cardType === 'green' ? 'Green_Card' : 'Pink_Card';
    const filename = `Lab_Request_${cardName}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Download PDF
    pdf.save(filename);

    // Cleanup
    root.unmount();
    document.body.removeChild(container);
  } catch (error) {
    console.error('Error generating lab request PDF:', error);
    throw new Error('Failed to generate laboratory request PDF');
  }
}

/**
 * Generate laboratory request PDF for a specific card type
 * Simpler function that directly accepts card type
 */
export async function downloadLabRequest(cardType: CardType): Promise<void> {
  const healthCardType: HealthCardType =
    cardType === 'yellow' ? 'food_handler' : cardType === 'green' ? 'non_food' : 'pink';

  await generateLabRequestPDF(healthCardType);
}

/**
 * Check if lab request is available for a given appointment
 * Only available for health card services with "inside_cho" lab location
 */
export function isLabRequestAvailable(
  serviceId: number,
  labLocation?: string | null
): boolean {
  // Health card services are 12-15
  const isHealthCardService = serviceId >= 12 && serviceId <= 15;

  // Only available for "inside_cho" location
  const isInsideCHO = labLocation === 'inside_cho';

  return isHealthCardService && isInsideCHO;
}

/**
 * Get card type from service ID
 */
export function getCardTypeFromServiceId(serviceId: number): CardType | null {
  switch (serviceId) {
    case 12:
    case 13:
      return 'yellow'; // Food handler
    case 14:
    case 15:
      return 'green'; // Non-food
    // Pink card service ID would go here when implemented
    default:
      return null;
  }
}
