import React, { useRef } from 'react';
import { Button } from './Button';

interface UploaderProps {
  onImageSelect: (base64: string) => void;
}

export const Uploader: React.FC<UploaderProps> = ({ onImageSelect }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onImageSelect(result);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center transition-colors hover:border-indigo-500 hover:bg-gray-800/50 cursor-pointer bg-gray-800"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={inputRef}
        onChange={handleChange} 
      />
      <div className="flex flex-col items-center">
        <svg className="w-12 h-12 text-indigo-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 className="text-lg font-medium text-white mb-1">Upload an Image</h3>
        <p className="text-sm text-gray-400">Drag & drop or click to browse</p>
      </div>
    </div>
  );
};