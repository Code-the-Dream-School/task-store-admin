#!/usr/bin/env node
/**
 * Utility 1: Load GitHub usernames from a file into the classRole table
 * Requirements:
 *  - Node 20
 *  - Uses `pg` for PostgreSQL
 *  - Loads .env variables
 *  - Validates DATABASE_URL and a file path argument
 *  - Ignores comment lines (#)
 *  - Inserts unique, lowercased githubName values
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv'); 
const pkg = require('pg');

const { Client } = pkg;

(async function main() {
  try {
    // Load .env
    dotenv.config();

    // --- Check command line arguments ---
    const [,, filePath] = process.argv;
    if (!filePath) {
      console.error('❌ Error: You must provide exactly one argument — the path to the input file.');
      process.exit(1);
    }

    // --- Check DATABASE_URL ---
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('❌ Error: DATABASE_URL not found in environment.');
      process.exit(1);
    }

    // --- Check if file is readable ---
    const absPath = path.resolve(filePath);
    if (!fs.existsSync(absPath)) {
      console.error(`❌ Error: File not found at ${absPath}`);
      process.exit(1);
    }

    const lines = fs.readFileSync(absPath, 'utf-8').split('\n');

    // --- Connect to the database ---
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    let addedCount = 0;

    for (let rawLine of lines) {
      const line = rawLine.trim();

      // Skip blank or comment lines
      if (!line || line.startsWith('#')) continue;

      // Validate GitHub username: letters, numbers, dashes, <=39 chars
      if (!/^[a-zA-Z0-9-]{1,39}$/.test(line)) {
        console.error(`⚠️ Skipping invalid GitHub username: "${line}"`);
        continue;
      }

      const githubName = line.toLowerCase();

      try {
        const result = await client.query(
          'INSERT INTO "classRoll" ("githubName") VALUES ($1) ON CONFLICT ("githubName") DO NOTHING RETURNING "githubName"',
          [githubName]
        );
        addedCount += result.rowCount;
      } catch (err) {
        // Ignore unique constraint violations
        if (err.code === '23505') continue;
        console.error(`❌ Database error: ${err.message}`);
        await client.end();
        process.exit(1);
      }
    }

    await client.end();
    console.log(`✅ Done. ${addedCount} new GitHub names added.`);
  } catch (err) {
    console.error(`❌ Fatal error: ${err.message}`);
    process.exit(1);
  }
})();
