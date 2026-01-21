import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Type definitions for lab fees
interface LabFee {
  card_type: 'food_handler' | 'non_food' | 'pink';
  stool_exam_fee: number | null;
  urinalysis_fee: number | null;
  cbc_fee: number | null;
  smearing_fee: number | null;
  card_fee: number;
  total_fee: number;
}

// Default fallback fees if database fetch fails
const FALLBACK_FEES = {
  food_handler: {
    stool_exam_fee: 33,
    urinalysis_fee: 33,
    cbc_fee: 34,
    card_fee: 70,
    total_fee: 170
  },
  non_food: {
    stool_exam_fee: 33,
    urinalysis_fee: 33,
    cbc_fee: 34,
    card_fee: 70,
    total_fee: 170
  },
  pink: {
    smearing_fee: 60,
    card_fee: 100,
    total_fee: 160
  }
};

// Fetch lab fees from database
async function fetchLabFees(): Promise<Record<string, LabFee>> {
  try {
    const supabase = await createClient();

    const { data: fees, error } = await supabase
      .from('lab_fees')
      .select('*')
      .eq('is_active', true);

    if (error || !fees || fees.length === 0) {
      console.error('Failed to fetch lab fees, using fallback values:', error);
      return FALLBACK_FEES as any;
    }

    // Transform array to object keyed by card_type
    const feesMap: Record<string, LabFee> = {};
    fees.forEach(fee => {
      feesMap[fee.card_type] = fee;
    });

    return feesMap;
  } catch (error) {
    console.error('Error fetching lab fees:', error);
    return FALLBACK_FEES as any;
  }
}

