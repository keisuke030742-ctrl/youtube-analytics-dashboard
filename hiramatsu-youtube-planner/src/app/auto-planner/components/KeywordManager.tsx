'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function KeywordManager() {
  const [newKeyword, setNewKeyword] = useState('');
  const [newVolume, setNewVolume] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);

  const utils = trpc.useUtils();

  // キーワード一覧を取得
  const { data: keywordsData, isLoading } = trpc.keyword.list.useQuery({
    limit: 100,
    orderBy: 'volume',
    orderDir: 'desc',
  });

  // キーワード作成
  const createMutation = trpc.keyword.create.useMutation({
    onSuccess: () => {
      utils.keyword.list.invalidate();
      utils.keyword.stats.invalidate();
      setNewKeyword('');
      setNewVolume('');
      setNewCategory('');
    },
  });

  // 一括作成
  const bulkCreateMutation = trpc.keyword.bulkCreate.useMutation({
    onSuccess: (result) => {
      utils.keyword.list.invalidate();
      utils.keyword.stats.invalidate();
      setBulkInput('');
      setShowBulkImport(false);
      alert(`${result.created}件を追加しました（${result.skipped}件は重複のためスキップ）`);
    },
  });

  // キーワード削除
  const deleteMutation = trpc.keyword.delete.useMutation({
    onSuccess: () => {
      utils.keyword.list.invalidate();
      utils.keyword.stats.invalidate();
    },
  });

  // アクティブ状態切り替え
  const updateMutation = trpc.keyword.update.useMutation({
    onSuccess: () => {
      utils.keyword.list.invalidate();
    },
  });

  const handleCreate = () => {
    if (!newKeyword.trim()) return;

    createMutation.mutate({
      keyword: newKeyword.trim(),
      volume: newVolume ? parseInt(newVolume, 10) : undefined,
      category: newCategory || undefined,
      source: '手動追加',
    });
  };

  const handleBulkImport = () => {
    const lines = bulkInput.split('\n').filter((line) => line.trim());
    const keywords = lines.map((line) => {
      const parts = line.split('\t').map((p) => p.trim());
      return {
        keyword: parts[0],
        volume: parts[1] ? parseInt(parts[1], 10) || undefined : undefined,
        difficulty: parts[2] ? parseInt(parts[2], 10) || undefined : undefined,
        category: parts[3] || undefined,
        source: '一括インポート',
      };
    }).filter((kw) => kw.keyword);

    if (keywords.length === 0) {
      alert('有効なキーワードがありません');
      return;
    }

    bulkCreateMutation.mutate({ keywords, skipDuplicates: true });
  };

  const filteredKeywords = keywordsData?.keywords.filter(
    (kw) =>
      !searchQuery ||
      kw.keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kw.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 新規追加 */}
      <Card>
        <CardHeader>
          <CardTitle>キーワード追加</CardTitle>
          <CardDescription>
            新しいキーワードを追加します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="keyword">キーワード *</Label>
              <Input
                id="keyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="断熱材 選び方"
              />
            </div>
            <div>
              <Label htmlFor="volume">検索ボリューム</Label>
              <Input
                id="volume"
                type="number"
                value={newVolume}
                onChange={(e) => setNewVolume(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div>
              <Label htmlFor="category">カテゴリ</Label>
              <Input
                id="category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="断熱"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCreate}
                disabled={!newKeyword.trim() || createMutation.isPending}
              >
                追加
              </Button>
            </div>
          </div>

          {/* 一括インポート */}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => setShowBulkImport(!showBulkImport)}
            >
              {showBulkImport ? '閉じる' : '一括インポート'}
            </Button>

            {showBulkImport && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  タブ区切りでキーワードを入力してください（1行1キーワード）
                  <br />
                  形式: キーワード[TAB]ボリューム[TAB]競合度[TAB]カテゴリ
                </p>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full h-40 p-2 border rounded font-mono text-sm"
                  placeholder="断熱材 比較	5000	30	断熱
住宅ローン 金利	10000	50	ローン
..."
                />
                <Button
                  className="mt-2"
                  onClick={handleBulkImport}
                  disabled={!bulkInput.trim() || bulkCreateMutation.isPending}
                >
                  インポート実行
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* キーワード一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>キーワード一覧</CardTitle>
              <CardDescription>
                {keywordsData?.total ?? 0}件のキーワード
              </CardDescription>
            </div>
            <div className="w-64">
              <Input
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">読み込み中...</p>
          ) : filteredKeywords && filteredKeywords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">キーワード</th>
                    <th className="text-right py-2 px-4">ボリューム</th>
                    <th className="text-right py-2 px-4">使用回数</th>
                    <th className="text-left py-2 px-4">カテゴリ</th>
                    <th className="text-left py-2 px-4">最終使用</th>
                    <th className="text-center py-2 px-4">状態</th>
                    <th className="text-right py-2 px-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.map((kw) => (
                    <tr key={kw.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 font-medium">{kw.keyword}</td>
                      <td className="py-2 px-4 text-right">
                        {kw.volume?.toLocaleString() ?? '-'}
                      </td>
                      <td className="py-2 px-4 text-right">{kw.usageCount}</td>
                      <td className="py-2 px-4">
                        {kw.category && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                            {kw.category}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-gray-500">
                        {kw.lastUsedAt
                          ? new Date(kw.lastUsedAt).toLocaleDateString('ja-JP')
                          : '-'}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <button
                          onClick={() =>
                            updateMutation.mutate({
                              id: kw.id,
                              isActive: !kw.isActive,
                            })
                          }
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            kw.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {kw.isActive ? '有効' : '無効'}
                        </button>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`「${kw.keyword}」を削除しますか？`)) {
                              deleteMutation.mutate({ id: kw.id });
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          削除
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              キーワードがありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
