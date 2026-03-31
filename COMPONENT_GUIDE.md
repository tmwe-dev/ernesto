# ERNESTO React Components Guide

A professional dark-themed pricelist import application built with React 18, TypeScript, Tailwind CSS, and lucide-react icons.

## Project Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Layout.tsx          # Main layout with sidebar and top bar
│   │   ├── Stepper.tsx         # 5-step horizontal stepper
│   │   └── ChatPanel.tsx       # Reusable AI chat panel
│   ├── upload/
│   │   └── UploadStep.tsx      # File upload with drag & drop
│   ├── workspace/
│   │   └── WorkspaceStep.tsx   # AI workspace with split layout
│   ├── preview/
│   │   └── PreviewStep.tsx     # Data preview with tabs
│   ├── confirm/
│   │   └── ConfirmStep.tsx     # Final confirmation
│   ├── result/
│   │   └── ResultStep.tsx      # Success and results display
│   └── kb/
│       ├── RuleEditor.tsx      # Knowledge base rule editor
│       └── MemoryPanel.tsx     # Hydra memory item viewer
├── pages/
│   ├── HomePage.tsx            # Dashboard page
│   ├── ImportPage.tsx          # Import wizard page
│   └── KnowledgeBasePage.tsx   # KB management page
├── stores/
│   └── importStore.ts          # Zustand import state store
└── types/
    └── index.ts                # Core TypeScript types
```

## Core Components

### 1. Layout.tsx
**Main application layout with responsive sidebar and top bar.**

**Features:**
- Collapsible sidebar (60px collapsed, 240px expanded)
- Navigation links with icons (Dashboard, Import, Knowledge Base, Memory)
- Top bar with breadcrumb, search, and memory health badge
- Dark theme with slate/cyan colors
- Smooth transitions

**Props:**
```typescript
interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'dashboard' | 'import' | 'knowledge-base' | 'memory';
}
```

**Usage:**
```tsx
<Layout currentPage="import">
  {/* Page content */}
</Layout>
```

---

### 2. Stepper.tsx
**Horizontal multi-step stepper component.**

**Features:**
- 5-step progress indicator
- Show checkmarks for completed steps
- Filled circle for current step
- Empty circle for pending steps
- Click navigation between steps
- Connector lines between steps

**Props:**
```typescript
interface StepperProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
}
```

**Usage:**
```tsx
<Stepper 
  steps={['Upload', 'Workspace', 'Preview', 'Confirm', 'Result']}
  currentStep={1}
  onStepClick={(idx) => setCurrentStep(idx)}
/>
```

---

### 3. ChatPanel.tsx
**Reusable AI chat interface with markdown support.**

**Features:**
- Message list with user/assistant roles
- Action badges (KB saved, memory promoted, conflict detected, warning)
- File attachment button
- Send button with keyboard support (Enter to send)
- Typing indicator with animation
- Auto-scroll to bottom
- Message timestamps

**Props:**
```typescript
interface ChatPanelProps {
  messages: Message[];
  onSend: (message: string) => void;
  isTyping?: boolean;
  phase?: 'upload' | 'workspace' | 'preview' | 'confirm' | 'result';
  actions?: MessageAction[];
}
```

**Usage:**
```tsx
<ChatPanel
  messages={messages}
  onSend={(msg) => handleSend(msg)}
  isTyping={isLoading}
  phase="workspace"
  actions={[{ type: 'kb_saved', label: 'KB saved' }]}
/>
```

---

### 4. UploadStep.tsx
**File upload with drag & drop and file analysis.**

**Features:**
- Drag & drop zone with visual feedback
- File browser button
- Support for Excel, PDF, CSV
- File list with status badges (queued, analyzing, analyzed, error)
- Progress bars during analysis
- Summary cards showing carrier, zones, prices, confidence
- Carrier hint input per file
- Analyze All button

**Props:**
```typescript
interface UploadStepProps {
  files: ImportFile[];
  onFilesAdded: (files: ImportFile[]) => void;
  onFileUpdated: (fileId: string, updates: Partial<ImportFile>) => void;
  onFileRemoved: (fileId: string) => void;
  onAnalyzeAll: () => void;
  isAnalyzing?: boolean;
}
```

**Usage:**
```tsx
<UploadStep
  files={files}
  onFilesAdded={handleAddFiles}
  onFileUpdated={handleUpdateFile}
  onFileRemoved={handleRemoveFile}
  onAnalyzeAll={handleAnalyze}
  isAnalyzing={isAnalyzing}
