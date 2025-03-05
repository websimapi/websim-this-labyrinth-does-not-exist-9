import React from 'react';

export function MobileControls({ onControlInput }) {
    return (
        <div className="mobile-controls">
            <div className="d-pad">
                {/* Empty space in top-left corner */}
                <div></div>
                
                {/* Up button */}
                <button 
                    onTouchStart={() => onControlInput('forward')}
                    onTouchEnd={() => onControlInput('stopForward')}
                >
                    ⬆️
                </button>
                
                {/* Empty space in top-right corner */}
                <div></div>
                
                {/* Left button */}
                <button 
                    onTouchStart={() => onControlInput('left')}
                    onTouchEnd={() => onControlInput('stopLeft')}
                >
                    ⬅️
                </button>
                
                {/* Center button (potentially jump) */}
                <button onTouchStart={() => onControlInput('jump')}>
                    ⚪
                </button>
                
                {/* Right button */}
                <button 
                    onTouchStart={() => onControlInput('right')}
                    onTouchEnd={() => onControlInput('stopRight')}
                >
                    ➡️
                </button>
                
                {/* Empty space in bottom-left corner */}
                <div></div>
                
                {/* Down button */}
                <button 
                    onTouchStart={() => onControlInput('backward')}
                    onTouchEnd={() => onControlInput('stopBackward')}
                >
                    ⬇️
                </button>
                
                {/* Empty space in bottom-right corner */}
                <div></div>
            </div>
            
            <div className="action-buttons">
                <button 
                    className="action-button"
                    onTouchStart={() => onControlInput('lookUp')}
                >
                    👆
                </button>
                <button 
                    className="action-button"
                    onTouchStart={() => onControlInput('lookDown')}
                >
                    👇
                </button>
                <button 
                    className="action-button"
                    onTouchStart={() => onControlInput('turnLeft')}
                >
                    ↺
                </button>
                <button 
                    className="action-button"
                    onTouchStart={() => onControlInput('turnRight')}
                >
                    ↻
                </button>
            </div>
        </div>
    );
}

