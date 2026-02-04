'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Plus, X } from "lucide-react";
import { stripHtmlTags } from "@/lib/stripHtmlTags";
import GooglePlacesAutocomplete from "@/components/GooglePlacesAutocomplete";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/useToast";
import { DataTable } from "./data-table";
import { createColumns, type Destination } from "./columns";
import DiscoverTab from '@/components/admin/DiscoverTab';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Destination Form Component
function DestinationForm({
  destination,
  onSave,
  onCancel,
  isSaving,
  toast
}: {
  destination?: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  toast: any;
}) {
  const sectionCard =
    "rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60";
  const labelClass =
    "text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300";
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-800";
  const textareaClass =
    "w-full rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-800";
  const [formData, setFormData] = useState({
    slug: destination?.slug || '',
    name: destination?.name || '',
    city: destination?.city || '',
    category: destination?.category || '',
    description: stripHtmlTags(destination?.description || ''),
    content: stripHtmlTags(destination?.content || ''),
    image: destination?.image || '',
    michelin_stars: destination?.michelin_stars || null,
    crown: destination?.crown || false,
    parent_destination_id: destination?.parent_destination_id || null,
  });
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentSearchResults, setParentSearchResults] = useState<any[]>([]);
  const [isSearchingParent, setIsSearchingParent] = useState(false);
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fetchingGoogle, setFetchingGoogle] = useState(false);
  const [placeRecommendations, setPlaceRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Update form when destination changes
  useEffect(() => {
    if (destination) {
      setFormData({
        slug: destination.slug || '',
        name: destination.name || '',
        city: destination.city || '',
        category: destination.category || '',
        description: stripHtmlTags(destination.description || ''),
        content: stripHtmlTags(destination.content || ''),
        image: destination.image || '',
        michelin_stars: destination.michelin_stars || null,
        crown: destination.crown || false,
        parent_destination_id: destination.parent_destination_id || null,
      });
      setImagePreview(destination.image || null);
      setImageFile(null);
      
      // Load parent destination if editing
      if (destination.parent_destination_id) {
        (async () => {
          try {
            const supabase = createClient();
            const { data } = await supabase
              .from('destinations')
              .select('id, slug, name, city')
              .eq('id', destination.parent_destination_id)
              .single();
            if (data) setSelectedParent(data);
          } catch {
            setSelectedParent(null);
          }
        })();
      } else {
        setSelectedParent(null);
      }
    } else {
      setFormData({
        slug: '',
        name: '',
        city: '',
        category: '',
        description: '',
        content: '',
        image: '',
        michelin_stars: null,
        crown: false,
        parent_destination_id: null,
      });
      setImagePreview(null);
      setImageFile(null);
      setSelectedParent(null);
    }
  }, [destination]);

  // Search for parent destinations
  useEffect(() => {
    if (parentSearchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchParentDestinations(parentSearchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setParentSearchResults([]);
    }
  }, [parentSearchQuery]);

  const searchParentDestinations = async (query: string) => {
    setIsSearchingParent(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category')
        .is('parent_destination_id', null) // Only top-level destinations can be parents
        .or(`name.ilike.%${query}%,city.ilike.%${query}%,slug.ilike.%${query}%`)
        .limit(10);
      if (error) throw error;
      setParentSearchResults(data || []);
    } catch (error) {
      console.error('Error searching parent destinations:', error);
      setParentSearchResults([]);
    } finally {
      setIsSearchingParent(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setUploadingImage(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', imageFile);
      formDataToSend.append('slug', formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!res.ok) {
        let error;
        try {
          error = await res.json();
        } catch (parseError) {
          const text = await res.text();
          throw new Error(`Upload failed: ${text || res.statusText}`);
        }
        throw new Error(error.error || 'Upload failed');
      }

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        const text = await res.text();
        throw new Error(`Invalid response format: ${text || 'Unable to parse response'}`);
      }
      return data.url;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Image upload failed: ${error.message}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchFromGoogle = async () => {
    if (!formData.name.trim()) {
      toast.warning('Please enter a name first');
      return;
    }

    setFetchingGoogle(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          city: formData.city,
        }),
      });

      if (!res.ok) {
        let error;
        try {
          error = await res.json();
        } catch (parseError) {
          const text = await res.text();
          throw new Error(`Failed to fetch from Google: ${text || res.statusText}`);
        }
        throw new Error(error.error || 'Failed to fetch from Google');
      }

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        const text = await res.text();
        throw new Error(`Invalid response format: ${text || 'Unable to parse response'}`);
      }

      // Auto-fill form with fetched data
      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        city: data.city || prev.city,
        category: data.category || prev.category,
        description: stripHtmlTags(data.description || prev.description),
        content: stripHtmlTags(data.content || prev.content),
        image: data.image || prev.image,
      }));

      // Update image preview if we got an image
      if (data.image) {
        setImagePreview(data.image);
      }

      // Show success message
      toast.success(`Fetched data from Google Places! Name: ${data.name}, City: ${data.city}`);
    } catch (error: any) {
      console.error('Fetch Google error:', error);
      toast.error(`Failed to fetch from Google: ${error.message}`);
    } finally {
      setFetchingGoogle(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Upload image if file selected
    let imageUrl = formData.image;
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        // Don't submit if upload failed
        return;
      }
    }

    const data: any = {
      ...formData,
      image: imageUrl,
      michelin_stars: formData.michelin_stars ? Number(formData.michelin_stars) : null,
      parent_destination_id: selectedParent?.id || null,
    };
    await onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information Section */}
      <section className={sectionCard}>
        <div className="mb-4">
          <p className={labelClass}>Basic Information</p>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Core details</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className={`block mb-1.5 ${labelClass}`}>Name *</label>
            <div className="flex gap-2">
              <GooglePlacesAutocomplete
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                onPlaceSelect={async (placeDetails: any) => {
                  if (placeDetails.placeId) {
                    setFetchingGoogle(true);
                    try {
                      // Get user email from session
                      const supabase = createClient();
                      const { data: { session } } = await supabase.auth.getSession();
                      const token = session?.access_token;
                      if (!token) {
                        throw new Error('Not authenticated');
                      }
                      const response = await fetch('/api/fetch-google-place', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({ placeId: placeDetails.placeId }),
                      });
                      let data;
                      try {
                        data = await response.json();
                      } catch (parseError) {
                        const text = await response.text();
                        console.error('Error parsing response:', text);
                        toast.error('Invalid response format from Google Places API');
                        return;
                      }
                      if (data.error) {
                        console.error('Error fetching place:', data.error);
                        return;
                      }
                      // Auto-fill form with Google data
                      setFormData(prev => ({
                        ...prev,
                        name: data.name || prev.name,
                        city: data.city || prev.city,
                        category: data.category || prev.category,
                        description: stripHtmlTags(data.description || ''),
                        content: stripHtmlTags(data.content || ''),
                        image: data.image || prev.image,
                      }));
                      if (data.image) {
                        setImagePreview(data.image);
                      }
                    } catch (error) {
                      console.error('Error:', error);
                    } finally {
                      setFetchingGoogle(false);
                    }
                  }
                }}
                placeholder="Start typing a place name... (autocomplete enabled)"
                className={`flex-1 ${inputClass}`}
                types="establishment"
              />
              <button
                type="button"
                onClick={fetchFromGoogle}
                disabled={fetchingGoogle || !formData.name.trim()}
                className="px-4 py-2 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap dark:bg-white dark:text-slate-900"
              >
                {fetchingGoogle ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1 inline" />
                    Fetching...
                  </>
                ) : (
                  '🔍 Fetch Details'
                )}
              </button>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Type to see Google Places suggestions, or click "Fetch Details" to auto-fill all fields.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1.5 ${labelClass}`}>Slug *</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="auto-generated if empty"
                className={inputClass}
              />
            </div>
            <div>
              <label className={`block mb-1.5 ${labelClass}`}>City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className={inputClass}
                placeholder="e.g., Tokyo"
              />
            </div>
          </div>
          <div>
            <label className={`block mb-1.5 ${labelClass}`}>Category *</label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={inputClass}
              placeholder="e.g., restaurant, hotel, cafe"
            />
          </div>
          
          {/* Parent Destination Selector */}
          <div>
            <label className={`block mb-1.5 ${labelClass}`}>Parent Destination (Optional)</label>
            <div className="relative">
              {selectedParent ? (
                <div className="flex items-center justify-between p-3 bg-slate-100/70 dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-sm font-medium">{selectedParent.name}</span>
                    <span className="text-xs text-slate-500 ml-2">{selectedParent.city}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParent(null);
                      setFormData({ ...formData, parent_destination_id: null });
                    }}
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={parentSearchQuery}
                    onChange={(e) => setParentSearchQuery(e.target.value)}
                    placeholder="Search for parent destination (e.g., hotel name)..."
                    className={inputClass}
                  />
                  {isSearchingParent && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                  {parentSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {parentSearchResults.map((parent) => (
                        <button
                          key={parent.id}
                          type="button"
                          onClick={() => {
                            setSelectedParent(parent);
                            setFormData({ ...formData, parent_destination_id: parent.id });
                            setParentSearchQuery('');
                            setParentSearchResults([]);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                        >
                          <div className="font-medium text-sm">{parent.name}</div>
                          <div className="text-xs text-slate-500">{parent.city} • {parent.category}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select a parent destination if this venue is located within another (e.g., a bar within a hotel)
            </div>
          </div>
        </div>
      </section>

      {/* Image Section */}
      <section className={sectionCard}>
        <div className="mb-4">
          <p className={labelClass}>Media</p>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Hero image</h3>
        </div>
        <div className="space-y-3">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-6 transition-colors ${
              isDragging
                ? 'border-slate-500 bg-slate-100 dark:bg-slate-900/70'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="image-upload-input"
            />
            <label
              htmlFor="image-upload-input"
              className="flex flex-col items-center justify-center cursor-pointer"
            >
              {imagePreview ? (
                <div className="relative w-full">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-2xl mb-3"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setImageFile(null);
                      setImagePreview(null);
                      const input = document.getElementById('image-upload-input') as HTMLInputElement;
                      if (input) input.value = '';
                    }}
                    className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1.5 hover:bg-rose-600 transition-colors"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-4xl mb-2">📷</div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Drag & drop an image here
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    or click to browse
                  </span>
                </>
              )}
            </label>
          </div>
          
          {/* Alternative: File Input Button */}
          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload-button"
              />
              <span className="inline-flex items-center justify-center w-full px-4 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm font-medium">
                📁 {imageFile ? 'Change Image' : 'Choose File'}
              </span>
            </label>
            {imageFile && (
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(formData.image || null);
                }}
                className="px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
              >
                Clear
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">or</div>
          <input
            type="url"
            value={formData.image}
            onChange={(e) => {
              setFormData({ ...formData, image: e.target.value });
              if (!imageFile) {
                setImagePreview(e.target.value || null);
              }
            }}
            placeholder="Enter image URL"
            className={inputClass}
          />
          {imagePreview && (
            <div className="mt-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                onError={() => setImagePreview(null)}
              />
            </div>
          )}
          {uploadingImage && (
            <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading image...
            </div>
          )}
        </div>
      </section>

      {/* Content Section */}
      <section className={sectionCard}>
        <div className="mb-4">
          <p className={labelClass}>Content</p>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Descriptions</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className={`block mb-1.5 ${labelClass}`}>Short Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={`${textareaClass} resize-none`}
              placeholder="A brief, punchy description (1-2 sentences)"
            />
          </div>
          <div>
            <label className={`block mb-1.5 ${labelClass}`}>Full Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className={`${textareaClass} resize-y`}
              placeholder="A detailed description of the destination, what makes it special, atmosphere, best time to visit, etc."
            />
          </div>
        </div>
      </section>

      {/* Additional Details */}
      <section className={sectionCard}>
        <div className="mb-4">
          <p className={labelClass}>Details</p>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Classification</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block mb-1.5 ${labelClass}`}>Michelin Stars</label>
            <input
              type="number"
              min="0"
              max="3"
              value={formData.michelin_stars || ''}
              onChange={(e) => {
                const michelinStars = e.target.value ? Number(e.target.value) : null;
                const updatedFormData = { ...formData, michelin_stars: michelinStars };
                // If Michelin stars are set, ensure category is 'Restaurant'
                if (michelinStars && michelinStars > 0) {
                  updatedFormData.category = 'Restaurant';
                }
                setFormData(updatedFormData);
              }}
              className={inputClass}
              placeholder="0-3"
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="crown-checkbox"
              checked={formData.crown}
              onChange={(e) => setFormData({ ...formData, crown: e.target.checked })}
              className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-2 focus:ring-slate-300"
            />
            <label htmlFor="crown-checkbox" className="text-sm font-medium cursor-pointer text-slate-700 dark:text-slate-200">
              Crown (Featured)
            </label>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="min-w-[100px] px-4 py-2.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium dark:bg-white dark:text-slate-900"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
              Saving...
            </>
          ) : destination ? (
            'Update Place'
          ) : (
            'Create Place'
          )}
        </button>
      </div>
    </form>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const toast = useToast();
  const { confirm, Dialog: ConfirmDialogComponent } = useConfirmDialog();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [destinationList, setDestinationList] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listOffset, setListOffset] = useState(0);
  
  // Regenerate content state
  const [regenerateRunning, setRegenerateRunning] = useState(false);
  const [regenerateResult, setRegenerateResult] = useState<any>(null);
  const [regenerateSlug, setRegenerateSlug] = useState('');
  const [regenerateLimit, setRegenerateLimit] = useState(10);
  const [regenerateOffset, setRegenerateOffset] = useState(0);
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDestination, setEditingDestination] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'destinations' | 'analytics' | 'searches' | 'discover'>('destinations');
  const adminTabs = useMemo(
    () => [
      { id: 'destinations', label: 'Destinations', description: 'Manage places and editorial content.' },
      { id: 'analytics', label: 'Analytics', description: 'Live performance signals across the platform.' },
      { id: 'searches', label: 'Search Logs', description: 'Inspect user intent and discovery demand.' },
      { id: 'discover', label: 'Discover Lab', description: 'Run ML discovery experiments and prompts.' },
    ],
    []
  );

  // Check for tab query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['destinations', 'analytics', 'searches', 'discover'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, []);

  // Searches state
  const [searchLogs, setSearchLogs] = useState<any[]>([]);
  const [loadingSearches, setLoadingSearches] = useState(false);
  const destinationStats = useMemo(() => {
    const total = destinationList.length;
    const enriched = destinationList.filter((item) => !!item.google_place_id).length;
    const crowned = destinationList.filter((item) => item.crown).length;
    const michelin = destinationList.filter((item) => Number(item.michelin_stars) > 0).length;
    const ratingValues = destinationList
      .map((item) => item.rating)
      .filter((value) => typeof value === 'number') as number[];
    const avgRating = ratingValues.length
      ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length
      : 0;
    return {
      total,
      enriched,
      crowned,
      michelin,
      avgRating,
    };
  }, [destinationList]);
  const latestSearchAt = useMemo(() => {
    if (!searchLogs.length) return '—';
    const latest = searchLogs[0]?.created_at;
    if (!latest) return '—';
    return new Date(latest).toLocaleString();
  }, [searchLogs]);

  // Check authentication
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    async function checkAuth() {
      try {
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('[Admin] Auth check timed out after 10 seconds');
            setAuthChecked(true);
            setIsAdmin(false);
          }
        }, 10000);
        
        // Use skipValidation to bypass strict validation that might be too restrictive
        // This allows admin page to work even if validation fails due to strict checks
        const supabase = createClient({ skipValidation: true });
        
        // Try to get session - this will fail if using placeholder client
        const { data: { session }, error } = await supabase.auth.getSession();
        
        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (error) {
          console.error('[Admin] Auth error:', error);
          
          // Check if this is a placeholder client error (invalid config)
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
          const isPlaceholderError = error.message?.includes('placeholder') || 
                                    error.message?.includes('Invalid API key') ||
                                    supabaseUrl.includes('placeholder') ||
                                    !supabaseUrl;
          
          if (isPlaceholderError) {
            console.error('[Admin] Invalid Supabase configuration detected');
          }
          
          if (isMounted) {
            setAuthChecked(true);
            setIsAdmin(false);
            // Redirect to account page on auth error
            setTimeout(() => {
              if (isMounted) {
                router.push('/account');
              }
            }, 1000);
          }
          return;
        }

        if (!session) {
          if (isMounted) {
            setAuthChecked(true);
            setIsAdmin(false);
            router.push('/account');
          }
          return;
        }

        const role = (session.user.app_metadata as Record<string, any> | null)?.role;
        const admin = role === 'admin';
        
        if (isMounted) {
          setUser(session.user);
          setIsAdmin(admin);
          setAuthChecked(true);
          
          if (!admin) {
            // Small delay before redirect to show access denied message
            setTimeout(() => {
              if (isMounted) {
                router.push('/account');
              }
            }, 1500);
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('[Admin] Error checking auth:', error);
        if (isMounted) {
          setAuthChecked(true);
          setIsAdmin(false);
          // Redirect on error after showing message
          setTimeout(() => {
            if (isMounted) {
              router.push('/account');
            }
          }, 2000);
        }
      }
    }

    checkAuth();
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [router]);

  // Load destination list once on mount (client-side filtering/sorting handled by TanStack Table)
  const loadDestinationList = useCallback(async () => {
    if (!isAdmin || !authChecked) return;
    
    setIsLoadingList(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('destinations')
        .select('slug, name, city, category, description, content, image, google_place_id, formatted_address, rating, michelin_stars, crown')
        .order('slug', { ascending: true });

      // Apply search filter if present
      if (listSearchQuery.trim()) {
        query = query.or(`name.ilike.%${listSearchQuery}%,city.ilike.%${listSearchQuery}%,slug.ilike.%${listSearchQuery}%,category.ilike.%${listSearchQuery}%`);
      }

      const { data, error } = await query.range(listOffset, listOffset + 19);

      if (error) {
        console.error('[Admin] Supabase error loading destinations:', error);
        // Safely stringify error to avoid JSON parse issues
        try {
          console.error('[Admin] Error details:', JSON.stringify(error, null, 2));
        } catch (stringifyError) {
          console.error('[Admin] Error details (raw):', error);
        }
        toast.error(`Failed to load destinations: ${error.message || 'Unknown error'}`);
        setDestinationList([]);
        return;
      }
      
      // Sanitize data to prevent JSON parse errors from malformed content
      const sanitizedData = (data || []).map((item: any) => {
        try {
          // Ensure description and content are strings and handle any encoding issues
          const sanitized = { ...item };
          if (sanitized.description && typeof sanitized.description === 'string') {
            // Remove any problematic characters that might break JSON
            sanitized.description = sanitized.description.replace(/\u0000/g, ''); // Remove null bytes
          }
          if (sanitized.content && typeof sanitized.content === 'string') {
            sanitized.content = sanitized.content.replace(/\u0000/g, ''); // Remove null bytes
          }
          return sanitized;
        } catch (sanitizeError) {
          console.warn('[Admin] Error sanitizing destination item:', item?.slug, sanitizeError);
          // Return item as-is if sanitization fails
          return item;
        }
      });
      
      console.log('[Admin] Loaded destinations:', sanitizedData.length);
      setDestinationList(sanitizedData);
    } catch (e: any) {
      console.error('[Admin] Error loading destinations:', e);
      // Check if it's a JSON parse error
      if (e.message?.includes('JSON') || e.message?.includes('parse') || e instanceof SyntaxError) {
        toast.error('Failed to load destinations: Invalid data format. Some destinations may have corrupted content.');
      } else {
        toast.error(`Error loading destinations: ${e.message || 'Unknown error'}`);
      }
      setDestinationList([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [isAdmin, authChecked, listSearchQuery, listOffset, toast]);

  const loadSearchLogs = useCallback(async () => {
    setLoadingSearches(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_interactions')
        .select('id, created_at, interaction_type, user_id, metadata')
        .eq('interaction_type', 'search')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSearchLogs(data || []);
    } catch (error) {
      console.error('[Admin] Error loading search logs:', error);
      toast.error('Failed to load search logs');
      setSearchLogs([]);
    } finally {
      setLoadingSearches(false);
    }
  }, [toast]);

  // Load destinations when admin/auth is ready, or when search/offset changes
  useEffect(() => {
    if (isAdmin && authChecked) {
      // Reset offset when search query changes
      if (listSearchQuery !== '' && listOffset !== 0) {
        setListOffset(0);
        return; // Will trigger another effect run with offset=0
      }
      loadDestinationList();
    }
  }, [isAdmin, authChecked, listSearchQuery, listOffset, loadDestinationList]);

  // Load data when tab changes
  useEffect(() => {
    if (!isAdmin || !authChecked) return;

    if (activeTab === 'searches' && searchLogs.length === 0) {
      loadSearchLogs();
    }
  }, [activeTab, isAdmin, authChecked, searchLogs.length, loadSearchLogs]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (showCreateModal) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [showCreateModal]);

  const handleDeleteDestination = (slug: string, name: string) => {
    confirm({
      title: 'Delete Destination',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const supabase = createClient();
          const { error } = await supabase
            .from('destinations')
            .delete()
            .eq('slug', slug);

          if (error) throw error;

          // Reload the list after deletion
          await loadDestinationList();

          toast.success(`Successfully deleted "${name}"`);
        } catch (e: any) {
          console.error('Delete error:', e);
          toast.error(`Failed to delete: ${e.message}`);
        }
      }
    });
  };

  const handleSearchDestinations = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('destinations')
        .select('slug, name, city')
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (e: any) {
      setSearchResults([]);
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Show loading state
  if (!authChecked) {
    return (
      <main className="px-6 md:px-10 py-20 min-h-screen flex items-center justify-center">
        <div className="container mx-auto flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Checking authentication...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="px-6 md:px-10 py-20 min-h-screen flex items-center justify-center">
        <div className="container mx-auto">
          <div className="text-center max-w-md mx-auto">
            <h1 className="text-2xl font-light mb-4 dark:text-white">Access Denied</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              You need admin privileges to access this page.
            </p>
            <button
              onClick={() => router.push('/account')}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Back to Account
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b12] dark:text-slate-100">
      <div className="relative overflow-hidden border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-8 h-64 w-64 rounded-full bg-slate-200/40 blur-3xl dark:bg-slate-800/40" />
          <div className="absolute -bottom-20 right-8 h-72 w-72 rounded-full bg-slate-200/40 blur-3xl dark:bg-slate-800/40" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-slate-100/40 to-slate-200/30 dark:from-[#0a101a] dark:via-[#0c1220] dark:to-[#101826]" />
        </div>
        <div className="relative z-10 container mx-auto px-6 md:px-10 py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Admin Studio</p>
              <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white">
                Curate destinations with confidence.
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Streamlined workflows for editorial accuracy, enrichment, and live performance insights.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setEditingDestination(null);
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 rounded-2xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors dark:bg-white dark:text-slate-900"
              >
                <Plus className="h-4 w-4 inline-block mr-2" />
                Add Destination
              </button>
              <button
                onClick={() => router.push('/account')}
                className="px-4 py-2 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                Back to Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-10 py-12">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Session</p>
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.email}</p>
                <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
                  Admin
                </span>
              </div>
              <div className="mt-4 rounded-xl bg-slate-50/90 p-3 text-xs text-slate-600 dark:bg-slate-950/60 dark:text-slate-300">
                Latest search: <span className="font-semibold text-slate-900 dark:text-white">{latestSearchAt}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-2 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
              {adminTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-950/60'
                  }`}
                >
                  <div className="text-sm font-semibold">{tab.label}</div>
                  <div className={`text-xs ${activeTab === tab.id ? 'text-white/80 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>
                    {tab.description}
                  </div>
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Quick Actions</p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => {
                    setEditingDestination(null);
                    setShowCreateModal(true);
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
                >
                  Create new destination
                </button>
                <button
                  onClick={() => {
                    setActiveTab('searches');
                    if (searchLogs.length === 0) loadSearchLogs();
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
                >
                  Review search logs
                </button>
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Destinations</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{destinationStats.total}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total curated entries</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Enrichment</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{destinationStats.enriched}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Google Places linked</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Editorial</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{destinationStats.crowned}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Crown selections</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Rating</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {destinationStats.avgRating ? destinationStats.avgRating.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg. starred destinations</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
              <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {adminTabs.find((tab) => tab.id === activeTab)?.label}
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {adminTabs.find((tab) => tab.id === activeTab)?.description}
                  </h2>
                </div>
              </div>

              {/* Destinations Tab */}
              {activeTab === 'destinations' && (
                <div className="fade-in space-y-6 mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Destinations</p>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Content inventory</h3>
                    </div>
                    <button
                      onClick={() => {
                        setEditingDestination(null);
                        setShowCreateModal(true);
                      }}
                      className="px-4 py-2 rounded-2xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors dark:bg-white dark:text-slate-900"
                    >
                      <Plus className="h-4 w-4 inline-block mr-2" />
                      Add Place
                    </button>
                  </div>
                  {isLoadingList ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                    </div>
                  ) : (
                    <DataTable
                      columns={createColumns(
                        (dest) => {
                          setEditingDestination(dest);
                          setShowCreateModal(true);
                        },
                        handleDeleteDestination
                      )}
                      data={destinationList}
                      searchQuery={listSearchQuery}
                      onSearchChange={(query) => {
                        setListSearchQuery(query);
                      }}
                      isLoading={isLoadingList}
                    />
                  )}
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="fade-in mt-6">
                  <AnalyticsDashboard variant="embedded" />
                </div>
              )}

              {/* Searches Tab */}
              {activeTab === 'searches' && (
                <div className="fade-in mt-6">
                  {loadingSearches ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                    </div>
                  ) : searchLogs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No search logs available</div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-slate-800/60">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                            <th className="py-2 pr-4 font-medium text-slate-500">Time</th>
                            <th className="py-2 pr-4 font-medium text-slate-500">User</th>
                            <th className="py-2 pr-4 font-medium text-slate-500">Query</th>
                            <th className="py-2 pr-4 font-medium text-slate-500">City</th>
                            <th className="py-2 pr-4 font-medium text-slate-500">Category</th>
                            <th className="py-2 pr-4 font-medium text-slate-500">Count</th>
                            <th className="py-2 pr-4 font-medium text-slate-500">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {searchLogs.map((log) => {
                            const q = log.metadata?.query || '';
                            const intent = log.metadata?.intent || {};
                            const filters = log.metadata?.filters || {};
                            const count = log.metadata?.count ?? '';
                            const source = log.metadata?.source || '';
                            return (
                              <tr
                                key={log.id}
                                className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                              >
                                <td className="py-2 pr-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                                <td className="py-2 pr-4">{log.user_id ? log.user_id.substring(0, 8) : 'anon'}</td>
                                <td className="py-2 pr-4 max-w-[360px] truncate" title={q}>
                                  {q}
                                </td>
                                <td className="py-2 pr-4">{intent.city || filters.city || ''}</td>
                                <td className="py-2 pr-4">{intent.category || filters.category || ''}</td>
                                <td className="py-2 pr-4">{count}</td>
                                <td className="py-2 pr-4">{source}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Discover Tab */}
              {activeTab === 'discover' && (
                <div className="fade-in mt-6">
                  <DiscoverTab />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Create/Edit Drawer - Outside tabs, always available */}
        {showCreateModal && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => {
                setShowCreateModal(false);
                setEditingDestination(null);
              }}
            />

            {/* Drawer */}
            <div
              className={`fixed right-0 top-0 h-full w-full sm:w-[600px] lg:w-[700px] bg-white dark:bg-gray-950 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${
                showCreateModal ? 'translate-x-0' : 'translate-x-full'
              } overflow-y-auto`}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold">
                  {editingDestination ? 'Edit Destination' : 'Create New Destination'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingDestination(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-blue-700 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <DestinationForm
                  destination={editingDestination}
                  toast={toast}
                  onSave={async (data) => {
                    setIsSaving(true);
                    try {
                      // Special rules: Places starting with "apple" or "aesop"/"aēsop" should be Shopping (retail stores)
                      if (data.name) {
                        const nameLower = data.name.toLowerCase();
                        if (nameLower.startsWith('apple') || nameLower.startsWith('aesop') || nameLower.startsWith('aēsop')) {
                          data.category = 'Shopping';
                        }
                      }
                      // Ensure Michelin-starred destinations are categorized as Restaurant
                      if (data.michelin_stars && data.michelin_stars > 0) {
                        data.category = 'Restaurant';
                      }

                      const supabase = createClient();
                      if (editingDestination) {
                        // Update existing
                        const { error } = await supabase
                          .from('destinations')
                          .update(data)
                          .eq('slug', editingDestination.slug);

                        if (error) throw error;
                      } else {
                        // Create new - generate slug if not provided
                        if (!data.slug && data.name) {
                          data.slug = data.name.toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '');
                        }

                        const { error } = await supabase
                          .from('destinations')
                          .insert([data] as any);

                        if (error) throw error;
                      }

                      setShowCreateModal(false);
                      setEditingDestination(null);
                      await loadDestinationList();
                      toast.success(editingDestination ? 'Destination updated successfully' : 'Destination created successfully');
                    } catch (e: any) {
                      toast.error(`Error: ${e.message}`);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  onCancel={() => {
                    setShowCreateModal(false);
                    setEditingDestination(null);
                  }}
                  isSaving={isSaving}
                />
              </div>
            </div>
          </>
        )}

        {/* Confirm Dialog */}
        <ConfirmDialogComponent />
      </div>
    </main>
  );
}
