import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { MemeCaption, MemeCanvasHandle } from '../types';

interface MemeCanvasProps {
  imageSrc: string | null;
  captions: MemeCaption[];
  onUpdateCaption: (id: string, updates: Partial<MemeCaption>) => void;
  onDeleteCaption: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export const MemeCanvas = forwardRef<MemeCanvasHandle, MemeCanvasProps>(({ 
  imageSrc, 
  captions, 
  onUpdateCaption, 
  onDeleteCaption,
  selectedId,
  onSelect
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useImperativeHandle(ref, () => ({
    generateMemeBlob: async () => {
      if (!imgRef.current || !containerRef.current) return null;

      const img = imgRef.current;
      const container = containerRef.current;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Set canvas to natural image size for high quality
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Calculate scaling factors
      const imgRect = img.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // The scale between the rendered image on screen and the natural image
      const scale = img.naturalWidth / imgRect.width;

      // The offset of the image within the container (due to object-contain/centering)
      const offsetX = imgRect.left - containerRect.left;
      const offsetY = imgRect.top - containerRect.top;

      // Draw Captions
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      captions.forEach(cap => {
        // Calculate position relative to the image, not the container
        // cap.x is relative to container left
        // (cap.x - offsetX) is relative to image left (in screen pixels)
        // * scale converts to natural image pixels
        const x = (cap.x - offsetX) * scale;
        const y = (cap.y - offsetY) * scale;

        ctx.font = `700 ${cap.fontSize * scale}px Oswald`;
        ctx.fillStyle = cap.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4 * scale; // Thicker stroke for meme style
        
        // Shadow (matches the CSS drop-shadow)
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4 * scale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2 * scale;

        // Draw Stroke (behind)
        ctx.strokeText(cap.text, x, y);
        
        // Draw Fill (top)
        ctx.shadowBlur = 0; // Reset shadow for fill to avoid double shadow blurriness
        ctx.fillText(cap.text, x, y);
      });

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    }
  }));

  // Handle Dragging Logic
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onSelect(id);
    onUpdateCaption(id, { isDragging: true });
  };
  
  const handleContainerMouseDown = () => {
    onSelect(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    
    captions.forEach(cap => {
      if (cap.isDragging) {
        const x = e.clientX - containerRect.left;
        const y = e.clientY - containerRect.top;
        
        const clampedX = Math.max(0, Math.min(x, containerRect.width));
        const clampedY = Math.max(0, Math.min(y, containerRect.height));

        onUpdateCaption(cap.id, { x: clampedX, y: clampedY });
      }
    });
  };

  const handleMouseUp = () => {
    captions.forEach(cap => {
      if (cap.isDragging) {
        onUpdateCaption(cap.id, { isDragging: false });
      }
    });
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [captions]);

  if (!imageSrc) {
    return (
      <div className="w-full aspect-square bg-gray-800 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p>No Image Selected</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden shadow-2xl bg-black select-none group"
      onMouseMove={handleMouseMove}
      onMouseDown={handleContainerMouseDown}
    >
      <img 
        ref={imgRef}
        src={imageSrc} 
        crossOrigin="anonymous" // Important for canvas export of remote images
        alt="Meme Background" 
        className="w-full h-auto object-contain max-h-[70vh] mx-auto pointer-events-none"
      />
      
      {/* Overlay Captions */}
      {captions.map((caption) => (
        <div
          key={caption.id}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move p-2 border-2 ${selectedId === caption.id ? 'border-indigo-500 bg-black/20' : 'border-transparent hover:border-white/30'}`}
          style={{ 
            left: caption.x, 
            top: caption.y,
            maxWidth: '90%'
          }}
          onMouseDown={(e) => handleMouseDown(e, caption.id)}
        >
          <h2 
            className="meme-text text-center font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] leading-tight"
            style={{ 
              fontSize: `${caption.fontSize}px`,
              color: caption.color,
              WebkitTextStroke: '2px black',
            }}
          >
            {caption.text}
          </h2>
          
          {selectedId === caption.id && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteCaption(caption.id); }}
              className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:bg-red-600"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
});

MemeCanvas.displayName = 'MemeCanvas';