import React from 'react';
import { LabyrinthGenerator } from './LabyrinthGenerator.js';
import { Gallery } from './Gallery.js';
import { GameView } from './GameView.js';

export function MainApp() {
    const [room] = React.useState(() => new WebsimSocket());
    const [view, setView] = React.useState('generator'); // 'generator', 'game'
    const [activeLabyrinth, setActiveLabyrinth] = React.useState(null);
    const [activeTab, setActiveTab] = React.useState('create');

    const handlePlayLabyrinth = (labyrinth) => {
        setActiveLabyrinth(labyrinth);
        setView('game');
    };

    const handleReturnToMenu = () => {
        setView('generator');
        setActiveLabyrinth(null);
    };

    return (
        <div className="app-container">
            {view === 'generator' && (
                <>
                    <div className="tabs">
                        <div 
                            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                            onClick={() => setActiveTab('create')}
                        >
                            Create
                        </div>
                        <div 
                            className={`tab ${activeTab === 'gallery' ? 'active' : ''}`}
                            onClick={() => setActiveTab('gallery')}
                        >
                            Gallery
                        </div>
                    </div>
                    
                    <div className={`tab-content ${activeTab === 'create' ? 'active' : ''}`}>
                        <LabyrinthGenerator room={room} onPlayLabyrinth={handlePlayLabyrinth} />
                    </div>
                    
                    <div className={`tab-content ${activeTab === 'gallery' ? 'active' : ''}`}>
                        <Gallery room={room} onPlayLabyrinth={handlePlayLabyrinth} />
                    </div>
                </>
            )}

            {view === 'game' && activeLabyrinth && (
                <GameView 
                    labyrinth={activeLabyrinth} 
                    onReturnToMenu={handleReturnToMenu}
                    room={room}
                />
            )}
        </div>
    );
}

