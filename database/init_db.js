/**
 * TIXORA Supabase Diagnostic & Deployment Helper
 * Database Engine: Supabase (PostgreSQL)
 * Host: Vercel (Production)
 */

const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, 'tixora.sql');

console.log('⚡ [TIXORA SUPABASE PROTOCOL] Verifying database schema file...');

if (!fs.existsSync(SQL_FILE)) {
    console.error('❌ Error: database/tixora.sql not found!');
    process.exit(1);
}

const sqlContent = fs.readFileSync(SQL_FILE, 'utf8');
const tableCount = (sqlContent.match(/CREATE TABLE/g) || []).length;
const viewCount = (sqlContent.match(/CREATE OR REPLACE VIEW/g) || []).length;
const triggerCount = (sqlContent.match(/CREATE TRIGGER/g) || []).length;
const rlsCount = (sqlContent.match(/ENABLE ROW LEVEL SECURITY/g) || []).length;

console.log(`✅ Supabase SQL Schema verified:`);
console.log(`   • Tables:    ${tableCount} core relational tables`);
console.log(`   • Views:     ${viewCount} real-time analytics views`);
console.log(`   • Triggers:  ${triggerCount} automated PL/pgSQL business triggers`);
console.log(`   • RLS:       ${rlsCount} Row Level Security policies`);
console.log(`   • Size:      ${(sqlContent.length / 1024).toFixed(1)} KB`);

console.log('\n🚀 DEPLOYMENT INSTRUCTIONS FOR SUPABASE:');
console.log('   1. Open your Supabase Dashboard: https://supabase.com/dashboard');
console.log('   2. Navigate to "SQL Editor" on the left menu.');
console.log('   3. Paste the contents of "database/tixora.sql" and click "RUN".');
console.log('   4. Connect your Supabase Project URL & Anon Key in the Tixora Admin Portal.\n');
