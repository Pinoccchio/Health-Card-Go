# HealthCard Historical Import Template

## How to Create the Template File

Create an Excel file named `healthcard-historical-import-template.xlsx` with the following structure:

### Column Headers (Row 1):

| Column Name | Data Type | Required | Validation |
|-------------|-----------|----------|------------|
| Record Date | Date (YYYY-MM-DD) | Yes | Must not be in future |
| HealthCard Type | Text | Yes | Must be "food_handler" or "non_food" |
| Cards Issued | Integer | Yes | Must be positive (> 0) |
| Barangay | Text | No | Must match exact barangay name from database |
| Source | Text | No | Free text (e.g., "CHO Manual Count", "DOH Bulletin") |
| Notes | Text | No | Free text for additional information |

### Example Data (Rows 2-5):

| Record Date | HealthCard Type | Cards Issued | Barangay | Source | Notes |
|-------------|----------------|--------------|----------|--------|-------|
| 2020-03-15 | food_handler | 45 | Datu Abdul Dadia | CHO Manual Records | Q1 2020 - Pre-pandemic batch |
| 2020-06-10 | non_food | 32 | Gredu | CHO Manual Records | Q2 2020 - Limited operations |
| 2021-02-14 | food_handler | 52 | New Pandan (Poblacion) | CHO Manual Records | Q1 2021 - Recovery period |
| 2022-10-15 | non_food | 39 | | CHO Records | Q4 2022 - Final pre-system batch |

**Note:** Template uses historical dates (2020-2022) to avoid double-counting with live appointment data tracked since 2023.

### Important Notes:

1. **Record Date Format**: Use YYYY-MM-DD format (e.g., 2024-01-15)
2. **HealthCard Type Values**:
   - `food_handler` - For food industry workers
   - `non_food` - For non-food industry workers
   - Case-insensitive (will be converted to lowercase)
3. **Cards Issued**: Must be a whole number greater than 0
4. **Barangay**:
   - Optional field
   - If provided, must match exact barangay name (case-insensitive)
   - Leave blank for system-wide data
5. **Source**: Optional, used for audit trail
6. **Notes**: Optional, for additional context

### File Requirements:

- **Format**: .xlsx or .xls
- **Max File Size**: 5MB
- **Max Records**: 1000 per import
- **Sheet**: Use first sheet only

### Creating the Template:

#### Option 1: Microsoft Excel
1. Open Excel
2. Create headers in Row 1 as specified above
3. Add 3-5 example rows with sample data
4. Format the "Record Date" column as Date
5. Format the "Cards Issued" column as Number (no decimals)
6. Save as "healthcard-historical-import-template.xlsx"

#### Option 2: Google Sheets
1. Create a new Google Sheet
2. Add headers and sample data as specified
3. Go to File > Download > Microsoft Excel (.xlsx)
4. Rename to "healthcard-historical-import-template.xlsx"

#### Option 3: LibreOffice Calc
1. Open LibreOffice Calc
2. Create headers and sample data as specified
3. Save as > Choose "Excel 2007-365 (.xlsx)" format
4. Name as "healthcard-historical-import-template.xlsx"

### Validation During Import:

The system will validate:
- ✅ Date format and not in future
- ✅ HealthCard type is valid
- ✅ Cards issued is positive integer
- ✅ Barangay exists in database (if provided)
- ✅ File size under 5MB
- ✅ Record count under 1000

### After Creating:

Place the file in:
```
Health-Card-Go/public/templates/healthcard-historical-import-template.xlsx
```

The template will then be available for download at:
```
https://your-domain.com/templates/healthcard-historical-import-template.xlsx
```

### Example Valid Records:

```
Record Date    | HealthCard Type | Cards Issued | Barangay                | Source              | Notes
2020-03-15    | food_handler    | 45          | Datu Abdul Dadia       | CHO Manual Records  | Q1 2020
2021-02-14    | food_handler    | 52          | New Pandan (Poblacion) | CHO Manual Records  | Q1 2021
2022-10-15    | non_food        | 39          |                         | CHO Records         | Q4 2022
```

**Important:** Use historical dates (2020-2022) to avoid double-counting with live appointment data (2023+).

### Example Invalid Records (Will Be Rejected):

```
# Future date
2026-12-31    | food_handler    | 25          | Datu Abdul Dadia   | CHO Manual Count | INVALID

# Invalid type (pink is handled by HIV Admin only)
2024-01-15    | pink            | 25          | Datu Abdul Dadia   | CHO Manual Count | INVALID

# Negative count
2024-01-15    | food_handler    | -5          | Datu Abdul Dadia   | CHO Manual Count | INVALID

# Non-existent barangay
2024-01-15    | food_handler    | 25          | Invalid Barangay   | CHO Manual Count | INVALID
```
