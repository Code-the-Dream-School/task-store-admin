#!/usr/bin/env node
/**
 * Reset various tables in the database
 * Features:
 *  - Node 20, uses pg and dotenv
 *  - Loads DATABASE_URL and RESET_URL from environment
 *  - Prompts user to choose an option (1–4)
 *  - Option 1: Delete all rows in Task, then User
 *  - Option 2: Delete all rows in classRoll
 *  - Option 3: Delete all rows in Origin, then POST to RESET_URL
 *  - Option 4: Exit immediately
 *  - Each destructive operation requires confirmation
 */

const readline = require('readline');
const dotenv = require('dotenv');
const pkg = require('pg');

const { Client } = pkg;

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
const resetUrl = process.env.RESET_URL;

if (!dbUrl || !resetUrl) {
  console.error('❌ Error: DATABASE_URL and RESET_URL must both be defined in .env');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function confirm(message) {
  const answer = (await ask(`${message} (y/N): `)).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
}

async function run() {
  console.log('\n🧰 Database Reset Utility');
  console.log('-------------------------');
  console.log('1. Delete all entries in Task and User tables');
  console.log('2. Delete all entries in classRoll table');
  console.log('3. Delete all entries in Origin table, then POST to RESET_URL');
  console.log('4. Exit');
  console.log('-------------------------');

  const choice = await ask('Enter your choice (1–4): ');
  const client = new Client({ connectionString: dbUrl });

  try {
    switch (choice.trim()) {
      case '1':
        if (!(await confirm('⚠️  This will DELETE ALL rows from Task and User tables. Proceed?'))) break;
        await client.connect();
        await client.query('BEGIN');
        await client.query('DELETE FROM "Task"');
        await client.query('DELETE FROM "User"');
        await client.query('COMMIT');
        console.log('✅ Task and User tables cleared.');
        break;

      case '2':
        if (!(await confirm('⚠️  This will DELETE ALL rows from classRoll. Proceed?'))) break;
        await client.connect();
        await client.query('DELETE FROM "classRoll"');
        console.log('✅ classRoll table cleared.');
        break;

      case '3':
        if (!(await confirm('⚠️  This will DELETE ALL rows from Origin AND notify the front end. Proceed?'))) break;
        await client.connect();
        await client.query('DELETE FROM "Origin"');
        console.log('✅ Origin table cleared.');

        // POST to RESET_URL
        try {
          const res = await fetch(resetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dbUrl })
          });

          if (!res.ok) {
            throw new Error(`Server responded with ${res.status}`);
          }

          console.log(`✅ Notified front end at ${resetUrl}`);
        } catch (err) {
          console.error(`❌ Failed to POST to RESET_URL: ${err.message}`);
        }
        break;

      case '4':
        console.log('👋 Exiting without changes.');
        break;

      default:
        console.error('❌ Invalid choice. Please enter a number from 1–4.');
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    try { await client.query('ROLLBACK'); } catch {}
  } finally {
    await client.end().catch(() => {});
    rl.close();
  }
}

run();
