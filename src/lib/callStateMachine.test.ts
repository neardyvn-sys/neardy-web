/**
 * Exhaustive unit tests for the shared call state machine.
 * Run: npx tsx src/lib/callStateMachine.test.ts
 */
import assert from "node:assert/strict";
import {
  ALL_EVENTS,
  ALL_STATES,
  applyCallEvent,
  canMediaSignaling,
  CallStateError,
  isTerminal,
  persistStatus,
  tryApplyCallEvent,
  type CallEvent,
  type CallState,
} from "./callStateMachine";

const valid: { from: CallState; ev: CallEvent; to: CallState }[] = [
  { from: "ringing", ev: "accept", to: "accepted" },
  { from: "ringing", ev: "reject", to: "rejected" },
  { from: "ringing", ev: "cancel", to: "cancelled" },
  { from: "ringing", ev: "timeout", to: "missed" },
  { from: "ringing", ev: "hangup", to: "missed" },
  { from: "ringing", ev: "browser_close", to: "missed" },
  { from: "ringing", ev: "ws_disconnect", to: "missed" },

  { from: "accepted", ev: "start_connecting", to: "connecting" },
  { from: "accepted", ev: "hangup", to: "ended" },
  { from: "accepted", ev: "ice_failure", to: "failed" },
  { from: "accepted", ev: "network_failure", to: "failed" },
  { from: "accepted", ev: "browser_close", to: "ended" },
  { from: "accepted", ev: "ws_disconnect", to: "ended" },

  { from: "connecting", ev: "connected", to: "connected" },
  { from: "connecting", ev: "hangup", to: "ended" },
  { from: "connecting", ev: "ice_failure", to: "failed" },
  { from: "connecting", ev: "network_failure", to: "failed" },
  { from: "connecting", ev: "browser_close", to: "ended" },
  { from: "connecting", ev: "ws_disconnect", to: "ended" },

  { from: "connected", ev: "hangup", to: "ended" },
  { from: "connected", ev: "ice_failure", to: "failed" },
  { from: "connected", ev: "network_failure", to: "failed" },
  { from: "connected", ev: "browser_close", to: "ended" },
  { from: "connected", ev: "ws_disconnect", to: "ended" },
];

const seen = new Set(valid.map((v) => `${v.from}|${v.ev}`));

for (const tc of valid) {
  const r = applyCallEvent(tc.from, tc.ev);
  assert.equal(r.to, tc.to, `${tc.from} + ${tc.ev}`);
  assert.equal(r.changed, true);
}

for (const st of ALL_STATES) {
  for (const ev of ALL_EVENTS) {
    const key = `${st}|${ev}`;
    if (seen.has(key)) continue;
    const res = tryApplyCallEvent(st, ev);
    assert.equal(res.ok, false, `expected error for ${key}`);
    assert.ok(
      res.ok === false &&
        (res.error.code === "invalid_transition" || res.error.code === "duplicate"),
      `${key} code`,
    );
  }
}

// Race: accept then reject/cancel
{
  const accepted = applyCallEvent("ringing", "accept");
  assert.equal(accepted.to, "accepted");
  assert.throws(() => applyCallEvent(accepted.to, "reject"), CallStateError);
  assert.throws(() => applyCallEvent(accepted.to, "cancel"), CallStateError);
}

// Race: cancel then accept
{
  const cancelled = applyCallEvent("ringing", "cancel");
  assert.throws(() => applyCallEvent(cancelled.to, "accept"), CallStateError);
}

// Duplicates
for (const [from, ev] of [
  ["accepted", "accept"],
  ["rejected", "reject"],
  ["cancelled", "cancel"],
  ["missed", "timeout"],
  ["connecting", "start_connecting"],
  ["connected", "connected"],
  ["ended", "hangup"],
  ["failed", "ice_failure"],
] as const) {
  const res = tryApplyCallEvent(from, ev);
  assert.equal(res.ok, false);
  assert.equal(res.ok === false && res.error.code, "duplicate");
}

// Happy path
{
  let s: CallState = "ringing";
  for (const [ev, want] of [
    ["accept", "accepted"],
    ["start_connecting", "connecting"],
    ["connected", "connected"],
    ["hangup", "ended"],
  ] as const) {
    const r = applyCallEvent(s, ev);
    assert.equal(r.to, want);
    s = r.to;
  }
  assert.equal(isTerminal(s), true);
}

assert.equal(canMediaSignaling("ringing"), false);
assert.equal(canMediaSignaling("accepted"), true);
assert.equal(persistStatus("active"), "connected");
assert.equal(applyCallEvent("active", "hangup").to, "ended");

console.log("callStateMachine: all assertions passed");
