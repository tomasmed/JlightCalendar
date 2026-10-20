#!/usr/bin/env node
/**
 * jlight — Autonomous Agent & CLI Client for JlightCalendar
 * Supports:
 * - jlight connect (Device Code Flow / Pull)
 * - jlight login (PAT Flow / Push)
 * - jlight whoami
 * - jlight events list | add | delete
 * - jlight lists list | add | toggle | delete
 * - jlight chores list | add | toggle | delete
 * - jlight meals list | add | delete
 */

import fs from "fs";
import path from "path";
import os from "os";

interface Config {
  apiUrl: string;
  token?: string;
  agentName?: string;
  boundMember?: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".config", "jlight");
const CONFIG_FILE = path.join(CONFIG_DIR, "credentials.json");

function loadConfig(): Config {
  const envUrl = process.env.JLIGHT_URL;
  const envToken = process.env.JLIGHT_TOKEN;

  let fileConfig: Partial<Config> = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    } catch {
      // Ignore
    }
  }

  return {
    apiUrl: (envUrl || fileConfig.apiUrl || "http://localhost:3000").replace(/\/+$/, ""),
    token: envToken || fileConfig.token,
    agentName: fileConfig.agentName,
    boundMember: fileConfig.boundMember,
  };
}

function saveConfig(cfg: Config) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const config = loadConfig();
  const url = `${config.apiUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (config.token && !headers["Authorization"] && !headers["authorization"]) {
    headers["Authorization"] = `Bearer ${config.token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } else {
    const text = await res.text();
    return { ok: res.ok, status: res.status, data: text };
  }
}

function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

// ==========================================
// Subcommands
// ==========================================

async function cmdConnect(flags: Record<string, string | boolean>) {
  const name = String(flags.name || flags.n || "Autonomous Envoy");
  const crew = flags.crew ? String(flags.crew) : undefined;
  const directive = flags.directive ? String(flags.directive) : undefined;
  const rune = flags.rune ? String(flags.rune) : "◈";
  const stencil = flags.stencil ? String(flags.stencil) : undefined;
  const tagMode = stencil ? "stencil16" : "rune";
  const color = flags.color ? String(flags.color) : "#06b6d4";
  const scope = flags.scope ? String(flags.scope) : "standard";

  const rawJoinCode = flags["join-code"] || flags.j || flags.code;
  const joinCode = rawJoinCode ? String(rawJoinCode).trim().toUpperCase() : undefined;

  console.log(`📡 Initiating handshake for agent '${name}'...`);

  const reqBody: any = {
    agentName: name,
    crew,
    directive,
    tagMode,
    rune,
    color,
    stencilMap: stencil,
    requestedScope: scope,
    joinCode,
  };

  const res = await apiRequest("/api/agent/connect", {
    method: "POST",
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    console.error("❌ Failed to initiate connection:", res.data);
    process.exit(1);
  }

  // Autonomous instant approval via Join Code
  if (res.data.status === "approved" && res.data.token) {
    const token = res.data.token;
    const config = loadConfig();
    config.token = token;
    config.agentName = name;
    saveConfig(config);

    console.log("\n=======================================================");
    console.log(`🎉 Autonomous Self-Registration Approved via Join Code!`);
    console.log(`🔑 Token saved to ${CONFIG_FILE}`);
    console.log(`👤 Bound Inhabitant: ${res.data.boundMember || res.data.memberId}`);
    console.log(`🪐 Galaxy:           ${res.data.galaxyName || res.data.galaxyId}`);
    console.log("=======================================================\n");
    return;
  }

  const { deviceCode, userCode, verificationUri, interval = 3 } = res.data;

  console.log("\n=======================================================");
  console.log(`🔑 Verification Code: \x1b[1m\x1b[36m${userCode}\x1b[0m`);
  console.log(`🔗 Approval Link:    \x1b[4m${verificationUri}\x1b[0m`);
  console.log("=======================================================\n");
  console.log("⏳ Waiting for human operator to approve connection...");

  // Poll
  const intervalMs = interval * 1000;
  while (true) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const pollRes = await apiRequest(`/api/agent/connect?deviceCode=${deviceCode}`);

    if (pollRes.status === 200 && pollRes.data.token) {
      const token = pollRes.data.token;
      const config = loadConfig();
      config.token = token;
      config.agentName = name;
      saveConfig(config);

      console.log("\n🎉 Authentication Approved!");
      console.log(`✅ Token saved to ${CONFIG_FILE}`);
      console.log(`Bound to Inhabitant: ${pollRes.data.memberId} in Galaxy: ${pollRes.data.galaxyId}`);
      break;
    } else if (pollRes.status === 403) {
      console.error("\n❌ Handshake request was denied by human operator.");
      process.exit(1);
    } else if (pollRes.status === 410) {
      console.error("\n❌ Handshake session expired.");
      process.exit(1);
    }
  }
}

async function cmdLogin(flags: Record<string, string | boolean>) {
  const token = flags.token as string;
  const url = flags.url as string;

  if (!token) {
    console.error("Usage: jlight login --token <jlight_ag_...>");
    process.exit(1);
  }

  const config = loadConfig();
  if (url) config.apiUrl = url.replace(/\/+$/, "");
  config.token = token;
  saveConfig(config);

  console.log(`Saved credentials to ${CONFIG_FILE}`);
  // Test whoami
  await cmdWhoami(flags);
}

