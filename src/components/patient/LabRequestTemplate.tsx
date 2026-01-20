/**
 * Laboratory Request Template Component
 *
 * Visual template for laboratory request forms (Yellow/Green/Pink Card)
 * Used for PDF generation - not directly rendered in UI
 */

import React from 'react';
import { getLabFees, type HealthCardFees } from '@/lib/config/labFees';

interface LabRequestTemplateProps {
  cardType: 'yellow' | 'green' | 'pink';
}

export default function LabRequestTemplate({ cardType }: LabRequestTemplateProps) {
  const fees = getLabFees(cardType);
  const isYellowOrGreen = cardType === 'yellow' || cardType === 'green';

  return (
    <div
      id="lab-request-template"
      style={{
        width: '794px',
        minHeight: '1123px',
        padding: '60px',
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif',
        color: '#000',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          margin: '0 0 8px 0',
          color: '#1a1a1a',
        }}>
          Laboratory Request inside CHO
        </h1>
        <p style={{
          fontSize: '16px',
          margin: 0,
          color: '#4a4a4a',
        }}>
          City Health Office - Panabo City
        </p>
      </div>

      {/* Divider */}
      <div style={{
        borderBottom: '3px solid #333',
        marginBottom: '35px'
      }} />

      {/* Name Field */}
      <div style={{ marginBottom: '35px' }}>
        <p style={{
          fontSize: '18px',
          fontWeight: 'bold',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
        }}>
          Name:
          <span style={{
            borderBottom: '2px solid #000',
            flex: 1,
            marginLeft: '15px',
            height: '30px',
          }}>
          </span>
        </p>
      </div>

      {/* Health Card Type */}
      <div style={{ marginBottom: '35px' }}>
        <p style={{
          fontSize: '18px',
          fontWeight: 'bold',
          margin: '0 0 15px 0',
        }}>
          Type of Healthcard:
        </p>
        {isYellowOrGreen ? (
          <div style={{ marginLeft: '25px', fontSize: '16px', display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', lineHeight: '20px' }}>
              <input
                type="checkbox"
                checked={cardType === 'yellow'}
                readOnly
                style={{ width: '20px', height: '20px', margin: 0, flexShrink: 0, verticalAlign: 'middle' }}
              />
              <span style={{ lineHeight: '20px' }}>Yellow Card (Food Handler)</span>
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', lineHeight: '20px' }}>
              <input
                type="checkbox"
                checked={cardType === 'green'}
                readOnly
                style={{ width: '20px', height: '20px', margin: 0, flexShrink: 0, verticalAlign: 'middle' }}
              />
              <span style={{ lineHeight: '20px' }}>Green Card (Non-Food Handler)</span>
            </label>
          </div>
        ) : (
          <div style={{ marginLeft: '25px', fontSize: '16px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'pointer', lineHeight: '20px' }}>
              <input
                type="checkbox"
                checked
                readOnly
                style={{ width: '20px', height: '20px', margin: 0, flexShrink: 0, verticalAlign: 'middle' }}
              />
              <span style={{ lineHeight: '20px' }}>Pink Card (Skin-Contact Workers)</span>
            </label>
          </div>
        )}
      </div>

      {/* Common Fees Table */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{
          fontSize: '18px',
          fontWeight: 'bold',
          margin: '0 0 20px 0',
        }}>
          Common Fees:
        </p>

        <table style={{
          width: '100%',
          maxWidth: '600px',
          borderCollapse: 'collapse',
          border: '3px solid #000',
        }}>
          <tbody>
            {/* Test Rows */}
            {fees.tests.map((test, index) => (
              <tr key={index}>
                <td style={{
                  border: '2px solid #000',
                  padding: '16px',
                  fontSize: '16px',
                  width: '70%',
                }}>
                  {test.name}
                </td>
                <td style={{
                  border: '2px solid #000',
                  padding: '16px',
                  fontSize: '16px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  width: '30%',
                }}>
                  {typeof test.price === 'number' ? `₱${test.price}` : test.price}
                </td>
              </tr>
            ))}

            {/* Health Card Fee */}
            <tr>
              <td style={{
                border: '2px solid #000',
                padding: '16px',
                fontSize: '16px',
              }}>
                {fees.cardName}
              </td>
              <td style={{
                border: '2px solid #000',
                padding: '16px',
                fontSize: '16px',
                textAlign: 'center',
                fontWeight: 'bold',
              }}>
                ₱{fees.cardFee}
              </td>
            </tr>

            {/* Total Row */}
            <tr>
              <td style={{
                border: '2px solid #000',
                padding: '16px',
                fontSize: '18px',
                fontWeight: 'bold',
                backgroundColor: '#f0f0f0',
              }}>
                Total
              </td>
              <td style={{
                border: '2px solid #000',
                padding: '16px',
                fontSize: '18px',
                textAlign: 'center',
                fontWeight: 'bold',
                backgroundColor: '#f0f0f0',
              }}>
                ₱{fees.total}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes Section */}
      <div style={{
        marginTop: '50px',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        border: '2px solid #ddd',
        borderRadius: '8px',
      }}>
        <p style={{
          fontSize: '14px',
          margin: 0,
          color: '#555',
          lineHeight: '1.8',
        }}>
          <strong>Note:</strong> Please present this laboratory request form to the CHO Laboratory.
          {isYellowOrGreen && (
            <> X-ray services are not available at CHO and must be obtained from an external facility.</>
          )}
        </p>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '60px',
        left: '60px',
        right: '60px',
        textAlign: 'center',
        fontSize: '13px',
        color: '#888',
        borderTop: '2px solid #ddd',
        paddingTop: '15px',
      }}>
        <p style={{ margin: 0, fontWeight: '600' }}>
          City Health Office, Panabo City, Davao del Norte
        </p>
        <p style={{ margin: '8px 0 0 0' }}>
          For inquiries, please contact your local health center
        </p>
      </div>
    </div>
  );
}
