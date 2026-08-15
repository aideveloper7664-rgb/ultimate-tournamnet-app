import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { ref, get, db } from '../firebase';
import { MatchHistoryItem } from '../types';
import { formatFullDateTime } from '../utils/helpers';

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, userProfile } = useAuth();
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'graphs' | 'matches'>('overview');
  const [graphMetric, setGraphMetric] = useState<'kills' | 'earnings'>('kills');
  const [copiedNotification, setCopiedNotification] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser) return;
      setLoading(true);

      try {
        const historyRef = ref(db, `users/${currentUser.uid}/matchHistory`);
        const snapshot = await get(historyRef);

        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: MatchHistoryItem[] = Object.values(val);
          list.sort((a, b) => (a.date || 0) - (b.date || 0)); // Chronological for graph
          setHistory(list);
        } else {
          setHistory([]);
        }
      } catch (e) {
        console.error("Error loading match history for stats:", e);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && currentUser) {
      fetchHistory();
    }
  }, [isOpen, currentUser]);

  // Aggregate stats
  const totalMatches = Math.max(userProfile?.totalMatches || 0, history.length);
  
  // Calculate kills from match history or fallback to profile
  const calculatedKills = useMemo(() => {
    if (history.length > 0) {
      return history.reduce((sum, item) => sum + (Number(item.kills) || 0), 0);
    }
    return userProfile?.totalKills || 0;
  }, [history, userProfile]);

  const wonMatches = useMemo(() => {
    if (userProfile?.wonMatches !== undefined && userProfile.wonMatches > 0) {
      return userProfile.wonMatches;
    }
    // Check history items where rank is 1 or '1'
    return history.filter(item => String(item.rank) === '1' || item.rank === 1).length;
  }, [history, userProfile]);

  const lostMatches = Math.max(0, totalMatches - wonMatches);
  const totalEarnings = userProfile?.totalEarnings || history.reduce((sum, item) => sum + (Number(item.earnings) || 0), 0);
  const winRate = totalMatches > 0 ? ((wonMatches / totalMatches) * 100).toFixed(1) : '0';
  const avgKills = totalMatches > 0 ? (calculatedKills / totalMatches).toFixed(1) : '0';
  
  const highestKills = useMemo(() => {
    if (history.length === 0) return calculatedKills > 0 ? calculatedKills : 0;
    return Math.max(...history.map(item => Number(item.kills) || 0), 0);
  }, [history, calculatedKills]);

  const highestEarning = useMemo(() => {
    if (history.length === 0) return totalEarnings > 0 ? totalEarnings : 0;
    return Math.max(...history.map(item => Number(item.earnings) || 0), 0);
  }, [history, totalEarnings]);

  // Player Tier Calculation
  const playerTier = useMemo(() => {
    if (totalMatches >= 50 && Number(winRate) >= 40) return { name: 'CHAMPION ELITE', color: '#F59E0B', icon: 'bi-gem', bg: 'rgba(245, 158, 11, 0.2)' };
    if (totalMatches >= 25 || calculatedKills >= 50) return { name: 'DIAMOND PRO', color: '#06B6D4', icon: 'bi-shield-shaded', bg: 'rgba(6, 182, 212, 0.2)' };
    if (totalMatches >= 10 || calculatedKills >= 20) return { name: 'GOLD MASTER', color: '#EAB308', icon: 'bi-award-fill', bg: 'rgba(234, 179, 8, 0.2)' };
    if (totalMatches >= 3 || calculatedKills >= 5) return { name: 'SILVER STRIKER', color: '#94A3B8', icon: 'bi-trophy', bg: 'rgba(148, 163, 184, 0.2)' };
    return { name: 'ROOKIE WARRIOR', color: '#10B981', icon: 'bi-controller', bg: 'rgba(16, 185, 129, 0.2)' };
  }, [totalMatches, winRate, calculatedKills]);

  // Chart data points
  const chartData = useMemo(() => {
    if (history.length > 0) {
      return history.map((item, idx) => ({
        label: `M${idx + 1}`,
        name: item.tournamentName || `Match ${idx + 1}`,
        kills: Number(item.kills) || 0,
        earnings: Number(item.earnings) || 0,
        rank: item.rank || '-',
        date: item.date
      }));
    }
    // If no history exists yet, generate sample demonstration points based on user's current summary or initial curve
    if (totalMatches > 0) {
      return Array.from({ length: Math.min(totalMatches, 6) }).map((_, i) => ({
        label: `M${i + 1}`,
        name: `Match ${i + 1}`,
        kills: Math.round(Number(avgKills)),
        earnings: Math.round(totalEarnings / totalMatches),
        rank: i === 0 && wonMatches > 0 ? 1 : i + 2,
        date: Date.now() - (totalMatches - i) * 86400000
      }));
    }
    return [];
  }, [history, totalMatches, avgKills, totalEarnings, wonMatches]);

  const handleShareStats = () => {
    const text = `🎮 *My Esports Player Stats* 🎮\n👤 Player: ${userProfile?.displayName || 'Gamer'}\n🏆 Matches Played: ${totalMatches}\n🥇 Victories (Wins): ${wonMatches}\n🎯 Total Kills: ${calculatedKills}\n💥 Avg Kills/Match: ${avgKills}\n⚡ Win Rate: ${winRate}%\n💰 Total Winnings: ₹${totalEarnings.toFixed(0)}\n🎖️ Tier: ${playerTier.name}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Esports Gaming Stats',
        text: text,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(5, 7, 20, 0.85)', backdropFilter: 'blur(8px)', zIndex: 1060 }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: '540px', width: '95%' }}>
        <div className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden" style={{ background: '#0F1123', color: '#F8FAFC', border: '1px solid rgba(250, 204, 21, 0.25)' }}>
          
          {/* Header */}
          <div className="modal-header border-bottom border-secondary border-opacity-25 px-4 py-3 d-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg, #181B38 0%, #0F1123 100%)' }}>
            <div className="d-flex align-items-center gap-2.5">
              <div className="rounded-circle p-2 d-flex align-items-center justify-content-center shadow-sm" style={{ background: playerTier.bg, color: playerTier.color, border: `1px solid ${playerTier.color}40`, width: '38px', height: '38px' }}>
                <i className={`bi ${playerTier.icon} fs-5`}></i>
              </div>
              <div>
                <h5 className="modal-title fw-bold text-white mb-0 d-flex align-items-center gap-2" style={{ fontSize: '1.05rem' }}>
                  Player Performance & Stats
                </h5>
                <span className="badge px-2 py-0.5 rounded-pill fw-bold" style={{ background: playerTier.bg, color: playerTier.color, fontSize: '0.65rem', border: `1px solid ${playerTier.color}60` }}>
                  {playerTier.name}
                </span>
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white shadow-none" onClick={onClose}></button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-3 pt-2.5 pb-2 d-flex gap-1.5 border-bottom border-secondary border-opacity-25" style={{ background: 'rgba(15, 17, 35, 0.95)' }}>
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex-grow-1 py-1.5 px-2 rounded-3 fw-bold small transition-all d-flex align-items-center justify-content-center gap-1.5 border-0 ${activeTab === 'overview' ? 'bg-warning text-dark shadow-sm' : 'bg-transparent text-secondary'}`}
              style={{ fontSize: '0.8rem' }}
            >
              <i className="bi bi-grid-fill"></i> Overview
            </button>
            <button 
              onClick={() => setActiveTab('graphs')}
              className={`flex-grow-1 py-1.5 px-2 rounded-3 fw-bold small transition-all d-flex align-items-center justify-content-center gap-1.5 border-0 ${activeTab === 'graphs' ? 'bg-warning text-dark shadow-sm' : 'bg-transparent text-secondary'}`}
              style={{ fontSize: '0.8rem' }}
            >
              <i className="bi bi-graph-up-arrow"></i> Graphs & Trends
            </button>
            <button 
              onClick={() => setActiveTab('matches')}
              className={`flex-grow-1 py-1.5 px-2 rounded-3 fw-bold small transition-all d-flex align-items-center justify-content-center gap-1.5 border-0 ${activeTab === 'matches' ? 'bg-warning text-dark shadow-sm' : 'bg-transparent text-secondary'}`}
              style={{ fontSize: '0.8rem' }}
            >
              <i className="bi bi-clock-history"></i> Match Records
            </button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-3" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-warning" role="status"></div>
                <p className="mt-3 text-secondary small">Crunching player statistics & match metrics...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                  <motion.div 
                    key="tab-overview"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="d-flex flex-column gap-3"
                  >
                    {/* Hero Big Stats 6-Grid */}
                    <div className="row g-2">
                      {/* Total Matches */}
                      <div className="col-6 col-md-4">
                        <div className="p-3 rounded-4 h-100 position-relative overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 41, 59, 0.4) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="text-secondary fw-semibold small" style={{ fontSize: '0.72rem' }}>MATCHES</span>
                            <i className="bi bi-controller text-primary fs-5"></i>
                          </div>
                          <div className="h3 fw-black text-white mb-0">{totalMatches}</div>
                          <span className="text-white-50" style={{ fontSize: '0.68rem' }}>Total Tournaments</span>
                        </div>
                      </div>

                      {/* Total Wins */}
                      <div className="col-6 col-md-4">
                        <div className="p-3 rounded-4 h-100 position-relative overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.15) 0%, rgba(30, 41, 59, 0.4) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="text-secondary fw-semibold small" style={{ fontSize: '0.72rem' }}>VICTORIES</span>
                            <i className="bi bi-trophy-fill text-success fs-5"></i>
                          </div>
                          <div className="h3 fw-black text-success mb-0">{wonMatches}</div>
                          <span className="text-success-emphasis text-white-50" style={{ fontSize: '0.68rem' }}>#1 Rank Wins</span>
                        </div>
                      </div>

                      {/* Total Kills */}
                      <div className="col-6 col-md-4">
                        <div className="p-3 rounded-4 h-100 position-relative overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.15) 0%, rgba(30, 41, 59, 0.4) 100%)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="text-secondary fw-semibold small" style={{ fontSize: '0.72rem' }}>TOTAL KILLS</span>
                            <i className="bi bi-crosshair text-danger fs-5"></i>
                          </div>
                          <div className="h3 fw-black text-danger mb-0">{calculatedKills}</div>
                          <span className="text-white-50" style={{ fontSize: '0.68rem' }}>Enemies Eliminated</span>
                        </div>
                      </div>

                      {/* Win Rate */}
                      <div className="col-6 col-md-4">
                        <div className="p-3 rounded-4 h-100 position-relative overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.15) 0%, rgba(30, 41, 59, 0.4) 100%)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="text-secondary fw-semibold small" style={{ fontSize: '0.72rem' }}>WIN RATE</span>
                            <i className="bi bi-pie-chart-fill text-warning fs-5"></i>
                          </div>
                          <div className="h3 fw-black text-warning mb-0">{winRate}%</div>
                          <span className="text-white-50" style={{ fontSize: '0.68rem' }}>Victory Ratio</span>
                        </div>
                      </div>

                      {/* Avg Kills / K-D */}
                      <div className="col-6 col-md-4">
                        <div className="p-3 rounded-4 h-100 position-relative overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(168, 85, 247, 0.15) 0%, rgba(30, 41, 59, 0.4) 100%)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="text-secondary fw-semibold small" style={{ fontSize: '0.72rem' }}>AVG KILLS</span>
                            <i className="bi bi-lightning-charge-fill text-purple fs-5" style={{ color: '#C084FC' }}></i>
                          </div>
                          <div className="h3 fw-black mb-0" style={{ color: '#C084FC' }}>{avgKills}</div>
                          <span className="text-white-50" style={{ fontSize: '0.68rem' }}>Per Match Kill Avg</span>
                        </div>
                      </div>

                      {/* Total Winnings */}
                      <div className="col-6 col-md-4">
                        <div className="p-3 rounded-4 h-100 position-relative overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(234, 179, 8, 0.2) 0%, rgba(30, 41, 59, 0.4) 100%)', border: '1px solid rgba(234, 179, 8, 0.4)' }}>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="text-secondary fw-semibold small" style={{ fontSize: '0.72rem' }}>WINNINGS</span>
                            <i className="bi bi-cash-stack text-warning fs-5"></i>
                          </div>
                          <div className="h3 fw-black text-warning mb-0">₹{totalEarnings.toFixed(0)}</div>
                          <span className="text-white-50" style={{ fontSize: '0.68rem' }}>Total Cash Won</span>
                        </div>
                      </div>
                    </div>

                    {/* Win vs Loss Donut & Ratio Section */}
                    <div className="p-3.5 rounded-4" style={{ background: 'rgba(20, 23, 48, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <span className="fw-bold small text-white d-flex align-items-center gap-1.5">
                          <i className="bi bi-pie-chart-fill text-warning"></i> Match Outcome Ratio
                        </span>
                        <span className="badge bg-dark border border-secondary border-opacity-25 text-secondary font-mono" style={{ fontSize: '0.7rem' }}>
                          {totalMatches} Completed
                        </span>
                      </div>

                      <div className="d-flex align-items-center gap-3">
                        {/* Circular SVG Donut */}
                        <div className="position-relative flex-shrink-0" style={{ width: '88px', height: '88px' }}>
                          <svg viewBox="0 0 36 36" className="w-100 h-100" style={{ transform: 'rotate(-90deg)' }}>
                            {/* Background Circle */}
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="rgba(239, 68, 68, 0.4)"
                              strokeWidth="3.8"
                            />
                            {/* Win Stroke */}
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="#10B981"
                              strokeWidth="4"
                              strokeDasharray={`${totalMatches > 0 ? (wonMatches / totalMatches) * 100 : 0}, 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="position-absolute top-50 start-50 translate-middle text-center">
                            <span className="fw-black text-white d-block" style={{ fontSize: '0.82rem', lineHeight: 1 }}>{winRate}%</span>
                            <span className="text-white-50" style={{ fontSize: '0.55rem', textTransform: 'uppercase' }}>Win</span>
                          </div>
                        </div>

                        {/* Ratio breakdown details */}
                        <div className="flex-grow-1 d-flex flex-column gap-2">
                          <div>
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-success fw-semibold" style={{ fontSize: '0.78rem' }}>
                                <i className="bi bi-check-circle-fill me-1"></i> Victories (Wins)
                              </span>
                              <span className="fw-bold text-white font-mono">{wonMatches} ({winRate}%)</span>
                            </div>
                            <div className="progress rounded-pill" style={{ height: '6px', background: 'rgba(255,255,255,0.06)' }}>
                              <div className="progress-bar bg-success rounded-pill" style={{ width: `${totalMatches > 0 ? (wonMatches / totalMatches) * 100 : 0}%` }}></div>
                            </div>
                          </div>

                          <div>
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-danger fw-semibold" style={{ fontSize: '0.78rem' }}>
                                <i className="bi bi-x-circle-fill me-1"></i> Defeated / Finished
                              </span>
                              <span className="fw-bold text-white font-mono">{lostMatches} ({totalMatches > 0 ? (100 - Number(winRate)).toFixed(1) : 0}%)</span>
                            </div>
                            <div className="progress rounded-pill" style={{ height: '6px', background: 'rgba(255,255,255,0.06)' }}>
                              <div className="progress-bar bg-danger rounded-pill" style={{ width: `${totalMatches > 0 ? (lostMatches / totalMatches) * 100 : 0}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Best Records & Highlights */}
                    <div className="row g-2">
                      <div className="col-6">
                        <div className="p-3 rounded-4 h-100" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <div className="d-flex align-items-center gap-1.5 mb-1 text-danger">
                            <i className="bi bi-fire"></i>
                            <span className="fw-bold small" style={{ fontSize: '0.72rem' }}>HIGHEST KILLS</span>
                          </div>
                          <div className="h4 fw-black text-white mb-0">{highestKills} <span className="small text-secondary fw-normal fs-6">kills</span></div>
                          <span className="text-white-50" style={{ fontSize: '0.68rem' }}>Best single match</span>
                        </div>
                      </div>

                      <div className="col-6">
                        <div className="p-3 rounded-4 h-100" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <div className="d-flex align-items-center gap-1.5 mb-1 text-warning">
                            <i className="bi bi-award-fill"></i>
                            <span className="fw-bold small" style={{ fontSize: '0.72rem' }}>MAX SINGLE PRIZE</span>
                          </div>
                          <div className="h4 fw-black text-warning mb-0">₹{highestEarning.toFixed(0)}</div>
                          <span className="text-white-50" style={{ fontSize: '0.68rem' }}>Peak tournament reward</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action: Open Charts */}
                    <button 
                      onClick={() => setActiveTab('graphs')}
                      className="btn btn-outline-warning w-100 py-2.5 rounded-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                      style={{ fontSize: '0.85rem' }}
                    >
                      <i className="bi bi-graph-up-arrow"></i> View Performance Graphs & Curves
                    </button>
                  </motion.div>
                )}

                {activeTab === 'graphs' && (
                  <motion.div 
                    key="tab-graphs"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="d-flex flex-column gap-3"
                  >
                    {/* Graph Controls */}
                    <div className="d-flex align-items-center justify-content-between p-2 rounded-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <span className="small text-white-50 fw-semibold ps-2" style={{ fontSize: '0.75rem' }}>Chart Display:</span>
                      <div className="btn-group btn-group-sm">
                        <button 
                          onClick={() => setGraphMetric('kills')} 
                          className={`btn btn-sm px-3 rounded-2 fw-bold ${graphMetric === 'kills' ? 'btn-danger text-white' : 'btn-dark text-secondary'}`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          <i className="bi bi-crosshair me-1"></i> Kills Graph
                        </button>
                        <button 
                          onClick={() => setGraphMetric('earnings')} 
                          className={`btn btn-sm px-3 rounded-2 fw-bold ms-1 ${graphMetric === 'earnings' ? 'btn-warning text-dark' : 'btn-dark text-secondary'}`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          <i className="bi bi-currency-rupee me-1"></i> Earnings (₹)
                        </button>
                      </div>
                    </div>

                    {/* Visual Interactive SVG Trend Area Graph */}
                    <div className="p-3 rounded-4 position-relative" style={{ background: 'linear-gradient(180deg, rgba(20, 24, 52, 0.9) 0%, rgba(12, 14, 32, 0.95) 100%)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div>
                          <div className="fw-bold text-white small">
                            {graphMetric === 'kills' ? '🎯 Kills Progression Trend' : '💰 Prize Earnings History'}
                          </div>
                          <div className="text-secondary" style={{ fontSize: '0.7rem' }}>
                            {chartData.length > 0 ? `Chronological match trend over last ${chartData.length} games` : 'Play tournaments to start charting your curve'}
                          </div>
                        </div>
                        <span className="badge bg-dark border border-secondary border-opacity-30 text-warning font-mono" style={{ fontSize: '0.7rem' }}>
                          Avg: {graphMetric === 'kills' ? `${avgKills} Kills` : `₹${(totalEarnings / Math.max(totalMatches, 1)).toFixed(0)}`}
                        </span>
                      </div>

                      {/* SVG Render Area */}
                      {chartData.length > 0 ? (
                        <div className="pt-2 pb-1">
                          <div style={{ height: '170px', position: 'relative' }}>
                            {(() => {
                              const values = chartData.map(d => graphMetric === 'kills' ? d.kills : d.earnings);
                              const maxVal = Math.max(...values, graphMetric === 'kills' ? 5 : 50);
                              const minVal = 0;
                              const points = values.map((val, idx) => {
                                const x = (idx / Math.max(values.length - 1, 1)) * 300 + 10;
                                const normalized = (val - minVal) / (maxVal - minVal || 1);
                                const y = 140 - normalized * 115;
                                return { x, y, val, label: chartData[idx].label, name: chartData[idx].name };
                              });

                              const pathD = points.length === 1 
                                ? `M 10 140 L 160 ${points[0].y} L 310 140`
                                : points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

                              const areaD = `${pathD} L ${points[points.length - 1].x} 145 L ${points[0].x} 145 Z`;

                              const strokeColor = graphMetric === 'kills' ? '#EF4444' : '#F59E0B';
                              const gradientId = graphMetric === 'kills' ? 'killsGrad' : 'earningsGrad';

                              return (
                                <svg viewBox="0 0 320 155" className="w-100 h-100" style={{ overflow: 'visible' }}>
                                  <defs>
                                    <linearGradient id="killsGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#EF4444" stopOpacity="0.45" />
                                      <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
                                    </linearGradient>
                                    <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
                                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                                    </linearGradient>
                                  </defs>

                                  {/* Grid Lines */}
                                  <line x1="10" y1="25" x2="310" y2="25" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                                  <line x1="10" y1="85" x2="310" y2="85" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                                  <line x1="10" y1="145" x2="310" y2="145" stroke="rgba(255,255,255,0.12)" />

                                  {/* Area Fill */}
                                  <path d={areaD} fill={`url(#${gradientId})`} />

                                  {/* Smooth Line */}
                                  <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

                                  {/* Points */}
                                  {points.map((p, i) => (
                                    <g key={i} className="chart-node">
                                      <circle cx={p.x} cy={p.y} r="5" fill="#0F1123" stroke={strokeColor} strokeWidth="2.5" />
                                      <circle cx={p.x} cy={p.y} r="2.2" fill={strokeColor} />
                                      {/* Value Label above Node */}
                                      <text 
                                        x={p.x} 
                                        y={p.y - 9} 
                                        textAnchor="middle" 
                                        fill="#FFFFFF" 
                                        fontSize="9" 
                                        fontWeight="bold"
                                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                                      >
                                        {graphMetric === 'earnings' ? `₹${p.val}` : p.val}
                                      </text>
                                    </g>
                                  ))}
                                </svg>
                              );
                            })()}
                          </div>

                          {/* X-Axis Labels */}
                          <div className="d-flex justify-content-between text-secondary pt-1 px-1" style={{ fontSize: '0.68rem' }}>
                            {chartData.slice(0, 7).map((d, i) => (
                              <span key={i} className="text-truncate px-1" style={{ maxWidth: '48px' }}>
                                {d.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-secondary">
                          <i className="bi bi-bar-chart fs-3 d-block mb-1 opacity-50"></i>
                          <p className="small mb-0">No matches logged yet. Play a tournament to see your live curve!</p>
                        </div>
                      )}
                    </div>

                    {/* Bar Breakdown of Match Performance */}
                    <div className="p-3 rounded-4" style={{ background: 'rgba(20, 23, 48, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div className="fw-bold text-white small mb-2.5 d-flex align-items-center gap-1.5">
                        <i className="bi bi-bar-chart-fill text-primary"></i> Combat & Skill Rating Index
                      </div>

                      <div className="d-flex flex-column gap-2.5">
                        {/* Combat Efficiency */}
                        <div>
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="text-white-50" style={{ fontSize: '0.75rem' }}>Combat Aggression (Kills / Game)</span>
                            <span className="fw-bold text-danger font-mono" style={{ fontSize: '0.78rem' }}>{Math.min(Number(avgKills) * 20, 100).toFixed(0)}/100</span>
                          </div>
                          <div className="progress rounded-pill" style={{ height: '7px', background: 'rgba(255,255,255,0.06)' }}>
                            <div className="progress-bar bg-danger rounded-pill" style={{ width: `${Math.min(Number(avgKills) * 20, 100)}%` }}></div>
                          </div>
                        </div>

                        {/* Victory Consistency */}
                        <div>
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="text-white-50" style={{ fontSize: '0.75rem' }}>Victory Consistency (Win Rate)</span>
                            <span className="fw-bold text-warning font-mono" style={{ fontSize: '0.78rem' }}>{winRate}%</span>
                          </div>
                          <div className="progress rounded-pill" style={{ height: '7px', background: 'rgba(255,255,255,0.06)' }}>
                            <div className="progress-bar bg-warning rounded-pill" style={{ width: `${Math.min(Number(winRate), 100)}%` }}></div>
                          </div>
                        </div>

                        {/* Cash Conversion */}
                        <div>
                          <div className="d-flex justify-content-between small mb-1">
                            <span className="text-white-50" style={{ fontSize: '0.75rem' }}>Tournament ROI & Cash Returns</span>
                            <span className="fw-bold text-success font-mono" style={{ fontSize: '0.78rem' }}>{totalEarnings > 0 ? 'HIGH' : 'BEGINNER'}</span>
                          </div>
                          <div className="progress rounded-pill" style={{ height: '7px', background: 'rgba(255,255,255,0.06)' }}>
                            <div className="progress-bar bg-success rounded-pill" style={{ width: `${Math.min(totalEarnings > 0 ? (totalEarnings / 200) * 100 : 10, 100)}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'matches' && (
                  <motion.div 
                    key="tab-matches"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="d-flex flex-column gap-2"
                  >
                    {history.length > 0 ? (
                      [...history].reverse().map((match, idx) => (
                        <div 
                          key={match.id || idx} 
                          className="p-3 rounded-3 position-relative transition-all"
                          style={{ background: 'rgba(24, 27, 56, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                        >
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <div className="fw-bold text-white small">{match.tournamentName || 'Tournament Match'}</div>
                              <div className="text-secondary" style={{ fontSize: '0.68rem' }}>{formatFullDateTime(match.date)}</div>
                            </div>
                            <span className={`badge rounded-pill fw-bold ${String(match.rank) === '1' ? 'bg-warning text-dark' : 'bg-dark text-white border border-secondary'}`} style={{ fontSize: '0.7rem' }}>
                              {String(match.rank) === '1' ? '👑 RANK #1' : `RANK #${match.rank || 'N/A'}`}
                            </span>
                          </div>

                          <div className="d-flex justify-content-around text-center pt-2 border-top border-secondary border-opacity-25">
                            <div>
                              <span className="text-secondary d-block" style={{ fontSize: '0.65rem' }}>KILLS</span>
                              <strong className="text-danger small">{match.kills ?? 0} 🎯</strong>
                            </div>
                            <div className="border-start border-secondary border-opacity-25 ps-3">
                              <span className="text-secondary d-block" style={{ fontSize: '0.65rem' }}>RANK</span>
                              <strong className="text-white small">#{match.rank || '-'}</strong>
                            </div>
                            <div className="border-start border-secondary border-opacity-25 ps-3">
                              <span className="text-secondary d-block" style={{ fontSize: '0.65rem' }}>PRIZE WON</span>
                              <strong className="text-success small">₹{(match.earnings || 0).toFixed(0)}</strong>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-5 text-secondary">
                        <i className="bi bi-clock-history fs-2 d-block mb-2 text-warning opacity-60"></i>
                        <p className="small mb-1 text-white">No Match Logs Found</p>
                        <p className="text-secondary" style={{ fontSize: '0.75rem' }}>Join upcoming contests to build your tournament history & track kill records!</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Footer with Share Card button */}
          <div className="modal-footer border-top border-secondary border-opacity-25 px-3 py-2.5 d-flex justify-content-between" style={{ background: 'rgba(15, 17, 35, 0.95)' }}>
            <button 
              type="button" 
              onClick={handleShareStats} 
              className="btn btn-outline-light btn-sm rounded-3 fw-bold d-flex align-items-center gap-1.5 px-3"
              style={{ fontSize: '0.8rem' }}
            >
              <i className="bi bi-share-fill text-warning"></i> Share Stats
            </button>
            <button 
              type="button" 
              className="btn btn-warning btn-sm rounded-3 fw-bold px-4 text-dark"
              onClick={onClose}
              style={{ fontSize: '0.82rem' }}
            >
              Done
            </button>
          </div>

          {copiedNotification && (
            <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 px-3 py-1.5 rounded-pill bg-success text-white small shadow-lg fw-bold" style={{ zIndex: 1070 }}>
              <i className="bi bi-check-circle-fill me-1"></i> Stats copied to clipboard!
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
