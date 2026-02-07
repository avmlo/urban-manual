'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, X, Upload, Link2, Search, MapPin, Star, Crown, ChevronDown, ImageIcon,
  Globe, Phone, Instagram, ExternalLink, Building2, Compass, Calendar, Tag, DollarSign,
  Eye, EyeOff, Hash,
} from 'lucide-react';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import type { Destination } from '@/types/destination';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/ui/searchable-select';
import { SearchableMultiSelect } from '@/ui/searchable-multi-select';
import { RichTextEditor } from './cms/RichTextEditor';

interface Toast {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  safeError?: (error: unknown, fallbackMessage?: string) => void;
}

interface DestinationFormProps {
  destination?: Destination;
  onSave: (data: Partial<Destination>) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  toast: Toast;
  /** Called on every form field change with the full current form data (for autosave) */
  onFormChange?: (data: Partial<Destination>) => void;
  /** Current save state for the header indicator */
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
}

type SectionId = 'details' | 'location' | 'media' | 'content' | 'architecture' | 'booking';

const CATEGORIES = [
  'Restaurant', 'Hotel', 'Bar', 'Cafe', 'Shopping', 'Museum', 'Gallery',
  'Landmark', 'Park', 'Beach', 'Spa', 'Club', 'Theater', 'Market', 'Others',
];

const PRICE_LEVELS = [
  { value: 1, label: '$ - Budget' },
  { value: 2, label: '$$ - Moderate' },
  { value: 3, label: '$$$ - Expensive' },
  { value: 4, label: '$$$$ - Very Expensive' },
];

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'details', label: 'Details', icon: <Hash size={14} /> },
  { id: 'location', label: 'Location', icon: <MapPin size={14} /> },
  { id: 'media', label: 'Media', icon: <ImageIcon size={14} /> },
  { id: 'content', label: 'Content', icon: <Globe size={14} /> },
  { id: 'architecture', label: 'Design', icon: <Building2 size={14} /> },
  { id: 'booking', label: 'Booking', icon: <Phone size={14} /> },
];

interface DropdownOptions {
  cities: string[];
  countries: string[];
  neighborhoods: string[];
  brands: string[];
  architects: string[];
}


