import { useState } from 'react';
import { useFlag } from '@ai-platform/feature-flags';
import { TextPromptForm } from './TextPromptForm';
import { ImageUploader } from './ImageUploader';
import { GenerationProgress } from './GenerationProgress';
import { ResultDisplay } from './ResultDisplay';
import { useTextGeneration } from '../hooks/useTextGeneration';
import { useImgToImg } from '../hooks/useImgToImg';

type Tab = 'text' | 'image';

export function GenerateTabs() {
  const isTextEnabled = useFlag('image.text_generation.enabled');
  const isImg2ImgEnabled = useFlag('image.img2img.enabled');

  const defaultTab: Tab = isTextEnabled ? 'text' : isImg2ImgEnabled ? 'image' : 'text';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  const textGen = useTextGeneration();
  const imgToImg = useImgToImg();

  const activeJobId = activeTab === 'text' ? textGen.activeJobId : imgToImg.activeJobId;

  const enabledTabs: { key: Tab; label: string }[] = [
    ...(isTextEnabled ? [{ key: 'text' as const, label: 'Text to Image' }] : []),
    ...(isImg2ImgEnabled ? [{ key: 'image' as const, label: 'Image to Image' }] : []),
  ];

  if (enabledTabs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        No generation features are currently available.
      </div>
    );
  }

  return (
    <div>
      {/* Tab bar — only shown when more than one tab is enabled */}
      {enabledTabs.length > 1 && (
        <div className="mb-4 flex rounded-lg border border-gray-200 bg-white p-1">
          {enabledTabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {activeTab === 'text' && isTextEnabled && <TextPromptForm />}
        {activeTab === 'image' && isImg2ImgEnabled && <ImageUploader />}
      </div>

      <GenerationProgress jobId={activeJobId} />
      <ResultDisplay jobId={activeJobId} />
    </div>
  );
}
