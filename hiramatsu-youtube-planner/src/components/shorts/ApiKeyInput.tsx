'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Check, Key } from 'lucide-react';

const API_KEY_STORAGE_KEY = 'hiramatsu-shorts-api-key';

interface ApiKeyInputProps {
  onApiKeyChange: (apiKey: string) => void;
}

export function ApiKeyInput({ onApiKeyChange }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // LocalStorageから読み込み
  useEffect(() => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
      setIsSaved(true);
      onApiKeyChange(savedKey);
    }
  }, [onApiKeyChange]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      setIsSaved(true);
      onApiKeyChange(apiKey.trim());
    }
  };

  const handleChange = (value: string) => {
    setApiKey(value);
    setIsSaved(false);
  };

  const handleClear = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setIsSaved(false);
    onApiKeyChange('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Key className="w-5 h-5" />
          APIキー設定
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => handleChange(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              onClick={handleSave}
              disabled={!apiKey.trim() || isSaved}
              variant={isSaved ? 'secondary' : 'default'}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  保存済み
                </>
              ) : (
                '保存'
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              APIキーはブラウザのローカルストレージに保存されます
            </p>
            {isSaved && (
              <button
                onClick={handleClear}
                className="text-xs text-red-500 hover:text-red-700"
              >
                クリア
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
