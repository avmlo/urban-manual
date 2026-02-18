export type ResourceType = "activity" | "restaurant" | "hotel" | "partner" | "guide" | "list";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  description: string;
  address: string;
  phone: string;
  website: string;
  googleMapsUrl: string;
  agentBookingLink: string;
  price: string;
  hours: string;
  partnerType: string;
  urlLink: string;
  tags: string[];
  images: string[];
  affiliates: string[];
  createdAt: string;
  updatedAt: string;
  lat: number | null;
  lng: number | null;
  hasUnreadUpdate: boolean;
}

export interface Note {
  id: string;
  resourceId: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface ResourceDocument {
  id: string;
  resourceId: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface ResourceFilters {
  search: string;
  location: string | null;
  type: ResourceType | null;
  keywords: string[];
  affiliates: string | null;
}

export type LayoutMode = "split" | "map-full" | "list-full";

export type PanelView =
  | "list"
  | "detail"
  | "add-resource"
  | "add-guide"
  | "add-partner"
  | "add-list";
