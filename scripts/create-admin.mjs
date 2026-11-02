#!/usr/bin/env node
/**
 * Create (or promote) a store admin.
 *
 *   node --env-file=.env.local scripts/create-admin.mjs owner@example.com
 *
 * Prompts for a password if the user doesn't exist yet. Uses the SECRET key,
 * so run it only from a trusted machine. Public sign-ups stay disabled.
 */
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";

const [email, roleArg = "owner"] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> [owner|staff]");
  process.exit(1);
}
if (!["owner", "staff"].includes(roleArg)) {
  console.error("Role must be owner or staff.");
  process.exit(1);
}
if (!url || !secret) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUser(target) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

let user = await findUser(email);
if (!user) {
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Password for the new admin (min 10 chars): ");
    rl.close();
  }
  if (!password || password.length < 10) {
    console.error("Password must be at least 10 characters.");
    process.exit(1);
  }
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    console.error("Could not create user:", error.message);
    process.exit(1);
  }
  user = data.user;
  console.log(`Created auth user ${email}`);
}

const { error } = await supabase.from("admin_users").upsert({ user_id: user.id, role: roleArg });
if (error) {
  console.error("Could not grant admin:", error.message);
  process.exit(1);
}
console.log(`${email} is now an admin (${roleArg}).`);
