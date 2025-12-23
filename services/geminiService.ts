import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedCaption } from "../types";

// Helper to convert Blob/File to Base64 string (raw)
export const fileToGenerativePart = async (file: Blob): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (!result) {
        reject(new Error("Failed to read file"));
        return;
      }
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper for pure base64 string handling
export const base64ToGenerativePart = (base64String: string) => {
  if (base64String.includes(',')) {
    return base64String.split(',')[1];
  }
  return base64String;
};

// Helper to resolve image input (URL or Base64) to raw Base64
const resolveImageInput = async (input: string): Promise<string> => {
  if (input.startsWith('data:')) {
    return base64ToGenerativePart(input);
  }
  
  // Assume it's a URL - Fetch and convert
  try {
    const response = await fetch(input);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    return await fileToGenerativePart(blob);
  } catch (error) {
    console.warn("Fetch failed, trying canvas fallback for CORS images...", error);
    // Fallback: Load into Image and draw to canvas
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context failed"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          const dataUrl = canvas.toDataURL("image/png");
          resolve(base64ToGenerativePart(dataUrl));
        } catch (e) {
          reject(new Error("Canvas tainted, CORS blocked"));
        }
      };
      img.onerror = () => reject(new Error("Failed to load image resource"));
      img.src = input;
    });
  }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMemeCaptions = async (imageInput: string): Promise<GeneratedCaption[]> => {
  try {
    const cleanBase64 = await resolveImageInput(imageInput);
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for better image understanding/humor
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG for simplicity in base64, or detect
              data: cleanBase64
            }
          },
          {
            text: `Analyze this image and generate 5 funny, viral-worthy meme captions. 
            Provide a mix of styles (Funny, Sarcastic, Relatable). 
            Return the response in strictly valid JSON format.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "The meme caption text" },
              category: { type: Type.STRING, description: "The style/category of the caption" }
            },
            required: ["text", "category"]
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    const result = JSON.parse(jsonText) as GeneratedCaption[];
    return result;
  } catch (error) {
    console.error("Error generating captions:", error);
    throw error;
  }
};

export const editMemeImage = async (imageInput: string, prompt: string): Promise<string> => {
  try {
    const cleanBase64 = await resolveImageInput(imageInput);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Nano banana for image editing
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          },
          {
            text: `Edit this image: ${prompt}. Maintain the main subject but apply the requested changes.`
          }
        ]
      }
    });

    // Extract the image from the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image generated in response");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};