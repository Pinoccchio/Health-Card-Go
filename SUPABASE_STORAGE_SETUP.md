# Supabase Storage Setup Instructions

**Required for:** Health Card Appointment Document Uploads

**Bucket Name:** `appointment-documents`

---

## 📋 Setup Steps

### 1. Create Storage Bucket

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `https://wjwxcxvilqsuoldaduyj.supabase.co`
3. Navigate to **Storage** in the left sidebar
4. Click **New Bucket**
5. Configure bucket:
   - **Name:** `appointment-documents`
   - **Public bucket:** ✅ **YES** (Enable public access for viewing uploaded files)
   - **File size limit:** 5 MB
   - **Allowed MIME types:** Leave default (or specify: `image/jpeg, image/png, application/pdf`)

### 2. Configure Bucket Policies (RLS)

After creating the bucket, set up Row Level Security policies:

#### Policy 1: Allow Authenticated Users to Upload
```sql
-- Allow authenticated users to upload files to their own appointment folders
CREATE POLICY "Allow authenticated uploads to appointment folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'appointment-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 2: Allow Public Read Access
```sql
-- Allow anyone to view uploaded files (needed for healthcare admin verification)
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'appointment-documents');
```

#### Policy 3: Allow Users to Delete Own Pending Uploads
```sql
-- Allow users to delete their own unverified uploads
CREATE POLICY "Allow users to delete own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'appointment-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. Verify Bucket Configuration

Test the bucket by uploading a test file through the Supabase dashboard:

1. Go to Storage → `appointment-documents`
2. Click **Upload file**
3. Upload a test image (JPG/PNG)
4. Verify you can view the file via public URL

---

## 🔧 Expected Folder Structure

Files are organized by appointment ID:

```
appointment-documents/
├── {appointment-id-1}/
│   ├── {uuid}.pdf (lab_request)
│   ├── {uuid}.jpg (payment_receipt)
│   └── {uuid}.png (valid_id)
├── {appointment-id-2}/
│   ├── {uuid}.pdf
│   └── {uuid}.jpg
└── ...
```

**Example:**
```
appointment-documents/550e8400-e29b-41d4-a716-446655440000/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf
```

---

## 🔐 Security Considerations

1. **File Size Limit:** 5MB per file prevents abuse
2. **Public URLs:** Files are publicly accessible via URL (needed for healthcare admin to view)
3. **Folder Isolation:** Users can only upload to their own appointment folders
4. **Database Tracking:** All uploads tracked in `appointment_uploads` table with verification status

---

## 🧪 Testing Checklist

After setup, test the following:

- [ ] Bucket `appointment-documents` exists
- [ ] Public access is enabled
- [ ] Can upload file via API (`/api/appointments/{id}/uploads`)
- [ ] Can view file via public URL
- [ ] Can delete pending upload via API
- [ ] RLS policies prevent unauthorized access

---

## 🚀 Production Deployment

When deploying to production:

1. Create the same bucket in production Supabase project
2. Apply the same RLS policies
3. Update environment variables if needed
4. Test upload/download flow in production

---

## 📞 Support

If you encounter issues:

1. Check Supabase logs for storage errors
2. Verify RLS policies are correctly applied
3. Test bucket permissions in Supabase dashboard
4. Ensure API routes have correct Supabase client configuration

---

**Created:** January 19, 2026
**Status:** Manual setup required (cannot be automated via migrations)
**Priority:** HIGH - Required for Health Card booking flow
