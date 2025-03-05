import React from 'react';

export function LabyrinthGenerator({ room, onPlayLabyrinth }) {
    const [theme, setTheme] = React.useState('');
    const [difficulty, setDifficulty] = React.useState('medium');
    const [musicFile, setMusicFile] = React.useState(null);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [generatedText, setGeneratedText] = React.useState('');
    const [generationStep, setGenerationStep] = React.useState(0); // 0: not started, 1: generating text, 2: generating image

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setMusicFile(file);
        }
    };

    const generateLabyrinth = async () => {
        try {
            setIsGenerating(true);
            setGenerationStep(1);

            // Generate labyrinth description using LLM
            const textCompletion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a creative labyrinth designer. Create a detailed description for an infinite, procedurally-generated labyrinth based on the theme provided. Include details about:
                        - The overall atmosphere and visual style
                        - What types of walls, floors, and ceilings exist
                        - The lighting conditions
                        - Any special features or mechanics that make this labyrinth unique
                        - At least 3 different biomes or zones that could appear
                        - Any creatures or challenges that might be encountered
                        - A short backstory for why this labyrinth exists
                        
                        Keep it to 3-4 paragraphs maximum. Make it mysterious and intriguing.`
                    },
                    {
                        role: "user",
                        content: `Create a labyrinth with the theme: "${theme}". Difficulty level: ${difficulty}.`
                    }
                ]
            });

            const description = textCompletion.content;
            setGeneratedText(description);
            setGenerationStep(2);

            // Generate an image based on the description
            const imagePrompt = `A dramatic, atmospheric establishing shot of a mysterious labyrinth. ${description} Dark, moody lighting. Cinematic quality. 4K resolution.`;
            const imageResult = await websim.imageGen({
                prompt: imagePrompt,
                aspect_ratio: "16:9"
            });

            // Upload music file if provided
            let musicUrl = null;
            if (musicFile) {
                musicUrl = await websim.upload(musicFile);
            }

            // Generate wall textures for different biomes
            const biomeTexturePrompts = await generateBiomeTexturePrompts(description);
            const biomeTextures = await Promise.all(
                biomeTexturePrompts.map(async (prompt) => {
                    const result = await websim.imageGen({
                        prompt: prompt,
                        aspect_ratio: "1:1",
                    });
                    return result.url;
                })
            );

            // Store in database
            const labyrinth = await room.collection('labyrinths').create({
                theme,
                difficulty,
                description,
                imageUrl: imageResult.url,
                musicUrl,
                biomeTextures,
                createdAt: new Date().toISOString()
            });

            setIsGenerating(false);
            setGenerationStep(0);
            
            // Clear form
            setTheme('');
            setDifficulty('medium');
            setMusicFile(null);
            setGeneratedText('');
            
            // Start playing
            onPlayLabyrinth(labyrinth);
            
        } catch (error) {
            console.error("Error generating labyrinth:", error);
            setIsGenerating(false);
            setGenerationStep(0);
            alert("Failed to generate labyrinth. Please try again.");
        }
    };

    const generateBiomeTexturePrompts = async (description) => {
        // Use LLM to generate texture prompts for different biomes based on the description
        const textureCompletion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Based on the labyrinth description, create 3 detailed prompts for wall texture images that would fit the different biomes or zones in this labyrinth. 
                    Each prompt should be for a seamless texture that would look good on walls.
                    Focus on surface details, materials, and visual characteristics.
                    Each prompt should be distinct and represent a different area of the labyrinth.
                    
                    Output ONLY an array of 3 strings, each describing a texture.`
                },
                {
                    role: "user",
                    content: description
                }
            ],
            json: true
        });

        try {
            return JSON.parse(textureCompletion.content);
        } catch (e) {
            // Fallback in case parsing fails
            const content = textureCompletion.content;
            if (Array.isArray(content)) {
                return content;
            }
            // Split by numbered items if not proper JSON
            return [
                "Ancient stone wall texture with moss and mysterious carvings",
                "Crystal-infused obsidian wall with glowing blue veins",
                "Weathered metal plates with rust and faded inscriptions"
            ];
        }
    };

    return (
        <div className="generator-container">
            <h2>Create Your Labyrinth</h2>
            
            {!isGenerating ? (
                <form onSubmit={(e) => { e.preventDefault(); generateLabyrinth(); }}>
                    <div className="form-group">
                        <label htmlFor="theme">Theme or Concept:</label>
                        <input 
                            type="text" 
                            id="theme" 
                            value={theme} 
                            onChange={(e) => setTheme(e.target.value)}
                            placeholder="e.g., Ancient Egyptian tombs, Cyberpunk cityscape, Enchanted forest..."
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="difficulty">Difficulty:</label>
                        <select 
                            id="difficulty" 
                            value={difficulty} 
                            onChange={(e) => setDifficulty(e.target.value)}
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                    
                    <div className="form-group file-input">
                        <label htmlFor="music">Background Music (Optional):</label>
                        <input 
                            type="file" 
                            id="music" 
                            accept="audio/*" 
                            onChange={handleFileChange}
                        />
                        <small>Upload an MP3 or MIDI file to set the mood</small>
                    </div>
                    
                    <button type="submit" disabled={!theme}>Generate Labyrinth</button>
                </form>
            ) : (
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <p>
                        {generationStep === 1 
                            ? "Creating your labyrinth story..." 
                            : "Generating visuals and building your labyrinth..."}
                    </p>
                    
                    {generatedText && (
                        <div className="generated-text">
                            <p>{generatedText}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

