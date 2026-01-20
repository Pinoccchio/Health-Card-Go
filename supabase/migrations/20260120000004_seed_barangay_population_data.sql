-- Seed official population data for all 41 barangays in Panabo City
-- Data source: Official census data provided by client (January 20, 2026)
-- Purpose: Enable accurate percentage-based disease risk calculations
-- Formula: (cases / population) × 100

-- Risk Levels:
-- High Risk: >= 70%
-- Medium Risk: 50-69%
-- Low Risk: <= 49%

-- Update all barangays with official population data
UPDATE barangays SET population = 4371 WHERE name = 'A.O. Floirendo';
UPDATE barangays SET population = 806 WHERE name = 'Buenavista';
UPDATE barangays SET population = 1365 WHERE name = 'Cacao';
UPDATE barangays SET population = 13892 WHERE name = 'Cagangohan';
UPDATE barangays SET population = 1583 WHERE name = 'Consolacion';
UPDATE barangays SET population = 4419 WHERE name = 'Dapco';
UPDATE barangays SET population = 7766 WHERE name = 'Datu Abdul Dadia';
UPDATE barangays SET population = 17084 WHERE name = 'Gredu (Poblacion)';
UPDATE barangays SET population = 9938 WHERE name = 'J.P. Laurel';
UPDATE barangays SET population = 2867 WHERE name = 'Kasilak';
UPDATE barangays SET population = 2568 WHERE name = 'Katipunan';
UPDATE barangays SET population = 611 WHERE name = 'Katualan';
UPDATE barangays SET population = 1887 WHERE name = 'Kauswagan';
UPDATE barangays SET population = 1578 WHERE name = 'Kiotoy';
UPDATE barangays SET population = 2868 WHERE name = 'Little Panay';
UPDATE barangays SET population = 1671 WHERE name = 'Lower Panaga (Roxas)';
UPDATE barangays SET population = 2225 WHERE name = 'Mabunao';
UPDATE barangays SET population = 3909 WHERE name = 'Maduao';
UPDATE barangays SET population = 2730 WHERE name = 'Malativas';
UPDATE barangays SET population = 6671 WHERE name = 'Manay';
UPDATE barangays SET population = 4184 WHERE name = 'Nanyo';
UPDATE barangays SET population = 2189 WHERE name = 'New Malaga (Dalisay)';
UPDATE barangays SET population = 4455 WHERE name = 'New Malitbog';
UPDATE barangays SET population = 8976 WHERE name = 'New Pandan (Pob.)';
UPDATE barangays SET population = 19953 WHERE name = 'New Visayas';
UPDATE barangays SET population = 7279 WHERE name = 'Quezon';
UPDATE barangays SET population = 11293 WHERE name = 'Salvacion';
UPDATE barangays SET population = 14659 WHERE name = 'San Francisco (Pob.)';
UPDATE barangays SET population = 3100 WHERE name = 'San Nicolas';
UPDATE barangays SET population = 3585 WHERE name = 'San Pedro';
UPDATE barangays SET population = 666 WHERE name = 'San Roque';
UPDATE barangays SET population = 20317 WHERE name = 'San Vicente';
UPDATE barangays SET population = 1229 WHERE name = 'Santa Cruz';
UPDATE barangays SET population = 5418 WHERE name = 'Santo Niño (Pob.)';
UPDATE barangays SET population = 4530 WHERE name = 'Sindaton';
UPDATE barangays SET population = 10407 WHERE name = 'Southern Davao';
UPDATE barangays SET population = 1861 WHERE name = 'Tagpore';
UPDATE barangays SET population = 2146 WHERE name = 'Tibungol';
UPDATE barangays SET population = 1680 WHERE name = 'Upper Licanan';
UPDATE barangays SET population = 1000 WHERE name = 'Waterfall';

-- Outside Zone has no population data provided, set to NULL
UPDATE barangays SET population = NULL WHERE name = 'Outside Zone';

-- Verification: Total population should be approximately 223,000
-- SELECT SUM(population) as total_population, COUNT(*) as total_barangays FROM barangays WHERE population IS NOT NULL;

-- Additional verification: Check all barangays
-- SELECT id, name, population FROM barangays ORDER BY name;

COMMENT ON COLUMN barangays.population IS 'Official population data from census - used for disease risk percentage calculation: (cases/population) × 100';
