import csv
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv('.env.local')

# --- CONFIGURATION ---
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
CSV_FILE_PATH = '/home/ubuntu/upload/TheSpaceManual-Spaces.csv'

# --- Supabase Client Initialization ---
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Supabase client initialized successfully.")
except Exception as e:
    print(f"🔥 Error initializing Supabase client: {e}")
    exit()

# --- Data Loading and Processing ---
def get_data_from_csv():
    """Reads and processes data from the CSV file."""
    with open(CSV_FILE_PATH, mode='r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        data_to_update = []
        for row in reader:
            slug = row.get('Slug')
            if not slug:
                continue

            update_payload = {
                "architect": row.get('Architect / Interior', '').strip() or None,
                "brand": row.get('Brand', '').strip() or None,
                "year_opened": int(row.get('Year of Opening')) if row.get('Year of Opening') else None,
                "michelin_stars": int(row.get('Michelin Stars')) if row.get('Michelin Stars') else None,
                "neighborhood": row.get('Location', '').strip() or None,
                "gallery": [img.strip() for img in row.get('Gallery', '').split(';') if img.strip()] if row.get('Gallery') else None,
            }
            
            # Remove None values to avoid overwriting existing data with nulls
            update_payload = {k: v for k, v in update_payload.items() if v is not None}

            if update_payload:
                data_to_update.append({"slug": slug, "payload": update_payload})
    return data_to_update

def update_destinations_in_supabase(data):
    """Updates destinations in Supabase in batches."""
    updated_count = 0
    failed_count = 0
    skipped_count = 0
    
    print(f"\nFound {len(data)} destinations with new data to update.")

    for item in data:
        slug = item["slug"]
        payload = item["payload"]

        try:
            # First, find the destination ID from the slug
            # This assumes slugs are unique
            dest_response = supabase.from_('destinations').select('id').eq('slug', slug).execute()
            
            if dest_response.data and len(dest_response.data) > 0:
                destination_id = dest_response.data[0]['id']
                
                # Now, update the destination by its ID
                update_response = supabase.from_('destinations').update(payload).eq('id', destination_id).execute()

                if update_response.data and len(update_response.data) > 0:
                    print(f"  - ✅ Successfully updated: {slug}")
                    updated_count += 1
                else:
                    print(f"  - 🔥 FAILED to update: {slug}")
                    failed_count += 1
            else:
                print(f"  - ⚠️  SKIPPED: Destination with slug '{slug}' not found in Supabase.")
                skipped_count += 1

        except Exception as e:
            print(f"  - 🔥 An unexpected error occurred for slug {slug}: {e}")
            failed_count += 1

    print("\n" + "="*60)
    print("--- MIGRATION SUMMARY ---")
    print("="*60)
    print(f"✅ Successfully updated destinations: {updated_count}")
    print(f"⚠️  Skipped (not found in DB): {skipped_count}")
    print(f"🔥 Failed to update destinations: {failed_count}")
    print(f"📊 Total processed: {len(data)}")
    print("="*60)

# --- Main Execution ---
if __name__ == "__main__":
    print("="*60)
    print("Starting data migration from CSV to Supabase...")
    print("="*60)
    csv_data = get_data_from_csv()
    if csv_data:
        update_destinations_in_supabase(csv_data)
    else:
        print("No data to update.")
    print("\nMigration process finished.")

