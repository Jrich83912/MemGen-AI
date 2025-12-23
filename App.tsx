import React, { useState, useRef, useEffect } from 'react';
import { Uploader } from './components/Uploader';
import { MemeCanvas } from './components/MemeCanvas';
import { Button } from './components/Button';
import { generateMemeCaptions, editMemeImage } from './services/geminiService';
import { MemeCaption, GeneratedCaption, AppState, MemeTemplate, MemeCanvasHandle } from './types';

// Placeholder templates
const TEMPLATES: MemeTemplate[] = [
  { id: '1', name: 'Distracted Boyfriend', url: 'https://i.imgflip.com/1ur9b0.jpg' },
  { id: '2', name: 'Success Kid', url: 'https://i.imgflip.com/261o3j.jpg' },
  { id: '3', name: 'Drake', url: 'https://i.imgflip.com/30b1gx.jpg' },
  { id: '4', name: 'Two Buttons', url: 'https://i.imgflip.com/1g8my4.jpg' },
];

const App: React.FC = () => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [captions, setCaptions] = useState<MemeCaption[]>([]);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [generatedCaptions, setGeneratedCaptions] = useState<GeneratedCaption[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [editPrompt, setEditPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const memeCanvasRef = useRef<MemeCanvasHandle>(null);

  const selectedCaption = captions.find(c => c.id === selectedCaptionId);

  // Magic Caption Handler
  const handleMagicCaption = async () => {
    if (!currentImage) return;
    
    setAppState(AppState.ANALYZING);
    setErrorMsg(null);
    try {
      const results = await generateMemeCaptions(currentImage);
      setGeneratedCaptions(results);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to generate captions. Try again.");
    } finally {
      setAppState(AppState.IDLE);
    }
  };

  // Image Edit Handler
  const handleImageEdit = async () => {
    if (!currentImage || !editPrompt.trim()) return;

    setAppState(AppState.EDITING);
    setErrorMsg(null);
    try {
      const newImageBase64 = await editMemeImage(currentImage, editPrompt);
      setCurrentImage(newImageBase64);
      setEditPrompt(''); // Clear prompt on success
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to edit image. The prompt might be too complex or blocked.");
    } finally {
      setAppState(AppState.IDLE);
    }
  };

  const addCaption = (text: string) => {
    const id = Date.now().toString();
    const newCaption: MemeCaption = {
      id,
      text,
      x: 300, // Default center-ish
      y: 50,  // Default top
      color: '#FFFFFF',
      fontSize: 32,
    };
    setCaptions((prev) => [...prev, newCaption]);
    setSelectedCaptionId(id); // Auto-select new caption
  };

  const updateCaption = (id: string, updates: Partial<MemeCaption>) => {
    setCaptions((prev) => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCaption = (id: string) => {
    setCaptions((prev) => prev.filter(c => c.id !== id));
    if (selectedCaptionId === id) {
      setSelectedCaptionId(null);
    }
  };

  const handleDownload = async () => {
    if (!memeCanvasRef.current) return;
    try {
      const blob = await memeCanvasRef.current.generateMemeBlob();
      if (!blob) throw new Error("Could not generate image");

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `memegen-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to download meme.");
    }
  };

  const handleShare = async () => {
    if (!memeCanvasRef.current) return;
    try {
      const blob = await memeCanvasRef.current.generateMemeBlob();
      if (!blob) throw new Error("Could not generate image");

      const file = new File([blob], 'meme.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'MemeGen AI',
          text: 'Check out this meme I created with MemeGen AI!',
          files: [file]
        });
      } else {
        // Fallback for desktop/unsupported browsers
        await handleDownload();
        alert("Image downloaded! You can now upload it to your favorite social platform.");
      }
    } catch (err) {
      console.error("Share failed:", err);
      // Usually user cancelled or unsupported
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-3xl">🍌</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              MemeGen AI
            </h1>
          </div>
          <div className="flex space-x-4">
             <a href="#" className="text-gray-400 hover:text-white transition">Gallery</a>
             <a href="#" className="text-gray-400 hover:text-white transition">About</a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Canvas & Upload */}
        <section className="flex-1 flex flex-col space-y-6">
          <MemeCanvas 
            ref={memeCanvasRef}
            imageSrc={currentImage} 
            captions={captions}
            onUpdateCaption={updateCaption}
            onDeleteCaption={deleteCaption}
            selectedId={selectedCaptionId}
            onSelect={setSelectedCaptionId}
          />
          
          {/* Caption Edit Controls */}
          {selectedCaption && (
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-3">
                 <h3 className="font-semibold text-white flex items-center">
                   <svg className="w-4 h-4 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                   Edit Selected Text
                 </h3>
                 <button onClick={() => deleteCaption(selectedCaption.id)} className="text-red-400 hover:text-red-300 text-sm font-medium flex items-center">
                   <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   Delete
                 </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Content</label>
                    <input 
                      type="text" 
                      value={selectedCaption.text}
                      onChange={(e) => updateCaption(selectedCaption.id, { text: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none transition-colors"
                      placeholder="Enter meme text..."
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Color</label>
                    <div className="flex items-center space-x-2 bg-gray-950 p-1 rounded-lg border border-gray-700">
                      <input 
                        type="color" 
                        value={selectedCaption.color}
                        onChange={(e) => updateCaption(selectedCaption.id, { color: e.target.value })}
                        className="h-8 w-10 bg-transparent cursor-pointer rounded overflow-hidden border-none"
                      />
                      <span className="text-xs text-gray-400 font-mono">{selectedCaption.color}</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Size: {selectedCaption.fontSize}px</label>
                    <div className="flex items-center h-10">
                      <span className="text-xs text-gray-500 mr-2">A</span>
                      <input 
                        type="range" 
                        min="12" 
                        max="120" 
                        value={selectedCaption.fontSize}
                        onChange={(e) => updateCaption(selectedCaption.id, { fontSize: Number(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <span className="text-lg text-gray-300 ml-2">A</span>
                    </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <h3 className="font-semibold mb-3">Controls</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Button 
                onClick={() => document.getElementById('file-upload')?.click()} 
                variant="secondary"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
              >
                Upload New
              </Button>
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  if(e.target.files?.[0]) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setCurrentImage(ev.target?.result as string);
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }} 
              />
              <Button 
                onClick={() => addCaption('NEW TEXT')}
                variant="secondary"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
              >
                Add Text
              </Button>
              
              <div className="flex-1"></div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleDownload}
                  variant="ghost"
                  disabled={!currentImage}
                  title="Download Image"
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                >
                  Save
                </Button>
                <Button 
                  onClick={handleShare}
                  variant="primary"
                  disabled={!currentImage}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>}
                >
                  Share
                </Button>
              </div>
            </div>
          </div>

          {!currentImage && (
            <div className="space-y-4">
              <p className="text-gray-400 font-medium">Or choose a template:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {TEMPLATES.map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => setCurrentImage(t.url)}
                    className="rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition relative group aspect-square"
                  >
                    <img src={t.url} crossOrigin="anonymous" alt={t.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <span className="text-sm font-bold">Use Template</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: AI Tools */}
        <aside className="w-full lg:w-96 flex flex-col space-y-6">
          
          {/* Magic Caption Section */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent flex items-center gap-2">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Magic Caption
              </h2>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">
              Let Gemini analyze your image and suggest 5 hilarious captions instantly.
            </p>
            
            <Button 
              className="w-full mb-6" 
              onClick={handleMagicCaption} 
              isLoading={appState === AppState.ANALYZING}
              disabled={!currentImage}
            >
              Generate Captions
            </Button>

            {generatedCaptions.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {generatedCaptions.map((cap, i) => (
                  <button
                    key={i}
                    onClick={() => addCaption(cap.text)}
                    className="w-full text-left p-3 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-indigo-500 transition group"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-white group-hover:text-indigo-200">{cap.text}</p>
                      <span className="text-[10px] uppercase tracking-wider bg-gray-900 text-gray-400 px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                        {cap.category}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* AI Editor Section */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Magic Editor
              </h2>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">
              Use natural language to edit the image (e.g., "Make it cyberpunk", "Remove the background").
            </p>

            <div className="space-y-3">
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Describe your edit..."
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-24"
              />
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-500 shadow-blue-500/30" 
                onClick={handleImageEdit}
                isLoading={appState === AppState.EDITING}
                disabled={!currentImage || !editPrompt.trim()}
              >
                Apply Edit
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl text-sm animate-pulse">
              {errorMsg}
            </div>
          )}

        </aside>
      </main>
    </div>
  );
};

export default App;