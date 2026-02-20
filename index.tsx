import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- Types ---

interface Location {
  latitude: number;
  longitude: number;
}

interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    placeId?: string;
    title?: string;
    uri?: string; // Google Maps URL
    placeAnswerSources?: {
        reviewSnippets?: {
            content?: string;
        }[]
    }[]
  };
}

interface StoreInfo {
    description: string;
    url?: string;
}

// --- API Helper ---

const analyzeClothing = async (base64Image: string, mimeType: string, location: Location) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are a high-end fashion stylist and personal shopper.
    
    TASK:
    1. Analyze the clothing item in the image. Identify the brand if visible.
    2. Provide specific styling advice for this item.
    3. Find up to 10 physical stores NEAR the user's location using Google Maps.
    4. For each store, find their OFFICIAL WEBSITE using Google Search.
    
    CRITICAL RULES:
    - IF YOU RECOGNIZE THE BRAND, prioritize their official store.
    - Limit results to a MAXIMUM of 10 stores.
    - The URL MUST be the brand's official homepage (e.g., https://www.zara.com), NOT a Google Maps link (e.g., https://maps.google.com...).
    
    OUTPUT FORMAT:
    
    CLOTHING ANALYSIS
    [Write 1 paragraph analyzing the item (fabric, cut, aesthetic, condition).]
    
    STYLING TIPS
    [Write 1 paragraph suggesting how to style it for different occasions.]
    
    STORE LIST
    [Output a numbered list. Format EACH line EXACTLY as follows using pipes "|"]:
    [Number]. [Store Name] | [Official Website URL] | [Description]
    
    Example:
    1. Luca Faloni | https://lucafaloni.com | Specializes in premium linen.
    2. The Kooples | https://www.thekooples.com | Urban-chic aesthetic.
    
    If you cannot find a specific URL, write "SEARCH" in the URL slot.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        // Enable both Maps (for location) and Search (for URLs/Brand info)
        tools: [{ googleMaps: {} }, { googleSearch: {} }],
        toolConfig: {
          retrievalConfig: {
              latLng: {
                  latitude: location.latitude,
                  longitude: location.longitude
              }
          }
        }
      }
    });
    return response;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// --- Components ---

const LocationBadge = ({ location, error }: { location: Location | null, error: string | null }) => {
  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-600 border border-red-200 bg-red-50 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide">
        <i className="fas fa-location-slash"></i>
        <span>LOCATION DISABLED</span>
      </div>
    );
  }
  if (!location) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 border border-gray-200 bg-gray-50 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide animate-pulse">
        <i className="fas fa-circle-notch fa-spin"></i>
        <span>LOCATING...</span>
      </div>
    );
  }
  return (
    <div className="flex items-center space-x-2 text-gray-900 border border-gray-300 bg-white px-3 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm">
      <i className="fas fa-location-dot"></i>
      <span>NEARBY ACTIVE</span>
    </div>
  );
};

interface StoreCardProps {
  chunk: GroundingChunk;
  index: number;
  info?: StoreInfo;
}

