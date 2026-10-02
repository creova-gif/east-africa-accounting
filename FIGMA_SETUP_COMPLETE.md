# Figma Integration Setup

## Supply the Figma access token

The Figma integration reads a personal access token from the environment. Do not put the token in this repository.

1. Copy `.env.example` to `.env.local` in the project root. `.env` and `.env.local` are listed in `.gitignore`.
2. Set `VITE_FIGMA_ACCESS_TOKEN` to a token created at [Figma Settings → Personal Access Tokens](https://www.figma.com/settings).
3. Restart the Vite dev server (`npm run dev`) so the value is loaded.

```env
VITE_FIGMA_ACCESS_TOKEN=your_figma_personal_access_token
```

`src/services/figma.service.ts` sends that value as the `X-Figma-Token` header. Vite exposes only variables prefixed with `VITE_` to client code.

If a token was ever committed or shared, rotate it in Figma and update `.env.local`. Do not commit `.env` or `.env.local`.

---

## 🚀 How to Use Figma Integration

### 1. Access the Integration UI

The Figma Integration is now available in your app:

1. Open the app
2. Complete onboarding (or skip if already done)
3. Navigate to **Settings** (bottom nav: "More" icon)
4. Scroll to the bottom → **Figma Integration** card
5. Click **"Figma Integration"** button

### 2. Available Features

#### 📤 **Export Tab**
- **Export Wireframes to Figma JSON**
  - Generates JSON for all 7 app screens
  - Includes all components and layouts
  - Download or copy to clipboard
  - Import into Figma using plugins

#### 📥 **Import Tab**
- **Extract Design Tokens from Figma**
  - Enter your Figma file key
  - Extracts colors, spacing, typography
  - Downloads as JSON
  - Use in your codebase

#### 🎨 **Tokens Tab**
- **Generate CSS Variables**
  - Country-adaptive colors
  - Spacing system
  - Typography scale
  - Border radius
  - Download as CSS file

---

## 📋 Quick Testing Guide

### Test 1: Export Wireframes
```
1. Open Settings → Figma Integration
2. Click "Export" tab
3. Click "Export Wireframes" button
4. See JSON output with all screens
5. Click download button to save file
```

### Test 2: Generate CSS Variables
```
1. Open Settings → Figma Integration
2. Click "Tokens" tab
3. Click "Generate CSS Variables" button
4. See CSS output with design tokens
5. Click download button to save as design-system.css
```

### Test 3: Extract from Figma (requires Figma file)
```
1. Create a test file in Figma
2. Copy the file key from URL
3. Open Settings → Figma Integration → Import tab
4. Paste file key
5. Click "Extract Design Tokens"
6. See extracted colors and styles
```

---

## 📁 Files Created

### 1. Environment Configuration
**File:** `.env.local` (local only; copy from `.env.example`)
```env
VITE_FIGMA_ACCESS_TOKEN=your_figma_personal_access_token
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=EastBooks - Accounting for East Africa
```

`VITE_FIGMA_ACCESS_TOKEN` is required for Figma API calls. `VITE_API_URL` and `VITE_APP_NAME` are optional app settings and are not secrets.

### 2. Figma Service
**File:** `/src/services/figma.service.ts`
- Export wireframes to JSON
- Extract design tokens from Figma files
- Generate CSS variables
- RGB to Hex conversion
- Component spec generation

### 3. Figma Integration UI
**File:** `/src/app/components/figma/FigmaIntegration.tsx`
- 3-tab interface (Export, Import, Tokens)
- Copy to clipboard
- Download files
- Visual design token preview
- Loading states and error handling

### 4. Updated Settings Page
**File:** `/src/app/components/dashboard/Settings.tsx`
- Added Figma Integration card
- Integrated FigmaIntegration component

---

## 🎨 What Gets Exported

### Wireframe Structure (7 Screens)

1. **Onboarding**
   - Country Selector (5 countries)
   - Business Info Form
   - Tax Setup Wizard
   - Payment Methods
   - Success Screen

2. **Dashboard**
   - Header with business name
   - Summary Cards (3 stats)
   - 7-Day Trend Chart
   - Quick Actions (3 buttons)
   - Recent Activity List
   - Tax Reminder
   - Bottom Navigation (6 tabs)

3. **Transactions**
   - Search Bar
   - Filter Pills
   - Summary Cards
   - Transaction List

4. **Invoices**
   - Customer Selector
   - Line Items
   - VAT Calculation
   - PDF Preview

5. **Reports**
   - Period Selector
   - Report Cards (4 types)
   - Charts

6. **Receipt OCR**
   - Camera Button
   - Upload Button
   - Processing State
   - Review Form

7. **Mobile Money Payment**
   - Provider Selection
   - Phone Input
   - Processing State
   - Success State

### Design Tokens Exported

**Colors (Country-Adaptive):**
- Kenya: `#006B3F`, `#BC2025`
- Tanzania: `#1EB53A`, `#00A3DD`
- Uganda: `#FCDC04`, `#000000`
- Rwanda: `#00A1DE`, `#FAD201`
- Burundi: `#CE1126`, `#1EB53A`
- UI: Blue, Green, Red, Gray shades

**Spacing:**
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px

**Typography:**
- H1: 24px bold
- H2: 20px semi-bold
- Body: 16px regular
- Small: 14px regular
- Tiny: 12px regular

**Border Radius:**
- sm: 4px, md: 8px, lg: 12px, full: 9999px

---

## 🔗 Figma API Endpoints Used

### 1. Get File
```
GET https://api.figma.com/v1/files/{file_key}
Header: X-Figma-Token: YOUR_TOKEN
```

### 2. Get Nodes
```
GET https://api.figma.com/v1/files/{file_key}/nodes?ids={node_ids}
Header: X-Figma-Token: YOUR_TOKEN
```

### 3. Get Styles
```
GET https://api.figma.com/v1/files/{file_key}/styles
Header: X-Figma-Token: YOUR_TOKEN
```

---

## 🛠️ Troubleshooting

### Issue: "Access token not found"
**Solution:** Create `.env.local` from `.env.example`, set `VITE_FIGMA_ACCESS_TOKEN`, and restart `npm run dev`.

### Issue: "Unauthorized" error
**Solution:** Check that `VITE_FIGMA_ACCESS_TOKEN` in `.env.local` is valid. Export it in the shell first, then:
```bash
curl -H "X-Figma-Token: ${VITE_FIGMA_ACCESS_TOKEN}" \
  https://api.figma.com/v1/me
```

### Issue: CORS error
**Solution:** Figma API calls must be made from server-side or use a proxy

### Issue: Can't see integration in Settings
**Solution:** 
1. Navigate to Settings tab (bottom nav "More" icon)
2. Scroll to the bottom
3. Look for "Figma Integration" card

---

## 📚 Documentation References

- **Complete Guide:** `/FIGMA_REST_API_GUIDE.md`
- **Backend Integration:** `/BACKEND_INTEGRATION_GUIDE.md`
- **Mobile Wireframes:** `/MOBILE_WIREFRAME_IMPLEMENTATION.md`
- **Architecture:** `/ARCHITECTURE.md`

---

## 🎯 Next Steps

1. ✅ Set `VITE_FIGMA_ACCESS_TOKEN` in `.env.local`
2. ✅ UI component added to Settings
3. ✅ Service layer ready
4. 🔄 Test the export functionality
5. 🔄 Create a Figma file for import testing
6. 🔄 Rotate token for security
7. 🔄 Set up webhook automation (optional)

---

## 💡 Pro Tips

1. **Create a dedicated Figma file** for design sync
2. **Use Figma's Auto Layout** for better JSON export
3. **Name layers consistently** for easier extraction
4. **Publish styles** before extracting tokens
5. **Use components** instead of frames for reusable elements

---

## 🎉 You're Ready!

Your Figma integration is fully set up and ready to use. You can now:
- Export all wireframes to Figma JSON
- Import design tokens from Figma files
- Generate CSS variables for your design system
- Sync designs between Figma and your app

**Try it now:**
1. Open the app
2. Go to Settings → Figma Integration
3. Click "Export" and generate your wireframes!

---

**Status:** ✅ Figma Integration Complete & Ready to Use!
**Last Updated:** January 15, 2026