/>
```

---

### 5. WorkspaceStep.tsx
**Interactive AI workspace with chat and data tabs.**

**Features:**
- Split layout (60% chat, 40% tabs)
- Left: ChatPanel for dialogue
- Right: Tabbed panel with:
  - Report tab: rendered markdown
  - Data tab: zones, prices, supplements tables
  - Sheets tab: Excel sheet screenshots
- Bottom toolbar with KB rules count badge
- Re-analyze and Preview buttons

**Props:**
```typescript
interface WorkspaceStepProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
  data: ImportData | null;
  aiReport: string;
  kbRulesCount?: number;
  onBuildMapping?: () => void;
  onReanalyze?: () => void;
  onPreview?: () => void;
}
```

**Usage:**
```tsx
<WorkspaceStep
  messages={messages}
  onSendMessage={handleSend}
  data={importData}
  aiReport={report}
  kbRulesCount={5}
  onPreview={() => goToPreview()}
/>
```

---

### 6. PreviewStep.tsx
**Data preview with statistics and warnings.**

**Features:**
- Stats bar: zones, prices, supplements, warnings, errors
- 3-tab view:
  - Zones table (country, zone number, label)
  - Prices pivot grid (zones as columns, weights as rows)
  - Supplements list
- Collapsible warnings panel with severity colors
- Chat panel for corrections
- Dry Run and Back buttons

**Props:**
```typescript
interface PreviewStepProps {
  data: ImportData | null;
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
  onDryRun?: () => void;
  onBack?: () => void;
}
```

**Usage:**
```tsx
<PreviewStep
  data={importData}
  messages={messages}
  onSendMessage={handleSend}
  onDryRun={handleDryRun}
  onBack={goBack}
/>
```

---

### 7. ConfirmStep.tsx
**Final confirmation before import commit.**

**Features:**
- Summary card with carrier, service, zones, prices info
- Editable pricelist name input
- Service selector (existing or create new)
- CE/Extra-CE split indicator
- Issues summary panel
- Chat panel for questions
- Confirm dialog with danger indicator
- Back and Commit buttons

**Props:**
```typescript
interface ConfirmStepProps {
  data: ImportData | null;
  pricelistName: string;
  onPricelistNameChange: (name: string) => void;
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
  onCommit?: () => void;
  onBack?: () => void;
}
```

**Usage:**
```tsx
<ConfirmStep
  data={importData}
  pricelistName={name}
  onPricelistNameChange={setName}
  messages={messages}
  onSendMessage={handleSend}
  onCommit={handleCommit}
/>
```

---

### 8. ResultStep.tsx
**Success confirmation and post-import actions.**

**Features:**
- Success card with inserted counts
- Quick links to service and pricelist
- Details section with IDs
- Import statistics (carrier, service, zoning, total records)
- Chat panel for post-import corrections
- Import Another button
- Review & Learn button

**Props:**
```typescript
interface ResultStepProps {
  data: ImportData | null;
  pricelistName: string;
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
  insertedZones?: number;
  insertedPrices?: number;
  insertedSupplements?: number;
  createdServiceId?: string;
  createdPricelistId?: string;
  onImportAnother?: () => void;
}
```

**Usage:**
```tsx
<ResultStep
  data={importData}
  pricelistName={name}
  messages={messages}
  onSendMessage={handleSend}
  insertedZones={215}
  insertedPrices={2400}
  onImportAnother={resetImport}