// HTML template generator with dynamic fees
function generateLabRequestHTML(cardType: 'yellow' | 'green' | 'pink', fees: Record<string, LabFee>) {
  const isYellow = cardType === 'yellow';
  const isGreen = cardType === 'green';
  const isPink = cardType === 'pink';

  // Get the appropriate fees based on card type
  const cardTypeMapping = {
    'yellow': 'food_handler',
    'green': 'non_food',
    'pink': 'pink'
  };
  const dbCardType = cardTypeMapping[cardType];
  const currentFees = fees[dbCardType] || FALLBACK_FEES[dbCardType];

  const commonStyles = `
    <style>
      @page { size: A4; margin: 20mm; }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 0;
      }
      .container {
        border: 2px solid black;
        padding: 30px;
        margin: 20px;
      }
      h2 {
        text-align: center;
        margin: 0 0 10px 0;
        font-size: 18px;
      }
      h3 {
        text-align: center;
        margin: 0 0 30px 0;
        font-size: 16px;
        font-weight: normal;
      }
      .form-group {
        margin: 20px 0;
      }
      .name-field {
        border-bottom: 1px solid black;
        min-height: 25px;
        margin-top: 5px;
      }
      .checkbox {
        width: 15px;
        height: 15px;
        border: 1px solid black;
        display: inline-block;
        margin-right: 8px;
        vertical-align: middle;
        text-align: center;
        line-height: 15px;
        font-size: 12px;
      }
      .checkbox.checked {
        font-weight: bold;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      td {
        border: 1px solid black;
        padding: 8px;
      }
      .fee-cell {
        text-align: right;
        width: 30%;
      }
      .total-row td {
        font-weight: bold;
      }
      .footer-fields {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
      }
      .footer-field {
        width: 45%;
        display: inline-block;
      }
      .footer-field-line {
        border-bottom: 1px solid black;
        min-height: 25px;
        margin-top: 5px;
      }
      .footer-text {
        text-align: center;
        margin-top: 40px;
        font-size: 12px;
        line-height: 1.5;
      }
    </style>
  `;

  if (isPink) {
    const smearingFee = currentFees.smearing_fee || FALLBACK_FEES.pink.smearing_fee;
    const cardFee = currentFees.card_fee;
    const totalFee = currentFees.total_fee;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Laboratory Request - Pink Card</title>
  ${commonStyles}
</head>
<body>
  <div class="container">
    <h2>Laboratory Request Inside CHO</h2>
    <h3>City Health Office - Panabo City</h3>

    <div class="form-group">
      <strong>Name:</strong>
      <div class="name-field"></div>
    </div>

    <div class="form-group">
      <strong>Type of Healthcare:</strong>
      <div style="margin-top: 10px;">
        <span class="checkbox checked">✓</span> Pink Card (Social Hygiene)
      </div>
    </div>

    <div class="form-group">
      <strong>Laboratory Fees:</strong>
      <table>
        <tr>
          <td>Smearing Test</td>
          <td class="fee-cell">₱${smearingFee}</td>
        </tr>
        <tr>
          <td>Pink Card</td>
          <td class="fee-cell">₱${cardFee}</td>
        </tr>
        <tr class="total-row">
          <td>Total</td>
          <td class="fee-cell">₱${totalFee}</td>
        </tr>
      </table>
    </div>

    <div class="footer-fields">
      <div class="footer-field">
        <strong>Date:</strong>
        <div class="footer-field-line"></div>
      </div>
      <div class="footer-field" style="margin-left: 50px;">
        <strong>Signature:</strong>
        <div class="footer-field-line"></div>
      </div>
    </div>
  </div>

  <div class="footer-text">
    This form is for laboratory request purposes only.<br>
    Please proceed to CHO Treasury for payment after laboratory tests.<br>
    <strong>Note:</strong> Pink Card services are conducted at Inside CHO Laboratory only.
  </div>
</body>
</html>`;
  }

  // Yellow or Green card
  const stoolFee = currentFees.stool_exam_fee || 33;
  const urinalysisFee = currentFees.urinalysis_fee || 33;
  const cbcFee = currentFees.cbc_fee || 34;
  const cardFee = currentFees.card_fee;
  const labTestsTotal = stoolFee + urinalysisFee + cbcFee;
  const totalFee = currentFees.total_fee;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Laboratory Request - ${isYellow ? 'Yellow' : 'Green'} Card</title>
  ${commonStyles}
</head>
<body>
  <div class="container">
    <h2>Laboratory Request Inside CHO</h2>
    <h3>City Health Office - Panabo City</h3>

    <div class="form-group">
      <strong>Name:</strong>
      <div class="name-field"></div>
    </div>

    <div class="form-group">
      <strong>Type of Healthcare:</strong>
      <div style="margin-top: 10px;">
        <span class="checkbox${isYellow ? ' checked' : ''}">${isYellow ? '✓' : ''}</span> Yellow Card (Food Handler)
        <span style="margin-left: 20px;">
          <span class="checkbox${isGreen ? ' checked' : ''}">${isGreen ? '✓' : ''}</span> Green Card (Non-Food Handler)
        </span>
      </div>
    </div>

    <div class="form-group">
      <strong>Common Fees:</strong>
      <table>
        <tr>
          <td>Stool Exam, Urinalysis, and CBC</td>
          <td class="fee-cell">₱${labTestsTotal}</td>
        </tr>
        <tr>
          <td>X-ray</td>
          <td class="fee-cell">Not available</td>
        </tr>
        <tr>
          <td>Health Card</td>
          <td class="fee-cell">₱${cardFee}</td>
        </tr>
        <tr class="total-row">
          <td>Total</td>
          <td class="fee-cell">₱${totalFee}</td>
        </tr>
      </table>
    </div>

    <div class="footer-fields">
      <div class="footer-field">
        <strong>Date:</strong>
        <div class="footer-field-line"></div>
      </div>
      <div class="footer-field" style="margin-left: 50px;">
        <strong>Signature:</strong>
        <div class="footer-field-line"></div>
      </div>
    </div>
  </div>

  <div class="footer-text">
    This form is for laboratory request purposes only.<br>
    Please proceed to CHO Treasury for payment after laboratory tests.
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'yellow' | 'green' | 'pink' | null;
    const shouldPrint = searchParams.get('print') === 'true';

    if (!type || !['yellow', 'green', 'pink'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid card type. Must be yellow, green, or pink.' },
        { status: 400 }
      );
    }

    // Fetch current lab fees from database
    const fees = await fetchLabFees();

    // Generate HTML with dynamic fees
    let html = generateLabRequestHTML(type, fees);

    // If print mode, add auto-print script
    if (shouldPrint) {
      html = html.replace('</body>', `
        <script>
          window.onload = function() {
            // Auto trigger print dialog after a short delay
            setTimeout(function() {
              window.print();
            }, 100);
          };
        </script>
      </body>`);
    }

    // Set headers for inline viewing (not download)
    const headers = new Headers();
    headers.set('Content-Type', 'text/html; charset=utf-8');

    // Don't use Content-Disposition attachment for print mode
    if (!shouldPrint) {
      headers.set('Content-Disposition', `inline; filename="Lab_Request_${type.charAt(0).toUpperCase() + type.slice(1)}_Card.html"`);
    }

    return new NextResponse(html, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error generating lab request:', error);
    return NextResponse.json(
      { error: 'Failed to generate lab request form' },
      { status: 500 }
    );
  }
}