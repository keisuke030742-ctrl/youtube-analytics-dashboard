'use client';

import { useState, useEffect } from 'react';
import { parseProposalsResponse, ParsedProposals, Proposal, checkNGWords } from '@/lib/prompts/short-script-prompt';

const API_KEY_STORAGE_KEY = 'hiramatsu-shorts-api-key';
const YOUTUBE_API_KEY_STORAGE_KEY = 'hiramatsu-youtube-api-key';
const HISTORY_STORAGE_KEY = 'hiramatsu-shorts-history';

// 履歴の型定義
interface HistoryItem {
  id: string;
  theme: string;
  createdAt: string;
  proposals: Proposal[];
  researchData?: any;
  isFavorite?: boolean;
}

// 読み上げ時間を計算（日本語は約7文字/秒）
const calculateReadingTime = (text: string): number => {
  return Math.round(text.length / 7);
};

// 秒を「○分○秒」形式に変換
const formatSeconds = (seconds: number): string => {
  if (seconds < 60) return `${seconds}秒`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}分${sec}秒` : `${min}分`;
};

export default function ShortsPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [isYoutubeKeySaved, setIsYoutubeKeySaved] = useState(false);
  const [theme, setTheme] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [scriptStyle, setScriptStyle] = useState('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ParsedProposals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('sonnet');
  const [researchData, setResearchData] = useState<any>(null);

  // 新機能用のstate
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTarget, setExportTarget] = useState<Proposal | null>(null);
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [rewriteTarget, setRewriteTarget] = useState<Proposal | null>(null);
  const [rewriteStyle, setRewriteStyle] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [showResearchDetail, setShowResearchDetail] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (saved) { setApiKey(saved); setIsKeySaved(true); }
    const savedYoutube = localStorage.getItem(YOUTUBE_API_KEY_STORAGE_KEY);
    if (savedYoutube) { setYoutubeApiKey(savedYoutube); setIsYoutubeKeySaved(true); }
    // 履歴を読み込み
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('History parse error:', e);
      }
    }
  }, []);

  // 履歴を保存
  const saveToHistory = (proposals: Proposal[], themeText: string, research?: any) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      theme: themeText,
      createdAt: new Date().toISOString(),
      proposals,
      researchData: research,
      isFavorite: false,
    };
    const updated = [newItem, ...history].slice(0, 50); // 最大50件
    setHistory(updated);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  };

  // お気に入り切り替え
  const toggleFavorite = (id: string) => {
    const updated = history.map(h =>
      h.id === id ? { ...h, isFavorite: !h.isFavorite } : h
    );
    setHistory(updated);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  };

  // 履歴から削除
  const deleteHistory = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  };

  // 履歴を復元
  const restoreHistory = (item: HistoryItem) => {
    setResult({ proposals: item.proposals, rawText: '' });
    setResearchData(item.researchData || null);
    setTheme(item.theme);
    setShowHistory(false);
    setExpandedRow(1);
  };

  const saveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      setIsKeySaved(true);
    }
  };

  const clearKey = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setIsKeySaved(false);
  };

  const saveYoutubeKey = () => {
    if (youtubeApiKey.trim()) {
      localStorage.setItem(YOUTUBE_API_KEY_STORAGE_KEY, youtubeApiKey.trim());
      setIsYoutubeKeySaved(true);
    }
  };

  const clearYoutubeKey = () => {
    localStorage.removeItem(YOUTUBE_API_KEY_STORAGE_KEY);
    setYoutubeApiKey('');
    setIsYoutubeKeySaved(false);
    setResearchData(null);
  };

  const getProgressSteps = () => {
    const baseSteps = [
      { percent: 5, message: '企画テーマを分析中...' },
    ];

    if (youtubeApiKey.trim()) {
      baseSteps.push(
        { percent: 12, message: 'YouTube競合動画を検索中...' },
        { percent: 22, message: '再生回数データを取得中...' },
        { percent: 32, message: 'タイトルパターンを分析中...' }
      );
    } else {
      baseSteps.push({ percent: 15, message: 'トレンドデータを収集中...' });
    }

    baseSteps.push(
      { percent: 42, message: '競合チャンネルを調査中...' },
      { percent: 55, message: 'バイラル要素を抽出中...' },
      { percent: 68, message: '企画案を構築中...' },
      { percent: 80, message: '台本を生成中...' },
      { percent: 90, message: 'スコアリング中...' },
      { percent: 96, message: '最終調整中...' }
    );

    return baseSteps;
  };

  const generate = async () => {
    if (!theme.trim() || !apiKey) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setProgressMessage('準備中...');

    const progressSteps = getProgressSteps();
    let stepIndex = 0;
    const progressInterval = setInterval(() => {
      if (stepIndex < progressSteps.length) {
        const step = progressSteps[stepIndex];
        setProgress(step.percent);
        setProgressMessage(step.message);
        stepIndex++;
      }
    }, 2500);

    try {
      const res = await fetch('/api/shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          theme,
          model: selectedModel,
          youtubeApiKey: youtubeApiKey.trim() || undefined,
          additionalInfo: scriptStyle !== 'auto'
            ? `${scriptStyle}形式で。${additionalInfo}`
            : additionalInfo,
        }),
      });

      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`APIレスポンスが不正です: ${responseText.substring(0, 100)}...`);
      }

      clearInterval(progressInterval);
      setProgress(100);
      setProgressMessage('完了！');

      await new Promise(resolve => setTimeout(resolve, 500));

      if (!res.ok) throw new Error(data.error || '生成失敗');
      if (!data.data?.rawMarkdown) throw new Error('レスポンスにデータがありません');

      const parsed = parseProposalsResponse(data.data.rawMarkdown);

      if (parsed.proposals.length === 0) {
        // デバッグ情報をコンソールに出力
        console.log('Parse failed. Debug info:', data.data.debug);
        console.log('Raw response (first 500 chars):', data.data.rawMarkdown?.substring(0, 500));
        throw new Error(`企画案のパースに失敗しました。レスポンス長: ${data.data.debug?.responseLength || 'unknown'}, 先頭: ${data.data.debug?.first100 || 'unknown'}`);
      }

      setResult(parsed);
      setExpandedRow(1);

      if (data.data?.research) {
        setResearchData(data.data.research);
      } else {
        setResearchData(null);
      }

      // 履歴に保存
      saveToHistory(parsed.proposals, theme, data.data?.research);

    } catch (e) {
      clearInterval(progressInterval);
      setError(e instanceof Error ? e.message : 'エラー');
    } finally {
      setIsLoading(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  // リライト機能
  const rewriteScript = async () => {
    if (!rewriteTarget || !rewriteStyle || !apiKey) return;
    setIsRewriting(true);

    try {
      const res = await fetch('/api/shorts/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          originalScript: rewriteTarget.script,
          style: rewriteStyle,
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'リライト失敗');

      // 結果を更新
      if (result) {
        const updated = result.proposals.map(p =>
          p.rank === rewriteTarget.rank ? { ...p, script: data.data.script } : p
        );
        setResult({ ...result, proposals: updated });
      }

      setShowRewriteModal(false);
      setRewriteTarget(null);
      setRewriteStyle('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'リライトエラー');
    } finally {
      setIsRewriting(false);
    }
  };

  // エクスポート機能
  const exportScript = (format: 'gdocs' | 'notion' | 'plain') => {
    if (!exportTarget) return;

    let content = '';
    const title = exportTarget.title;
    const script = exportTarget.script;

    switch (format) {
      case 'gdocs':
        content = `${title}\n\n---\n\n${script}\n\n---\n\n■ フック: ${exportTarget.hook}\n■ コンセプト: ${exportTarget.concept}\n■ 狙う感情: ${exportTarget.targetEmotion}\n■ バイラルスコア: ${exportTarget.viralScore}点`;
        break;
      case 'notion':
        content = `# ${title}\n\n## 台本\n\n${script}\n\n---\n\n| 項目 | 内容 |\n|---|---|\n| フック | ${exportTarget.hook} |\n| コンセプト | ${exportTarget.concept} |\n| 狙う感情 | ${exportTarget.targetEmotion} |\n| スコア | ${exportTarget.viralScore}点 |`;
        break;
      case 'plain':
        content = script;
        break;
    }

    navigator.clipboard.writeText(content);
    setShowExportModal(false);
    setExportTarget(null);
    setCopiedId(exportTarget.rank);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copy = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const avg = result?.proposals.length
    ? Math.round(result.proposals.reduce((a, p) => a + p.viralScore, 0) / result.proposals.length)
    : 0;
  const top = result?.proposals.length
    ? Math.max(...result.proposals.map(p => p.viralScore))
    : 0;
  const ngTotal = result?.proposals.filter(p => checkNGWords(p.script).length > 0).length || 0;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #E8F5F0 0%, #E0F0EA 100%)' }}>
      {/* ヘッダー */}
      <header style={{ padding: '32px 0 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #81C784 0%, #66BB6A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px'
          }}>
            🎬
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0 }}>
            ショート台本AI
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0' }}>
          AIが5つの企画案を自動生成・スコアリング
        </p>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 16px', background: '#E57373', color: '#fff',
            fontSize: '13px', fontWeight: '500', borderRadius: '20px'
          }}>
            🏠 職人社長の家づくり工務店
          </span>
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                padding: '6px 16px', background: showHistory ? '#5B9BD5' : '#fff',
                color: showHistory ? '#fff' : '#5B9BD5',
                fontSize: '13px', fontWeight: '500', borderRadius: '20px',
                border: '1px solid #5B9BD5', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }}
            >
              📚 履歴 ({history.length})
            </button>
          )}
        </div>
      </header>

      {/* 履歴パネル */}
      {showHistory && (
        <div style={{
          maxWidth: '1100px', margin: '0 auto 16px', padding: '0 24px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '8px', padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', maxHeight: '300px', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#333', margin: 0 }}>生成履歴</h3>
              <button
                onClick={() => setShowHistory(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            {history.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px' }}>
                履歴がありません
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', background: '#f8f8f8', borderRadius: '6px'
                  }}>
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                    >
                      {item.isFavorite ? '⭐' : '☆'}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: '#333', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.theme}
                      </p>
                      <p style={{ fontSize: '11px', color: '#999', margin: '2px 0 0' }}>
                        {new Date(item.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        ・{item.proposals.length}案
                      </p>
                    </div>
                    <button
                      onClick={() => restoreHistory(item)}
                      style={{
                        padding: '4px 12px', background: '#5B9BD5', color: '#fff',
                        border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      復元
                    </button>
                    <button
                      onClick={() => deleteHistory(item.id)}
                      style={{
                        padding: '4px 8px', background: '#f5f5f5', color: '#999',
                        border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* メイン */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 48px', display: 'flex', gap: '24px' }}>
        {/* 左カラム */}
        <div style={{ width: '320px', flexShrink: 0 }}>
          {/* 基本設定 */}
          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 'bold', color: '#333', margin: '0 0 16px' }}>基本設定</h2>

            {/* APIキー */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>APIキー</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setIsKeySaved(false); }}
                    placeholder="sk-ant-api03-..."
                    style={{
                      width: '100%', height: '32px', padding: '0 32px 0 10px',
                      border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                      outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    style={{
                      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '12px'
                    }}
                  >
                    {showKey ? '🙈' : '👁'}
                  </button>
                </div>
                <button
                  onClick={isKeySaved ? clearKey : saveKey}
                  disabled={!apiKey.trim()}
                  style={{
                    height: '32px', padding: '0 12px', borderRadius: '4px',
                    border: 'none', fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                    background: isKeySaved ? '#E8F5E9' : '#5B9BD5',
                    color: isKeySaved ? '#2E7D32' : '#fff',
                    opacity: apiKey.trim() ? 1 : 0.5
                  }}
                >
                  {isKeySaved ? '削除' : '保存'}
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                <a href="https://console.anthropic.com/settings/keys" target="_blank" style={{ color: '#5B9BD5' }}>
                  Anthropicコンソール
                </a>から取得
              </p>
            </div>

            {/* モデル選択 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>AIモデル</label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%', height: '32px', padding: '0 10px',
                  border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                  outline: 'none', background: '#fff', cursor: 'pointer'
                }}
              >
                <option value="sonnet">Claude Sonnet 4（高速・低コスト）</option>
                <option value="opus">Claude Opus 4.5（高品質）</option>
                <option value="opus46">Claude Opus 4.6（最高品質）</option>
              </select>
              <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                {selectedModel === 'opus46' ? '⚡ 最新・最高品質の企画案を生成（コスト高め）' : selectedModel === 'opus' ? '⚡ 高品質の企画案を生成（コスト高め）' : '💨 バランスの取れた高速生成'}
              </p>
            </div>

            {/* テーマ */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>企画テーマ</label>
              <input
                type="text"
                value={theme}
                onChange={e => setTheme(e.target.value)}
                placeholder="例：平屋住宅の闇"
                disabled={isLoading}
                style={{
                  width: '100%', height: '32px', padding: '0 10px',
                  border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                  outline: 'none', boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                {['平屋住宅の闇', '断熱等級', '太陽光発電', '住宅ローン'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    disabled={isLoading}
                    style={{
                      padding: '4px 8px', fontSize: '11px', color: '#666',
                      background: '#f5f5f5', border: 'none', borderRadius: '4px', cursor: 'pointer'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 形式 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>台本形式</label>
              <select
                value={scriptStyle}
                onChange={e => setScriptStyle(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%', height: '32px', padding: '0 10px',
                  border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                  outline: 'none', background: '#fff', cursor: 'pointer'
                }}
              >
                <option value="auto">自動（AI判断）</option>
                <option value="TOP3">TOP3形式</option>
                <option value="逆張り">逆張り形式</option>
                <option value="比較">比較形式</option>
              </select>
            </div>

            {/* 計算結果 */}
            {result && (
              <div style={{ background: '#f8f8f8', borderRadius: '4px', padding: '12px' }}>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', margin: '0 0 8px' }}>計算結果</p>
                <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px' }}>
                  生成数: <span style={{ color: '#333' }}>{result.proposals.length}案</span>
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px' }}>
                  平均スコア: <span style={{ color: '#333' }}>{avg}点</span>
                </p>
                <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                  最高スコア: <span style={{ color: '#333' }}>{top}点</span>
                </p>
              </div>
            )}
          </div>

          {/* 詳細設定 */}
          <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: '16px' }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                width: '100%', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left'
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#333' }}>詳細設定</span>
              <span style={{ fontSize: '12px', color: '#999' }}>{showAdvanced ? '▲' : '▼'}</span>
            </button>
            {showAdvanced && (
              <div style={{ padding: '0 20px 16px' }}>
                {/* YouTube APIキー */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                    <span>YouTube APIキー</span>
                    <span style={{
                      padding: '2px 6px',
                      background: '#E3F2FD',
                      color: '#1976D2',
                      fontSize: '10px',
                      borderRadius: '4px',
                      fontWeight: '500'
                    }}>
                      リサーチ精度UP
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type={showYoutubeKey ? 'text' : 'password'}
                        value={youtubeApiKey}
                        onChange={e => { setYoutubeApiKey(e.target.value); setIsYoutubeKeySaved(false); }}
                        placeholder="AIza..."
                        style={{
                          width: '100%', height: '32px', padding: '0 32px 0 10px',
                          border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                          outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                      <button
                        onClick={() => setShowYoutubeKey(!showYoutubeKey)}
                        style={{
                          position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '12px'
                        }}
                      >
                        {showYoutubeKey ? '🙈' : '👁'}
                      </button>
                    </div>
                    <button
                      onClick={isYoutubeKeySaved ? clearYoutubeKey : saveYoutubeKey}
                      disabled={!youtubeApiKey.trim()}
                      style={{
                        height: '32px', padding: '0 12px', borderRadius: '4px',
                        border: 'none', fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                        background: isYoutubeKeySaved ? '#E8F5E9' : '#5B9BD5',
                        color: isYoutubeKeySaved ? '#2E7D32' : '#fff',
                        opacity: youtubeApiKey.trim() ? 1 : 0.5
                      }}
                    >
                      {isYoutubeKeySaved ? '削除' : '保存'}
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style={{ color: '#5B9BD5' }}>
                      Google Cloud Console
                    </a>から取得（任意）
                  </p>
                  {isYoutubeKeySaved && (
                    <p style={{ fontSize: '11px', color: '#2E7D32', marginTop: '4px' }}>
                      ✓ 競合動画の実データを使ってリサーチ精度がアップします
                    </p>
                  )}
                </div>

                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>補足情報</label>
                <textarea
                  value={additionalInfo}
                  onChange={e => setAdditionalInfo(e.target.value)}
                  placeholder="追加指示があれば..."
                  disabled={isLoading}
                  style={{
                    width: '100%', height: '60px', padding: '8px 10px',
                    border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                    outline: 'none', resize: 'none', boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                  {['外壁材', 'ZEH住宅', '床暖房', '工務店vsハウスメーカー'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      style={{
                        padding: '4px 8px', fontSize: '11px', color: '#666',
                        background: '#f5f5f5', border: 'none', borderRadius: '4px', cursor: 'pointer'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 生成ボタン */}
          <button
            onClick={generate}
            disabled={!theme.trim() || !apiKey || isLoading}
            style={{
              width: '100%', height: '44px', borderRadius: '8px',
              background: isLoading ? '#5B9BD5' : (!theme.trim() || !apiKey) ? '#ccc' : '#E57373',
              border: 'none', color: '#fff', fontSize: '14px', fontWeight: 'bold',
              cursor: (!theme.trim() || !apiKey || isLoading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {isLoading ? '🔄 生成中...' : '⚡ 企画案を生成'}
          </button>

          {/* 左カラムのプログレスバー */}
          {isLoading && (
            <div style={{ marginTop: '12px' }}>
              <div style={{
                width: '100%',
                background: '#E0E0E0',
                borderRadius: '6px',
                height: '20px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #5B9BD5 0%, #7BAFD4 100%)',
                  borderRadius: '6px',
                  transition: 'width 0.5s ease-out'
                }} />
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: progress > 50 ? '#fff' : '#333'
                }}>
                  {progress}%
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#666', margin: '6px 0 0', textAlign: 'center' }}>
                {progressMessage}
              </p>
            </div>
          )}
        </div>

        {/* 右カラム */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* KPIカード */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: '1位スコア', value: result ? top : '-', unit: '点', color: '#E57373' },
              { label: '平均スコア', value: result ? avg : '-', unit: '点', color: '#5B9BD5' },
              { label: '生成数', value: result ? result.proposals.length : '-', unit: '案', color: '#6AAF6A' },
              { label: 'NG検出', value: result ? ngTotal : '-', unit: '件', color: ngTotal > 0 ? '#E57373' : '#6AAF6A' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: '8px', padding: '16px',
                textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}>
                <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px' }}>{item.label}</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: item.color, margin: '0' }}>{item.value}</p>
                <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>{item.unit}</p>
              </div>
            ))}
          </div>

          {/* リサーチ結果 */}
          {researchData && result && !isLoading && (
            <div style={{
              background: researchData.error
                ? 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)'
                : 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)',
              borderRadius: '8px', padding: '16px', marginBottom: '16px',
              border: researchData.error ? '1px solid #FFB74D' : '1px solid #90CAF9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{researchData.error ? '⚠️' : '🔍'}</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: researchData.error ? '#E65100' : '#1565C0' }}>
                    {researchData.error ? 'YouTubeリサーチエラー' : 'YouTubeリサーチ結果'}
                  </span>
                </div>
                {!researchData.error && (
                  <button
                    onClick={() => setShowResearchDetail(!showResearchDetail)}
                    style={{
                      padding: '4px 12px', background: '#fff', color: '#1976D2',
                      border: '1px solid #90CAF9', borderRadius: '4px', fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {showResearchDetail ? '閉じる' : '📊 詳細を見る'}
                  </button>
                )}
              </div>
              {researchData.error && (
                <p style={{ fontSize: '12px', color: '#E65100', margin: '0 0 12px' }}>
                  {researchData.error}
                </p>
              )}
              {!researchData.error && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#fff', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px' }}>サンプル数</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976D2', margin: 0 }}>
                        {researchData.videosAnalyzed}本
                      </p>
                    </div>
                    <div style={{ background: '#fff', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px' }}>中央値再生数</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976D2', margin: 0 }}>
                        {researchData.medianViews?.toLocaleString() || researchData.avgViews?.toLocaleString()}回
                      </p>
                    </div>
                    <div style={{ background: '#fff', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px' }}>最高再生数</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976D2', margin: 0 }}>
                        {researchData.maxViews?.toLocaleString()}回
                      </p>
                    </div>
                  </div>

                  {/* 詳細表示（再生回数分布グラフ風） */}
                  {showResearchDetail && (
                    <div style={{ marginTop: '16px', padding: '16px', background: '#fff', borderRadius: '8px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', margin: '0 0 12px' }}>
                        📈 再生回数分布
                      </p>
                      {/* バー部分 */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px', marginBottom: '4px' }}>
                        {[
                          { label: '〜1万', height: 48 },
                          { label: '1〜5万', height: 64 },
                          { label: '5〜10万', height: 40 },
                          { label: '10〜50万', height: 24 },
                          { label: '50万〜', height: 12 },
                        ].map((b, i) => (
                          <div key={i} style={{
                            flex: 1,
                            height: `${b.height}px`,
                            background: i === 1 ? '#1976D2' : '#90CAF9',
                            borderRadius: '4px 4px 0 0'
                          }} />
                        ))}
                      </div>
                      {/* ラベル部分 */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['〜1万', '1〜5万', '5〜10万', '10〜50万', '50万〜'].map((label, i) => (
                          <p key={i} style={{
                            flex: 1,
                            fontSize: '9px',
                            color: '#666',
                            margin: 0,
                            textAlign: 'center'
                          }}>
                            {label}
                          </p>
                        ))}
                      </div>
                      <p style={{ fontSize: '11px', color: '#666', margin: '8px 0 0', textAlign: 'center' }}>
                        中央値 {researchData.medianViews?.toLocaleString()}回 = 上位50%のライン
                      </p>
                    </div>
                  )}

                  {researchData.patterns && researchData.patterns.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '12px', color: '#1565C0', margin: '0 0 6px', fontWeight: '500' }}>
                        発見されたタイトルパターン:
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {researchData.patterns.map((pattern: string, i: number) => (
                          <span key={i} style={{
                            padding: '4px 10px', background: '#fff', borderRadius: '12px',
                            fontSize: '11px', color: '#1976D2'
                          }}>
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* エラー */}
          {error && (
            <div style={{
              background: '#FFEBEE', border: '1px solid #FFCDD2', borderRadius: '8px',
              padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span>⚠️</span>
              <span style={{ flex: 1, fontSize: '13px', color: '#C62828' }}>{error}</span>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
          )}

          {/* ローディング */}
          {isLoading && (
            <div style={{
              background: '#fff', borderRadius: '8px', padding: '48px',
              textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎬</div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: '0 0 8px' }}>
                {progressMessage || '準備中...'}
              </p>

              {/* プログレスバー */}
              <div style={{
                width: '100%',
                maxWidth: '400px',
                margin: '16px auto',
                background: '#E0E0E0',
                borderRadius: '8px',
                height: '24px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #5B9BD5 0%, #7BAFD4 100%)',
                  borderRadius: '8px',
                  transition: 'width 0.5s ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                </div>
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: progress > 50 ? '#fff' : '#333'
                }}>
                  {progress}%
                </span>
              </div>

              <p style={{ fontSize: '12px', color: '#999', margin: '12px 0 0' }}>
                AIが最適な企画案を生成しています
              </p>
            </div>
          )}

          {/* 結果テーブル */}
          {result && result.proposals.length > 0 && !isLoading && (
            <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#333', margin: 0 }}>企画案一覧</h3>
              </div>

              {/* テーブルヘッダー */}
              <div style={{
                display: 'grid', gridTemplateColumns: '60px 1fr 80px 100px 80px',
                padding: '10px 20px', background: '#fafafa', borderBottom: '1px solid #eee',
                fontSize: '12px', color: '#666', fontWeight: '500'
              }}>
                <div>順位</div>
                <div>タイトル</div>
                <div style={{ textAlign: 'center' }}>スコア</div>
                <div style={{ textAlign: 'center' }}>予測再生</div>
                <div style={{ textAlign: 'center' }}>状態</div>
              </div>

              {/* テーブル行 */}
              {result.proposals.map((p) => {
                const ng = checkNGWords(p.script);
                const isOpen = expandedRow === p.rank;
                const readingTime = calculateReadingTime(p.script);
                const isOverTime = readingTime > 60;

                return (
                  <div key={p.rank} style={{ borderBottom: '1px solid #eee' }}>
                    <div
                      onClick={() => setExpandedRow(isOpen ? null : p.rank)}
                      style={{
                        display: 'grid', gridTemplateColumns: '60px 1fr 80px 100px 80px',
                        padding: '14px 20px', alignItems: 'center', cursor: 'pointer',
                        background: isOpen ? '#fafafa' : '#fff'
                      }}
                    >
                      <div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '24px', height: '24px', borderRadius: '50%', fontSize: '12px', fontWeight: 'bold',
                          background: p.rank === 1 ? '#FFEBEE' : p.rank === 2 ? '#E3F2FD' : '#f5f5f5',
                          color: p.rank === 1 ? '#E57373' : p.rank === 2 ? '#5B9BD5' : '#666'
                        }}>
                          {p.rank}
                        </span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: '500', color: '#333', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </p>
                        <p style={{ fontSize: '11px', color: '#999', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.concept}
                        </p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: '15px', fontWeight: 'bold',
                          color: p.viralScore >= 80 ? '#6AAF6A' : p.viralScore >= 65 ? '#5B9BD5' : '#E57373'
                        }}>
                          {p.viralScore}
                        </span>
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>
                        {p.estimatedViews}
                      </div>
                      <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '500',
                          background: ng.length > 0 ? '#FFF3E0' : '#E8F5E9',
                          color: ng.length > 0 ? '#E65100' : '#2E7D32'
                        }}>
                          {ng.length > 0 ? 'NG' : 'OK'}
                        </span>
                        <span style={{ fontSize: '10px', color: '#999' }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ padding: '16px 20px', background: '#fafafa' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <p style={{ fontSize: '12px', color: '#666', margin: '0 0 6px' }}>⚡ 冒頭フック</p>
                            <p style={{
                              fontSize: '13px', color: '#333', margin: 0, padding: '10px 12px',
                              background: '#fff', borderLeft: '3px solid #FF9800', borderRadius: '0 4px 4px 0'
                            }}>
                              {p.hook}
                            </p>

                            <p style={{ fontSize: '12px', color: '#666', margin: '16px 0 6px' }}>順位の根拠</p>
                            <p style={{ fontSize: '13px', color: '#333', margin: 0, lineHeight: 1.6 }}>{p.reasoning}</p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                              <span style={{ padding: '4px 10px', background: '#fff', borderRadius: '4px', fontSize: '11px', color: '#666' }}>
                                狙い: {p.targetEmotion}
                              </span>
                              <span style={{
                                padding: '4px 10px', background: isOverTime ? '#FFF3E0' : '#fff',
                                borderRadius: '4px', fontSize: '11px',
                                color: isOverTime ? '#E65100' : '#666'
                              }}>
                                {p.script.length}文字 / 約{formatSeconds(readingTime)}
                                {isOverTime && ' ⚠️'}
                              </span>
                            </div>

                            {p.suggestedKeywords && p.suggestedKeywords.length > 0 && (
                              <div style={{ marginTop: '12px', padding: '10px 12px', background: '#E8F5E9', borderRadius: '4px' }}>
                                <p style={{ fontSize: '12px', fontWeight: '500', color: '#2E7D32', margin: '0 0 6px' }}>
                                  🔍 おすすめ検索キーワード
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {p.suggestedKeywords.map((kw, i) => (
                                    <span key={i} style={{
                                      padding: '4px 10px', background: '#fff', borderRadius: '12px',
                                      fontSize: '11px', color: '#388E3C', border: '1px solid #A5D6A7'
                                    }}>
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {ng.length > 0 && (
                              <div style={{ marginTop: '12px', padding: '10px 12px', background: '#FFF8E1', borderRadius: '4px' }}>
                                <p style={{ fontSize: '12px', fontWeight: '500', color: '#F57C00', margin: '0 0 6px' }}>⚠ NGワード検出</p>
                                {ng.map((n, i) => (
                                  <p key={i} style={{ fontSize: '12px', color: '#E65100', margin: 0 }}>
                                    「{n.word}」→ {n.suggestion}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>台本</p>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setRewriteTarget(p); setShowRewriteModal(true); }}
                                  style={{
                                    padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
                                    background: '#fff', border: '1px solid #ddd', color: '#666'
                                  }}
                                >
                                  ✏️ リライト
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setExportTarget(p); setShowExportModal(true); }}
                                  style={{
                                    padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
                                    background: '#fff', border: '1px solid #ddd', color: '#666'
                                  }}
                                >
                                  📤 出力
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copy(p.script, p.rank); }}
                                  style={{
                                    padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
                                    background: copiedId === p.rank ? '#E8F5E9' : '#fff',
                                    border: copiedId === p.rank ? 'none' : '1px solid #ddd',
                                    color: copiedId === p.rank ? '#2E7D32' : '#666'
                                  }}
                                >
                                  {copiedId === p.rank ? '✓ コピー済' : '📋 コピー'}
                                </button>
                              </div>
                            </div>
                            <div style={{
                              background: '#fff', border: '1px solid #eee', borderRadius: '4px',
                              padding: '12px', maxHeight: '200px', overflowY: 'auto'
                            }}>
                              <pre style={{
                                margin: 0, fontSize: '13px', color: '#333',
                                whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.7
                              }}>
                                {p.script}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 初期状態 */}
          {!result && !isLoading && (
            <div style={{
              background: '#fff', borderRadius: '8px', padding: '48px',
              textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🎬</div>
              <p style={{ fontSize: '15px', fontWeight: '500', color: '#333', margin: '0 0 8px' }}>
                企画テーマを入力してください
              </p>
              <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
                左パネルでテーマを入力し「企画案を生成」をクリック
              </p>
            </div>
          )}
        </div>
      </main>

      {/* エクスポートモーダル */}
      {showExportModal && exportTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowExportModal(false)}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', margin: '0 0 16px' }}>
              📤 エクスポート形式を選択
            </h3>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px', wordBreak: 'break-all' }}>
              「{exportTarget.title}」
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => exportScript('gdocs')}
                style={{
                  padding: '12px 16px', background: '#4285F4', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                📄 Googleドキュメント形式（メタ情報付き）
              </button>
              <button
                onClick={() => exportScript('notion')}
                style={{
                  padding: '12px 16px', background: '#000', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                📝 Notion形式（マークダウン）
              </button>
              <button
                onClick={() => exportScript('plain')}
                style={{
                  padding: '12px 16px', background: '#f5f5f5', color: '#333',
                  border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                📋 プレーンテキスト（台本のみ）
              </button>
            </div>
            <button
              onClick={() => setShowExportModal(false)}
              style={{
                width: '100%', marginTop: '12px', padding: '10px',
                background: 'none', border: 'none', color: '#999', cursor: 'pointer'
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* リライトモーダル */}
      {showRewriteModal && rewriteTarget && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowRewriteModal(false)}>
          <div style={{
            background: '#fff', borderRadius: '12px', padding: '24px', width: '400px', maxWidth: '90%'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', margin: '0 0 16px' }}>
              ✏️ 台本をリライト
            </h3>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px' }}>
              調整スタイルを選択してください
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {[
                { value: 'more_hook', label: '🔥 もっとフックを強く', desc: '冒頭のインパクトを強化' },
                { value: 'more_mild', label: '😌 もっとマイルドに', desc: '煽りを抑えて信頼感アップ' },
                { value: 'shorter', label: '✂️ もっと短く', desc: '50秒以内に収まるよう調整' },
                { value: 'more_specific', label: '🔢 もっと具体的に', desc: '数字や事例を追加' },
              ].map(style => (
                <button
                  key={style.value}
                  onClick={() => setRewriteStyle(style.value)}
                  style={{
                    padding: '12px 16px', textAlign: 'left',
                    background: rewriteStyle === style.value ? '#E3F2FD' : '#f5f5f5',
                    border: rewriteStyle === style.value ? '2px solid #1976D2' : '2px solid transparent',
                    borderRadius: '8px', cursor: 'pointer'
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#333', margin: 0 }}>
                    {style.label}
                  </p>
                  <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>
                    {style.desc}
                  </p>
                </button>
              ))}
            </div>
            <button
              onClick={rewriteScript}
              disabled={!rewriteStyle || isRewriting}
              style={{
                width: '100%', padding: '12px',
                background: !rewriteStyle ? '#ccc' : '#E57373', color: '#fff',
                border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold',
                cursor: !rewriteStyle ? 'not-allowed' : 'pointer'
              }}
            >
              {isRewriting ? '🔄 リライト中...' : 'リライトを実行'}
            </button>
            <button
              onClick={() => { setShowRewriteModal(false); setRewriteStyle(''); }}
              style={{
                width: '100%', marginTop: '8px', padding: '10px',
                background: 'none', border: 'none', color: '#999', cursor: 'pointer'
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
