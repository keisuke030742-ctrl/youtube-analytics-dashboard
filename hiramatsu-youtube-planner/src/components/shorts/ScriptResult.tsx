'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, Check, FileText, AlertTriangle } from 'lucide-react';
import { ParsedScript, checkNGWords, NGWordCheck } from '@/lib/prompts/short-script-prompt';

interface ScriptResultProps {
  result: ParsedScript;
}

export function ScriptResult({ result }: ScriptResultProps) {
  const [copied, setCopied] = useState(false);
  const ngWordIssues = checkNGWords(result.script);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.rawMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([result.rawMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `台本_${result.title.slice(0, 30).replace(/[【】]/g, '')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            生成結果
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  コピー済み
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  コピー
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              ダウンロード
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* NGワード警告 */}
        {ngWordIssues.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              NGワード検出
            </div>
            <ul className="text-sm text-amber-600 space-y-1">
              {ngWordIssues.map((issue, index) => (
                <li key={index}>
                  <span className="font-medium">「{issue.word}」</span>: {issue.suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* タイトル */}
        {result.title && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">タイトル</h3>
            <p className="text-lg font-bold text-gray-900">{result.title}</p>
          </div>
        )}

        {/* SEOキーワード */}
        {result.seoKeyword && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">SEOキーワード</h3>
            <p className="text-sm text-gray-700">{result.seoKeyword}</p>
          </div>
        )}

        {/* 台本 */}
        {result.script && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">台本</h3>
            <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-gray-800 leading-relaxed text-sm">
              {result.script}
            </div>
          </div>
        )}

        {/* 文字数カウント */}
        <div className="flex justify-end">
          <span className="text-xs text-gray-400">
            台本文字数: {result.script.length}文字
            {result.script.length > 600 && (
              <span className="text-amber-500 ml-2">（少し長いかもしれません）</span>
            )}
            {result.script.length < 300 && (
              <span className="text-amber-500 ml-2">（少し短いかもしれません）</span>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
