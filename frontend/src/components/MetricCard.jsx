import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'brand',
  delay = 0,
}) {
  const cardRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const colorVariants = {
    brand: {
      border: 'hover:border-brand-500/40',
      iconBg: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
      glow: 'rgba(99, 102, 241, 0.15)',
      topBar: 'from-brand-500 to-indigo-400',
    },
    cyan: {
      border: 'hover:border-cyan-400/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      glow: 'rgba(56, 189, 248, 0.15)',
      topBar: 'from-cyan-400 to-sky-500',
    },
    emerald: {
      border: 'hover:border-emerald-400/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      glow: 'rgba(16, 185, 129, 0.15)',
      topBar: 'from-emerald-400 to-teal-500',
    },
    rose: {
      border: 'hover:border-rose-400/40',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      glow: 'rgba(251, 113, 133, 0.15)',
      topBar: 'from-rose-400 to-pink-500',
    },
    amber: {
      border: 'hover:border-amber-400/40',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      glow: 'rgba(245, 158, 11, 0.15)',
      topBar: 'from-amber-400 to-orange-500',
    },
  };

  const scheme = colorVariants[color] || colorVariants.brand;

  const strVal = String(value || '');
  const fontSizeClass =
    strVal.length > 13
      ? 'text-lg sm:text-xl'
      : strVal.length > 8
      ? 'text-xl sm:text-2xl'
      : 'text-2xl sm:text-3xl';

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#101728]/80 p-5 backdrop-blur-md transition-all duration-300 ${scheme.border} shadow-lg flex flex-col justify-between`}
      style={{
        boxShadow: isHovered
          ? `0 12px 30px -10px rgba(0, 0, 0, 0.5), 0 0 25px -5px ${scheme.glow}`
          : '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Top subtle accent gradient bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${scheme.topBar} opacity-80`} />

      {/* Spotlight effect on hover */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, ${scheme.glow}, transparent 70%)`,
          }}
        />
      )}

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="block text-[0.72rem] font-semibold tracking-wider text-slate-400 uppercase truncate">
            {title}
          </span>
          <div
            title={strVal}
            className={`mt-1.5 font-sans font-bold tracking-tight text-white leading-tight truncate ${fontSizeClass}`}
          >
            {value}
          </div>
          {subtitle && (
            <div
              title={String(subtitle)}
              className="mt-1 flex items-center gap-1.5 text-xs font-medium text-cyan-400 truncate max-w-full"
            >
              <span className="truncate">{subtitle}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`shrink-0 rounded-lg border p-2.5 ${scheme.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
