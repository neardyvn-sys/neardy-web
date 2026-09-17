/**
 * Authoritative 1-to-1 call state machine (Phase 8).
 * Keep in sync with neardy-api/internal/callfsm.
 */

export type CallState =
  | "ringing"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "missed"
  | "connecting"
  | "connected"
  | "failed"
  | "ended";

export type CallEvent =
  | "accept"
  | "reject"
  | "cancel"
  | "timeout"
  | "start_connecting"
  | "connected"
  | "hangup"
  | "ice_failure"
  | "network_failure"
  | "browser_close"
  | "ws_disconnect";

export const ALL_STATES: CallState[] = [
  "ringing",
  "accepted",
  "rejected",
  "cancelled",
  "missed",
  "connecting",
  "connected",
  "failed",
  "ended",
];

export const ALL_EVENTS: CallEvent[] = [
  "accept",
  "reject",
  "cancel",
  "timeout",
  "start_connecting",
  "connected",
  "hangup",
  "ice_failure",
  "network_failure",
  "browser_close",
  "ws_disconnect",
];

const TRANSITIONS: Partial<Record<CallState, Partial<Record<CallEvent, CallState>>>> = {
  ringing: {
    accept: "accepted",
    reject: "rejected",
    cancel: "cancelled",
    timeout: "missed",
    hangup: "missed",
    browser_close: "missed",
    ws_disconnect: "missed",
  },
  accepted: {
    start_connecting: "connecting",
    hangup: "ended",
    ice_failure: "failed",
    network_failure: "failed",
    browser_close: "ended",
    ws_disconnect: "ended",
  },
  connecting: {
    connected: "connected",
    hangup: "ended",
    ice_failure: "failed",
    network_failure: "failed",
    browser_close: "ended",
    ws_disconnect: "ended",
  },
  connected: {
    hangup: "ended",
    ice_failure: "failed",
    network_failure: "failed",
    browser_close: "ended",
    ws_disconnect: "ended",
  },
};

const IDEMPOTENT_ALREADY_IN: Partial<Record<CallEvent, CallState>> = {
  accept: "accepted",
  reject: "rejected",
  cancel: "cancelled",
  timeout: "missed",
  start_connecting: "connecting",
  connected: "connected",
  hangup: "ended",
  ice_failure: "failed",
  network_failure: "failed",
  browser_close: "ended",
  ws_disconnect: "ended",
};

export class CallStateError extends Error {
  constructor(
    message: string,
    public readonly code: "invalid_transition" | "duplicate" | "unknown_state" | "unknown_event",
  ) {
    super(message);
    this.name = "CallStateError";
  }
}

export function isTerminal(state: CallState): boolean {
  return (
    state === "rejected" ||
    state === "cancelled" ||
    state === "missed" ||
    state === "failed" ||
    state === "ended"
  );
}

export function canMediaSignaling(state: CallState): boolean {
  return state === "accepted" || state === "connecting" || state === "connected";
}

/** Map legacy persisted "active" into the FSM vocabulary. */
export function persistStatus(raw: string): CallState {
  if (raw === "active") return "connected";
  return raw as CallState;
}

export type ApplyResult = {
  from: CallState;
  to: CallState;
  event: CallEvent;
  changed: boolean;
};

export function applyCallEvent(fromRaw: string, event: CallEvent): ApplyResult {
  const from = persistStatus(fromRaw);

  if (!ALL_STATES.includes(from)) {
    throw new CallStateError(`unknown call state: ${from}`, "unknown_state");
  }
  if (!ALL_EVENTS.includes(event)) {
    throw new CallStateError(`unknown call event: ${event}`, "unknown_event");
  }

  const already = IDEMPOTENT_ALREADY_IN[event];
  if (already && from === already) {
    throw new CallStateError(`duplicate event ${event} in ${from}`, "duplicate");
  }
  if (
    (event === "hangup" || event === "browser_close" || event === "ws_disconnect") &&
    (from === "ended" || from === "failed")
  ) {
    throw new CallStateError(`duplicate event ${event} in ${from}`, "duplicate");
  }
  if ((event === "ice_failure" || event === "network_failure") && from === "failed") {
    throw new CallStateError(`duplicate event ${event} in ${from}`, "duplicate");
  }

  const to = TRANSITIONS[from]?.[event];
  if (!to) {
    throw new CallStateError(`invalid transition: ${from} + ${event}`, "invalid_transition");
  }
  return { from, to, event, changed: to !== from };
}

export function tryApplyCallEvent(
  fromRaw: string,
  event: CallEvent,
): { ok: true; result: ApplyResult } | { ok: false; error: CallStateError } {
  try {
    return { ok: true, result: applyCallEvent(fromRaw, event) };
  } catch (e) {
    if (e instanceof CallStateError) return { ok: false, error: e };
    throw e;
  }
}

/** UI phase helper: maps FSM state + role into overlay phases. */
export function uiPhaseFromState(
  state: CallState | null,
  role: "caller" | "callee" | null,
): "idle" | "outgoing" | "incoming" | "active" {
  if (!state || !role) return "idle";
  if (state === "ringing") return role === "caller" ? "outgoing" : "incoming";
  if (canMediaSignaling(state)) return "active";
  return "idle";
}
