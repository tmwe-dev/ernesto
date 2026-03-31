import React, { useState } from 'react';
import { Layout } from '../components/common/Layout';
import { Stepper } from '../components/common/Stepper';
import { UploadStep } from '../components/upload/UploadStep';
import { WorkspaceStep } from '../components/workspace/WorkspaceStep';
import { PreviewStep } from '../components/preview/PreviewStep';
import { ConfirmStep } from '../components/confirm/ConfirmStep';
import { ResultStep } from '../components/result/ResultStep';
import { useImportStore } from '../stores/importStore';
import { Message, ImportFile, ImportData } from '../types';

const STEPS = ['Upload', 'Workspace', 'Preview', 'Confirm', 'Result'];

export const ImportPage: React.FC = () => {
  const store = useImportStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleAddFiles = (files: ImportFile[]) => {
    files.forEach((file) => store.addFile(file));
  };

  const handleAnalyzeAll = async () => {
    store.files.forEach((file) => {
      store.updateFile(file.id, { status: 'analyzing', progress: 0 });
    });

    // Simulate analysis
    await new Promise((resolve) => setTimeout(resolve, 2000));

    store.files.forEach((file, idx) => {
      store.updateFile(file.id, {
        status: 'analyzed',
        progress: 100,
        summary: {
          carrier: file.carrierHint || 'Unknown Carrier',
          zones: Math.floor(Math.random() * 200) + 50,
          prices: Math.floor(Math.random() * 2000) + 500,
          confidence: Math.random() * 0.25 + 0.75,
        },
      });
    });

    // Add AI message
    const aiMessage: Message = {
      id: Math.random().toString(),
      role: 'assistant',
      content: 'I\'ve analyzed your files. I found pricing data for multiple carriers and zones. Let me help you build the complete mapping.',
      timestamp: new Date(),
      actions: [
        { type: 'kb_saved', label: 'KB saved' },
      ],
    };
    setMessages((prev) => [...prev, aiMessage]);

    store.setCurrentStep('workspace');
  };

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: Math.random().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsTyping(true);
    setTimeout(() => {
      const aiMessage: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        content: 'I\'m processing your request. The mapping looks good so far.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const renderStep = () => {
    const currentStepIndex = STEPS.findIndex(
      (s) => s.toLowerCase() === store.currentStep
    );

    switch (currentStepIndex) {
      case 0: // Upload
        return (
          <UploadStep
            files={store.files}
            onFilesAdded={handleAddFiles}
            onFileUpdated={(id, updates) =>
              store.updateFile(id, updates)
            }
            onFileRemoved={(id) => store.removeFile(id)}
            onAnalyzeAll={handleAnalyzeAll}
            isAnalyzing={store.files.some((f) => f.status === 'analyzing')}
          />
        );

      case 1: // Workspace
        return (
          <WorkspaceStep
            messages={messages}
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
            data={store.data}
            aiReport={store.aiReport}
            kbRulesCount={5}
            onReanalyze={() => {
              // Reanalyze logic
            }}
            onPreview={() => store.setCurrentStep('preview')}
          />
        );

      case 2: // Preview
        return (
          <PreviewStep
            data={store.data}
            messages={messages}
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
            onDryRun={() => store.setCurrentStep('confirm')}
            onBack={() => store.setCurrentStep('workspace')}
          />
        );

      case 3: // Confirm
        return (
          <ConfirmStep
            data={store.data}
            pricelistName={store.pricelistName}
            onPricelistNameChange={(name) => store.setPricelistName(name)}
            messages={messages}
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
            onCommit={() => store.setCurrentStep('result')}
            onBack={() => store.setCurrentStep('preview')}
          />
        );

      case 4: // Result
        return (
          <ResultStep
            data={store.data}
            pricelistName={store.pricelistName}
            messages={messages}
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
            insertedZones={store.data?.zones.length || 0}
            insertedPrices={store.data?.prices.length || 0}
            insertedSupplements={store.data?.supplements.length || 0}
            onImportAnother={() => {
              store.reset();
              setMessages([]);
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Layout currentPage="import">
      <div className="p-6 space-y-6 max-h-screen flex flex-col">
        {/* Stepper */}
        <div className="flex-shrink-0">
          <Stepper
            steps={STEPS}
            currentStep={STEPS.findIndex(
              (s) => s.toLowerCase() === store.currentStep
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderStep()}
        </div>
      </div>
    </Layout>
  );
};
