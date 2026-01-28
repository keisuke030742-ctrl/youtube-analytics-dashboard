import Link from 'next/link';
import { Youtube, FileText, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Youtube className="w-12 h-12 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900">
              平松建築 YouTube企画ツール
            </h1>
          </div>
          <p className="text-gray-500 text-lg">
            AI を活用した YouTube 動画企画・台本作成支援ツール
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/shorts"
            className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Sparkles className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                ショート台本ジェネレーター
              </h2>
            </div>
            <p className="text-gray-600">
              テーマを入力するだけで YouTube ショート動画の台本を AI が自動生成します。
            </p>
          </Link>

          <Link
            href="/projects/new"
            className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                ロング動画企画書作成
              </h2>
            </div>
            <p className="text-gray-600">
              4フェーズのワークフローで本格的な YouTube 企画書を作成します。
            </p>
          </Link>
        </div>

        <div className="mt-16 text-center text-sm text-gray-400">
          <p>職人社長の家づくり工務店 × AI 企画支援</p>
        </div>
      </div>
    </div>
  );
}