export function DestinationForm({
  destination,
  onSave,
  onCancel,
  isSaving,
  toast,
  onFormChange,
}: DestinationFormProps) {
  const [activeSection, setActiveSection] = useState<SectionId>('details');
  const [formData, setFormData] = useState({
    // Core fields
    slug: destination?.slug || '',
    name: destination?.name || '',
    city: destination?.city || '',
    country: destination?.country || '',
    neighborhood: destination?.neighborhood || '',
    category: destination?.category || '',
    brand: destination?.brand || '',
    micro_description: destination?.micro_description || '',
    tags: destination?.tags || [],
    crown: destination?.crown || false,
    michelin_stars: destination?.michelin_stars || null,
    parent_destination_id: destination?.parent_destination_id || null,
    // Location
    latitude: destination?.latitude || null,
    longitude: destination?.longitude || null,
    formatted_address: destination?.formatted_address || '',
    // Media
    image: destination?.image || '',
    // Content
    description: destination?.description || '',
    content: destination?.content || '',
    editorial_summary: destination?.editorial_summary || '',
    // Architecture
    design_firm: destination?.design_firm || '',
    architectural_style: destination?.architectural_style || '',
    design_period: destination?.design_period || '',
    construction_year: destination?.construction_year || null,
    architectural_significance: destination?.architectural_significance || '',
    design_story: destination?.design_story || '',
    // Booking
    website: destination?.website || '',
    phone_number: destination?.phone_number || '',
    instagram_handle: destination?.instagram_handle || '',
    opentable_url: destination?.opentable_url || '',
    resy_url: destination?.resy_url || '',
    booking_url: destination?.booking_url || '',
    google_maps_url: destination?.google_maps_url || '',
    // Data (read-only but stored)
    rating: destination?.rating || null,
    price_level: destination?.price_level || null,
  });

  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [parentSearchResults, setParentSearchResults] = useState<Destination[]>([]);
  const [isSearchingParent, setIsSearchingParent] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Destination | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fetchingGoogle, setFetchingGoogle] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions>({
    cities: [],
    countries: [],
    neighborhoods: [],
    brands: [],
    architects: [],
  });
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const formInitializedRef = useRef(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    details: null,
    location: null,
    media: null,
    content: null,
    architecture: null,
    booking: null,
  });

  // Notify parent of form changes (for autosave)
  useEffect(() => {
    // Skip the initial render and destination-reset renders
    if (!formInitializedRef.current) {
      formInitializedRef.current = true;
      return;
    }
    if (destination && onFormChange) {
      onFormChange(formData as unknown as Partial<Destination>);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // Update form when destination changes
  useEffect(() => {
    if (destination) {
      setFormData({
        slug: destination.slug || '',
        name: destination.name || '',
        city: destination.city || '',
        country: destination.country || '',
        neighborhood: destination.neighborhood || '',
        category: destination.category || '',
        brand: destination.brand || '',
        micro_description: destination.micro_description || '',
        tags: destination.tags || [],
        crown: destination.crown || false,
        michelin_stars: destination.michelin_stars || null,
        parent_destination_id: destination.parent_destination_id || null,
        latitude: destination.latitude || null,
        longitude: destination.longitude || null,
        formatted_address: destination.formatted_address || '',
        image: destination.image || '',
        description: destination.description || '',
        content: destination.content || '',
        editorial_summary: destination.editorial_summary || '',
        design_firm: destination.design_firm || '',
        architectural_style: destination.architectural_style || '',
        design_period: destination.design_period || '',
        construction_year: destination.construction_year || null,
        architectural_significance: destination.architectural_significance || '',
        design_story: destination.design_story || '',
        website: destination.website || '',
        phone_number: destination.phone_number || '',
        instagram_handle: destination.instagram_handle || '',
        opentable_url: destination.opentable_url || '',
        resy_url: destination.resy_url || '',
        booking_url: destination.booking_url || '',
        google_maps_url: destination.google_maps_url || '',
        rating: destination.rating || null,
        price_level: destination.price_level || null,
      });
      setImagePreview(destination.image || null);
      setImageFile(null);

      if (destination.parent_destination_id) {
        (async () => {
          try {
            const supabase = createClient({ skipValidation: true });
            const { data, error } = await supabase
              .from('destinations')
              .select('id, slug, name, city, category, image')
              .eq('id', destination.parent_destination_id)
              .single();
            if (!error && data) {
              setSelectedParent(data as Destination);
            }
          } catch {
            setSelectedParent(null);
          }
        })();
      } else {
        setSelectedParent(null);
      }
    } else {
      // Reset form for new destination
      setFormData({
        slug: '', name: '', city: '', country: '', neighborhood: '', category: '',
        brand: '', micro_description: '', tags: [], crown: false, michelin_stars: null,
        parent_destination_id: null, latitude: null, longitude: null, formatted_address: '',
        image: '', description: '', content: '', editorial_summary: '', design_firm: '',
        architectural_style: '', design_period: '',
        construction_year: null, architectural_significance: '', design_story: '',
        website: '', phone_number: '', instagram_handle: '', opentable_url: '',
        resy_url: '', booking_url: '', google_maps_url: '', rating: null, price_level: null,
      });
      setImagePreview(null);
      setImageFile(null);
      setSelectedParent(null);
    }
  }, [destination]);

  // Fetch dropdown options from normalized tables
  useEffect(() => {
    const fetchDropdownOptions = async () => {
      setIsLoadingDropdowns(true);
      try {
        const supabase = createClient({ skipValidation: true });
        const [citiesResult, countriesResult, neighborhoodsResult, brandsResult, architectsResult] = await Promise.all([
          supabase.from('cities').select('name').order('name'),
          supabase.from('countries').select('name').order('name'),
          supabase.from('neighborhoods').select('name').order('name'),
          supabase.from('brands').select('name').order('name'),
          supabase.from('architects').select('name').order('name'),
        ]);

        setDropdownOptions({
          cities: citiesResult.data?.map(c => c.name).filter(Boolean) || [],
          countries: countriesResult.data?.map(c => c.name).filter(Boolean) || [],
          neighborhoods: neighborhoodsResult.data?.map(n => n.name).filter(Boolean) || [],
          brands: brandsResult.data?.map(b => b.name).filter(Boolean) || [],
          architects: architectsResult.data?.map(a => a.name).filter(Boolean) || [],
        });
      } catch (error) {
        console.error('Error fetching dropdown options:', error);
      } finally {
        setIsLoadingDropdowns(false);
      }
    };
    fetchDropdownOptions();
  }, []);

  // Search for parent destinations
  useEffect(() => {
    if (parentSearchQuery.trim()) {
      const timeoutId = setTimeout(() => searchParentDestinations(parentSearchQuery), 300);
      return () => clearTimeout(timeoutId);
    } else {
      setParentSearchResults([]);
    }
  }, [parentSearchQuery]);

  // Track active section based on scroll position
  useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      let currentSection: SectionId = 'details';

      for (const section of SECTIONS) {
        const el = sectionRefs.current[section.id];
        if (el && el.offsetTop - 80 <= scrollTop) {
          currentSection = section.id;
        }
      }
      setActiveSection(currentSection);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: SectionId) => {
    const el = sectionRefs.current[sectionId];
    if (el && mainContentRef.current) {
      mainContentRef.current.scrollTo({
        top: el.offsetTop - 24,
        behavior: 'smooth',
      });
    }
  };

  const searchParentDestinations = async (query: string) => {
    setIsSearchingParent(true);
    try {
      const supabase = createClient({ skipValidation: true });
      const { data, error } = await supabase
        .from('destinations')
        .select('id, slug, name, city, category, image')
        .is('parent_destination_id', null)
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
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
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
      reader.onloadend = () => setImagePreview(reader.result as string);
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

      const supabase = createClient({ skipValidation: true });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Upload failed');
      }

      const data = await res.json();
      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.safeError ? toast.safeError(error, 'Image upload failed') : toast.error('Image upload failed');
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
      const supabase = createClient({ skipValidation: true });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: formData.name, city: formData.city }),
      });

      if (!res.ok) throw new Error('Failed to fetch from Google');
      const data = await res.json();

      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        city: data.city || prev.city,
        category: data.category || prev.category,
        description: data.description || prev.description,
        content: data.content || prev.content,
        image: data.image || prev.image,
        formatted_address: data.formatted_address || prev.formatted_address,
        phone_number: data.phone_number || prev.phone_number,
        website: data.website || prev.website,
        rating: data.rating || prev.rating,
        price_level: data.price_level || prev.price_level,
        latitude: data.latitude || prev.latitude,
        longitude: data.longitude || prev.longitude,
      }));
      if (data.image) setImagePreview(data.image);
      toast.success('Auto-filled from Google Places');
    } catch (error) {
      console.error('Fetch Google error:', error);
      toast.safeError ? toast.safeError(error, 'Unable to fetch place details') : toast.error('Unable to fetch place details');
    } finally {
      setFetchingGoogle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let imageUrl = formData.image;
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) imageUrl = uploadedUrl;
      else return;
    }

    const data: Partial<Destination> = {
      ...formData,
      image: imageUrl,
      michelin_stars: formData.michelin_stars ? Number(formData.michelin_stars) : undefined,
      construction_year: formData.construction_year ? Number(formData.construction_year) : null,
      latitude: formData.latitude ? Number(formData.latitude) : null,
      longitude: formData.longitude ? Number(formData.longitude) : null,
      rating: formData.rating ? Number(formData.rating) : null,
      price_level: formData.price_level ? Number(formData.price_level) : null,
      tags: formData.tags.length > 0 ? formData.tags : null,
    };
    await onSave(data);
  };

  const handleEnrich = async () => {
    if (!formData.slug || !formData.name || !formData.city) {
      toast.warning('Please fill in name, slug, and city before enriching');
      return;
    }
    setIsEnriching(true);
    try {
      const supabase = createClient({ skipValidation: true });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          slug: formData.slug, name: formData.name, city: formData.city,
          category: formData.category, content: formData.content,
        }),
      });

      if (!response.ok) throw new Error('Enrichment failed');
      const result = await response.json();
      toast.success('Destination enriched with Google Places and AI data');

      if (result.data?.category) {
        setFormData(prev => ({ ...prev, category: result.data.category || prev.category }));
      }
    } catch (error) {
      console.error('Enrich error:', error);
      toast.safeError ? toast.safeError(error, 'Unable to enrich destination') : toast.error('Unable to enrich destination');
    } finally {
      setIsEnriching(false);
    }
  };

  const handlePlaceSelect = async (placeDetails: { placeId?: string }) => {
    if (!placeDetails.placeId) return;
    setFetchingGoogle(true);
    try {
      const supabase = createClient({ skipValidation: true });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('/api/fetch-google-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ placeId: placeDetails.placeId }),
      });

      const data = await response.json();
      if (data.error) return;

      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        city: data.city || prev.city,
        category: data.category || prev.category,
        description: data.description || '',
        content: data.content || '',
        image: data.image || prev.image,
        formatted_address: data.formatted_address || prev.formatted_address,
        phone_number: data.phone_number || prev.phone_number,
        website: data.website || prev.website,
        latitude: data.latitude || prev.latitude,
        longitude: data.longitude || prev.longitude,
      }));
      if (data.image) setImagePreview(data.image);
      toast.success('Auto-filled from Google Places');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setFetchingGoogle(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const inputClasses = "w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-shadow";
  const labelClasses = "block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5";
  const sectionTitleClasses = "text-sm font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-800";

  return (
    <form onSubmit={handleSubmit} className="flex h-full">
      {/* Left Sidebar — Section Anchor Nav */}
      <div className="hidden lg:flex flex-col w-44 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 py-4">
        <nav className="space-y-0.5 px-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left",
                activeSection === section.id
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50"
              )}
            >
              <span className={cn(
                "transition-colors",
                activeSection === section.id ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"
              )}>
                {section.icon}
              </span>
              {section.label}
            </button>
          ))}
        </nav>

        {/* Data quality section in sidebar */}
        {destination && (
          <div className="mt-auto px-3 pt-4 border-t border-gray-200 dark:border-gray-800 mx-2">
            <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Data</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Rating</span>
                <span className="font-medium">{destination.rating ? `${destination.rating}/5` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Views</span>
                <span className="font-medium">{destination.views_count?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Saves</span>
                <span className="font-medium">{destination.saves_count?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content — Stacked Fields */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Scrollable content area */}
        <div ref={mainContentRef} className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-6 space-y-10">

            {/* ─── DETAILS SECTION ─── */}
            <div ref={el => { sectionRefs.current.details = el; }}>
              <h3 className={sectionTitleClasses}>Details</h3>
              <div className="space-y-5">
                {/* Name with Google Places */}
                <div>
                  <label className={labelClasses}>Name</label>
                  <div className="flex gap-2">
                    <GooglePlacesAutocomplete
                      value={formData.name}
                      onChange={(value) => setFormData({ ...formData, name: value })}
                      onPlaceSelect={handlePlaceSelect}
                      placeholder="Search for a place..."
                      className={cn(inputClasses, "flex-1")}
                      types="establishment"
                    />
                    <button
                      type="button"
                      onClick={fetchFromGoogle}
                      disabled={fetchingGoogle || !formData.name.trim()}
                      className="px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Fetch details from Google"
                    >
                      {fetchingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Slug, Brand */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>Slug</label>
                    <input type="text" required value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="url-slug" className={inputClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>Brand</label>
                    <SearchableSelect
                      value={formData.brand}
                      onChange={(value) => setFormData({ ...formData, brand: value })}
                      options={dropdownOptions.brands}
                      placeholder="Select brand..."
                      allowCustomValue
                      isLoading={isLoadingDropdowns}
                    />
                  </div>
                </div>

                {/* Design Firm */}
                <div>
                  <label className={labelClasses}>Design Firm</label>
                  <SearchableMultiSelect
                    values={formData.design_firm ? formData.design_firm.split(', ').filter(Boolean) : []}
                    onChange={(values) => setFormData({ ...formData, design_firm: values.join(', ') })}
                    options={dropdownOptions.architects}
                    placeholder="Search or add design firms..."
                    allowCustomValue
                    isLoading={isLoadingDropdowns}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className={labelClasses}>Category</label>
                  <div className="relative">
                    <button type="button" onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      className={cn(inputClasses, "text-left flex items-center justify-between")}>
                      <span className={formData.category ? "" : "text-gray-400"}>{formData.category || "Select..."}</span>
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", showCategoryDropdown && "rotate-180")} />
                    </button>
                    {showCategoryDropdown && (
                      <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {CATEGORIES.map((cat) => (
                          <button key={cat} type="button"
                            onClick={() => { setFormData({ ...formData, category: cat }); setShowCategoryDropdown(false); }}
                            className={cn("w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800",
                              formData.category === cat && "bg-gray-50 dark:bg-gray-800 font-medium")}>
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Micro Description with character count */}
                <div>
                  <label className={labelClasses}>Micro Description</label>
                  <input type="text" value={formData.micro_description}
                    onChange={(e) => setFormData({ ...formData, micro_description: e.target.value })}
                    placeholder="Short tagline for cards (50-100 chars)" className={inputClasses} maxLength={150} />
                  <div className="mt-1 text-right text-xs text-gray-400">{formData.micro_description.length}/150</div>
                </div>

                {/* Tags */}
                <div>
                  <label className={labelClasses}>Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      placeholder="Add a tag..." className={cn(inputClasses, "flex-1")} />
                    <button type="button" onClick={addTag}
                      className="px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Tag className="h-4 w-4" />
                    </button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {formData.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Parent Destination — Reference Field with Preview */}
                <div>
                  <label className={labelClasses}>Parent Destination</label>
                  <div className="relative">
                    {selectedParent ? (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                        {/* Thumbnail preview */}
                        {(selectedParent as Destination & { image?: string }).image ? (
                          <img
                            src={(selectedParent as Destination & { image?: string }).image!}
                            alt={selectedParent.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{selectedParent.name}</div>
                          <div className="text-xs text-gray-500">{selectedParent.city} · {selectedParent.category}</div>
                        </div>
                        <button type="button" onClick={() => { setSelectedParent(null); setFormData({ ...formData, parent_destination_id: null }); }}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg flex-shrink-0">
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type="text" value={parentSearchQuery} onChange={(e) => setParentSearchQuery(e.target.value)}
                          placeholder="Search parent venue..." className={cn(inputClasses, "pl-9")} />
                        {isSearchingParent && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                        {parentSearchResults.length > 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                            {parentSearchResults.map((parent) => (
                              <button key={parent.id} type="button"
                                onClick={() => { setSelectedParent(parent); setFormData({ ...formData, parent_destination_id: parent.id ?? null }); setParentSearchQuery(''); setParentSearchResults([]); }}
                                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3">
                                {/* Search result with thumbnail */}
                                {(parent as Destination & { image?: string }).image ? (
                                  <img
                                    src={(parent as Destination & { image?: string }).image!}
                                    alt={parent.name}
                                    className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">{parent.name}</div>
                                  <div className="text-xs text-gray-500">{parent.city} · {parent.category}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Badges & Recognition */}
                <div className="space-y-3">
                  <label className={labelClasses}>Badges & Recognition</label>
                  {/* Michelin Stars */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Michelin Stars</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3].map((stars) => (
                        <button key={stars} type="button"
                          onClick={() => { setFormData({ ...formData, michelin_stars: stars || null, category: stars > 0 ? 'Restaurant' : formData.category }); }}
                          className={cn("w-8 h-8 rounded-md text-sm font-medium transition-colors",
                            (formData.michelin_stars || 0) === stars
                              ? "bg-black dark:bg-white text-white dark:text-black"
                              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700")}>
                          {stars}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Crown */}
                  <button type="button" onClick={() => setFormData({ ...formData, crown: !formData.crown })}
                    className={cn("w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                      formData.crown ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                        : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800")}>
                    <div className="flex items-center gap-2">
                      <Crown className={cn("h-4 w-4", formData.crown ? "text-amber-500" : "text-gray-500")} />
                      <span className="text-sm">Featured (Crown)</span>
                    </div>
                    <div className={cn("w-10 h-6 rounded-full relative transition-colors",
                      formData.crown ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600")}>
                      <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                        formData.crown ? "translate-x-5" : "translate-x-1")} />
                    </div>
                  </button>
                </div>

                {/* AI Enrichment */}
                {destination && (
                  <div>
                    <label className={labelClasses}>AI Enrichment</label>
                    <button type="button" onClick={handleEnrich}
                      disabled={isEnriching || !formData.slug || !formData.name || !formData.city}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-800 rounded-md flex items-center justify-center">
                          <Star className="h-4 w-4 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium">Enrich with AI</div>
                          <div className="text-xs text-gray-500">Fetch Google Places data & generate tags</div>
                        </div>
                      </div>
                      {isEnriching ? <Loader2 className="h-4 w-4 animate-spin text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ─── LOCATION SECTION ─── */}
            <div ref={el => { sectionRefs.current.location = el; }}>
              <h3 className={sectionTitleClasses}>Location</h3>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>City</label>
                    <SearchableSelect
                      value={formData.city}
                      onChange={(value) => setFormData({ ...formData, city: value })}
                      options={dropdownOptions.cities}
                      placeholder="Select city..."
                      allowCustomValue
                      isLoading={isLoadingDropdowns}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Neighborhood</label>
                    <SearchableSelect
                      value={formData.neighborhood}
                      onChange={(value) => setFormData({ ...formData, neighborhood: value })}
                      options={dropdownOptions.neighborhoods}
                      placeholder="Select neighborhood..."
                      allowCustomValue
                      isLoading={isLoadingDropdowns}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>Country</label>
                    <SearchableSelect
                      value={formData.country}
                      onChange={(value) => setFormData({ ...formData, country: value })}
                      options={dropdownOptions.countries}
                      placeholder="Select country..."
                      allowCustomValue
                      isLoading={isLoadingDropdowns}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Price Level</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select value={formData.price_level || ''}
                        onChange={(e) => setFormData({ ...formData, price_level: e.target.value ? parseInt(e.target.value) : null })}
                        className={cn(inputClasses, "pl-9")}>
                        <option value="">Not set</option>
                        {PRICE_LEVELS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Formatted Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" value={formData.formatted_address}
                      onChange={(e) => setFormData({ ...formData, formatted_address: e.target.value })}
                      placeholder="123 Main St, City, Country" className={cn(inputClasses, "pl-9")} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>Latitude</label>
                    <div className="relative">
                      <Compass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="number" step="any" value={formData.latitude || ''}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="35.6762" className={cn(inputClasses, "pl-9")} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Longitude</label>
                    <div className="relative">
                      <Compass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="number" step="any" value={formData.longitude || ''}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="139.6503" className={cn(inputClasses, "pl-9")} />
                    </div>
                  </div>
                </div>
                {formData.latitude && formData.longitude && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                    <a href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                      <ExternalLink className="h-4 w-4" />
                      View on Google Maps
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ─── MEDIA SECTION ─── */}
            <div ref={el => { sectionRefs.current.media = el; }}>
              <h3 className={sectionTitleClasses}>Media</h3>
              <div className="space-y-5">
                <div>
                  <label className={labelClasses}>Image</label>
                  <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    className={cn("relative border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden",
                      isDragging ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700")}>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload-input" />
                    <label htmlFor="image-upload-input" className="block cursor-pointer">
                      {imagePreview ? (
                        <div className="relative aspect-video">
                          <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-sm font-medium">Click to change</span>
                          </div>
                          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setImageFile(null); setImagePreview(null); setFormData({ ...formData, image: '' }); }}
                            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Drop an image here</p>
                          <p className="text-xs text-gray-500">or click to browse</p>
                        </div>
                      )}
                    </label>
                  </div>
                  {uploadingImage && <div className="mt-2 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading...</span></div>}
                </div>
                <div>
                  <label className={labelClasses}>Or paste image URL</label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="url" value={formData.image}
                      onChange={(e) => { setFormData({ ...formData, image: e.target.value }); if (!imageFile) setImagePreview(e.target.value || null); }}
                      placeholder="https://..." className={cn(inputClasses, "pl-9")} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setFormData({ ...formData, image: '' }); }}
                    disabled={!imagePreview && !formData.image}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                    Clear Image
                  </button>
                  <label className="flex-1">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    <span className="flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <Upload className="h-4 w-4" />Upload New
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* ─── CONTENT SECTION — Rich Text Editors ─── */}
            <div ref={el => { sectionRefs.current.content = el; }}>
              <h3 className={sectionTitleClasses}>Content</h3>
              <div className="space-y-6">
                <div>
                  <label className={labelClasses}>Short Description</label>
                  <RichTextEditor
                    content={formData.description}
                    onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
                    placeholder="A brief description (1-2 sentences)"
                    minHeight={100}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Full Content</label>
                  <RichTextEditor
                    content={formData.content}
                    onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                    placeholder="Detailed description, what makes it special, atmosphere, best time to visit..."
                    minHeight={250}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Editorial Summary</label>
                  <textarea value={formData.editorial_summary} onChange={(e) => setFormData({ ...formData, editorial_summary: e.target.value })}
                    rows={3} className={cn(inputClasses, "resize-none")} placeholder="Brief editorial summary" />
                </div>
              </div>
            </div>

            {/* ─── ARCHITECTURE SECTION ─── */}
            <div ref={el => { sectionRefs.current.architecture = el; }}>
              <h3 className={sectionTitleClasses}>Design & Architecture</h3>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClasses}>Architectural Style</label>
                    <input type="text" value={formData.architectural_style} onChange={(e) => setFormData({ ...formData, architectural_style: e.target.value })}
                      placeholder="Brutalism, Art Deco..." className={inputClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>Design Period</label>
                    <input type="text" value={formData.design_period} onChange={(e) => setFormData({ ...formData, design_period: e.target.value })}
                      placeholder="1960s, Contemporary..." className={inputClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>Construction Year</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="number" min="1000" max="2100" value={formData.construction_year || ''}
                        onChange={(e) => setFormData({ ...formData, construction_year: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="2020" className={cn(inputClasses, "pl-9")} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Architectural Significance</label>
                  <RichTextEditor
                    content={formData.architectural_significance}
                    onChange={(html) => setFormData(prev => ({ ...prev, architectural_significance: html }))}
                    placeholder="Why this matters architecturally..."
                    minHeight={100}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Design Story</label>
                  <RichTextEditor
                    content={formData.design_story}
                    onChange={(html) => setFormData(prev => ({ ...prev, design_story: html }))}
                    placeholder="Narrative about the design..."
                    minHeight={150}
                  />
                </div>
              </div>
            </div>

            {/* ─── BOOKING SECTION ─── */}
            <div ref={el => { sectionRefs.current.booking = el; }}>
              <h3 className={sectionTitleClasses}>Booking & Contact</h3>
              <div className="space-y-5">
                <div>
                  <label className={labelClasses}>Website</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://example.com" className={cn(inputClasses, "pl-9")} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="tel" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        placeholder="+1 234 567 8900" className={cn(inputClasses, "pl-9")} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>Instagram Handle</label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" value={formData.instagram_handle} onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                        placeholder="username" className={cn(inputClasses, "pl-9")} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>Google Maps URL</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="url" value={formData.google_maps_url} onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                      placeholder="https://maps.google.com/..." className={cn(inputClasses, "pl-9")} />
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
                  <label className={cn(labelClasses, "mb-3")}>Reservation Links</label>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">OpenTable</label>
                      <input type="url" value={formData.opentable_url} onChange={(e) => setFormData({ ...formData, opentable_url: e.target.value })}
                        placeholder="https://opentable.com/..." className={inputClasses} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Resy</label>
                      <input type="url" value={formData.resy_url} onChange={(e) => setFormData({ ...formData, resy_url: e.target.value })}
                        placeholder="https://resy.com/..." className={inputClasses} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Other Booking URL</label>
                      <input type="url" value={formData.booking_url} onChange={(e) => setFormData({ ...formData, booking_url: e.target.value })}
                        placeholder="https://..." className={inputClasses} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom spacing */}
            <div className="h-8" />
          </div>
        </div>

        {/* Sticky Action Bar */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button type="button" onClick={onCancel} disabled={isSaving}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50">
              Cancel
            </button>
            <div className="flex items-center gap-3">
              {destination && (
                <button type="submit" disabled={isSaving}
                  className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                  Save as Draft
                </button>
              )}
              <button type="submit" disabled={isSaving}
                className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50 flex items-center gap-2">
                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving...</span></> : destination ? <><Eye className="h-4 w-4" /><span>Publish</span></> : 'Create Destination'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar — Metadata */}
      <div className="hidden xl:flex flex-col w-56 flex-shrink-0 border-l border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 p-4 overflow-y-auto">
        <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Metadata</div>

        <div className="space-y-4">
          {/* Status */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">Published</span>
            </div>
          </div>

          {/* Slug */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Slug</div>
            <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{formData.slug || '—'}</code>
          </div>

          {/* Category */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Category</div>
            <span className="text-xs font-medium">{formData.category || '—'}</span>
          </div>

          {/* City */}
          <div>
            <div className="text-xs text-gray-500 mb-1">City</div>
            <span className="text-xs font-medium">{formData.city || '—'}</span>
          </div>

          {destination && (
            <>
              {/* Last Enriched */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Last Enriched</div>
                <span className="text-xs">
                  {destination.last_enriched_at ? new Date(destination.last_enriched_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
              </div>

              {/* Place ID */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Place ID</div>
                <code className="text-[10px] font-mono text-gray-500 break-all">{destination.place_id || '—'}</code>
              </div>

              {/* Rating */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Rating</div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-500" />
                  <span className="text-xs font-medium">{destination.rating || '—'}</span>
                  {destination.user_ratings_total && (
                    <span className="text-[10px] text-gray-400">({destination.user_ratings_total.toLocaleString()})</span>
                  )}
                </div>
              </div>

              {/* Engagement */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800">
                <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Engagement</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-white dark:bg-gray-900 rounded-lg">
                    <div className="text-sm font-semibold">{destination.views_count?.toLocaleString() || '0'}</div>
                    <div className="text-[10px] text-gray-500">Views</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-gray-900 rounded-lg">
                    <div className="text-sm font-semibold">{destination.saves_count?.toLocaleString() || '0'}</div>
                    <div className="text-[10px] text-gray-500">Saves</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
