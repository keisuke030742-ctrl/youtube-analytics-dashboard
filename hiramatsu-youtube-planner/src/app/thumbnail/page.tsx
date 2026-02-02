'use client';

import { useState, useEffect } from 'react';
import { parseThumbnailResponse, ParsedThumbnailResponse, ThumbnailProposal } from '@/lib/prompts/thumbnail-prompt';

const API_KEY_STORAGE_KEY = 'hiramatsu-shorts-api-key';
const YOUTUBE_API_KEY_STORAGE_KEY = 'hiramatsu-youtube-api-key';
const HISTORY_STORAGE_KEY = 'hiramatsu-thumbnail-history';

interface HistoryItem {
  id: string;
  transcript: string;
  createdAt: string;
  proposals: ThumbnailProposal[];
  analysis: any;
  isFavorite?: boolean;
}

export default function ThumbnailPage() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ParsedThumbnailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('sonnet');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [isYoutubeKeySaved, setIsYoutubeKeySaved] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [researchData, setResearchData] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (saved) { setApiKey(saved); setIsKeySaved(true); }
    const savedYoutube = localStorage.getItem(YOUTUBE_API_KEY_STORAGE_KEY);
    if (savedYoutube) { setYoutubeApiKey(savedYoutube); setIsYoutubeKeySaved(true); }
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('History parse error:', e);
      }
    }
  }, []);

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

  const saveToHistory = (proposals: ThumbnailProposal[], transcriptText: string, analysis: any) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      transcript: transcriptText.substring(0, 100) + '...',
      createdAt: new Date().toISOString(),
      proposals,
      analysis,
      isFavorite: false,
    };
    const updated = [newItem, ...history].slice(0, 30);
    setHistory(updated);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  };

  const toggleFavorite = (id: string) => {
    const updated = history.map(h =>
      h.id === id ? { ...h, isFavorite: !h.isFavorite } : h
    );
    setHistory(updated);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  };

  const deleteHistory = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  };

  const restoreHistory = (item: HistoryItem) => {
    setResult({ analysis: item.analysis, proposals: item.proposals, rawText: '' });
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

  
  const getProgressSteps = () => {
    const baseSteps = [
      { percent: 5, message: '文字起こしを分析中...' },
    ];
    if (youtubeApiKey.trim() && searchKeyword.trim()) {
      baseSteps.push(
        { percent: 12, message: 'YouTube競合動画を検索中...' },
        { percent: 22, message: '再生回数データを取得中...' },
        { percent: 32, message: 'タイトルパターンを分析中...' }
      );
    }
    baseSteps.push(
      { percent: 40, message: '動画の要点を抽出中...' },
      { percent: 50, message: '「つまりどういうこと？」1回目...' },
      { percent: 60, message: '「つまりどういうこと？」2回目...' },
      { percent: 70, message: '「つまりどういうこと？」3回目...' },
      { percent: 80, message: 'サムネ文言を生成中...' },
      { percent: 90, message: 'タイトル案を最適化中...' },
      { percent: 96, message: 'CTR評価中...' }
    );
    return baseSteps;
  };

  const generate = async () => {
    if (!transcript.trim() || !apiKey) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setResearchData(null);
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
    }, 2000);

    try {
      const res = await fetch('/api/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          transcript,
          additionalInfo,
          model: selectedModel,
          youtubeApiKey: youtubeApiKey.trim() || undefined,
          searchKeyword: searchKeyword.trim() || undefined,
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
      setProgressMessage('完了!');

      await new Promise(resolve => setTimeout(resolve, 500));

      if (!res.ok) throw new Error(data.error || '生成失敗');
      if (!data.data?.rawMarkdown) throw new Error('レスポンスにデータがありません');

      const parsed = parseThumbnailResponse(data.data.rawMarkdown);

      if (parsed.proposals.length === 0) {
        throw new Error('サムネ案のパースに失敗しました');
      }

      setResult(parsed);
      setExpandedRow(1);

      if (data.data?.research) {
        setResearchData(data.data.research);
      }

      saveToHistory(parsed.proposals, transcript, parsed.analysis);

    } catch (e) {
      clearInterval(progressInterval);
      setError(e instanceof Error ? e.message : 'エラー');
    } finally {
      setIsLoading(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const copy = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCTRColor = (ctr: string) => {
    switch (ctr) {
      case 'high': return '#2E7D32';
      case 'medium': return '#F57C00';
      case 'low': return '#C62828';
      default: return '#666';
    }
  };

  const getCTRLabel = (ctr: string) => {
    switch (ctr) {
      case 'high': return 'CTR高';
      case 'medium': return 'CTR中';
      case 'low': return 'CTR低';
      default: return ctr;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'negative': return 'ネガティブ';
      case 'positive': return 'ポジティブ';
      case 'comparison': return '比較';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'negative': return '#E57373';
      case 'positive': return '#81C784';
      case 'comparison': return '#64B5F6';
      default: return '#999';
    }
  };

  const highCTRCount = result?.proposals.filter(p => p.expectedCTR === 'high').length || 0;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #FFF3E0 0%, #FFE0B2 100%)' }}>
      {/* ヘッダー */}
      <header style={{ padding: '32px 0 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px'
          }}>
            🖼️
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0 }}>
            サムネタイトル案作成AI
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0' }}>
          動画の文字起こしから最適なサムネ・タイトルを自動生成
        </p>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 16px', background: '#E57373', color: '#fff',
            fontSize: '13px', fontWeight: '500', borderRadius: '20px'
          }}>
            🏠 注文住宅向け
          </span>
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                padding: '6px 16px', background: showHistory ? '#FF9800' : '#fff',
                color: showHistory ? '#fff' : '#FF9800',
                fontSize: '13px', fontWeight: '500', borderRadius: '20px',
                border: '1px solid #FF9800', cursor: 'pointer',
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
        <div style={{ maxWidth: '1100px', margin: '0 auto 16px', padding: '0 24px' }}>
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
                ×
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
                        {item.transcript}
                      </p>
                      <p style={{ fontSize: '11px', color: '#999', margin: '2px 0 0' }}>
                        {new Date(item.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        ・{item.proposals.length}案
                      </p>
                    </div>
                    <button
                      onClick={() => restoreHistory(item)}
                      style={{
                        padding: '4px 12px', background: '#FF9800', color: '#fff',
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
        <div style={{ width: '360px', flexShrink: 0 }}>
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
                    background: isKeySaved ? '#E8F5E9' : '#FF9800',
                    color: isKeySaved ? '#2E7D32' : '#fff',
                    opacity: apiKey.trim() ? 1 : 0.5
                  }}
                >
                  {isKeySaved ? '削除' : '保存'}
                </button>
              </div>
              <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                <a href="https://console.anthropic.com/settings/keys" target="_blank" style={{ color: '#FF9800' }}>
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
                <option value="opus">Claude Opus 4.5（最高品質）</option>
              </select>
            </div>

            {/* 文字起こし入力 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                動画の文字起こし/内容
              </label>
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                placeholder="動画の文字起こしをペーストしてください...

例：「今日は断熱材の話をします。断熱材にはグラスウール、ロックウールなど色々ありますが、実は選び方を間違えると光熱費が...」"
                disabled={isLoading}
                style={{
                  width: '100%', height: '200px', padding: '10px',
                  border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                  outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  lineHeight: '1.6'
                }}
              />
              <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                {transcript.length}文字
              </p>
            </div>
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
                      競合リサーチ
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
                        background: isYoutubeKeySaved ? '#E8F5E9' : '#1976D2',
                        color: isYoutubeKeySaved ? '#2E7D32' : '#fff',
                        opacity: youtubeApiKey.trim() ? 1 : 0.5
                      }}
                    >
                      {isYoutubeKeySaved ? '削除' : '保存'}
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style={{ color: '#1976D2' }}>
                      Google Cloud Console
                    </a>から取得（任意）
                  </p>
                </div>

                {/* リサーチキーワード */}
                {isYoutubeKeySaved && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      リサーチキーワード
                    </label>
                    <input
                      type="text"
                      value={searchKeyword}
                      onChange={e => setSearchKeyword(e.target.value)}
                      placeholder="例：断熱材 選び方"
                      disabled={isLoading}
                      style={{
                        width: '100%', height: '32px', padding: '0 10px',
                        border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                        outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                    <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      競合動画を検索するキーワードを入力
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {['断熱材', '住宅ローン', '平屋', '太陽光発電', 'ZEH'].map(kw => (
                        <button
                          key={kw}
                          onClick={() => setSearchKeyword(kw)}
                          disabled={isLoading}
                          style={{
                            padding: '4px 8px', fontSize: '11px', color: '#1976D2',
                            background: '#E3F2FD', border: 'none', borderRadius: '4px', cursor: 'pointer'
                          }}
                        >
                          {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>補足情報</label>
                <textarea
                  value={additionalInfo}
                  onChange={e => setAdditionalInfo(e.target.value)}
                  placeholder="追加指示があれば...

例：「ネガティブ訴求を多めに」「数字を強調したい」"
                  disabled={isLoading}
                  style={{
                    width: '100%', height: '80px', padding: '8px 10px',
                    border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px',
                    outline: 'none', resize: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
          </div>

          {/* 生成ボタン */}
          <button
            onClick={generate}
            disabled={!transcript.trim() || !apiKey || isLoading}
            style={{
              width: '100%', height: '48px', borderRadius: '8px',
              background: isLoading ? '#FFB74D' : (!transcript.trim() || !apiKey) ? '#ccc' : '#FF9800',
              border: 'none', color: '#fff', fontSize: '15px', fontWeight: 'bold',
              cursor: (!transcript.trim() || !apiKey || isLoading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {isLoading ? '🔄 生成中...' : '🖼️ サムネ・タイトル案を生成'}
          </button>

          {/* プログレスバー */}
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
                  background: 'linear-gradient(90deg, #FF9800 0%, #FFB74D 100%)',
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

          {/* 生成方法の説明 */}
          <div style={{ background: '#FFF8E1', borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#F57C00', margin: '0 0 8px' }}>
              💡 生成方法
            </h3>
            <p style={{ fontSize: '12px', color: '#666', margin: 0, lineHeight: 1.6 }}>
              1. 動画内容を分析<br />
              2. 「つまりどういうこと？」を3回繰り返し本質を抽出<br />
              3. 衝撃ワード・具体性・ベネフィットを含む文言を生成
            </p>
          </div>
        </div>

        {/* 右カラム */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* KPIカード */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'CTR高の案', value: result ? highCTRCount : '-', unit: '件', color: '#2E7D32' },
              { label: '生成数', value: result ? result.proposals.length : '-', unit: '案', color: '#FF9800' },
              { label: '訴求タイプ', value: result ? 'ネガ/ポジ混合' : '-', unit: '', color: '#5B9BD5' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: '8px', padding: '16px',
                textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}>
                <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px' }}>{item.label}</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: item.color, margin: '0' }}>{item.value}</p>
                <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>{item.unit}</p>
              </div>
            ))}
          </div>

          {/* YouTubeリサーチ結果 */}
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
                    {researchData.error ? 'YouTubeリサーチエラー' : `YouTubeリサーチ結果「${researchData.keyword}」`}
                  </span>
                </div>
              </div>
              {researchData.error ? (
                <p style={{ fontSize: '12px', color: '#E65100', margin: 0 }}>
                  {researchData.error}
                </p>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: '#fff', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px' }}>サンプル数</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976D2', margin: 0 }}>
                        {researchData.videosAnalyzed}本
                      </p>
                    </div>
                    <div style={{ background: '#fff', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px' }}>中央値再生数</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976D2', margin: 0 }}>
                        {researchData.medianViews?.toLocaleString()}回
                      </p>
                    </div>
                    <div style={{ background: '#fff', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px' }}>最高再生数</p>
                      <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976D2', margin: 0 }}>
                        {researchData.maxViews?.toLocaleString()}回
                      </p>
                    </div>
                  </div>
                  {researchData.topVideos && researchData.topVideos.length > 0 && (
                    <div style={{ background: '#fff', borderRadius: '6px', padding: '12px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#1565C0', margin: '0 0 8px' }}>
                        上位動画タイトル
                      </p>
                      {researchData.topVideos.slice(0, 3).map((v: any, i: number) => (
                        <p key={i} style={{ fontSize: '12px', color: '#333', margin: '4px 0', lineHeight: 1.4 }}>
                          {i + 1}. {v.title} <span style={{ color: '#999' }}>({v.viewCount?.toLocaleString()}回)</span>
                        </p>
                      ))}
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

          {/* 分析結果 */}
          {result && result.analysis && !isLoading && (
            <div style={{
              background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
              borderRadius: '8px', padding: '16px', marginBottom: '16px',
              border: '1px solid #A5D6A7'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#2E7D32', margin: '0 0 12px' }}>
                🔍 「つまりどういうこと？」分析結果
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: '#fff', borderRadius: '6px', padding: '10px 12px' }}>
                  <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px' }}>1回目</p>
                  <p style={{ fontSize: '13px', color: '#333', margin: 0 }}>{result.analysis.tumaridouiukoto1}</p>
                </div>
                <div style={{ background: '#fff', borderRadius: '6px', padding: '10px 12px' }}>
                  <p style={{ fontSize: '11px', color: '#666', margin: '0 0 4px' }}>2回目</p>
                  <p style={{ fontSize: '13px', color: '#333', margin: 0 }}>{result.analysis.tumaridouiukoto2}</p>
                </div>
                <div style={{ background: '#fff', borderRadius: '6px', padding: '10px 12px', border: '2px solid #4CAF50' }}>
                  <p style={{ fontSize: '11px', color: '#4CAF50', margin: '0 0 4px', fontWeight: 'bold' }}>3回目（本質）</p>
                  <p style={{ fontSize: '14px', color: '#2E7D32', margin: 0, fontWeight: 'bold' }}>{result.analysis.tumaridouiukoto3}</p>
                </div>
              </div>
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
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
          )}

          {/* ローディング */}
          {isLoading && (
            <div style={{
              background: '#fff', borderRadius: '8px', padding: '48px',
              textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🖼️</div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#333', margin: '0 0 8px' }}>
                {progressMessage || '準備中...'}
              </p>
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
                  background: 'linear-gradient(90deg, #FF9800 0%, #FFB74D 100%)',
                  borderRadius: '8px',
                  transition: 'width 0.5s ease-out'
                }} />
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
                AIが最適なサムネ・タイトルを分析しています
              </p>
            </div>
          )}

          {/* 結果テーブル */}
          {result && result.proposals.length > 0 && !isLoading && (
            <div style={{ background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#333', margin: 0 }}>サムネ・タイトル案一覧</h3>
              </div>

              {/* テーブルヘッダー */}
              <div style={{
                display: 'grid', gridTemplateColumns: '50px 1fr 100px 80px',
                padding: '10px 20px', background: '#fafafa', borderBottom: '1px solid #eee',
                fontSize: '12px', color: '#666', fontWeight: '500'
              }}>
                <div>#</div>
                <div>サムネ文言 / タイトル</div>
                <div style={{ textAlign: 'center' }}>訴求タイプ</div>
                <div style={{ textAlign: 'center' }}>CTR予測</div>
              </div>

              {/* テーブル行 */}
              {result.proposals.map((p) => {
                const isOpen = expandedRow === p.rank;
                return (
                  <div key={p.rank} style={{ borderBottom: '1px solid #eee' }}>
                    <div
                      onClick={() => setExpandedRow(isOpen ? null : p.rank)}
                      style={{
                        display: 'grid', gridTemplateColumns: '50px 1fr 100px 80px',
                        padding: '14px 20px', alignItems: 'center', cursor: 'pointer',
                        background: isOpen ? '#fafafa' : '#fff'
                      }}
                    >
                      <div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '24px', height: '24px', borderRadius: '50%', fontSize: '12px', fontWeight: 'bold',
                          background: p.rank === 1 ? '#FFF3E0' : p.rank === 2 ? '#E3F2FD' : '#f5f5f5',
                          color: p.rank === 1 ? '#FF9800' : p.rank === 2 ? '#5B9BD5' : '#666'
                        }}>
                          {p.rank}
                        </span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '15px', fontWeight: '700', color: '#333', margin: 0 }}>
                          「{p.thumbnailText}」
                        </p>
                        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '500',
                          background: `${getTypeColor(p.type)}20`,
                          color: getTypeColor(p.type)
                        }}>
                          {getTypeLabel(p.type)}
                        </span>
                      </div>
                      <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '500',
                          background: p.expectedCTR === 'high' ? '#E8F5E9' : p.expectedCTR === 'medium' ? '#FFF3E0' : '#FFEBEE',
                          color: getCTRColor(p.expectedCTR)
                        }}>
                          {getCTRLabel(p.expectedCTR)}
                        </span>
                        <span style={{ fontSize: '10px', color: '#999' }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ padding: '16px 20px', background: '#fafafa' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            {/* 3要素チェック */}
                            <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px' }}>サムネ成功要素</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #E57373' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#E57373' }}>衝撃ワード</span>
                                <span style={{ fontSize: '13px', color: '#333' }}>{p.shockWord}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #5B9BD5' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#5B9BD5' }}>具体性</span>
                                <span style={{ fontSize: '13px', color: '#333' }}>{p.specificity}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #81C784' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#81C784' }}>ベネフィット</span>
                                <span style={{ fontSize: '13px', color: '#333' }}>{p.benefit}</span>
                              </div>
                            </div>

                            <p style={{ fontSize: '12px', color: '#666', margin: '0 0 6px' }}>順位の根拠</p>
                            <p style={{ fontSize: '13px', color: '#333', margin: 0, lineHeight: 1.6 }}>{p.reasoning}</p>
                          </div>

                          <div>
                            <p style={{ fontSize: '12px', color: '#666', margin: '0 0 6px' }}>🖼️ サムネ画像おすすめ構図</p>
                            <div style={{
                              background: '#fff', border: '1px solid #eee', borderRadius: '4px',
                              padding: '12px', marginBottom: '16px'
                            }}>
                              <p style={{ fontSize: '13px', color: '#333', margin: 0, lineHeight: 1.6 }}>
                                {p.imageDescription}
                              </p>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); copy(p.thumbnailText, p.rank); }}
                                style={{
                                  flex: 1, padding: '10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                                  background: copiedId === p.rank ? '#E8F5E9' : '#FF9800',
                                  border: 'none',
                                  color: copiedId === p.rank ? '#2E7D32' : '#fff',
                                  fontWeight: 'bold'
                                }}
                              >
                                {copiedId === p.rank ? '✓ コピー済' : '📋 サムネ文言コピー'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); copy(p.title, p.rank + 100); }}
                                style={{
                                  flex: 1, padding: '10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                                  background: copiedId === p.rank + 100 ? '#E8F5E9' : '#fff',
                                  border: '1px solid #ddd',
                                  color: copiedId === p.rank + 100 ? '#2E7D32' : '#666',
                                  fontWeight: '500'
                                }}
                              >
                                {copiedId === p.rank + 100 ? '✓ コピー済' : '📋 タイトルコピー'}
                              </button>
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
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🖼️</div>
              <p style={{ fontSize: '15px', fontWeight: '500', color: '#333', margin: '0 0 8px' }}>
                動画の文字起こしを入力してください
              </p>
              <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>
                左パネルで文字起こしを入力し「サムネ・タイトル案を生成」をクリック
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