async function cmdWhoami(flags: Record<string, string | boolean>) {
  const res = await apiRequest("/api/agent/whoami");
  if (!res.ok) {
    console.error("Authentication check failed:", res.data);
    process.exit(1);
  }

  if (flags.json) {
    console.log(JSON.stringify(res.data, null, 2));
    return;
  }

  const { agent, onBehalfOf, galaxy, inhabitants } = res.data;
  console.log("\n🪐 JlightCalendar Agent Status");
  console.log("-----------------------------------------");
  console.log(`Agent:       ${agent.rune} ${agent.agentName} (${agent.scope} scope, ${agent.actionCount} actions)`);
  if (agent.crew) console.log(`Crew:        ${agent.crew}`);
  if (agent.directive) console.log(`Directive:   "${agent.directive}"`);
  console.log(`On Behalf Of: ${onBehalfOf.displayName} (${onBehalfOf.role}, id: ${onBehalfOf.memberId})`);
  console.log(`Galaxy:      ${galaxy?.name || "None"} (${galaxy?.id})`);
  console.log("\nHousehold Inhabitants:");
  for (const inh of inhabitants || []) {
    console.log(`  - [${inh.id}] ${inh.displayName} (${inh.role})`);
  }
}

async function cmdEvents(action: string, positional: string[], flags: Record<string, string | boolean>) {
  if (action === "list" || !action) {
    const res = await apiRequest("/api/events");
    if (!res.ok) {
      console.error("Error fetching events:", res.data);
      process.exit(1);
    }
    if (flags.json) {
      console.log(JSON.stringify(res.data, null, 2));
    } else {
      console.log(`\n📅 Events (${res.data.events?.length || 0}):`);
      for (const e of res.data.events || []) {
        console.log(`- [${e.id}] ${e.title} (${e.startTime} to ${e.endTime})`);
      }
    }
  } else if (action === "add" || action === "create") {
    const title = positional[0] || (flags.title as string);
    const start = (flags.start || flags.startTime) as string;
    const end = (flags.end || flags.endTime) as string;
    const location = flags.location as string;

    if (!title || !start || !end) {
      console.error('Usage: jlight events add "Title" --start "2026-10-24T18:00:00" --end "2026-10-24T19:00:00"');
      process.exit(1);
    }

    const res = await apiRequest("/api/events", {
      method: "POST",
      body: JSON.stringify({
        title,
        startTime: start,
        endTime: end,
        location,
      }),
    });

    if (flags.json) {
      console.log(JSON.stringify(res.data, null, 2));
    } else if (res.ok) {
      console.log(`✅ Event created: ${res.data.event?.title} (id: ${res.data.event?.id})`);
    } else {
      console.error("❌ Failed to create event:", res.data);
    }
  } else if (action === "delete") {
    const id = positional[0] || (flags.id as string);
    if (!id) {
      console.error("Usage: jlight events delete <id>");
      process.exit(1);
    }
    const res = await apiRequest(`/api/events?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (flags.json) console.log(JSON.stringify(res.data, null, 2));
    else if (res.ok) console.log(`✅ Deleted event ${id}`);
    else console.error("❌ Failed to delete event:", res.data);
  }
}

async function cmdLists(action: string, positional: string[], flags: Record<string, string | boolean>) {
  if (action === "list" || !action) {
    const type = (flags.type as string) || "grocery";
    const res = await apiRequest(`/api/lists?type=${type}`);
    if (!res.ok) {
      console.error("Error fetching list:", res.data);
      process.exit(1);
    }
    if (flags.json) {
      console.log(JSON.stringify(res.data, null, 2));
    } else {
      console.log(`\n🛒 ${type.toUpperCase()} Items (${res.data.items?.length || 0}):`);
      for (const item of res.data.items || []) {
        console.log(`  [${item.completed ? "x" : " "}] [${item.id}] ${item.title}`);
      }
    }
  } else if (action === "add") {
    const title = positional[0] || (flags.title as string);
    const type = (flags.type as string) || "grocery";
    if (!title) {
      console.error('Usage: jlight lists add "Apples" [--type grocery]');
      process.exit(1);
    }
    const res = await apiRequest("/api/lists", {
      method: "POST",
      body: JSON.stringify({ title, listType: type }),
    });
    if (flags.json) console.log(JSON.stringify(res.data, null, 2));
    else if (res.ok) console.log(`✅ Added to list: ${title} (id: ${res.data.id})`);
    else console.error("❌ Failed to add item:", res.data);
  } else if (action === "toggle") {
    const id = positional[0] || (flags.id as string);
    const completed = flags.completed !== "false" && flags.completed !== false;
    const res = await apiRequest("/api/lists", {
      method: "PATCH",
      body: JSON.stringify({ id, completed }),
    });
    if (flags.json) console.log(JSON.stringify(res.data, null, 2));
    else if (res.ok) console.log(`✅ Toggled item ${id}`);
    else console.error("❌ Failed to toggle item:", res.data);
  }
}

async function cmdChores(action: string, positional: string[], flags: Record<string, string | boolean>) {
  if (action === "list" || !action) {
    const res = await apiRequest("/api/chores");
    if (!res.ok) {
      console.error("Error fetching chores:", res.data);
      process.exit(1);
    }
    if (flags.json) {
      console.log(JSON.stringify(res.data, null, 2));
    } else {
      console.log(`\n🧹 Daily Chores (${res.data.chores?.length || 0}):`);
      for (const c of res.data.chores || []) {
        console.log(`  [${c.completed ? "x" : " "}] [${c.id}] ${c.title} (${c.points}⭐) for ${c.memberName}`);
      }
    }
  } else if (action === "toggle") {
    const choreId = positional[0] || (flags.id as string);
    const date = (flags.date as string) || new Date().toISOString().slice(0, 10);
    const res = await apiRequest("/api/chores", {
      method: "PATCH",
      body: JSON.stringify({ choreId, date }),
    });
    if (flags.json) console.log(JSON.stringify(res.data, null, 2));
    else if (res.ok) console.log(`✅ Toggled chore ${choreId} (completed: ${res.data.completed})`);
    else console.error("❌ Failed to toggle chore:", res.data);
  } else if (action === "add") {
    const title = positional[0] || (flags.title as string);
    const points = Number(flags.points || 1);
    if (!title) {
      console.error('Usage: jlight chores add "Vacuum" [--points 2]');
      process.exit(1);
    }
    const res = await apiRequest("/api/chores", {
      method: "POST",
      body: JSON.stringify({ title, points }),
    });
    if (flags.json) console.log(JSON.stringify(res.data, null, 2));
    else if (res.ok) console.log(`✅ Added chore: ${title} (id: ${res.data.id})`);
    else console.error("❌ Failed to add chore:", res.data);
  }
}

async function cmdMeals(action: string, positional: string[], flags: Record<string, string | boolean>) {
  if (action === "list" || !action) {
    const res = await apiRequest("/api/meals");
    if (!res.ok) {
      console.error("Error fetching meals:", res.data);
      process.exit(1);
    }
    if (flags.json) {
      console.log(JSON.stringify(res.data, null, 2));
    } else {
      console.log(`\n🍽️ Meal Plans (${res.data.meals?.length || 0}):`);
      for (const m of res.data.meals || []) {
        console.log(`  [${m.planDate}] [${m.mealType}] ${m.title} (Chef: ${m.memberName || "Family"})`);
      }
    }
  } else if (action === "add") {
    const title = positional[0] || (flags.title as string);
    const date = (flags.date as string) || new Date().toISOString().slice(0, 10);
    const mealType = (flags.type as string) || "dinner";
    if (!title) {
      console.error('Usage: jlight meals add "Pasta Primavera" [--date YYYY-MM-DD] [--type dinner]');
      process.exit(1);
    }
    const res = await apiRequest("/api/meals", {
      method: "POST",
      body: JSON.stringify({ title, planDate: date, mealType }),
    });
    if (flags.json) console.log(JSON.stringify(res.data, null, 2));
    else if (res.ok) console.log(`✅ Added meal plan: ${title} (id: ${res.data.id})`);
    else console.error("❌ Failed to add meal:", res.data);
  }
}

function showHelp() {
  console.log(`
jlight — Autonomous Agent & CLI Client for JlightCalendar

USAGE:
  jlight <command> [subcommand] [arguments...] [--flags]

COMMANDS:
  connect                   Initiate Device Code handshake or autonomous instant registration
                            Flags: --name <n> --crew <c> --directive <d> --rune <r> --stencil <hex> --scope <s>
                            Autonomous: --join-code <GLX-XXXXX> (auto-approves with 0 human clicks)
  login                     Save PAT token directly (Push flow)
                            Flags: --token <jlight_ag_...> [--url <url>]
  whoami                    Inspect authenticated agent persona & household
  events [list|add|delete]  Manage calendar events
  lists [list|add|toggle]   Manage grocery and packing items
  chores [list|add|toggle]  Manage chores and toggle completions
  meals [list|add|delete]   Manage family meal plans

GLOBAL FLAGS:
  --json                    Output raw JSON for machine/agent tool use
  --help, -h                Show this help screen
`);
}

// ==========================================
// Entry point
// ==========================================
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  const { positional, flags } = parseFlags(args);
  const command = positional[0];
  const subAction = positional[1];
  const restPositional = positional.slice(2);

  switch (command) {
    case "connect":
      await cmdConnect(flags);
      break;
    case "login":
      await cmdLogin(flags);
      break;
    case "whoami":
      await cmdWhoami(flags);
      break;
    case "events":
      await cmdEvents(subAction, restPositional, flags);
      break;
    case "lists":
      await cmdLists(subAction, restPositional, flags);
      break;
    case "chores":
      await cmdChores(subAction, restPositional, flags);
      break;
    case "meals":
      await cmdMeals(subAction, restPositional, flags);
      break;
    default:
      console.error(`Unknown command: ${command}. Run jlight --help for options.`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
