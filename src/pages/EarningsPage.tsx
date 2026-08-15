import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

// SubViews
import { SpinWinSubView } from '../components/earnings/subviews/SpinWinSubView';
import { DailyCheckinSubView } from '../components/earnings/subviews/DailyCheckinSubView';
import { ScratchWinSubView } from '../components/earnings/subviews/ScratchWinSubView';
import { LuckyDrawSubView } from '../components/earnings/subviews/LuckyDrawSubView';
import { DailyMissionsSubView } from '../components/earnings/subviews/DailyMissionsSubView';
import { ReferEarnSubView } from '../components/earnings/subviews/ReferEarnSubView';
import { PlayEarnSubView } from '../components/earnings/subviews/PlayEarnSubView';
import { LeaderboardRewardsSubView } from '../components/earnings/subviews/LeaderboardRewardsSubView';
import { LuckyCouponSubView } from '../components/earnings/subviews/LuckyCouponSubView';
import { BonusZoneSubView } from '../components/earnings/subviews/BonusZoneSubView';

export const EarningsPage: React.FC = () => {
  const { userProfile } = useAuth();
  // Dedicated in-page subview state for all 10 earning hubs
  const [activeSubView, setActiveSubView] = useState<string | null>(null);

  const earningModules = [
    {
      id: 'spin',
      title: 'Spin & Win',
      icon: '🎡',
      badge: 'Daily Free',
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      iconBg: 'from-amber-500/20 to-yellow-600/10 border-amber-500/30 text-amber-400',
      cardBg: 'from-amber-950/25 via-zinc-900/90 to-zinc-950',
      borderColor: 'border-amber-500/20 hover:border-amber-400/60',
      glowColor: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.18)]',
      reward: 'Win ₹100',
      tagColor: 'text-amber-400'
    },
    {
      id: 'daily_checkin',
      title: 'Daily Streak',
      icon: '🎁',
      badge: 'Day 1 🔥',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      iconBg: 'from-emerald-500/20 to-teal-600/10 border-emerald-500/30 text-emerald-400',
      cardBg: 'from-emerald-950/25 via-zinc-900/90 to-zinc-950',
      borderColor: 'border-emerald-500/20 hover:border-emerald-400/60',
      glowColor: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.18)]',
      reward: 'Claim ₹50',
      tagColor: 'text-emerald-400'
    },
    {
      id: 'scratch',
      title: 'Scratch Cards',
      icon: '🧧',
      badge: '2 Free',
      badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
      iconBg: 'from-rose-500/20 to-pink-600/10 border-rose-500/30 text-rose-400',
      cardBg: 'from-rose-950/25 via-zinc-900/90 to-zinc-950',
      borderColor: 'border-rose-500/20 hover:border-rose-400/60',
      glowColor: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.18)]',
      reward: 'Win ₹50',
      tagColor: 'text-rose-400'
    },
    {
      id: 'lucky_draw',
      title: 'Lucky Draw',
      icon: '🎯',
      badge: 'Mega Pot',
      badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
      iconBg: 'from-purple-500/20 to-indigo-600/10 border-purple-500/30 text-purple-400',
      cardBg: 'from-purple-950/25 via-zinc-900/90 to-zinc-950',
      borderColor: 'border-purple-500/20 hover:border-purple-400/60',
      glowColor: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.18)]',
      reward: '₹10,000 Pot',
      tagColor: 'text-purple-400'
    },
    {
      id: 'missions',
      title: 'Daily Missions',
      icon: '🔥',
      badge: '6 Tasks',
      badgeClass: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
      iconBg: 'from-orange-500/20 to-amber-600/10 border-orange-500/30 text-orange-400',
      cardBg: 'from-orange-950/25 via-zinc-900/90 to-zinc-950',
      borderColor: 'border-orange-500/20 hover:border-orange-400/60',
      glowColor: 'group-hover:shadow-[0_0_20px_rgba(249,115,22,0.18)]',
      reward: '₹75 Daily',
      tagColor: 'text-orange-400'
    },
    {
      id: 'refer',
      title: 'Refer & Earn',
      icon: '👥',
      badge: 'Instant',
      badgeClass: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
      iconBg: 'from-blue-500/20 to-cyan-600/10 border-blue-500/30 text-blue-400',
      cardBg: 'from-blue-950/25 via-zinc-900/90 to-zinc-950',
      borderColor: 'border-blue-500/20 hover:border-blue-400/60',
      glowColor: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.18)]',
      reward: '₹50/Invite',
      tagColor: 'text-blue-400'
    },
    {
      id: 'play_earn',
      title: 'Play & Earn',
      icon: '🎮',
      badge: 'Mini Game',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40',
      iconBg: 'from-indigo-500/20 to-violet-600/10 border-indigo-500/30 text-indigo-400',
      cardBg: 'from-indigo-950/25 via-zinc-900/90 to-zinc-950',
      borderColor: 'border-indigo-500/20 hover:border-indigo-400/60',
      glowColor: 'group-hover:shadow-[0_0_20px_rgba(99,102,241,0.18)]',
      reward: 'Win ₹15/Game',
      tagColor: 'text-indigo-400'
    },
    {
      id: 'leaderboard_rewards',
      title: 'Leaderboard',
      icon: '🏆',
      badge: 'Weekly',
      badgeClass: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
      iconBg: 'from-yellow-500/20 to-amber-600/10 border-yellow-500/30 text-yellow-400',
      cardBg: 'from-yellow-950/25 via-zinc-900/90 to-zinc-950',
      borderColor: 'border-yellow-500/20 hover:border-yellow-400/60',
      glowColor: 'group-hover:shadow-[0_0_20px_rgba(234,179,8,0.18)]',
      reward: '₹15,000 Pool',
      tagColor: 'text-yellow-400'
    },
    {
      id: 'coupon',
      title: 'Lucky Coupons',
      icon: '🎟️',
      badge: 'Promo',
      badgeClass: 'bg-teal-500/20 text-teal-300 border border-teal-500/40',
      iconBg: 'from-teal-500/20 to-emerald-600/10 border-teal-500/30 text-teal-400',
      cardBg: 'from-teal-950/25 via-zinc-900/90 to-zinc-950',
      borderColor: 'border-teal-500/20 hover:border-teal-400/60',
      glowColor: 'group-hover:shadow-[0_0_20px_rgba(20,184,166,0.18)]',
      reward: 'Free Drops',
      tagColor: 'text-teal-400'
    },
    {
      id: 'bonus_zone',
      title: 'Bonus Zone',
      icon: '💰',
      badge: 'VIP Perk',
      badgeClass: 'bg-amber-500/25 text-amber-300 border border-amber-400/50 font-black',
      iconBg: 'from-amber-500/25 to-yellow-600/15 border-amber-500/40 text-amber-400',
      cardBg: 'from-amber-950/30 via-zinc-900/90 to-zinc-950',
      borderColor: 'border-amber-500/25 hover:border-yellow-300/80',
      glowColor: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]',
      reward: '100% Match',
      tagColor: 'text-amber-400'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0.01
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 420,
        damping: 26
      }
    }
  };

  return (
    <section id="earnings-section" className="section active px-3 py-2.5 pb-6">
      <AnimatePresence mode="wait">
        {activeSubView === null ? (
          <motion.div
            key="hub-grid"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title mb-0 text-lg font-black text-white flex items-center gap-2 tracking-tight">
                <span>Earning Hubs</span>
                <span className="badge bg-amber-400 text-black text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">
                  10 Hubs
                </span>
              </h2>
              <span className="badge bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Active
              </span>
            </div>

            {/* Quick Balance Vault Pill */}
            <motion.div 
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="px-3 py-2 mb-3 rounded-xl bg-zinc-900/80 border border-white/10 flex items-center justify-between shadow-sm relative overflow-hidden backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 text-xs">
                  <i className="bi bi-wallet2"></i>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] text-gray-400 font-medium">Balance:</span>
                  <span className="text-white font-black text-xs tracking-tight">₹{userProfile?.balance?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-400 font-medium">Bonus:</span>
                <span className="text-amber-400 font-bold text-[11px]">
                  ₹{userProfile?.bonusCash?.toFixed(2) || '0.00'}
                </span>
              </div>
            </motion.div>

            {/* 10 Earning Hubs Grid - Clean & Native */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-2.5 mb-2"
            >
              {earningModules.map((mod) => (
                <motion.div
                  key={mod.id}
                  variants={itemVariants}
                  whileHover={{ y: -2, scale: 1.015 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveSubView(mod.id)}
                  className={`p-3 rounded-2xl bg-gradient-to-b ${mod.cardBg} border ${mod.borderColor} ${mod.glowColor} cursor-pointer transition-all duration-150 shadow-sm flex flex-col justify-between relative overflow-hidden group select-none`}
                  style={{ minHeight: '115px' }}
                >
                  {/* Top Row: Icon & Badge */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${mod.iconBg} border flex items-center justify-center text-base shadow-sm group-hover:scale-105 transition-transform duration-150`}>
                      {mod.icon}
                    </div>
                    <span className={`badge ${mod.badgeClass} text-[9px] font-bold uppercase px-2 py-0.5 rounded-full`}>
                      {mod.badge}
                    </span>
                  </div>

                  {/* Clean Title */}
                  <div className="my-1">
                    <h6 className="text-white font-bold text-[13px] mb-0 tracking-tight group-hover:text-amber-300 transition-colors">
                      {mod.title}
                    </h6>
                  </div>

                  {/* Bottom: Native Action Row */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className={`${mod.tagColor} font-black text-xs`}>
                      {mod.reward}
                    </span>
                    <span className="text-gray-400 group-hover:text-white font-semibold text-[10px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Open <i className="bi bi-chevron-right text-[9px]"></i>
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          /* Dedicated In-Page SubView Screen with Smooth Slide/Fade Transition */
          <motion.div 
            key="hub-subview"
            initial={{ opacity: 0, x: 20, scale: 0.99 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.99 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="w-full"
          >
            {activeSubView === 'spin' && (
              <SpinWinSubView onBack={() => setActiveSubView(null)} />
            )}
            {activeSubView === 'daily_checkin' && (
              <DailyCheckinSubView onBack={() => setActiveSubView(null)} />
            )}
            {activeSubView === 'scratch' && (
              <ScratchWinSubView onBack={() => setActiveSubView(null)} />
            )}
            {activeSubView === 'lucky_draw' && (
              <LuckyDrawSubView onBack={() => setActiveSubView(null)} />
            )}
            {activeSubView === 'missions' && (
              <DailyMissionsSubView 
                onBack={() => setActiveSubView(null)} 
                onNavigateHub={(id) => setActiveSubView(id)}
              />
            )}
            {activeSubView === 'refer' && (
              <ReferEarnSubView onBack={() => setActiveSubView(null)} />
            )}
            {activeSubView === 'play_earn' && (
              <PlayEarnSubView onBack={() => setActiveSubView(null)} />
            )}
            {activeSubView === 'leaderboard_rewards' && (
              <LeaderboardRewardsSubView onBack={() => setActiveSubView(null)} />
            )}
            {activeSubView === 'coupon' && (
              <LuckyCouponSubView onBack={() => setActiveSubView(null)} />
            )}
            {activeSubView === 'bonus_zone' && (
              <BonusZoneSubView onBack={() => setActiveSubView(null)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

