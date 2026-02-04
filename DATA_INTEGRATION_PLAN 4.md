# Data Integration Plan: TheSpaceManual-Spaces.csv

**Date:** November 01, 2025
**Author:** Manus AI
**Version:** 1.0

---

## 1. Objective

The goal of this plan is to enrich the existing `destinations` table in the Urban Manual Supabase database with valuable new information from the `TheSpaceManual-Spaces.csv` file. This will add architect, brand, and other key data points to your curated travel destinations.

## 2. New Fields to Add

To accommodate the new data, we will add the following columns to the `destinations` table:

| Column Name | Data Type | Description |
|---|---|---|
| `architect` | `TEXT` | The name of the architect or interior designer. |
| `brand` | `TEXT` | The brand or hotel group (e.g., 'Aman', 'Ace Hotel'). |
| `year_opened` | `INTEGER` | The year the destination was opened. |
| `michelin_stars` | `INTEGER` | The number of Michelin stars, if applicable. |
| `neighborhood` | `TEXT` | The specific neighborhood or district within a city. |
| `gallery` | `TEXT[]` | An array of URLs for additional images. |

## 3. Data Mapping

The data from the CSV file will be mapped to the `destinations` table as follows:

| CSV Column | Supabase Column |
|---|---|
| `Title` | `name` |
| `Slug` | `slug` |
| `City` | `city` |
| `Type` | `category` |
| `Architect / Interior` | `architect` |
| `Brand` | `brand` |
| `Year of Opening` | `year_opened` |
| `Michelin Stars` | `michelin_stars` |
| `Location` | `neighborhood` |
| `Gallery` | `gallery` |
| `Main Image` | `image` |
| `Details` | `content` |

## 4. Migration Strategy

We will use a three-step process to migrate the data:

### Step 1: Update the Database Schema

First, we need to add the new columns to the `destinations` table. You can run the following SQL command in your Supabase SQL Editor:

```sql
ALTER TABLE public.destinations
ADD COLUMN architect TEXT,
ADD COLUMN brand TEXT,
ADD COLUMN year_opened INTEGER,
ADD COLUMN michelin_stars INTEGER,
ADD COLUMN neighborhood TEXT,
ADD COLUMN gallery TEXT[];
```

### Step 2: Import the Data

Next, we will run a Python script to read the CSV file and update the `destinations` table. The script will match destinations based on their `slug`.

I will create this script for you in the next step and save it as `/home/ubuntu/urban-manual/scripts/import_architect_data.py`.

### Step 3: Verify the Data

After running the import script, you can verify the data in your Supabase table. You can run a `SELECT` query to check if the new fields have been populated for a few sample destinations:

```sql
SELECT name, architect, brand, year_opened, michelin_stars
FROM public.destinations
WHERE architect IS NOT NULL
LIMIT 10;
```

## 5. Future Recommendations

For better data integrity and to enable more powerful filtering, I recommend normalizing the `architect` and `brand` data in the future:

*   **Create an `architects` table:** This would store unique architect names and allow you to build dedicated architect profile pages.
*   **Create a `brands` table:** This would store unique brand names and allow for brand-specific pages and filtering.

This would be similar to the database normalization we are already performing for `cities` and `categories`.

