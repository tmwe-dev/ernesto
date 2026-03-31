# ERNESTO — AI Pricelist Import Engine con Memoria Intelligente

A modern React application for intelligent pricelist importing with AI-powered processing and persistent memory system.

## Overview

ERNESTO is a full-featured pricelist import engine featuring:

- **Smart 5-Step Import Wizard**: Upload → Preview → Mapping → Rules → Review
- **Intelligent Memory System**: 3-level (L1/L2/L3) learning hierarchy with promotion and decay
- **Knowledge Base**: Manage rules and patterns for intelligent processing
- **Real-time Dashboard**: Monitor imports, memory health, and system metrics
- **Dark Corporate Theme**: Modern UI with Tailwind CSS and custom ernesto color palette

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite + SWC
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS 3 + PostCSS
- **UI Icons**: Lucide React
- **Backend Ready**: Supabase integration configured
- **Data Processing**: XLSX support for spreadsheet handling

## Project Structure

```
ernesto/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── Layout.tsx       # Main sidebar layout
│   ├── pages/               # Page components
│   │   ├── HomePage.tsx     # Dashboard & recent activity
│   │   ├── ImportPage.tsx   # 5-step import wizard
│   │   └── KnowledgeBasePage.tsx  # Rules management
│   ├── lib/                 # Utilities & helpers
│   │   ├── cn.ts           # Class name merger (clsx + tailwind-merge)
│   │   └── supabase.ts      # Supabase client & helpers
│   ├── stores/              # Zustand state management
│   │   ├── import-store.ts  # Import wizard state
│   │   ├── memory-store.ts  # 3-level memory hierarchy
│   │   └── kb-store.ts      # Knowledge base rules
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # Core types
│   ├── styles/              # Global styles
│   │   └── globals.css      # Tailwind + CSS variables
│   ├── App.tsx              # Main app with routing
│   └── main.tsx             # React root & Router setup
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── tailwind.config.ts       # Tailwind theme & colors
├── tsconfig.json            # TypeScript strict config
├── package.json             # Dependencies
└── .env.example             # Environment variables template
```

## Installation

```bash
# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Configure Supabase (optional)
# VITE_SUPABASE_URL=your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Development

```bash
# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

### Dashboard (HomePage)
- Recent imports with status indicators
- Memory health metrics (accuracy, automation rate, items processed)
- Quick action cards for import and KB management
- Real-time system health monitoring

### Import Wizard (ImportPage)
5-step guided process:
1. **Upload** - Drag & drop file selection (XLSX, CSV, TSV)
2. **Preview** - Review data table with first rows
3. **Mapping** - Map spreadsheet columns to ERNESTO fields
4. **Rules** - Enable/disable AI processing rules
5. **Review** - Final confirmation before import

### Knowledge Base (KnowledgeBasePage)
- Manage AI rules for data processing
- Filter by type: Mapping, Validation, Transformation, Deduplication
- Track rule usage and accuracy metrics
- Enable/disable rules per import
- Search functionality for discovering rules

## Theming

### Color Palette
```
ernesto-primary:   Blue #4f9eff (UI actions, navigation)
ernesto-accent:    Orange #f97316 (Highlights, CTAs)
ernesto-surface:   Gray #1f2937 → #111827 (Backgrounds)
```

### CSS Variables
Available in `globals.css`:
- `--ernesto-primary` - Primary blue
- `--ernesto-accent` - Accent orange
- `--ernesto-surface` - Background gray
- `--transition-fast` - 150ms ease
- `--transition-base` - 250ms ease

### Component Classes
```tsx
// Buttons
<button className="ernesto-btn-primary">Primary</button>
<button className="ernesto-btn-secondary">Secondary</button>
<button className="ernesto-btn-accent">Accent</button>
<button className="ernesto-btn-ghost">Ghost</button>

// Cards
<div className="ernesto-card">Content</div>
<div className="ernesto-card-hover">Hoverable</div>

// Forms
<input className="ernesto-input" />

// Text
<span className="ernesto-badge-primary">Badge</span>
<h1 className="ernesto-text-gradient">Gradient Text</h1>
```

## State Management

### Import Store (Zustand)
```typescript
const { files, currentStep, activeFile } = useImportStore();
store.addFiles(newFiles);
store.setStep(2);
store.updateFile(fileId, { status: 'analyzed' });
```

### Memory Store (Zustand + Persist)
```typescript
const { items, getHealth } = useMemoryStore();
store.addItem(memoryData);
store.checkAndPromote(); // Promote items based on thresholds
store.applyDecay();      // Decay unused items
```

### KB Store
Rules management with versioning and statistics.

## Environment Variables

Create `.env` file:

```env
# Supabase Configuration (Optional)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API Configuration (Optional)
VITE_API_URL=http://localhost:3000
VITE_API_KEY=your-api-key
```

## Utilities

### cn() - Class Name Merger
Combines clsx with tailwind-merge for safe Tailwind conflict resolution:

```typescript
import { cn } from '@/lib/cn';

cn('px-2 py-1', isActive && 'px-4 py-2')
// Results in: px-4 py-2 (larger padding wins)
```

### Supabase Client
```typescript
import { supabase, withErrorHandling } from '@/lib/supabase';

const result = await withErrorHandling(
  supabase.from('imports').select('*')
);
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Supports modern ES2020+

## Performance Optimizations

- SWC transpilation (faster than Babel)
- Code splitting via Vite
- CSS-in-JS optimization with Tailwind
- Zustand store persistence (localStorage)
- React StrictMode in development

## Contributing

Follow TypeScript strict mode rules and use the established component patterns. All components should use the custom ernesto component classes for styling consistency.

## License

MIT
