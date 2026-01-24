-- Fix Incorrect Barangay Coordinates
-- Corrects 5 barangays that had wrong latitude/longitude values
-- Reference: ERRORS.md lines 54-135 for correct coordinate specifications

-- Lower Panaga (Roxas)
-- Old: {"lat": 7.497, "lng": 125.652}
-- New: {"lat": 7.4320, "lng": 125.5640} (7° 26' North, 125° 34' East)
UPDATE barangays
SET coordinates = '{"lat": 7.4320, "lng": 125.5640}'::jsonb
WHERE name = 'Lower Panaga (Roxas)';

-- New Malaga (Dalisay)
-- Old: {"lat": 7.518, "lng": 125.686}
-- New: {"lat": 7.3442, "lng": 125.5725} (7° 21' North, 125° 34' East)
UPDATE barangays
SET coordinates = '{"lat": 7.3442, "lng": 125.5725}'::jsonb
WHERE name = 'New Malaga (Dalisay)';

-- New Pandan (Pob.)
-- Old: {"lat": 7.517, "lng": 125.687}
-- New: {"lat": 7.2973, "lng": 125.6801} (7° 18' North, 125° 41' East)
UPDATE barangays
SET coordinates = '{"lat": 7.2973, "lng": 125.6801}'::jsonb
WHERE name = 'New Pandan (Pob.)';

-- San Francisco (Pob.)
-- Old: {"lat": 7.52, "lng": 125.684}
-- New: {"lat": 7.3068, "lng": 125.6803} (7° 18' North, 125° 41' East)
UPDATE barangays
SET coordinates = '{"lat": 7.3068, "lng": 125.6803}'::jsonb
WHERE name = 'San Francisco (Pob.)';

-- Santo Niño (Pob.)
-- Old: {"lat": 7.519, "lng": 125.682}
-- New: {"lat": 7.3082, "lng": 125.6867} (7° 18' North, 125° 41' East)
UPDATE barangays
SET coordinates = '{"lat": 7.3082, "lng": 125.6867}'::jsonb
WHERE name = 'Santo Niño (Pob.)';

-- Verification: All 5 barangays should now have correct coordinates
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM barangays
  WHERE name IN (
    'Lower Panaga (Roxas)',
    'New Malaga (Dalisay)',
    'New Pandan (Pob.)',
    'San Francisco (Pob.)',
    'Santo Niño (Pob.)'
  );

  IF updated_count != 5 THEN
    RAISE EXCEPTION 'Expected 5 barangays to be updated, but found %', updated_count;
  END IF;

  RAISE NOTICE 'Successfully updated coordinates for 5 barangays';
END $$;
