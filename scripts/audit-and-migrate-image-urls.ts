import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// Environment setup
// ---------------------------------------------------------------------------

async function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envExists = await fs
      .access(envPath)
      .then(() => true)
      .catch(() => false);

    if (envExists) {
      const envFile = await fs.readFile(envPath, "utf-8");
      envFile.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2]
              .trim()
              .replace(/^["']|["']$/g, "");
          }
        }
      });
    }
  } catch {
    // Ignore if .env.local doesn't exist
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Describes a single table + column pair that may hold image URLs. */
interface ImageColumnSpec {
  table: string;
  column: string;
  /** Column used to uniquely identify a row when updating (default: "id") */
  idColumn?: string;
  /** Human-readable label column for the report */
  labelColumn?: string;
}

interface AuditRow {
  table: string;
  column: string;
  id: string | number;
  label: string;
  currentUrl: string;
  domain: string;
}

interface MigrationResult {
  table: string;
  column: string;
  id: string | number;
  label: string;
  oldUrl: string;
  newUrl: string;
  status: "success" | "failed";
  error?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * All known tables and their image-holding columns.
 * Extend this list if new tables are added.
 */
const IMAGE_COLUMNS: ImageColumnSpec[] = [
  // destinations
  {
    table: "destinations",
    column: "image",
    idColumn: "id",
    labelColumn: "name",
  },
  {
    table: "destinations",
    column: "image_thumbnail",
    idColumn: "id",
    labelColumn: "name",
  },
  {
    table: "destinations",
    column: "image_original",
    idColumn: "id",
    labelColumn: "name",
  },
  {
    table: "destinations",
    column: "primary_photo_url",
    idColumn: "id",
    labelColumn: "name",
  },
  // architects
  {
    table: "architects",
    column: "image_url",
    idColumn: "id",
    labelColumn: "name",
  },
  // design_firms
  {
    table: "design_firms",
    column: "image_url",
    idColumn: "id",
    labelColumn: "name",
  },
  // design_movements (may also be called "movements")
  {
    table: "design_movements",
    column: "image_url",
    idColumn: "id",
    labelColumn: "name",
  },
  // architectural_photos
  {
    table: "architectural_photos",
    column: "url",
    idColumn: "id",
    labelColumn: "caption",
  },
];

const WEBFLOW_FRAMER_PATTERNS = [
  "webflow.io",
  "webflow.com",
  "uploads-ssl.webflow.com",
  "cdn.prod.website-files.com",
  "framer.com",
  "framerusercontent.com",
];

/** Storage bucket to upload migrated images into. */
const BUCKET_NAME = "images";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isWebflowOrFramerUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return WEBFLOW_FRAMER_PATTERNS.some((pat) => lower.includes(pat));
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

function isSupabaseUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes("supabase") && lower.includes("storage");
}

/** Only allow safe characters in storage paths. */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function guessExtension(url: string, contentType?: string | null): string {
  if (contentType) {
    if (contentType.includes("webp")) return "webp";
    if (contentType.includes("png")) return "png";
    if (contentType.includes("gif")) return "gif";
    if (contentType.includes("svg")) return "svg";
    if (contentType.includes("jpeg") || contentType.includes("jpg"))
      return "jpg";
  }
  // Fallback: check extension in URL
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext && ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return "jpg"; // default
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  label = "Operation"
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (i === maxRetries - 1) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`${label} failed after ${maxRetries} attempts: ${msg}`);
      }
      const delay = 1000 * Math.pow(2, i);
      console.log(
        `  Warning: ${label} failed, retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

async function auditTable(
  supabase: SupabaseClient,
  spec: ImageColumnSpec
): Promise<AuditRow[]> {
  const idCol = spec.idColumn || "id";
  const labelCol = spec.labelColumn || idCol;
  const selectCols = [idCol, labelCol, spec.column]
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(",");

  const { data, error } = await supabase
    .from(spec.table)
    .select(selectCols)
    .not(spec.column, "is", null);

  if (error) {
    // Table might not exist – that's fine, skip silently
    if (
      error.message.includes("does not exist") ||
      error.code === "42P01" ||
      error.message.includes("relation")
    ) {
      return [];
    }
    console.error(
      `  Error querying ${spec.table}.${spec.column}: ${error.message}`
    );
    return [];
  }

  if (!data) return [];

  const rows: AuditRow[] = [];
  for (const row of data) {
    const url = row[spec.column] as string | null;
    if (url && isWebflowOrFramerUrl(url)) {
      rows.push({
        table: spec.table,
        column: spec.column,
        id: row[idCol],
        label: row[labelCol] || String(row[idCol]),
        currentUrl: url,
        domain: extractDomain(url),
      });
    }
  }

  return rows;
}

async function runAudit(supabase: SupabaseClient): Promise<AuditRow[]> {
  console.log("=".repeat(60));
  console.log("  IMAGE URL AUDIT – Webflow & Framer URLs");
  console.log("=".repeat(60));
  console.log();

  const allRows: AuditRow[] = [];

  for (const spec of IMAGE_COLUMNS) {
    process.stdout.write(
      `Checking ${spec.table}.${spec.column}... `
    );
    const rows = await auditTable(supabase, spec);
    console.log(`${rows.length} found`);
    allRows.push(...rows);
  }

  console.log();

  if (allRows.length === 0) {
    console.log(
      "No Webflow or Framer image URLs found. All images may already be migrated."
    );
    return allRows;
  }

  // Summary by table/column
  const summary = new Map<string, number>();
  const domainSummary = new Map<string, number>();
  for (const row of allRows) {
    const key = `${row.table}.${row.column}`;
    summary.set(key, (summary.get(key) || 0) + 1);
    domainSummary.set(row.domain, (domainSummary.get(row.domain) || 0) + 1);
  }

  console.log("-".repeat(60));
  console.log("SUMMARY BY TABLE.COLUMN");
  console.log("-".repeat(60));
  for (const [key, count] of [...summary.entries()].sort()) {
    console.log(`  ${key}: ${count} URLs`);
  }

  console.log();
  console.log("-".repeat(60));
  console.log("SUMMARY BY DOMAIN");
  console.log("-".repeat(60));
  for (const [domain, count] of [...domainSummary.entries()].sort()) {
    console.log(`  ${domain}: ${count} URLs`);
  }

  console.log();
  console.log(`TOTAL: ${allRows.length} Webflow/Framer image URLs found`);
  console.log();

  // Detailed list
  console.log("-".repeat(60));
  console.log("DETAILED LIST");
  console.log("-".repeat(60));
  for (const row of allRows) {
    console.log(
      `  [${row.table}.${row.column}] id=${row.id} "${row.label}"`
    );
    console.log(`    URL: ${row.currentUrl}`);
  }
  console.log();

  return allRows;
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

async function ensureBucketExists(supabase: SupabaseClient): Promise<void> {
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Failed to list buckets: ${listError.message}`);
  }

  const exists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (!exists) {
    console.log(`Creating bucket: ${BUCKET_NAME}...`);
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: [
        "image/webp",
        "image/jpeg",
        "image/png",
        "image/gif",
      ],
    });
    if (error) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
    console.log(`Created bucket: ${BUCKET_NAME}`);
  } else {
    console.log(`Bucket "${BUCKET_NAME}" already exists`);
  }
}

