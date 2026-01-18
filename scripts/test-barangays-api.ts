/**
 * Test script to fetch barangays from API
 * Run with: npx tsx scripts/test-barangays-api.ts
 */

async function testBarangaysAPI() {
  try {
    // Fetch from local API
    const response = await fetch('http://localhost:3000/api/barangays');

    if (!response.ok) {
      console.error('API error:', response.status, response.statusText);
      return;
    }

    const result = await response.json();
    const barangays = result.data || [];

    console.log('Total barangays:', barangays.length);
    console.log('\nBarangay names (sorted):');
    console.log('========================');

    barangays.forEach((b: any, index: number) => {
      console.log(`${index + 1}. "${b.name}" (code: ${b.code}, id: ${b.id})`);
    });

    // Check specific barangays from template
    console.log('\n\nChecking template barangays:');
    console.log('============================');

    const templateBarangays = [
      'Datu Abdul Dadia',
      'San Francisco (Poblacion)',
      'Gredu',
      'Poblacion',
      'Kasilak',
      'Buenavista',
      'Nanyo'
    ];

    templateBarangays.forEach((name) => {
      const found = barangays.find((b: any) =>
        b.name.toLowerCase() === name.toLowerCase()
      );
      console.log(`${name}: ${found ? '✓ FOUND' : '✗ NOT FOUND'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

testBarangaysAPI();
