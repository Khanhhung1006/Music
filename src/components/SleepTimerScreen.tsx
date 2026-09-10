import React, { useState, useEffect } from 'react';
import { useAudio } from '../lib/AudioProvider';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Play } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onClose: () => void;
}

export function SleepTimerScreen({ onClose }: Props) {
  const { sleepTimer, setSleepTimer } = useAudio();
  
  const options = [15, 30, 45, 60, 90, 120];

  const handleSetTimer = (mins: number) => {
    setSleepTimer(mins);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-0 pb-safe transition-opacity duration-300"
      >
        <motion.div 
          initial={{ y: 50, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          className="relative bg-bg-surface w-full max-w-sm rounded-[32px] shadow-2xl p-6 border border-border"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 text-text-primary">
              <Clock className="w-6 h-6 text-accent" />
              <h2 className="text-xl font-bold">Hẹn giờ tắt</h2>
            </div>
            <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {sleepTimer !== null && (
            <div className="mb-6 p-4 rounded-2xl bg-accent/10 border border-accent/20 flex flex-col items-center justify-center">
              <span className="text-sm text-accent font-medium mb-1">Thời gian còn lại</span>
              <span className="text-3xl font-bold text-accent tracking-wider">
                {sleepTimer} phút
              </span>
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {options.map(mins => (
                <button
                  key={mins}
                  onClick={() => handleSetTimer(mins)}
                  className="p-4 rounded-2xl border-2 border-border hover:border-accent hover:bg-text-primary/5 text-text-primary font-medium transition-all active:scale-95 bg-bg-card"
                >
                  {mins} phút
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setSleepTimer(null)}
              disabled={sleepTimer === null}
              className={cn(
                "w-full p-4 rounded-2xl font-medium transition-all active:scale-95 border",
                sleepTimer !== null 
                  ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20" 
                  : "bg-bg-card text-text-secondary border-border cursor-not-allowed"
              )}
            >
              Tắt hẹn giờ
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
