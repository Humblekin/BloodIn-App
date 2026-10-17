// Test Suite for BloodIn admin user-deletion fix
// Validates that migration 20261017000000_fix_user_deletion_fk_constraints.sql
// makes every previously-blocking user-referencing foreign key safe to delete
// while preserving authored / shared / historical records (ON DELETE SET NULL).
//
// Run with: npm run test:user-deletion

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(
  __dirname,
  '..',
  'supabase',
  'migrations',
  '20261017000000_fix_user_deletion_fk_constraints.sql'
);
const sql = fs.readFileSync(migrationPath, 'utf8');

// Flatten whitespace so multi-line SQL statements can be matched simply.
const flat = sql.replace(/\s+/g, ' ');

// Every FK that blocked deleting an auth user (referencing auth.users or
// public.profiles with the default NO ACTION / RESTRICT), and the canonical
// constraint name that must be preserved for PostgREST embeds.
const preserved = [
  { con: 'messages_sender_id_fkey',                 tbl: 'messages',            col: 'sender_id',        ref: 'public.profiles(id)', nullable: true },
  { con: 'request_responses_responder_id_fkey',     tbl: 'request_responses',   col: 'responder_id',     ref: 'public.profiles(id)', nullable: true },
  { con: 'communities_created_by_fkey',             tbl: 'communities',         col: 'created_by',       ref: 'auth.users(id)',      nullable: true },
  { con: 'organizations_created_by_fkey',           tbl: 'organizations',       col: 'created_by',       ref: 'auth.users(id)',      nullable: true },
  { con: 'campaigns_created_by_fkey',               tbl: 'campaigns',           col: 'created_by',       ref: 'auth.users(id)',      nullable: true },
  { con: 'verification_records_verified_by_fkey',   tbl: 'verification_records',col: 'verified_by',      ref: 'auth.users(id)',      nullable: false },
  { con: 'reports_reporter_id_fkey',                tbl: 'reports',             col: 'reporter_id',      ref: 'auth.users(id)',      nullable: true },
  { con: 'reports_reported_user_id_fkey',           tbl: 'reports',             col: 'reported_user_id', ref: 'auth.users(id)',      nullable: false },
  { con: 'moderation_actions_moderator_id_fkey',    tbl: 'moderation_actions',  col: 'moderator_id',     ref: 'auth.users(id)',      nullable: true },
  { con: 'moderation_actions_target_user_id_fkey',  tbl: 'moderation_actions',  col: 'target_user_id',   ref: 'auth.users(id)',      nullable: false },
  { con: 'audit_logs_actor_id_fkey',                tbl: 'audit_logs',          col: 'actor_id',         ref: 'auth.users(id)',      nullable: false },
];

// ─── Test 1: every blocking FK is re-created with ON DELETE SET NULL ───
console.log('--- Test 1: Blocking foreign keys become ON DELETE SET NULL ---');
for (const fk of preserved) {
  const re = new RegExp(
    `ADD CONSTRAINT ${fk.con} FOREIGN KEY \\(${fk.col}\\) REFERENCES ${fk.ref.replace(/[().]/g, '\\$&')} ON DELETE SET NULL`
  );
  assert(re.test(flat), `Missing ON DELETE SET NULL constraint: ${fk.con}`);
  console.log(`✔ ${fk.con} -> ${fk.ref} SET NULL`);
}
console.log('✔ PASS: all previously-blocking FKs are now ON DELETE SET NULL.');

// ─── Test 2: NOT NULL is dropped on columns that must stay nullable ───
console.log('\n--- Test 2: NOT NULL dropped on preserved author columns ---');
for (const fk of preserved) {
  if (!fk.nullable) continue;
  const re = new RegExp(`ALTER TABLE public\\.${fk.tbl} ALTER COLUMN ${fk.col} DROP NOT NULL`);
  assert(re.test(flat), `Missing DROP NOT NULL for ${fk.tbl}.${fk.col}`);
}
console.log('✔ PASS: preserved author/actor columns can hold NULL.');

// ─── Test 3: embed-critical constraint names preserved ───
console.log('\n--- Test 3: PostgREST embed constraint names preserved ---');
for (const name of ['messages_sender_id_fkey', 'request_responses_responder_id_fkey']) {
  assert(flat.includes(`ADD CONSTRAINT ${name} `), `Client embed depends on ${name}`);
}
console.log('✔ PASS: messages/request_responses embed names unchanged.');

// ─── Test 4: no unbounded cascade / disabled constraints introduced ───
console.log('\n--- Test 4: no unsafe delete behavior introduced ---');
assert(/ADD CONSTRAINT messages_sender_id_fkey[\s\S]*?ON DELETE SET NULL/.test(sql),
  'messages sender must be SET NULL, not cascaded');
assert(!/SET session_replication_role/.test(sql), 'must not disable FK enforcement');
assert(!/ADD CONSTRAINT messages_sender_id_fkey[^;]*ON DELETE CASCADE/.test(flat),
  'must not cascade-delete chat history');
console.log('✔ PASS: no cascading deletes or FK disabling for preserved records.');

// ─── Test 5: migration is self-verifying ───
console.log('\n--- Test 5: migration contains audits + regression test ---');
assert(flat.includes('PRE-FLIGHT AUDIT'), 'expected a pre-flight audit');
assert(flat.includes('POST-FLIGHT AUDIT'), 'expected a post-flight audit');
assert(flat.includes('regression test PASSED'), 'expected an in-migration regression test');
assert(flat.includes('DELETE FROM auth.users WHERE id = _uid'), 'regression test must delete a real auth user');
console.log('✔ PASS: migration audits and verifies itself.');

console.log('\n========================================');
console.log('ALL USER-DELETION VERIFICATION TESTS PASSED!');
console.log('========================================');
