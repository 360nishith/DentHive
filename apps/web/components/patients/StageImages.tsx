import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import api from '../../../lib/api';
import { Button } from '../../ui/button';
import { Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { toast } from 'react-hot-toast';

interface StageImage {
  id: string;
  imageUrl: string;
  createdAt: string;
}

export function StageImages({ stageId, tenantStatus }: { stageId: string, tenantStatus: string }) {
  const [images, setImages] = useState<StageImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      fetchImages();
    }
  }, [stageId, isExpanded]);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/stages/${stageId}/images`);
      setImages(res.data);
    } catch (err) {
      console.error('Failed to fetch stage images', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (tenantStatus === 'READ_ONLY') {
      toast.error('Your subscription is inactive. Read-only mode.');
      return;
    }

    setIsUploading(true);
    
    // 1. Compress Image on Client Side
    try {
      const options = {
        maxSizeMB: 0.2, // 200KB limit
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      const fileName = `${stageId}-${Date.now()}.jpg`;

      // 2. Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('clinical-images')
        .upload(fileName, compressedFile, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // 3. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('clinical-images')
        .getPublicUrl(fileName);

      const imageUrl = publicUrlData.publicUrl;

      // 4. Save to Database
      await api.post(`/stages/${stageId}/images`, { imageUrl });
      
      toast.success('Image uploaded successfully');
      fetchImages();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Make sure the clinical-images bucket is set up publically in Supabase.');
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = ''; // Reset input
      }
    }
  };

  if (!isExpanded) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-6 text-[10px] px-2 w-full mt-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
        onClick={() => setIsExpanded(true)}
      >
        <ImageIcon className="w-3 h-3 mr-1" />
        Images
      </Button>
    );
  }

  return (
    <div className="w-full mt-2 border-t border-slate-100 pt-2 flex flex-col items-center">
      <div className="flex w-full justify-between items-center mb-2 px-1">
        <span className="text-[10px] font-semibold text-slate-500 uppercase">Gallery</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-4 text-[10px] px-1 text-slate-400 hover:text-slate-600"
          onClick={() => setIsExpanded(false)}
        >
          Close
        </Button>
      </div>

      <div className="w-full relative">
        <label 
          className={`flex items-center justify-center w-full h-8 border border-dashed border-slate-300 rounded-md bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-colors cursor-pointer ${isUploading || tenantStatus === 'READ_ONLY' ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
          <span className="text-[10px] ml-1 font-medium">{isUploading ? 'Uploading...' : 'Add Image'}</span>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileUpload}
            disabled={isUploading || tenantStatus === 'READ_ONLY'}
          />
        </label>
      </div>

      {isLoading ? (
        <div className="py-2"><Loader2 className="w-3 h-3 animate-spin text-slate-400" /></div>
      ) : images.length > 0 ? (
        <div className="grid grid-cols-2 gap-1 mt-2 w-full">
          {images.map(img => (
            <a 
              key={img.id} 
              href={img.imageUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block relative aspect-square rounded overflow-hidden border border-slate-200 hover:border-indigo-400 transition-colors"
            >
              <img src={img.imageUrl} alt="Stage" className="object-cover w-full h-full" />
            </a>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-slate-400 mt-2 text-center w-full">No images yet</div>
      )}
    </div>
  );
}
