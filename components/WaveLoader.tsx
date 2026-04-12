/**
 * WaveLoader - Animated wave component that cycles through bwave brand colors
 *
 * Usage:
 *   <WaveLoader /> (picks a random funny message)
 *   <WaveLoader text="Custom text..." /> (use custom text)
 */

const FUNNY_MESSAGES = [
  '🌊 Riding the wave...',
  '🏄 Catching the vibe...',
  '🌊 Making waves happen...',
  '✨ Riding your data...',
  '🚀 Surfing the cloud...',
  '💫 Waving goodbye to manual work...',
  '🌊 Diving deep into your PDFs...',
  '🏄 Getting gnarly with bwave...',
  '✨ Catching the data wave...',
  '🌊 bwave is on the case...',
  '📊 Turning PDFs into gold...',
  '🤖 bwave is cooking up magic...',
  '⚡ Extracting with style...',
  '🌊 Your buddy bwave is working...',
  '🎯 Nailing the extraction...',
]

export default function WaveLoader({ text }: { text?: string }) {
  // Pick a random funny message if none provided
  const displayText = text || FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)]
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <style>{`
        @keyframes wave {
          0% {
            d: path('M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z');
          }
          25% {
            d: path('M0,50 Q25,10 50,50 T100,50 L100,100 L0,100 Z');
          }
          50% {
            d: path('M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z');
          }
          75% {
            d: path('M0,50 Q25,70 50,50 T100,50 L100,100 L0,100 Z');
          }
          100% {
            d: path('M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z');
          }
        }

        @keyframes waveShift {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100px);
          }
        }

        @keyframes colorCycle {
          0% {
            stop-color: #2892D7;
          }
          33% {
            stop-color: #28E2CF;
          }
          66% {
            stop-color: #826AED;
          }
          100% {
            stop-color: #2892D7;
          }
        }

        @keyframes colorCycle2 {
          0% {
            stop-color: #28E2CF;
          }
          33% {
            stop-color: #826AED;
          }
          66% {
            stop-color: #F87AA0;
          }
          100% {
            stop-color: #28E2CF;
          }
        }

        .wave-path {
          animation: waveShift 3s linear infinite;
        }

        .wave-color-1 {
          animation: colorCycle 6s ease-in-out infinite;
        }

        .wave-color-2 {
          animation: colorCycle2 6s ease-in-out infinite;
          animation-delay: 1s;
        }

        .pulse-dot {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>

      <div className="relative w-40 h-40 mb-6">
        {/* Outer ring glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-bwave-blue via-bwave-cyan to-bwave-purple opacity-20 blur-xl" aria-hidden="true"></div>

        {/* Wave SVG */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full"
          style={{ filter: 'drop-shadow(0 0 20px rgba(40, 146, 215, 0.3))' }}
          aria-hidden="true"
          role="img"
          aria-label="Loading animation"
        >
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" className="wave-color-1" />
              <stop offset="100%" className="wave-color-2" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Multiple wave layers for depth */}
          <g className="wave-path" opacity="0.6">
            <path
              d="M0,100 Q50,70 100,100 T200,100 L200,200 L0,200 Z"
              fill="url(#waveGradient)"
              filter="url(#glow)"
            />
          </g>

          <g className="wave-path" style={{ animationDelay: '-1s' }} opacity="0.4">
            <path
              d="M0,110 Q50,80 100,110 T200,110 L200,200 L0,200 Z"
              fill="url(#waveGradient)"
              filter="url(#glow)"
            />
          </g>

          <g className="wave-path" style={{ animationDelay: '-2s' }} opacity="0.2">
            <path
              d="M0,120 Q50,90 100,120 T200,120 L200,200 L0,200 Z"
              fill="url(#waveGradient)"
              filter="url(#glow)"
            />
          </g>

          {/* Center circle indicator */}
          <circle
            cx="100"
            cy="80"
            r="8"
            fill="#28E2CF"
            opacity="0.8"
            className="pulse-dot"
            filter="url(#glow)"
          />
        </svg>
      </div>

      {/* Text */}
      <p className="text-slate-300 font-medium text-center" role="status" aria-live="polite" aria-atomic="true">
        {displayText}
      </p>

      {/* Animated dots */}
      <div className="flex gap-1 mt-4" aria-hidden="true">
        <span className="w-2 h-2 rounded-full bg-bwave-blue animate-pulse"></span>
        <span
          className="w-2 h-2 rounded-full bg-bwave-cyan animate-pulse"
          style={{ animationDelay: '0.2s' }}
        ></span>
        <span
          className="w-2 h-2 rounded-full bg-bwave-purple animate-pulse"
          style={{ animationDelay: '0.4s' }}
        ></span>
      </div>
    </div>
  )
}