const StoreCard: React.FC<StoreCardProps> = ({ chunk, index, info }) => {
  if (!chunk.maps) return null;

  const { title, uri } = chunk.maps;
  
  // Helper to validate if a URL is likely a Maps link
  const isMapsLink = (url: string) => {
      const lower = url.toLowerCase();
      return lower.includes('google.com/maps') || 
             lower.includes('maps.app.goo.gl') || 
             lower.includes('maps.google.com');
  };
  
  // Determine the target URL for the "Online Store" button
  let onlineUrl = "";
  const rawUrl = info?.url?.trim();
  
  // Ensure we rely on a valid web URL, not a maps link
  if (rawUrl && rawUrl !== "SEARCH" && rawUrl.startsWith("http") && !isMapsLink(rawUrl)) {
      onlineUrl = rawUrl;
  } else {
      // Fallback to Google Search if no valid URL provided or if it's a maps link
      const query = encodeURIComponent(`${title} official online store`);
      onlineUrl = `https://www.google.com/search?q=${query}`;
  }

  return (
    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full relative overflow-hidden group">
      {/* Decorative Index Number */}
      <div className="absolute -top-4 -right-4 text-9xl font-serif text-gray-50 opacity-50 pointer-events-none select-none group-hover:text-gray-100 transition-colors">
        {index + 1}
      </div>

      <div className="relative z-10 flex-grow">
        <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3">
            {title}
        </h3>
        
        <div className="mb-6 relative">
             <i className="fas fa-info-circle text-blue-500/20 text-xl absolute -left-1 top-0 opacity-100"></i>
             <p className="text-gray-600 text-sm leading-relaxed pl-6">
                {info?.description || "A recommended local destination for this style."}
             </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-4 relative z-10">
        <a 
            href={uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-black transition-colors shadow-lg shadow-gray-200/50"
        >
            <i className="fas fa-map-pin"></i>
            Location
        </a>
        <a 
            href={onlineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-200 text-gray-900 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
            <i className="fas fa-globe"></i>
            Online Store
        </a>
      </div>
    </div>
  );
};

const App = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [clothingAnalysis, setClothingAnalysis] = useState<string>("");
  const [stylingTips, setStylingTips] = useState<string>("");
  const [storeInfos, setStoreInfos] = useState<StoreInfo[]>([]);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError("Enable location to find stores.");
        }
      );
    } else {
      setLocationError("Geolocation not supported");
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
        setClothingAnalysis("");
        setStylingTips("");
        setStoreInfos([]);
        setGroundingChunks([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image || !location) return;

    setLoading(true);
    try {
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1] || 'image/jpeg';
      
      const response = await analyzeClothing(base64Data, mimeType, location);
      
      const text = response.text || "";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      // --- Text Parsing Logic ---
      
      let parsedAnalysis = "";
      let parsedStyling = "";
      let storeListText = "";
      
      // Split text into sections based on headers
      const stylingSplit = text.split(/STYLING TIPS/i);
      
      if (stylingSplit.length > 1) {
          // Part 0 is Clothing Analysis
          parsedAnalysis = stylingSplit[0].replace(/CLOTHING ANALYSIS/i, "").trim();
          
          const rest = stylingSplit[1];
          const storeSplit = rest.split(/STORE LIST/i);
          
          parsedStyling = storeSplit[0].trim();
          
          if (storeSplit.length > 1) {
              storeListText = storeSplit[1];
          }
      } else {
          // Fallback: If structure is missing, dump everything in analysis
          parsedAnalysis = text.replace(/CLOTHING ANALYSIS/i, "").trim();
      }

      // Parse Store List part
      let infos: StoreInfo[] = [];
      const lines = storeListText.split('\n');
      
      lines.forEach(line => {
         const trimmed = line.trim();
         // Match format: Number. Name | URL | Description
         if (trimmed && /^\d+\./.test(trimmed)) {
             const pipeParts = trimmed.split('|');
             if (pipeParts.length >= 3) {
                 const url = pipeParts[1].trim();
                 const desc = pipeParts.slice(2).join('|').trim();
                 infos.push({ description: desc, url: url });
             } else if (pipeParts.length === 2) {
                 infos.push({ description: pipeParts[1].trim() });
             } else {
                 const colonIndex = trimmed.indexOf(':');
                 if (colonIndex > -1) {
                     infos.push({ description: trimmed.substring(colonIndex + 1).trim() });
                 }
             }
         }
      });

      setClothingAnalysis(parsedAnalysis);
      setStylingTips(parsedStyling);
      setStoreInfos(infos);
      
      // Filter only maps chunks and limit to 10
      const mapChunks = (chunks as GroundingChunk[])
        .filter(c => c.maps)
        .slice(0, 10);
        
      setGroundingChunks(mapChunks);

    } catch (error) {
      console.error(error);
      setClothingAnalysis("We encountered an issue locating the item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const reset = () => {
    setImage(null);
    setClothingAnalysis("");
    setStylingTips("");
    setStoreInfos([]);
    setGroundingChunks([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] text-[#1a1a1a]">
      
      {/* Navigation */}
      <nav className="w-full px-6 py-6 flex justify-between items-center sticky top-0 z-50 bg-[#fafafa]/90 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-2">
            <span className="font-serif text-2xl font-bold tracking-tighter">StyleScout</span>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded-sm">Beta</span>
        </div>
        <LocationBadge location={location} error={locationError} />
      </nav>

      <main className="flex-grow flex flex-col lg:flex-row h-full">
        
        {/* Left Column: Image / Upload */}
        <div className="w-full lg:w-1/2 p-4 lg:p-8 flex flex-col justify-center items-center lg:sticky lg:top-20 lg:h-[calc(100vh-80px)]">
            <div className="w-full h-full max-w-xl relative group rounded-xl overflow-hidden shadow-2xl bg-white border border-gray-100">
                {!image ? (
                    <div 
                        onClick={triggerFileInput}
                        className="w-full h-full min-h-[400px] flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-500"
                    >
                        <div className="w-16 h-16 border border-black rounded-full flex items-center justify-center mb-6">
                            <i className="fas fa-plus text-xl"></i>
                        </div>
                        <h2 className="font-serif text-2xl mb-2">Upload Reference</h2>
                        <p className="text-gray-500 text-sm tracking-wide uppercase">Drag & Drop or Click</p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            accept="image/*" 
                            className="hidden" 
                        />
                    </div>
                ) : (
                    <>
                        <img src={image} alt="Analysis Target" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                        <button 
                            onClick={reset}
                            className="absolute top-6 right-6 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer z-10"
                        >
                            <i className="fas fa-times text-black"></i>
                        </button>
                    </>
                )}
            </div>

            {/* Analyze Action */}
            {image && !clothingAnalysis && !loading && (
                 <div className="mt-8 w-full max-w-xl">
                    <button 
                        onClick={handleAnalyze}
                        disabled={!location}
                        className={`
                            w-full py-5 px-8 bg-black text-white font-bold tracking-widest uppercase text-sm
                            transition-all duration-300 hover:bg-gray-800 hover:shadow-2xl
                            ${!location ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}
                        `}
                    >
                        {location ? 'Scout Locations' : 'Waiting for GPS...'}
                    </button>
                 </div>
            )}
             {loading && (
                <div className="mt-8 flex flex-col items-center">
                    <div className="loader w-8 h-8 rounded-full border-2 border-gray-200 mb-4"></div>
                    <span className="text-xs font-bold tracking-widest uppercase animate-pulse">Consulting Stylist AI...</span>
                </div>
            )}
        </div>

        {/* Right Column: Results */}
        <div className="w-full lg:w-1/2 p-4 lg:p-12 lg:overflow-y-auto bg-white border-l border-gray-100 min-h-[50vh]">
            {clothingAnalysis ? (
                <div className="max-w-xl mx-auto space-y-12 animate-fade-in">
                    
                    {/* Clothing Analysis */}
                    <section>
                        <h2 className="font-serif text-3xl font-bold mb-4 flex items-center gap-3">
                            <i className="fas fa-search-plus text-xl opacity-20"></i>
                            Clothing Analysis
                        </h2>
                        <div className="prose prose-lg prose-headings:font-serif prose-p:text-gray-600 prose-p:font-light prose-p:leading-8 bg-gray-50 p-6 rounded-lg border border-gray-100">
                             <p className="whitespace-pre-wrap">{clothingAnalysis.replace(/\[\d+\]/g, '').replace(/\*\*/g, '')}</p>
                        </div>
                    </section>

                    {/* Styling Tips */}
                    {stylingTips && (
                        <section>
                            <h2 className="font-serif text-3xl font-bold mb-4 flex items-center gap-3">
                                <i className="fas fa-hat-wizard text-xl opacity-20"></i>
                                Styling Tips
                            </h2>
                            <div className="prose prose-lg prose-headings:font-serif prose-p:text-gray-600 prose-p:font-light prose-p:leading-8 bg-gray-50 p-6 rounded-lg border border-gray-100">
                                <p className="whitespace-pre-wrap">{stylingTips.replace(/\[\d+\]/g, '').replace(/\*\*/g, '')}</p>
                            </div>
                        </section>
                    )}

                    {/* Store Recommendations */}
                    {groundingChunks.length > 0 && (
                        <section className="pt-8 border-t border-gray-100">
                             <div className="flex justify-between items-end mb-8">
                                <h2 className="font-serif text-3xl font-bold">Sourced Locations</h2>
                                <span className="text-xs font-bold uppercase tracking-widest bg-gray-100 px-2 py-1">
                                    {groundingChunks.length} Matches
                                </span>
                             </div>
                             
                             <div className="grid gap-6">
                                {groundingChunks.map((chunk, idx) => {
                                    // Match info by index
                                    const info = storeInfos[idx];
                                    return (
                                        <StoreCard 
                                            key={idx} 
                                            chunk={chunk} 
                                            index={idx} 
                                            info={info} 
                                        />
                                    );
                                })}
                             </div>
                        </section>
                    )}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
                    {!loading && (
                        <>
                            <i className="fas fa-quote-left text-4xl opacity-20"></i>
                            <p className="text-center font-serif text-2xl opacity-50 max-w-xs">
                                Upload an item to receive a curated list of local stockists.
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>

      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);