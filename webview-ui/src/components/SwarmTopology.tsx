import React from 'react';

export function SwarmTopology() {
  // Cinematic SVG representation of a neural swarm
  return (
    <div className="swarm-topology-container">
      <svg width="100%" height="200" viewBox="0 0 400 200" className="swarm-svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Connections */}
        <g className="swarm-links">
           <line x1="200" y1="40" x2="100" y2="100" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
           <line x1="200" y1="40" x2="300" y2="100" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
           <line x1="100" y1="100" x2="50" y2="160" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
           <line x1="100" y1="100" x2="150" y2="160" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
           <line x1="300" y1="100" x2="250" y2="160" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
           <line x1="300" y1="100" x2="350" y2="160" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
           {/* Cross-links for hive feel */}
           <line x1="150" y1="160" x2="250" y2="160" stroke="rgba(255, 0, 255, 0.1)" strokeWidth="1" strokeDasharray="4 2" />
        </g>

        {/* Nodes */}
        <g className="swarm-nodes">
           {/* Master Sovereign Node */}
           <circle cx="200" cy="40" r="6" fill="#00E5FF" filter="url(#glow)" className="node-pulse" />
           <text x="210" y="45" fill="#00E5FF" className="node-text">CORE_ORCHESTRATOR</text>

           {/* Sub-Agent Nodes */}
           <circle cx="100" cy="100" r="4" fill="#00E5FF" />
           <text x="110" y="105" fill="#555" className="node-text">SUB_AGENT_01</text>
           
           <circle cx="300" cy="100" r="4" fill="#00E5FF" />
           <text x="310" y="105" fill="#555" className="node-text">SUB_AGENT_02</text>

           {/* Peripheral Tool Nodes */}
           <circle cx="50" cy="160" r="3" fill="#FF00FF" opacity="0.6" />
           <circle cx="150" cy="160" r="3" fill="#FF00FF" opacity="0.6" />
           <circle cx="250" cy="160" r="3" fill="#FF00FF" opacity="0.6" />
           <circle cx="350" cy="160" r="3" fill="#FF00FF" opacity="0.6" />
        </g>

        {/* Animated Data Pulse placeholders */}
        <circle r="2" fill="#FFF" className="data-pulse-anim">
           <animateMotion path="M 200 40 L 100 100" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle r="2" fill="#FFF" className="data-pulse-anim">
           <animateMotion path="M 200 40 L 300 100" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
