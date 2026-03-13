import { GenerateTabs } from '../components/GenerateTabs';

export default function GeneratePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Generate</h1>
      <GenerateTabs />
    </div>
  );
}
