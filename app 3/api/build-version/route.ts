import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Get build version from environment or package.json
export async function GET() {
  // Try multiple sources for commit SHA (in order of preference):
  // 1. Vercel's build environment variables
  // 2. GitHub Actions environment variables
  // 3. Git command (for local development)
  const vercelCommitSha = process.env.VERCEL_GIT_COMMIT_SHA;
  const githubSha = process.env.GITHUB_SHA;
  const vercelEnv = process.env.VERCEL_ENV;
  
  // Read package.json version
  let packageVersion = '0.1.0';
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    packageVersion = packageJson.version || '0.1.0';
  } catch (error) {
    console.error('Error reading package.json:', error);
  }
  
  // Get commit SHA from various sources
  let commitSha: string | null = vercelCommitSha || githubSha || null;
  
  // If no commit SHA from environment, try to get it from git (local dev only)
  if (!commitSha) {
    try {
      commitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      // Git command failed (not a git repo or git not available)
      // This is expected in some deployment environments
    }
  }
  
  const shortSha = commitSha ? commitSha.substring(0, 7) : null;
  
  // Build version should always show commit SHA if available
  // Only fall back to package version if no commit SHA is available
  const buildVersion = commitSha 
    ? shortSha + (vercelEnv && vercelEnv !== 'production' ? ` (${vercelEnv})` : '')
    : (process.env.NEXT_PUBLIC_BUILD_VERSION || `${packageVersion}-dev`);

  return NextResponse.json({ 
    version: buildVersion,
    commitSha: commitSha || null,
    shortSha: shortSha || null,
    packageVersion,
    environment: vercelEnv || null
  });
}

