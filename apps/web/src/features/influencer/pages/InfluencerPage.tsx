import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useFlag } from '@ai-platform/feature-flags';
import { CreateInfluencerForm } from '../components/CreateInfluencerForm';
import { InfluencerVault } from '../components/InfluencerVault';
import { InfluencerGenerateForm } from '../components/InfluencerGenerateForm';
import { InfluencerGallery } from '../components/InfluencerGallery';
import { GenerationProgress } from '../../generate/components/GenerationProgress';
import { ResultDisplay } from '../../generate/components/ResultDisplay';

type Tab = 'vault' | 'create' | 'generate';

export default function InfluencerPage() {
  const isEnabled = useFlag('image.influencer.enabled');
  const [activeTab, setActiveTab] = useState<Tab>('vault');
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isEnabled) return <Navigate to="/generate" replace />;

  function handleJobStarted(jobId: string) {
    setIsSubmitting(false);
    setActiveJobId(jobId);
  }

  function handleSelectInfluencer(id: string) {
    setSelectedInfluencerId(id);
    setActiveTab('generate');
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'vault', label: 'Library' },
    { key: 'create', label: 'New influencer' },
    { key: 'generate', label: 'Generate' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-background px-8 py-[18px]">
        <div>
          <div className="font-display text-2xl font-medium tracking-[-0.5px]">Influencer</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            {activeTab === 'vault'
              ? 'Reusable characters that stay visually consistent across every generation'
              : activeTab === 'create'
                ? 'Step 1 of 2 · Define the character'
                : 'Influencer locked · generate consistent scenes'}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-[10px] bg-muted p-[3px]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`rounded-[7px] px-4 py-[7px] text-[12.5px] font-semibold transition-all ${
                activeTab === t.key
                  ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,.06)]'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vault tab — full-width grid */}
      {activeTab === 'vault' && (
        <div className="flex-1 overflow-auto p-8">
          <InfluencerVault
            onSelect={handleSelectInfluencer}
            onCreateClick={() => setActiveTab('create')}
          />
        </div>
      )}

      {/* Create tab — centered form */}
      {activeTab === 'create' && (
        <div className="flex flex-1 items-start justify-center overflow-auto p-8 bg-tint">
          <div className="w-full max-w-[680px]">
            <CreateInfluencerForm
              onCreated={(influencer) => {
                setSelectedInfluencerId(influencer.id);
                setActiveTab('vault');
              }}
            />
          </div>
        </div>
      )}

      {/* Generate tab — split panel */}
      {activeTab === 'generate' && (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left panel — form */}
          <div
            className="flex flex-col gap-5 overflow-auto border-r border-border bg-card p-6"
            style={{ width: 380, flexShrink: 0 }}
          >
            <InfluencerGenerateForm
              preSelectedInfluencerId={selectedInfluencerId}
              onJobStarted={handleJobStarted}
              onSubmitStart={() => {
                setIsSubmitting(true);
                setActiveJobId(null);
              }}
              onSubmitError={() => setIsSubmitting(false)}
            />
          </div>

          {/* Right panel — result + gallery */}
          <div className="flex flex-1 flex-col overflow-auto bg-tint p-7">
            <GenerationProgress jobId={activeJobId} isSubmitting={isSubmitting} />
            <ResultDisplay
              jobId={activeJobId}
              onClear={() => setActiveJobId(null)}
              onRegenerate={() => {}}
            />

            {!isSubmitting && !activeJobId && (
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
                  <circle cx="12" cy="7" r="4" />
                  <path d="M4 21c0-5 3.6-9 8-9s8 4 8 9" />
                </svg>
                <div className="text-[14px] font-medium text-muted-foreground opacity-60">
                  Your generation will appear here
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground opacity-40">
                  Select an influencer and fill in the scene prompt
                </div>
              </div>
            )}

            <InfluencerGallery influencerId={selectedInfluencerId} />
          </div>
        </div>
      )}
    </div>
  );
}