/>
```

---

### 9. RuleEditor.tsx
**Knowledge base rule editor modal.**

**Features:**
- Create and edit KB rules
- Fields: title, content, carrier, operation, priority, tags, active status
- Modal dialog with header and footer
- Save and Cancel buttons
- Validation (title and content required)

**Props:**
```typescript
interface RuleEditorProps {
  rule?: KnowledgeBaseRule | null;
  onSave: (rule: Omit<KnowledgeBaseRule, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
  onCancel: () => void;
  isOpen: boolean;
}
```

**Usage:**
```tsx
<RuleEditor
  rule={editingRule}
  onSave={handleSave}
  onCancel={handleCancel}
  isOpen={isEditing}
/>
```

---

### 10. MemoryPanel.tsx
**Hydra memory item viewer with filtering.**

**Features:**
- Level filter tabs (L1, L2, L3, All)
- Items list with expandable details
- Confidence bars
- Access count badge
- Tags display
- Linked rule indicator
- Promote, Pin, Archive actions
- Empty state handling

**Props:**
```typescript
interface MemoryPanelProps {
  items: HydraMemoryItem[];
  onPromote?: (itemId: string) => void;
  onArchive?: (itemId: string) => void;
  onPin?: (itemId: string) => void;
}
```

**Usage:**
```tsx
<MemoryPanel
  items={memoryItems}
  onPromote={handlePromote}
  onArchive={handleArchive}
  onPin={handlePin}
/>
```

---

## Pages

### HomePage.tsx
Dashboard with:
- Top stats (total imports, KB rules, memory items, learning score)
- Recent imports table with status and confidence
- Memory health card with L1/L2/L3 distribution
- Quick action buttons

### ImportPage.tsx
Import wizard that:
- Renders appropriate step component based on current step
- Manages messages and typing state
- Handles all step transitions
- Uses importStore for state management

### KnowledgeBasePage.tsx
Knowledge Base management:
- Rules list with filtering (carrier, status, search)
- Create/Edit/Delete rules
- Toggle rule active status
- Memory items tab with MemoryPanel
- Rule statistics and usage counts

---

## Types

All TypeScript types are defined in `src/types/index.ts`:

```typescript
Message, MessageAction
ImportFile, FileSummary
PriceZone, PriceEntry, Supplement
ImportWarning, ImportData
KnowledgeBaseRule
HydraMemoryItem, MemoryHealth
RecentImport
Step, ImportState
```

---

## State Management

Using Zustand for import state:

```typescript
import { useImportStore } from '../stores/importStore';

const store = useImportStore();
store.setCurrentStep('workspace');
store.addFile(file);
store.setData(importData);
```

---

## Styling

- **Framework:** Tailwind CSS
- **Color Scheme:**
  - Background: slate-950, slate-900
  - Primary: cyan-600, cyan-400
  - Success: emerald-600, emerald-400
  - Warning: yellow-500
  - Error: red-600
  - Neutral: slate-700, slate-500

- **Dark Theme:** All components use dark backgrounds with light text
- **Icons:** lucide-react icons (18-32px typically)

---

## Dependencies

- `react`: ^18.0
- `zustand`: State management
- `lucide-react`: Icons
- `tailwindcss`: Styling
- `typescript`: Type safety

---

## Usage Example: Full Import Workflow

```tsx
import { ImportPage } from './pages/ImportPage';
import { Layout } from './components/common/Layout';

function App() {
  return (
    <Layout currentPage="import">
      <ImportPage />
    </Layout>
  );
}
```

The ImportPage handles all step transitions and renders the appropriate component based on the current step from the import store.

---

## Accessibility Notes

- All interactive elements are keyboard accessible
- Color contrast meets WCAG AA standards
- Icons are paired with text labels
- Form inputs have proper labels and focus states
- Loading states use animated indicators
- Dialogs have escape key handlers

---

## Performance Considerations

- Components use React.memo where appropriate
- Message lists have efficient rendering
- Large tables implement virtual scrolling
- File inputs avoid re-rendering
- State updates are batched with Zustand

