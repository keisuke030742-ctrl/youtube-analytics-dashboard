'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';

interface ThemeInputFormProps {
  onSubmit: (theme: string, additionalInfo: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

const EXAMPLE_THEMES = [
  '平屋住宅の闇',
  '断熱等級',
  '太陽光発電',
  '住宅ローン 変動金利',
  '外壁材 選び方',
  '工務店 ハウスメーカー 違い',
];

export function ThemeInputForm({ onSubmit, isLoading, disabled }: ThemeInputFormProps) {
  const [theme, setTheme] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (theme.trim()) {
      onSubmit(theme.trim(), additionalInfo.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setTheme(example);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          テーマ入力
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">テーマ/キーワード *</Label>
            <Input
              id="theme"
              type="text"
              placeholder="例: 平屋住宅の闇"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              maxLength={500}
              disabled={isLoading}
            />
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_THEMES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handleExampleClick(example)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalInfo">補足情報（オプション）</Label>
            <Input
              id="additionalInfo"
              type="text"
              placeholder="例: TOP3形式で作成してほしい"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              maxLength={500}
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!theme.trim() || isLoading || disabled}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                台本を生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                台本を生成する
              </>
            )}
          </Button>

          {disabled && !isLoading && (
            <p className="text-sm text-amber-600 text-center">
              APIキーを設定してください
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
