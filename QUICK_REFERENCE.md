# ERNESTO Components - Quick Reference

## Import Statements

```typescript
// Common
import { Layout } from './components/common/Layout';
import { Stepper } from './components/common/Stepper';
import { ChatPanel } from './components/common/ChatPanel';

// Workflow
import { UploadStep } from './components/upload/UploadStep';
import { WorkspaceStep } from './components/workspace/WorkspaceStep';
import { PreviewStep } from './components/preview/PreviewStep';
import { ConfirmStep } from './components/confirm/ConfirmStep';
import { ResultStep } from './components/result/ResultStep';

// Knowledge Base
import { RuleEditor } from './components/kb/RuleEditor';
import { MemoryPanel } from './components/kb/MemoryPanel';

// Pages
import { HomePage } from './pages/HomePage';
import { ImportPage } from './pages/ImportPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';

// Store
import { useImportStore } from './stores/importStore';

// Types
import type {
  Message, ImportData, KnowledgeBaseRule, HydraMemoryItem
} from './types';
```

---

## Common Props Patterns

### Layout
```tsx
<Layout currentPage="import">
  <YourContent />
</Layout>
```

### Stepper
```tsx
<Stepper
  steps={['Step 1', 'Step 2', 'Step 3']}
  currentStep={0}
  onStepClick={(idx) => setStep(idx)}
/>
```

### ChatPanel
```tsx
<ChatPanel
  messages={messages}
  onSend={(msg) => handleSend(msg)}
  isTyping={isLoading}
  phase="workspace"
/>
```

---

## State Management

```typescript
// Get store
const store = useImportStore();

// Navigate
store.setCurrentStep('preview');

// File operations
store.addFile(newFile);
store.updateFile(fileId, { status: 'analyzed' });
store.removeFile(fileId);

// Data
store.setData(importData);
store.setAiReport(reportMarkdown);
store.setPricelistName('My Pricelist');

// Reset
store.reset();
```

---

## Color Reference

### Backgrounds
- `bg-slate-950` - Darkest background
- `bg-slate-900` - Main background
- `bg-slate-800` - Card background
- `bg-slate-700` - Hover state

### Primary (Cyan)
- `bg-cyan-600` - Button active
- `bg-cyan-700` - Button hover
- `text-cyan-400` - Primary text
- `text-cyan-100` - Light text

### Success (Emerald)
- `bg-emerald-900` - Success card
- `text-emerald-400` - Success indicator
- `border-emerald-700` - Success border

### Warning (Yellow)
- `bg-yellow-900` - Warning card
- `text-yellow-400` - Warning text
- `border-yellow-700` - Warning border

### Error (Red)
- `bg-red-900` - Error card
- `text-red-400` - Error text
- `border-red-700` - Error border

---

## Common UI Patterns

### Button Variants

**Primary:**
```tsx
<button className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold">
  Action
</button>
```

**Secondary:**
```tsx
<button className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold">
  Action
</button>
```

**Danger:**
```tsx
<button className="bg-red-600 hover:bg-red-700 text-white font-semibold">
  Delete
</button>
```

**Disabled:**
```tsx
<button disabled className="opacity-50 cursor-not-allowed">
  Disabled
</button>
```

### Card Layout

```tsx
<div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
  <h2 className="text-slate-100 font-semibold mb-2">Title</h2>
  <p className="text-slate-300">Content</p>
</div>
```

### Input Fields

```tsx
<input
  type="text"
  placeholder="Placeholder"
  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
/>
```

### Status Badges

```tsx
// Success
<span className="px-2 py-1 bg-emerald-900 text-emerald-100 rounded text-xs font-semibold">
  Success
</span>

// Warning
<span className="px-2 py-1 bg-yellow-900 text-yellow-100 rounded text-xs font-semibold">
  Warning
</span>

// Error
<span className="px-2 py-1 bg-red-900 text-red-100 rounded text-xs font-semibold">
  Error
</span>
```

### Progress Bar

```tsx
<div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
  <div
    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
    style={{ width: `${progress}%` }}
  />
</div>
```

---

## Icon Sizing Guide

- **Tiny:** `size={12}` - Badges, inline icons
- **Small:** `size={16}` - Form elements, compact buttons
- **Medium:** `size={18}` - Regular buttons
- **Large:** `size={24}` - Headers, large buttons
- **XL:** `size={32}` - Page headers

