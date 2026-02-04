'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export type Destination = {
  slug: string;
  name: string;
  city: string;
  category: string;
  description?: string;
  content?: string;
  image?: string;
  google_place_id?: string;
  formatted_address?: string;
  rating?: number;
  michelin_stars?: number;
  crown?: boolean;
  parent_destination_id?: number | null;
};

export const createColumns = (
  onEdit: (destination: Destination) => void,
  onDelete: (slug: string, name: string) => void
): ColumnDef<Destination>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const destination = row.original;
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{destination.name}</span>
          {destination.crown && (
            <Badge variant="default" className="text-xs">Crown</Badge>
          )}
          {destination.michelin_stars && destination.michelin_stars > 0 && (
            <Badge variant="outline" className="text-xs">
              ⭐ {destination.michelin_stars}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'city',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          City
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-xs text-gray-500">{row.getValue('city')}</div>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => (
      <div className="text-xs capitalize">{row.getValue('category')}</div>
    ),
  },
  {
    accessorKey: 'google_place_id',
    header: 'Status',
    cell: ({ row }) => {
      const isEnriched = !!row.original.google_place_id;
      return (
        <Badge variant={isEnriched ? 'default' : 'secondary'} className="text-xs">
          {isEnriched ? 'Enriched' : 'Not Enriched'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'formatted_address',
    header: 'Address',
    cell: ({ row }) => {
      const hasAddress = !!row.original.formatted_address;
      return hasAddress ? (
        <span className="text-xs text-green-600 dark:text-green-400">✓</span>
      ) : (
        <span className="text-xs text-gray-400">—</span>
      );
    },
  },
  {
    accessorKey: 'rating',
    header: () => <div className="text-right">Rating</div>,
    cell: ({ row }) => {
      const rating = row.original.rating;
      return rating ? (
        <div className="text-right text-xs text-green-600 dark:text-green-400">
          ⭐ {rating.toFixed(1)}
        </div>
      ) : (
        <div className="text-right text-xs text-gray-400">—</div>
      );
    },
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
        {row.getValue('slug')}
      </code>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const destination = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onEdit(destination)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(destination.slug, destination.name)}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

