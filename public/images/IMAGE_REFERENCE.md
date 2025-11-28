# Image Reference Guide

> **Last Updated:** November 29, 2025
> **Source:** Legacy Laravel Application (docs/legacy/healthcardgo/healthcardgo/)
> **Migration Date:** November 29, 2025

This document provides a complete reference for all images migrated from the Laravel HealthCard application to the Next.js project.

---

## Directory Structure

```
public/
├── favicon.ico                          # Browser tab icon (legacy format)
├── favicon.svg                          # Browser tab icon (modern SVG)
├── apple-touch-icon.png                 # iOS home screen icon
└── images/
    ├── hero-background.jpg              # Header background image
    ├── about-section.jpg                # About section image
    ├── why-choose-us-section.jpg        # Why Choose Us section image
    ├── icons/
    │   ├── user-profile.png             # User profile avatar icon
    │   └── flags/
    │       ├── en-us.png                # English/US flag icon
    │       └── ph.png                   # Philippines flag icon
    └── unused/
        ├── about-alternative.jpg        # Alternative About section image
        ├── why-choose-us-alternative.jpg # Alternative Why Choose Us image
        ├── hero-background-alternative.jpg # Alternative header background
        └── team/
            ├── doctor-01.jpg            # Doctor profile image #1
            ├── doctor-02.jpg            # Doctor profile image #2
            └── doctor-03.jpg            # Doctor profile image #3
```

---

## Actively Used Images

### 1. Hero Background Image

**File:** `hero-background.jpg`
**Original Name:** `A1.jpg`
**Dimensions:** 600 × 338 pixels
**File Size:** 47 KB
**Format:** JPEG (Progressive, 8-bit)

**Usage Context:**
- Header/hero section background image
- Applied with gradient overlay in CSS
- Used as page header banner

**Next.js Usage:**
```jsx
// As CSS background
<div
  className="hero-section"
  style={{
    backgroundImage: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('/images/hero-background.jpg')"
  }}
>
  {/* Hero content */}
</div>

// Or with next/image for optimization
import Image from 'next/image'

<div className="relative h-96">
  <Image
    src="/images/hero-background.jpg"
    alt="HealthCard Hero"
    fill
    className="object-cover"
    priority
  />
  <div className="absolute inset-0 bg-black/50" />
  {/* Hero content */}
</div>
```

---

### 2. About Section Image

**File:** `about-section.jpg`
**Original Name:** `A2.jpg`
**Dimensions:** 940 × 788 pixels
**File Size:** 141 KB
**Format:** JPEG (Baseline, 8-bit)

**Usage Context:**
- Displayed in the "About Us" section
- Accompanies descriptive text about the healthcare service
- Shows healthcare facility or service image

**Next.js Usage:**
```jsx
import Image from 'next/image'

<Image
  src="/images/about-section.jpg"
  alt="About HealthCard Service"
  width={940}
  height={788}
  className="rounded-lg shadow-lg"
/>
```

---

### 3. Why Choose Us Section Image

**File:** `why-choose-us-section.jpg`
**Original Name:** `A3.jpg`
**Dimensions:** 940 × 788 pixels
**File Size:** 273 KB
**Format:** JPEG (Baseline, 8-bit)

**Usage Context:**
- Displayed in the "Why Choose Us" section
- Highlights service benefits and features
- Visual representation of quality healthcare

**Next.js Usage:**
```jsx
import Image from 'next/image'

<Image
  src="/images/why-choose-us-section.jpg"
  alt="Why Choose HealthCard"
  width={940}
  height={788}
  className="rounded-lg shadow-lg"
/>
```

---

### 4. User Profile Icon

**File:** `icons/user-profile.png`
**Original Name:** `user.png`
**Dimensions:** 32 × 32 pixels
**File Size:** 1.1 KB
**Format:** PNG (RGBA, non-interlaced)

**Usage Context:**
- User profile avatar icon in navigation header
- Displayed when patient is logged in
- Used in dropdown menu

**Next.js Usage:**
```jsx
import Image from 'next/image'

<Image
  src="/images/icons/user-profile.png"
  alt="Profile"
  width={32}
  height={32}
  className="rounded-full"
/>
```

---

### 5. English/US Flag Icon

**File:** `icons/flags/en-us.png`
**Original Name:** `united.png`
**Dimensions:** 24 × 24 pixels
**File Size:** 1.1 KB
**Format:** PNG (RGBA, non-interlaced)

**Usage Context:**
- Language switcher dropdown
- Represents English language option
- Displayed in navigation header

**Next.js Usage:**
```jsx
import Image from 'next/image'

<Image
  src="/images/icons/flags/en-us.png"
  alt="English"
  width={24}
  height={24}
/>
```

---

### 6. Philippines Flag Icon

**File:** `icons/flags/ph.png`
**Original Name:** `flag.png`
**Dimensions:** 24 × 24 pixels
**File Size:** 1.3 KB
**Format:** PNG (RGBA, non-interlaced)

**Usage Context:**
- Language switcher dropdown
- Represents Tagalog/Bisaya language options
- Currently commented out in legacy code but available for use

**Next.js Usage:**
```jsx
import Image from 'next/image'

<Image
  src="/images/icons/flags/ph.png"
  alt="Tagalog"
  width={24}
  height={24}
/>
```