async function downloadImage(
  url: string
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Urban-Manual-Image-Migrator/2.0" },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

async function uploadToStorage(
  supabase: SupabaseClient,
  buffer: Buffer,
  storagePath: string,
  contentType: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType,
      cacheControl: "31536000", // 1 year
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  return publicUrl;
}

async function migrateRow(
  supabase: SupabaseClient,
  row: AuditRow,
  isDryRun: boolean
): Promise<MigrationResult> {
  const result: MigrationResult = {
    table: row.table,
    column: row.column,
    id: row.id,
    label: row.label,
    oldUrl: row.currentUrl,
    newUrl: "",
    status: "failed",
  };

  try {
    // 1. Download
    const { buffer, contentType } = await retryWithBackoff(
      () => downloadImage(row.currentUrl),
      3,
      `Download ${row.label}`
    );
    const ext = guessExtension(row.currentUrl, contentType);
    const mimeType = contentType || `image/${ext === "jpg" ? "jpeg" : ext}`;
    const sizeKB = (buffer.length / 1024).toFixed(1);
    console.log(`  Downloaded (${sizeKB} KB, ${mimeType})`);

    // 2. Build storage path: <table>/<sanitized-label-or-id>.<ext>
    const safeName = sanitizeFilename(
      row.label || String(row.id)
    );
    const storagePath = `${row.table}/${safeName}-${row.column}.${ext}`;

    if (isDryRun) {
      console.log(`  DRY RUN: Would upload to ${storagePath}`);
      result.newUrl = `<dry-run>${storagePath}`;
      result.status = "success";
      return result;
    }

    // 3. Upload to Supabase Storage
    const publicUrl = await retryWithBackoff(
      () => uploadToStorage(supabase, buffer, storagePath, mimeType),
      3,
      `Upload ${row.label}`
    );
    console.log(`  Uploaded to storage`);

    // 4. Update the database row
    const idCol =
      IMAGE_COLUMNS.find(
        (s) => s.table === row.table && s.column === row.column
      )?.idColumn || "id";

    const updateData: Record<string, string> = { [row.column]: publicUrl };

    // For destinations.image, also save the original URL in image_original
    if (row.table === "destinations" && row.column === "image") {
      updateData["image_original"] = row.currentUrl;
    }

    const { error } = await supabase
      .from(row.table)
      .update(updateData)
      .eq(idCol, row.id);

    if (error) {
      throw new Error(`DB update failed: ${error.message}`);
    }

    console.log(`  Updated database`);

    result.newUrl = publicUrl;
    result.status = "success";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  FAILED: ${msg}`);
    result.error = msg;
    result.status = "failed";
  }

  return result;
}

async function runMigration(
  supabase: SupabaseClient,
  rows: AuditRow[],
  isDryRun: boolean
): Promise<void> {
  console.log("=".repeat(60));
  console.log(
    isDryRun
      ? "  IMAGE MIGRATION – DRY RUN (no changes will be made)"
      : "  IMAGE MIGRATION – LIVE"
  );
  console.log("=".repeat(60));
  console.log();

  if (!isDryRun) {
    await ensureBucketExists(supabase);
    console.log();
  }

  // Save backup of old URLs before migration
  const backupPath = path.join(process.cwd(), "backup-webflow-framer-urls.json");
  await fs.writeFile(
    backupPath,
    JSON.stringify(
      rows.map((r) => ({
        table: r.table,
        column: r.column,
        id: r.id,
        label: r.label,
        url: r.currentUrl,
        domain: r.domain,
        timestamp: new Date().toISOString(),
      })),
      null,
      2
    )
  );
  console.log(`Backup saved to: ${backupPath}`);
  console.log();

  const results: MigrationResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(
      `[${i + 1}/${rows.length}] ${row.table}.${row.column} – "${row.label}" (id: ${row.id})`
    );

    const result = await migrateRow(supabase, row, isDryRun);
    results.push(result);
    console.log();
  }

  // Final report
  const success = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status === "failed");

  console.log("=".repeat(60));
  console.log("  MIGRATION REPORT");
  console.log("=".repeat(60));
  console.log(`  Total processed:  ${results.length}`);
  console.log(`  Successful:       ${success.length}`);
  console.log(`  Failed:           ${failed.length}`);
  console.log();

  // Breakdown by table
  const byTable = new Map<string, { success: number; failed: number }>();
  for (const r of results) {
    const key = `${r.table}.${r.column}`;
    const entry = byTable.get(key) || { success: 0, failed: 0 };
    entry[r.status]++;
    byTable.set(key, entry);
  }
  console.log("  By table.column:");
  for (const [key, counts] of [...byTable.entries()].sort()) {
    console.log(
      `    ${key}: ${counts.success} migrated, ${counts.failed} failed`
    );
  }
  console.log();

  if (failed.length > 0) {
    console.log("  FAILURES:");
    for (const f of failed) {
      console.log(
        `    [${f.table}.${f.column}] id=${f.id} "${f.label}": ${f.error}`
      );
    }
    console.log();

    // Save failures to file
    const failPath = path.join(
      process.cwd(),
      "migration-failures.json"
    );
    await fs.writeFile(failPath, JSON.stringify(failed, null, 2));
    console.log(`  Failures saved to: ${failPath}`);
  }

  if (isDryRun) {
    console.log(
      "  This was a DRY RUN. No files were uploaded or database rows updated."
    );
    console.log(
      '  Run without --dry-run to perform the actual migration.'
    );
  }

  // Save full results
  const resultsPath = path.join(
    process.cwd(),
    "migration-results.json"
  );
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`  Full results saved to: ${resultsPath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await loadEnvFile();

  const SUPABASE_URL =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials.");
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
    );
    console.error(
      "You can put them in .env.local or export them in your shell."
    );
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const mode = process.argv[2] || "audit";
  const isDryRun = process.argv.includes("--dry-run");

  if (mode === "audit") {
    const rows = await runAudit(supabase);
    if (rows.length > 0) {
      // Save audit results for reference
      const auditPath = path.join(process.cwd(), "audit-webflow-framer-urls.json");
      await fs.writeFile(auditPath, JSON.stringify(rows, null, 2));
      console.log(`Audit results saved to: ${auditPath}`);
      console.log();
      console.log("To run the migration:");
      console.log(
        "  npm run migrate:image-urls migrate --dry-run   # preview changes"
      );
      console.log(
        "  npm run migrate:image-urls migrate              # apply changes"
      );
    }
  } else if (mode === "migrate") {
    // First do a quick audit to get the current state
    console.log("Running pre-migration audit...\n");
    const rows = await runAudit(supabase);
    if (rows.length === 0) {
      console.log("Nothing to migrate.");
      return;
    }
    console.log();
    await runMigration(supabase, rows, isDryRun);
  } else {
    console.error(`Unknown mode: "${mode}". Use "audit" or "migrate".`);
    console.error("Usage:");
    console.error("  tsx scripts/audit-and-migrate-image-urls.ts audit");
    console.error(
      "  tsx scripts/audit-and-migrate-image-urls.ts migrate [--dry-run]"
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
