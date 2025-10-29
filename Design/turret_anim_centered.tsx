import React, { useState, useEffect } from 'react';

export default function TurretAnimation() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timeline = [
      { stage: 0, duration: 1500 },  // Standby
      { stage: 1, duration: 600 },   // Deploy: hatch + gun opening
      { stage: 2, duration: 400 },   // Decals build
      { stage: 3, duration: 600 },   // Charging
      { stage: 4, duration: 500 },   // SHOOTING
      { stage: 5, duration: 600 },   // Retract: gun + hatch closing
    ];

    let currentIndex = 0;
    let timeoutId;

    const advance = () => {
      setStage(timeline[currentIndex].stage);
      currentIndex = (currentIndex + 1) % timeline.length;
      timeoutId = setTimeout(advance, timeline[currentIndex].duration);
    };

    advance();
    return () => clearTimeout(timeoutId);
  }, []);

  // Calculate gun scale and opacity
  const getGunTransform = () => {
    if (stage === 0) return { scale: 0.01, opacity: 0 }; // Hidden
    if (stage === 1) return { scale: 1, opacity: 1 };    // Opening (animate to full)
    if (stage >= 2 && stage <= 4) return { scale: 1, opacity: 1 }; // Fully open
    if (stage === 5) return { scale: 0.01, opacity: 0 }; // Closing
    return { scale: 0.01, opacity: 0 };
  };

  const gunTransform = getGunTransform();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes shootRecoil {
          0% {
            transform: translate(-50%, -50%) translateY(0);
          }
          35% {
            transform: translate(-50%, -50%) translateY(24px);
          }
          100% {
            transform: translate(-50%, -50%) translateY(0);
          }
        }
      `}</style>
      
      <div className="relative">
        <div className="w-96 h-96 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 relative border-4 border-slate-600 shadow-2xl">
          
          {/* Hull details */}
          <div className="absolute inset-4 border border-slate-600 opacity-30"></div>
          <div className="absolute top-0 left-1/2 w-px h-full bg-slate-600 opacity-40"></div>
          <div className="absolute top-1/2 left-0 w-full h-px bg-slate-600 opacity-40"></div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            
            {/* Hatch */}
            <div 
              style={{
                opacity: stage >= 1 ? (stage === 5 ? 0 : 1) : 0,
                transform: `scale(${stage >= 1 && stage <= 4 ? 1.1 : 0.5})`,
                transition: 'all 600ms ease-in-out'
              }}
            >
              <div className="w-28 h-28 bg-black rounded-full border-4 border-gray-500 shadow-inner"></div>
            </div>
            
            {/* Gun - always rendered, visibility controlled by scale/opacity */}
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                animation: stage === 4 ? 'shootRecoil 500ms cubic-bezier(0.4, 0.0, 0.1, 1)' : 'none'
              }}
            >
                <div 
                  className="w-16 h-48 bg-gradient-to-t from-slate-600 via-slate-500 to-cyan-500 rounded-2xl relative shadow-lg"
                  style={{
                    transform: `scaleY(${gunTransform.scale})`,
                    opacity: gunTransform.opacity,
                    transformOrigin: 'center',
                    transition: 'all 600ms ease-in-out'
                  }}
                >
                  {/* Tip glow */}
                  <div 
                    className="absolute -top-1 left-1/2 w-12 h-4 bg-cyan-400 rounded-full"
                    style={{
                      transform: `translateX(-50%) scale(${stage === 3 ? 1.3 : 1})`,
                      boxShadow: stage === 3 ? '0 0 20px rgba(34, 211, 238, 0.8)' : '0 0 10px rgba(34, 211, 238, 0.5)',
                      transition: 'all 400ms ease-in-out'
                    }}
                  />
                  
                  {/* Charging */}
                  {stage === 3 && (
                    <>
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-6 bg-cyan-300 rounded-full blur-md opacity-70 animate-pulse"></div>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-8 bg-blue-400 rounded-full blur-lg opacity-50 animate-pulse"></div>
                    </>
                  )}
                  
                  {/* Decals */}
                  {(stage >= 2 && stage <= 4) && (
                    <>
                      <div 
                        className="absolute top-8 left-1/2 -translate-x-1/2 w-8 h-8 border-2 border-slate-700 bg-slate-600/50"
                        style={{ 
                          animation: stage === 2 ? 'fadeInScale 250ms ease-out forwards' : 'none',
                          animationDelay: '50ms',
                          opacity: stage === 2 ? 0 : 1
                        }}
                      />
                      <div 
                        className="absolute top-20 left-1/2 -translate-x-1/2 w-6 h-6 border-2 border-slate-700 bg-slate-600/50"
                        style={{ 
                          animation: stage === 2 ? 'fadeInScale 250ms ease-out forwards' : 'none',
                          animationDelay: '100ms',
                          opacity: stage === 2 ? 0 : 1
                        }}
                      />
                      <div 
                        className="absolute top-32 left-1/2 -translate-x-1/2 w-8 h-8 border-2 border-slate-700 bg-slate-600/50"
                        style={{ 
                          animation: stage === 2 ? 'fadeInScale 250ms ease-out forwards' : 'none',
                          animationDelay: '150ms',
                          opacity: stage === 2 ? 0 : 1
                        }}
                      />
                      
                      <div 
                        className="absolute top-12 -left-2 w-6 h-6 border-2 border-slate-700 bg-slate-600/50"
                        style={{ 
                          animation: stage === 2 ? 'slideInFromLeft 250ms ease-out forwards' : 'none',
                          animationDelay: '100ms',
                          opacity: stage === 2 ? 0 : 1
                        }}
                      />
                      <div 
                        className="absolute top-28 -left-3 w-5 h-5 border-2 border-slate-700 bg-slate-600/50"
                        style={{ 
                          animation: stage === 2 ? 'slideInFromLeft 250ms ease-out forwards' : 'none',
                          animationDelay: '150ms',
                          opacity: stage === 2 ? 0 : 1
                        }}
                      />
                      
                      <div 
                        className="absolute top-12 -right-2 w-6 h-6 border-2 border-slate-700 bg-slate-600/50"
                        style={{ 
                          animation: stage === 2 ? 'slideInFromRight 250ms ease-out forwards' : 'none',
                          animationDelay: '100ms',
                          opacity: stage === 2 ? 0 : 1
                        }}
                      />
                      <div 
                        className="absolute top-28 -right-3 w-5 h-5 border-2 border-slate-700 bg-slate-600/50"
                        style={{ 
                          animation: stage === 2 ? 'slideInFromRight 250ms ease-out forwards' : 'none',
                          animationDelay: '150ms',
                          opacity: stage === 2 ? 0 : 1
                        }}
                      />
                    </>
                  )}
                </div>
                
                {/* Shooting effects */}
                {stage === 4 && (
                  <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
                      <div className="w-24 h-24 bg-cyan-400 rounded-full blur-xl opacity-80 animate-pulse"></div>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-300 rounded-full blur-2xl opacity-60"></div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full w-2 h-60 bg-gradient-to-t from-transparent via-cyan-400 to-cyan-200 blur-sm"></div>
                  </>
                )}
              </div>
            </div>
        </div>
        
        {/* Status */}
        <div className="mt-8 text-center">
          <div 
            className="inline-block px-6 py-2 rounded-full font-semibold border"
            style={{
              transition: 'all 400ms ease-in-out',
              backgroundColor: stage === 4 ? 'rgba(34, 211, 238, 0.3)' :
                               stage === 3 ? 'rgba(234, 179, 8, 0.3)' :
                               stage >= 1 ? 'rgba(59, 130, 246, 0.2)' : 
                               'rgba(34, 197, 94, 0.2)',
              color: stage === 4 ? 'rgb(103, 232, 249)' :
                     stage === 3 ? 'rgb(250, 204, 21)' :
                     stage >= 1 ? 'rgb(96, 165, 250)' : 
                     'rgb(74, 222, 128)',
              borderColor: stage === 4 ? 'rgb(34, 211, 238)' :
                           stage === 3 ? 'rgb(234, 179, 8)' :
                           stage >= 1 ? 'rgb(59, 130, 246)' : 
                           'rgb(34, 197, 94)'
            }}
          >
            {stage === 4 ? '⚡ FIRING' : 
             stage === 3 ? '⚡ CHARGING' :
             stage >= 1 ? '🔧 ARMED' : 
             '✓ STANDBY'}
          </div>
        </div>
      </div>
    </div>
  );
}