import { useState } from 'react';
import { useFlag } from '@ai-platform/feature-flags';
import { useQuota } from '../../profile/hooks/useQuota';
import { TextPromptForm } from '../components/TextPromptForm';
import { ImageUploader } from '../components/ImageUploader';
import { GenerationProgress } from '../components/GenerationProgress';
import { ResultDisplay } from '../components/ResultDisplay';

type Tab = 'text' | 'image';

// ─── Shared top bar ───────────────────────────────────────────────────────────

function BoltIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GeneratePage() {
  const isTextEnabled = useFlag('image.text_generation.enabled');
  const isImg2ImgEnabled = useFlag('image.img2img.enabled');
  const { data: quota } = useQuota();

  const defaultTab: Tab = isTextEnabled ? 'text' : 'image';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const creditsLeft = quota ? Math.max(0, quota.limit - quota.used) : null;

  const showTabs = isTextEnabled && isImg2ImgEnabled;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-background px-8 py-[18px]">
        <div>
          <div className="font-display text-2xl font-medium tracking-[-0.5px]">Generate</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            {activeTab === 'text'
              ? 'Turn prompts into finished images'
              : 'Transform an existing image with a prompt'}
          </div>
        </div>
        {creditsLeft !== null && (
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-[5px] text-[11px] font-medium text-muted-foreground">
            <BoltIcon /> {creditsLeft} credit{creditsLeft !== 1 ? 's' : ''} left
          </span>
        )}
      </div>

      {/* Split panel */}
      <div
        className="flex min-h-0 flex-1 overflow-hidden"
        style={{ gridTemplateColumns: '380px 1fr' }}
      >
        {/* Left panel — form */}
        <div
          className="flex flex-col gap-5 overflow-auto border-r border-border bg-card p-6"
          style={{ width: 380, flexShrink: 0 }}
        >
          {/* Tab switcher */}
          {showTabs && (
            <div className="flex gap-1 rounded-[10px] bg-muted p-[3px]">
              {[
                { key: 'text' as Tab, label: 'Text → Image', enabled: isTextEnabled },
                { key: 'image' as Tab, label: 'Image → Image', enabled: isImg2ImgEnabled },
              ]
                .filter((t) => t.enabled)
                .map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex-1 rounded-[7px] px-2 py-[7px] text-[12.5px] font-semibold transition-all ${
                      activeTab === t.key
                        ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,.06)]'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
            </div>
          )}

          {/* Form content */}
          {activeTab === 'text' && isTextEnabled && (
            <TextPromptForm onJobStarted={setActiveJobId} />
          )}
          {activeTab === 'image' && isImg2ImgEnabled && (
            <ImageUploader onJobStarted={setActiveJobId} />
          )}

          {!isTextEnabled && !isImg2ImgEnabled && (
            <div className="rounded-lg border border-border bg-muted p-8 text-center text-[13px] text-muted-foreground">
              No generation features are currently available.
            </div>
          )}
        </div>

        {/* Right panel — result */}
        <div className="flex flex-1 flex-col overflow-auto bg-tint p-7">
          <GenerationProgress jobId={activeJobId} />
          <ResultDisplay jobId={activeJobId} onClear={() => setActiveJobId(null)} />

          {!activeJobId && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <svg
                width={48}
                height={48}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.3}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-4 text-muted-foreground opacity-30"
              >
                <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
                <path d="M19 15v3M17.5 16.5h3" />
              </svg>
              <div className="text-[14px] font-medium text-muted-foreground opacity-60">
                Your generation will appear here
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground opacity-40">
                Fill in the prompt and press Generate
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
