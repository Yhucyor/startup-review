"use client";

import React, { useState } from 'react';
import styles from './page.module.css';

const LOGOS = [
  { name: "Shopee", color: "#f97316", icon: "🛍️" },
  { name: "Lazada", color: "#ec4899", icon: "💙" },
  { name: "TIKI", color: "#38bdf8", icon: "📦" },
  { name: "Sendo", color: "#ef4444", icon: "🔴" },
  { name: "TGDD", color: "#eab308", icon: "📱" },
  { name: "FPT Shop", color: "#1f2937", icon: "💻" },
  { name: "ĐM XANH", color: "#0284c7", icon: "❄️" },
  { name: "Nguyễn Kim", color: "#dc2626", icon: "📺" },
];

export default function LogoOrbit() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const RADIUS = 230; // Radius of the orbit

  // Calculate coordinates for a given index
  const getCoords = (index: number) => {
    const angle = (index / LOGOS.length) * 2 * Math.PI - Math.PI / 2; // Start from top (-90deg)
    return {
      x: Math.cos(angle) * RADIUS,
      y: Math.sin(angle) * RADIUS
    };
  };

  return (
    <div className={styles.orbitContainer}>
      {/* SVG for drawing connection lines */}
      <svg 
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          overflow: 'visible',
          pointerEvents: 'none',
          zIndex: 0
        }}
      >
        <g transform={`translate(${RADIUS}, ${RADIUS})`}>
          {hoveredIndex !== null && (
            <>
              {/* Line to previous neighbor */}
              <line
                x1={getCoords(hoveredIndex).x}
                y1={getCoords(hoveredIndex).y}
                x2={getCoords((hoveredIndex - 1 + LOGOS.length) % LOGOS.length).x}
                y2={getCoords((hoveredIndex - 1 + LOGOS.length) % LOGOS.length).y}
                stroke={LOGOS[hoveredIndex].color}
                strokeWidth="3"
                strokeDasharray="4 4"
                className="animate-pulse"
                style={{ filter: `drop-shadow(0 0 8px ${LOGOS[hoveredIndex].color})` }}
              />
              {/* Line to next neighbor */}
              <line
                x1={getCoords(hoveredIndex).x}
                y1={getCoords(hoveredIndex).y}
                x2={getCoords((hoveredIndex + 1) % LOGOS.length).x}
                y2={getCoords((hoveredIndex + 1) % LOGOS.length).y}
                stroke={LOGOS[hoveredIndex].color}
                strokeWidth="3"
                strokeDasharray="4 4"
                className="animate-pulse"
                style={{ filter: `drop-shadow(0 0 8px ${LOGOS[hoveredIndex].color})` }}
              />
              {/* Line across to opposite (optional extra sci-fi effect) */}
              <line
                x1={getCoords(hoveredIndex).x}
                y1={getCoords(hoveredIndex).y}
                x2={getCoords((hoveredIndex + LOGOS.length / 2) % LOGOS.length).x}
                y2={getCoords((hoveredIndex + LOGOS.length / 2) % LOGOS.length).y}
                stroke={LOGOS[hoveredIndex].color}
                strokeWidth="1"
                opacity="0.4"
                style={{ filter: `drop-shadow(0 0 4px ${LOGOS[hoveredIndex].color})` }}
              />
            </>
          )}
        </g>
      </svg>

      {/* Render the orbiting nodes */}
      {LOGOS.map((logo, idx) => {
        const coords = getCoords(idx);
        const isHovered = hoveredIndex === idx;
        const isNeighbor = hoveredIndex !== null && (
          idx === (hoveredIndex - 1 + LOGOS.length) % LOGOS.length ||
          idx === (hoveredIndex + 1) % LOGOS.length
        );

        return (
          <div
            key={logo.name}
            className={`${styles.platformNode}`}
            style={{
              left: `calc(50% + ${coords.x}px - 35px)`, // 35px is half of 70px width
              top: `calc(50% + ${coords.y}px - 35px)`,
              zIndex: isHovered ? 20 : 10,
            }}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div 
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: logo.color,
                borderWidth: '2px',
                borderStyle: 'solid',
                background: 'rgba(10, 10, 15, 0.9)',
                backdropFilter: 'blur(8px)',
                boxShadow: isHovered 
                  ? `0 0 30px 10px ${logo.color}66, inset 0 0 15px ${logo.color}44` 
                  : (isNeighbor ? `0 0 15px 5px ${logo.color}44` : `0 0 10px rgba(0,0,0,0.5)`),
                transform: isHovered ? 'scale(1.3)' : (isNeighbor ? 'scale(1.15)' : 'scale(1)'),
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div className={styles.platformInner} style={{ color: logo.color, textShadow: isHovered ? `0 0 8px ${logo.color}` : 'none' }}>
                <span style={{ fontSize: '20px', marginBottom: '2px' }}>{logo.icon}</span>
                <span style={{ fontSize: '9px', textAlign: 'center', lineHeight: '1', fontWeight: 800 }}>
                  {logo.name}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
