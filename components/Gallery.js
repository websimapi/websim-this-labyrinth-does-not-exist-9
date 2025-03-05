import React from 'react';

export function Gallery({ room, onPlayLabyrinth }) {
    const [labyrinths, setLabyrinths] = React.useState([]);
    
    React.useEffect(() => {
        const unsubscribe = room.collection('labyrinths').subscribe((updatedLabyrinths) => {
            // Sort by creation date (newest first)
            const sorted = [...updatedLabyrinths].sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
            setLabyrinths(sorted);
        });
        
        return () => unsubscribe();
    }, [room]);

    return (
        <div className="gallery-container">
            <h2>Labyrinth Gallery</h2>
            <p>Explore labyrinths created by the community</p>
            
            {labyrinths.length === 0 ? (
                <p>No labyrinths have been created yet. Be the first to create one!</p>
            ) : (
                <div className="gallery">
                    {labyrinths.map((labyrinth) => (
                        <div 
                            key={labyrinth.id} 
                            className="gallery-item"
                            onClick={() => onPlayLabyrinth(labyrinth)}
                        >
                            <img 
                                src={labyrinth.imageUrl} 
                                alt={labyrinth.theme} 
                                className="gallery-image"
                            />
                            <div className="gallery-info">
                                <div className="gallery-title">{labyrinth.theme}</div>
                                <div>Difficulty: {labyrinth.difficulty}</div>
                                <div>By: {labyrinth.username}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

