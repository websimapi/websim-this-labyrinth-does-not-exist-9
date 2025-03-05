import React from 'react';
import { LabyrinthGame } from './LabyrinthGame.js';
import { MobileControls } from './MobileControls.js';

export function GameView({ labyrinth, onReturnToMenu, room }) {
    const [showDescription, setShowDescription] = React.useState(true);
    const [audioPlayer, setAudioPlayer] = React.useState(null);
    const [isMobile, setIsMobile] = React.useState(false);
    const gameRef = React.useRef(null);
    
    React.useEffect(() => {
        // Check if we're on mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    React.useEffect(() => {
        // Set up music if provided
        if (labyrinth.musicUrl) {
            const audio = new Audio(labyrinth.musicUrl);
            audio.loop = true;
            audio.volume = 0.7;
            setAudioPlayer(audio);
            
            // Start playing when game starts
            audio.play().catch(e => console.log("Audio playback prevented:", e));
            
            return () => {
                audio.pause();
                audio.currentTime = 0;
            };
        }
    }, [labyrinth.musicUrl]);

    const handleCloseDescription = () => {
        setShowDescription(false);
        // Attempt to play music after user interaction
        if (audioPlayer) {
            audioPlayer.play().catch(e => console.log("Audio playback prevented:", e));
        }
    };

    const handleControlInput = (action) => {
        if (gameRef.current) {
            gameRef.current.handleControlInput(action);
        }
    };

    const toggleAudio = () => {
        if (audioPlayer) {
            if (audioPlayer.paused) {
                audioPlayer.play();
            } else {
                audioPlayer.pause();
            }
        }
    };

    return (
        <div className="game-view">
            <div className="game-container">
                <LabyrinthGame 
                    labyrinth={labyrinth} 
                    room={room}
                    ref={gameRef}
                />
            </div>
            
            <button className="menu-button" onClick={onReturnToMenu} title="Return to menu">
                ⮜
            </button>
            
            {audioPlayer && (
                <button 
                    className="menu-button" 
                    onClick={toggleAudio}
                    style={{ right: 70 }}
                    title="Toggle music"
                >
                    {audioPlayer.paused ? '🔇' : '🔊'}
                </button>
            )}
            
            <div className="game-info">
                <h3>{labyrinth.theme}</h3>
                <div>Created by: {labyrinth.username}</div>
            </div>
            
            {isMobile && (
                <MobileControls onControlInput={handleControlInput} />
            )}
            
            {showDescription && (
                <div className="overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2>{labyrinth.theme}</h2>
                            <button className="modal-close" onClick={handleCloseDescription}>×</button>
                        </div>
                        <div className="game-description">
                            {labyrinth.description}
                        </div>
                        <div>
                            <p>Use WASD or arrow keys to move.</p>
                            <p>Mouse to look around.</p>
                            {isMobile && <p>Touch controls available on mobile.</p>}
                        </div>
                        <button onClick={handleCloseDescription}>Enter the Labyrinth</button>
                    </div>
                </div>
            )}
        </div>
    );
}