---

## Browser Icons

### Favicon (ICO)

**File:** `favicon.ico` (in public root)
**File Size:** 4.3 KB
**Usage:** Legacy browser tab icon

**Next.js Setup:**
Already in `public/` root. Next.js will automatically serve it.

---

### Favicon (SVG)

**File:** `favicon.svg` (in public root)
**File Size:** 3.5 KB
**Usage:** Modern browser tab icon (vector format)

**Next.js Setup:**
```tsx
// In app/layout.tsx or pages/_document.tsx
export const metadata = {
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
}
```

---

### Apple Touch Icon

**File:** `apple-touch-icon.png` (in public root)
**File Size:** 1.6 KB
**Usage:** iOS home screen icon

**Next.js Setup:**
```tsx
// In app/layout.tsx
export const metadata = {
  icons: {
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
}
```

---

## Unused Images (Available for Future Use)

### Alternative About Image

**File:** `unused/about-alternative.jpg`
**Original Name:** `about.jpg`
**Dimensions:** 534 × 667 pixels
**File Size:** 71 KB

**Notes:** Alternative image for About section. Can be used for A/B testing or design variations.

---

### Alternative Why Choose Us Image

**File:** `unused/why-choose-us-alternative.jpg`
**Original Name:** `choose-us.jpg`
**Dimensions:** 566 × 707 pixels
**File Size:** 58 KB

**Notes:** Alternative image for Why Choose Us section. Available for design updates.

---

### Alternative Hero Background

**File:** `unused/hero-background-alternative.jpg`
**Original Name:** `header.jpg`
**Dimensions:** 1500 × 1000 pixels
**File Size:** 868 KB (largest file)

**Notes:** High-resolution alternative header background. Consider optimizing before use due to large file size.

---

### Doctor Profile Images

**Files:**
- `unused/team/doctor-01.jpg` (500 × 625, 55 KB)
- `unused/team/doctor-02.jpg` (500 × 624, 78 KB)
- `unused/team/doctor-03.jpg` (500 × 624, 49 KB)

**Original Names:** `doctor-1.jpg`, `doctor-2.jpg`, `doctor-3.jpg`

**Usage:** Professional doctor profile images. Can be used for:
- Team/Staff section
- About page
- Service provider profiles
- Testimonials section

**Next.js Usage:**
```jsx
import Image from 'next/image'

const doctors = [
  { id: 1, name: "Dr. Example", image: "/images/unused/team/doctor-01.jpg" },
  { id: 2, name: "Dr. Sample", image: "/images/unused/team/doctor-02.jpg" },
  { id: 3, name: "Dr. Test", image: "/images/unused/team/doctor-03.jpg" },
]

{doctors.map(doctor => (
  <Image
    key={doctor.id}
    src={doctor.image}
    alt={doctor.name}
    width={500}
    height={625}
    className="rounded-lg"
  />
))}
```

---

## Image Optimization Tips for Next.js

### 1. Use next/image Component

**Benefits:**
- Automatic lazy loading
- Responsive images
- WebP/AVIF conversion
- Blur placeholder support

**Example:**
```jsx
import Image from 'next/image'

<Image
  src="/images/hero-background.jpg"
  alt="Hero"
  width={600}
  height={338}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..." // Optional
/>
```

### 2. Optimize Large Images

The `hero-background-alternative.jpg` (868 KB) should be optimized:
```bash
# Using next/image will automatically optimize, but you can pre-optimize:
npm install sharp
# Then run optimization script
```

### 3. Use Priority for Above-Fold Images

```jsx
<Image
  src="/images/hero-background.jpg"
  alt="Hero"
  width={600}
  height={338}
  priority  // Load immediately, no lazy loading
/>
```

### 4. Responsive Images

```jsx
<Image
  src="/images/about-section.jpg"
  alt="About"
  width={940}
  height={788}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

---

## Total Image Inventory

**Active Images:** 6 files (464 KB total)
- 3 content images (JPEG)
- 3 UI icons (PNG)

**Unused Images:** 6 files (1,179 KB total)
- 3 alternative content images
- 3 doctor profiles

**Browser Icons:** 3 files (9.4 KB total)

**Grand Total:** 15 files (1.65 MB)

---

## Migration Notes

1. All images have been renamed for better semantic clarity
2. Icons are organized in subdirectories (`icons/`, `flags/`)
3. Unused images are preserved in `unused/` folder
4. Original filenames are documented for reference
5. All images maintain their original quality and dimensions
6. Next.js will automatically optimize these images when using the `<Image>` component

---

## External Dependencies

The landing page also uses:
- **Remix Icon Font:** Icon library from CDN
- **OpenStreetMap Tiles:** Map imagery via Leaflet.js

---

## Recommended Next Steps

1. ✅ Images copied to Next.js project
2. ⏳ Optimize large images (especially hero-background-alternative.jpg)
3. ⏳ Generate blur placeholders for content images
4. ⏳ Implement responsive image sizes
5. ⏳ Consider WebP conversion for better compression
6. ⏳ Add alt text localization for multi-language support

---

**For questions or updates, refer to this document or contact the development team.**
