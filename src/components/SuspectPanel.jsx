import React, { useMemo } from 'react';
import { getPersonKey } from '../api/jotform';

const CONFIDENCE_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
};

function rankSuspects(tips) {
  const map = new Map(); // normalizedName → { displayName, tipCount, score, tips[] }

  tips.forEach((tip) => {
    if (!tip.suspectName || !tip.suspectName.trim()) return;
    const key = getPersonKey(tip.suspectName);
    if (!map.has(key)) {
      map.set(key, { displayName: tip.suspectName.trim(), tipCount: 0, score: 0, tips: [] });
    } else if (tip.suspectName.trim().length > map.get(key).displayName.length) {
      map.get(key).displayName = tip.suspectName.trim();
    }
    const entry = map.get(key);
    const weight = CONFIDENCE_WEIGHT[tip.confidence?.toLowerCase()] || 1;
    entry.tipCount += 1;
    entry.score += weight;
    entry.tips.push(tip);
  });

  return Array.from(map.values()).sort((a, b) => b.score - a.score || b.tipCount - a.tipCount);
}

function ScoreBar({ score, max }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div className="score-bar-track">
      <div className="score-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function SuspectCard({ suspect, rank, maxScore }) {
  const highTips = suspect.tips.filter((t) => t.confidence?.toLowerCase() === 'high').length;
  const medTips = suspect.tips.filter((t) => t.confidence?.toLowerCase() === 'medium').length;
  const lowTips = suspect.tips.filter((t) => t.confidence?.toLowerCase() === 'low').length;

  return (
    <div className={`suspect-card ${rank === 1 ? 'top-suspect' : ''}`}>
      <div className="suspect-rank">#{rank}</div>
      <div className="suspect-info">
        <div className="suspect-name">
          {rank === 1 && <span className="hot-tag">● PRIME SUSPECT</span>}
          {suspect.displayName}
        </div>
        <ScoreBar score={suspect.score} max={maxScore} />
        <div className="suspect-stats">
          <span className="stat-total">{suspect.tipCount} tip{suspect.tipCount !== 1 ? 's' : ''}</span>
          <span className="stat-score">score: {suspect.score}</span>
          {highTips > 0 && <span className="conf-high">{highTips} HIGH</span>}
          {medTips > 0 && <span className="conf-med">{medTips} MED</span>}
          {lowTips > 0 && <span className="conf-low">{lowTips} LOW</span>}
        </div>
        {suspect.tips[0]?.tip && (
          <div className="suspect-latest">
            Latest: "{suspect.tips[suspect.tips.length - 1]?.tip}"
          </div>
        )}
      </div>
    </div>
  );
}

export function SuspectPanel({ data }) {
  const suspects = useMemo(() => rankSuspects(data.tips), [data.tips]);
  const maxScore = suspects[0]?.score || 1;

  return (
    <div className="suspect-panel">
      <div className="panel-title">
        SUSPECT RANKINGS
        <span className="count"> ({suspects.length} named)</span>
      </div>
      {suspects.length === 0 && (
        <div className="empty-state">No anonymous tips received yet.</div>
      )}
      {suspects.map((suspect, i) => (
        <SuspectCard
          key={suspect.displayName}
          suspect={suspect}
          rank={i + 1}
          maxScore={maxScore}
        />
      ))}
    </div>
  );
}