---

## Type Examples

### Message
```typescript
const message: Message = {
  id: '123',
  role: 'assistant',
  content: 'Hello!',
  timestamp: new Date(),
  actions: [
    { type: 'kb_saved', label: 'Rule saved' }
  ]
};
```

### ImportFile
```typescript
const file: ImportFile = {
  id: '1',
  name: 'prices.xlsx',
  size: 45678,
  type: 'excel',
  status: 'analyzed',
  progress: 100,
  carrierHint: 'DHL',
  summary: {
    carrier: 'DHL',
    zones: 215,
    prices: 2400,
    confidence: 0.98
  }
};
```

### KnowledgeBaseRule
```typescript
const rule: KnowledgeBaseRule = {
  id: '1',
  title: 'Extract Zones',
  content: 'Pattern...',
  carrier: 'DHL',
  operation: 'extract',
  priority: 'high',
  tags: ['dhl', 'zones'],
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  usageCount: 45
};
```

### HydraMemoryItem
```typescript
const item: HydraMemoryItem = {
  id: 'm1',
  content: 'Memory content',
  level: 'L1',
  confidence: 0.92,
  accessCount: 23,
  tags: ['important'],
  linkedRuleId: '1',
  createdAt: new Date(),
  lastAccessedAt: new Date()
};
```

---

## Common Operations

### Adding a File
```typescript
const file: ImportFile = {
  id: Math.random().toString(),
  name: 'prices.xlsx',
  size: fileObj.size,
  type: 'excel',
  status: 'queued',
  progress: 0
};
store.addFile(file);
```

### Updating File Status
```typescript
store.updateFile(fileId, {
  status: 'analyzing',
  progress: 50,
  summary: {
    carrier: 'DHL',
    zones: 100,
    prices: 500,
    confidence: 0.95
  }
});
```

### Sending Chat Message
```typescript
const userMsg: Message = {
  id: Math.random().toString(),
  role: 'user',
  content: input,
  timestamp: new Date()
};
setMessages(prev => [...prev, userMsg]);
```

---

## Responsive Classes

```tsx
// Hidden on mobile, visible on desktop
<div className="hidden md:block">
  Desktop only
</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Items */}
</div>

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Heading
</h1>

// Responsive padding
<div className="p-4 md:p-6 lg:p-8">
  Content
</div>
```

---

## Animation Classes

```tsx
// Spin animation
<Icon className="animate-spin" size={20} />

// Bounce animation
<div className="animate-bounce">Content</div>

// Fade transition
<div className="transition-opacity duration-300">Content</div>

// Transform transition
<div className="transition-transform hover:scale-105">Content</div>
```

---

## Accessibility Tips

- Always pair icons with text labels
- Use semantic HTML (`<button>`, `<input>`, `<label>`)
- Include `aria-label` for icon-only buttons
- Set `disabled` attribute instead of styling
- Maintain color contrast ratios
- Use focus visible states

---

## Performance Tips

1. Use `React.memo()` for list items
2. Implement virtual scrolling for large lists
3. Debounce search inputs
4. Memoize expensive computations
5. Use Zustand for efficient state updates
6. Split components for lazy loading

---

## Debugging

Enable React DevTools extension to:
- Inspect component props
- View state updates
- Profile performance
- Track re-renders

Check Zustand state:
```typescript
const store = useImportStore.getState();
console.log(store);
```

---

## File Organization

```
src/
├── components/          # Reusable components
│   ├── common/         # Shared (Layout, Stepper, ChatPanel)
│   ├── upload/         # Upload workflow
│   ├── workspace/      # Workspace/AI features
│   ├── preview/        # Data preview
│   ├── confirm/        # Confirmation
│   ├── result/         # Results display
│   └── kb/             # Knowledge base
├── pages/              # Full page components
├── stores/             # Zustand stores
├── types/              # TypeScript definitions
└── lib/                # Utilities
```

---

## Next Steps

1. Install dependencies: `npm install zustand react-markdown lucide-react`
2. Configure Tailwind CSS
3. Import components as needed
4. Integrate with your backend API
5. Connect to Supabase for data persistence
6. Add error boundary component
7. Implement authentication
8. Add logging/analytics

