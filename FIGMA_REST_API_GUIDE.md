# Figma REST API Integration Guide

## Overview
This guide explains how to integrate the East Africa Accounting Platform with Figma's REST API for design synchronization, wireframe export, and design token management.

---

## Setup

### 1. Get Figma Access Token

1. Go to [Figma Settings](https://www.figma.com/settings)
2. Navigate to **Account** → **Personal Access Tokens**
3. Click **Generate new token**
4. Copy the token (you won't see it again!)
5. Copy `.env.example` to `.env.local` in the project root and set the variable below. `.env` and `.env.local` are gitignored. Restart `npm run dev` after editing.

```env
VITE_FIGMA_ACCESS_TOKEN=your_figma_personal_access_token
```

`src/services/figma.service.ts` reads `import.meta.env.VITE_FIGMA_ACCESS_TOKEN` and sends it as the `X-Figma-Token` header. Do not commit the real token.

### 2. Get Figma File Key

From your Figma file URL:
```
https://www.figma.com/file/ABC123DEF456/Project-Name
                             ^^^^^^^^^^^^^^^^
                             This is your file key
```

---

## Features

### 1. Export Wireframes to Figma JSON

**Use Case:** Generate a Figma-compatible JSON structure of all app screens

**Code:**
```typescript
import { figmaService } from '@/services/figma.service';

// Export wireframes
const wireframes = figmaService.exportWireframesToFigma();
const json = JSON.stringify(wireframes, null, 2);

// Download or copy
```

**Output:**
```json
{
  "document": {
    "name": "EA Accounting Platform",
    "children": [
      {
        "name": "Onboarding",
        "type": "FRAME",
        "width": 375,
        "height": 812,
        "children": [
          {
            "name": "Country Selector",
            "type": "COMPONENT"
          }
        ]
      }
    ]
  }
}
```

### 2. Import to Figma

**Method A: Using JSON to Figma Plugin**
1. Install [JSON to Figma](https://www.figma.com/community/plugin/789839703871161985/JSON-to-Figma) plugin
2. Copy the exported JSON
3. Run the plugin in Figma
4. Paste JSON and import

**Method B: Using Figma REST API**
```typescript
// Create frames programmatically
const response = await fetch('https://api.figma.com/v1/files', {
  method: 'POST',
  headers: {
    'X-Figma-Token': FIGMA_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'EA Accounting Wireframes',
    // ... frame data
  }),
});
```

### 3. Extract Design Tokens from Figma

**Use Case:** Sync colors, spacing, and typography from Figma to code

**Code:**
```typescript
import { figmaService } from '@/services/figma.service';

// Extract tokens
const tokens = await figmaService.extractDesignTokens('ABC123DEF456');

// tokens = [
//   { name: 'Primary Blue', value: '#3b82f6', type: 'color' },
//   { name: 'Spacing MD', value: '16px', type: 'spacing' },
// ]
```

### 4. Generate CSS Variables

**Use Case:** Export design system as CSS variables

**Code:**
```typescript
const css = figmaService.exportDesignSystemToCSS();

// Output:
// :root {
//   --color-kenya-primary: #006B3F;
//   --spacing-md: 16px;
//   --radius-md: 8px;
// }
```

---

## Figma REST API Reference

### Get File
```bash
curl -H "X-Figma-Token: YOUR_TOKEN" \
  https://api.figma.com/v1/files/FILE_KEY
```

**Response:**
```json
{
  "name": "My File",
  "document": {
    "id": "0:1",
    "name": "Document",
    "type": "DOCUMENT",
    "children": [...]
  },
  "components": {},
  "styles": {}
}
```

### Get Specific Node
```bash
curl -H "X-Figma-Token: YOUR_TOKEN" \
  https://api.figma.com/v1/files/FILE_KEY/nodes?ids=NODE_ID
```

### Get Image Exports
```bash
curl -H "X-Figma-Token: YOUR_TOKEN" \
  "https://api.figma.com/v1/images/FILE_KEY?ids=NODE_ID&format=png&scale=2"
```

### Get File Styles
```bash
curl -H "X-Figma-Token: YOUR_TOKEN" \
  https://api.figma.com/v1/files/FILE_KEY/styles
```

---

## Component Integration

### Add to Settings Page

```typescript
import { FigmaIntegration } from '@/app/components/figma/FigmaIntegration';

function Settings() {
  return (
    <div>
      {/* ... other settings ... */}
      
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Design Integration</h2>
        <p className="text-muted-foreground mb-4">
          Sync wireframes and design tokens with Figma
        </p>
        <FigmaIntegration />
      </Card>
    </div>
  );
}
```

### Standalone Usage

```typescript
import { figmaService } from '@/services/figma.service';

// Export wireframes
const exportWireframes = () => {
  const json = figmaService.exportAsJSON();
  console.log(json);
};

// Extract tokens
const extractTokens = async () => {
  const tokens = await figmaService.extractDesignTokens('FILE_KEY');
  console.log(tokens);
};

// Generate CSS
const generateCSS = () => {
  const css = figmaService.exportDesignSystemToCSS();
  console.log(css);
};
```

---

## Wireframe Structure

The exported JSON includes all major screens:

### 1. Onboarding Flow
- Country Selector (5 countries with flags)
- Business Info Form
- Tax Setup Wizard
- Payment Methods Selection
- Success Screen

### 2. Dashboard
- Header with business info
- Summary Cards (Money In/Out/Profit)
- 7-Day Trend Chart
- Quick Actions (3 buttons)
- Recent Activity List
- Tax Reminder Banner
- Bottom Navigation (6 tabs)

### 3. Transactions
- Search Bar
- Filter Pills (All, Income, Expense)
- Summary Cards
- Transaction List with icons

### 4. Invoices
- Customer Selector
- Line Items Editor
- VAT Auto-Calculation
- PDF Preview
- Send Options

### 5. Reports
- Period Selector
- Report Type Cards
- Charts and Graphs
- Export Options

### 6. Receipt OCR
- Camera Button
- Upload Button
- Processing State
- Review Form
- Success State

### 7. Mobile Money Payment
- Provider Selection (M-Pesa, Airtel, etc.)
- Phone Input
- Processing with Countdown
- Success/Failure States

---

## Design Tokens

### Colors (Country-Adaptive)
```css
/* Kenya */
--color-kenya-primary: #006B3F;
--color-kenya-secondary: #BC2025;

/* Tanzania */
--color-tanzania-primary: #1EB53A;
--color-tanzania-secondary: #00A3DD;

/* Uganda */
--color-uganda-primary: #FCDC04;
--color-uganda-secondary: #000000;

/* Rwanda */
--color-rwanda-primary: #00A1DE;
--color-rwanda-secondary: #FAD201;

/* Burundi */
--color-burundi-primary: #CE1126;
--color-burundi-secondary: #1EB53A;

/* UI Colors */
--color-blue-600: #3b82f6;
--color-green-600: #10b981;
--color-red-600: #ef4444;
```

### Spacing
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
```

### Typography
```css
--font-h1: 24px bold;
--font-h2: 20px 600;
--font-body: 16px 400;
--font-small: 14px 400;
--font-tiny: 12px 400;
```

### Border Radius
```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

---

## Automation with Figma Webhooks

### Setup Webhook
```typescript
// Register webhook
await fetch('https://api.figma.com/v2/webhooks', {
  method: 'POST',
  headers: {
    'X-Figma-Token': FIGMA_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event_type: 'FILE_UPDATE',
    team_id: 'YOUR_TEAM_ID',
    endpoint: 'https://your-app.com/api/figma/webhook',
    passcode: 'secret',
  }),
});
```

### Handle Webhook
```typescript
// /api/figma/webhook
app.post('/api/figma/webhook', (req, res) => {
  const { event_type, file_key, passcode } = req.body;
  
  if (passcode !== 'secret') {
    return res.status(401).send('Unauthorized');
  }
  
  if (event_type === 'FILE_UPDATE') {
    // Re-extract design tokens
    figmaService.extractDesignTokens(file_key)
      .then(tokens => {
        // Update design system
        console.log('Design tokens updated:', tokens);
      });
  }
  
  res.sendStatus(200);
});
```

---

## Figma Plugin Development (Optional)

### Create Custom Plugin

**manifest.json:**
```json
{
  "name": "EastBooks Design Sync",
  "id": "eastbooks-design-sync",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "capabilities": [
    "fileRead",
    "fileWrite"
  ]
}
```

**code.js:**
```javascript
// Plugin code runs in Figma
figma.showUI(__html__, { width: 400, height: 600 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'export-to-eastbooks') {
    const selection = figma.currentPage.selection;
    const data = exportSelection(selection);
    
    // Send to your app
    await fetch('https://your-app.com/api/figma/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    figma.notify('Exported to EastBooks!');
  }
};
```

**ui.html:**
```html
<button id="export">Export to EastBooks</button>
<script>
  document.getElementById('export').onclick = () => {
    parent.postMessage({ 
      pluginMessage: { type: 'export-to-eastbooks' } 
    }, '*');
  };
</script>
```

---

## Testing

### Test Figma API Connection
```bash
# Test with curl
curl -H "X-Figma-Token: YOUR_TOKEN" \
  https://api.figma.com/v1/files/YOUR_FILE_KEY
```

### Test in Browser Console
```javascript
// In your app's console
import { figmaService } from '@/services/figma.service';

// Export wireframes
const json = figmaService.exportAsJSON();
console.log(json);

// Generate CSS
const css = figmaService.exportDesignSystemToCSS();
console.log(css);
```

---

## Best Practices

### 1. Design Naming Conventions
- Use consistent naming in Figma (e.g., "Button/Primary", "Card/Transaction")
- Group related components in frames
- Use descriptive layer names for auto-export

### 2. Version Control
- Export design tokens to Git
- Track changes in design system
- Version your Figma file key in `.env`

### 3. Automation
- Set up CI/CD to auto-import design tokens
- Use webhooks to sync on Figma file updates
- Generate changelogs for design updates

### 4. Security
- Never commit Figma access token to Git
- Use environment variables
- Rotate tokens periodically
- Restrict token permissions to read-only if possible

---

## Troubleshooting

### Issue: "Unauthorized" Error
**Solution:** Check your Figma access token in `.env.local`

### Issue: "File not found"
**Solution:** Verify the Figma file key is correct

### Issue: CORS Error
**Solution:** Figma API requests must come from server-side or use a proxy

### Issue: Empty Design Tokens
**Solution:** Make sure your Figma file has published styles

---

## Resources

- [Figma REST API Docs](https://www.figma.com/developers/api)
- [Figma Plugin API](https://www.figma.com/plugin-docs/)
- [JSON to Figma Plugin](https://www.figma.com/community/plugin/789839703871161985)
- [Design Tokens Community](https://www.designtokens.org/)

---

## Next Steps

1. ✅ Get Figma access token
2. ✅ Export wireframes to JSON
3. ✅ Import JSON to Figma using plugin
4. ✅ Extract design tokens
5. ✅ Generate CSS variables
6. 🔄 Set up webhook automation
7. 🔄 Create custom Figma plugin (optional)

---

**Status:** Ready for Figma integration! 🎨
