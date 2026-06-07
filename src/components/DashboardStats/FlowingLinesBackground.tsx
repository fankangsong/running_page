import React from 'react';

const FlowingLinesBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-50 md:opacity-60 z-0">
      <svg
        className="absolute w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Gradient definitions for flowing lines */}
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4fc3f7" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#ab47bc" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff7043" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="gradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e040fb" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#7c4dff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#448aff" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="gradient3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff5252" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#ff4081" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f50057" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="gradient4" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#64ffda" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#1de9b6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00bfa5" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="gradient5" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ffab40" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#ff6d00" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#ff9100" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="gradient6" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ea80fc" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#b388ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7c4dff" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="gradient7" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd54f" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ffb300" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="gradient8" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#69f0ae" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00e676" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Main flowing curved lines */}
        <g>
          <path
            d="M-100,150 C100,80 300,200 500,120 S700,180 900,100 S1100,160 1300,90"
            fill="none"
            stroke="url(#gradient1)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M-50,250 Q200,150 400,280 T700,180 T1000,260 T1250,150"
            fill="none"
            stroke="url(#gradient2)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M-80,350 C150,280 350,400 550,300 S750,380 950,280 S1150,350 1350,250"
            fill="none"
            stroke="url(#gradient3)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M-120,450 Q180,350 380,480 T680,380 T980,450 T1280,320"
            fill="none"
            stroke="url(#gradient4)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M-60,550 C120,480 320,600 520,500 S720,580 920,480 S1120,550 1320,420"
            fill="none"
            stroke="url(#gradient5)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M-100,650 Q250,550 450,700 T750,580 T1050,680 T1350,500"
            fill="none"
            stroke="url(#gradient6)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M-30,750 C180,680 380,800 580,700 S780,780 980,680 S1180,750 1380,600"
            fill="none"
            stroke="url(#gradient7)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M50,50 Q300,20 500,100 T800,30 T1100,80 T1400,20"
            fill="none"
            stroke="url(#gradient8)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>

        {/* Secondary thinner accent lines */}
        <g opacity="0.4">
          <path
            d="M0,100 C200,60 400,120 600,80 S800,110 1000,70 S1200,100 1400,60"
            fill="none"
            stroke="#4fc3f7"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
          <path
            d="M0,200 Q250,150 500,220 T800,160 T1100,200 T1400,140"
            fill="none"
            stroke="#ab47bc"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
          <path
            d="M0,300 C180,260 380,320 580,280 S780,310 980,260 S1180,300 1380,240"
            fill="none"
            stroke="#ff7043"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
          <path
            d="M0,400 Q220,350 440,420 T680,360 T920,400 T1160,340"
            fill="none"
            stroke="#64ffda"
            strokeWidth="0.7"
            strokeLinecap="round"
          />
          <path
            d="M0,500 C160,460 360,520 560,480 S760,510 960,460 S1160,500 1360,440"
            fill="none"
            stroke="#ffab40"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
          <path
            d="M0,600 Q280,550 480,620 T720,560 T960,600 T1200,540"
            fill="none"
            stroke="#ea80fc"
            strokeWidth="0.7"
            strokeLinecap="round"
          />
          <path
            d="M0,700 C140,660 340,720 540,680 S740,710 940,660 S1140,700 1340,640"
            fill="none"
            stroke="#69f0ae"
            strokeWidth="0.6"
            strokeLinecap="round"
          />
        </g>

        {/* Very thin detail lines */}
        <g opacity="0.25">
          <path
            d="M0,180 C300,140 600,200 900,160 S1200,190 1500,150"
            fill="none"
            stroke="#e040fb"
            strokeWidth="0.4"
            strokeLinecap="round"
          />
          <path
            d="M0,380 Q400,340 800,400 T1200,360"
            fill="none"
            stroke="#1de9b6"
            strokeWidth="0.4"
            strokeLinecap="round"
          />
          <path
            d="M0,580 C350,540 700,600 1050,560 S1400,590 1700,550"
            fill="none"
            stroke="#ff6d00"
            strokeWidth="0.4"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
};

export default FlowingLinesBackground;