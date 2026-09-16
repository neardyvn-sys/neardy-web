/** Browser WebRTC 1-to-1 audio session (no video). */

import { classifyMicError, isMicSupported } from "@/lib/microphone";

export type IceCandidatePayload = {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string | null;
};

export type AudioCallSessionCallbacks = {
  onIceCandidate: (candidate: IceCandidatePayload) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
  onError: (message: string) => void;
};

export class AudioCallSession {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingRemoteCandidates: RTCIceCandidateInit[] = [];
  private remoteDescSet = false;
  private closed = false;
  private muted = false;
  private readonly cbs: AudioCallSessionCallbacks;

  constructor(cbs: AudioCallSessionCallbacks) {
    this.cbs = cbs;
  }

  get isMuted() {
    return this.muted;
  }

  async start(iceServers: RTCIceServer[]): Promise<void> {
    if (this.closed) return;

    if (!isMicSupported()) {
      throw new Error("microphone_insecure_context");
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (err) {
      const kind = classifyMicError(err);
      if (kind === "permission_denied") throw new Error("microphone_permission_denied");
      if (kind === "insecure_context") throw new Error("microphone_insecure_context");
      if (kind === "no_device") throw new Error("microphone_no_device");
      throw new Error("microphone_unavailable");
    }

    if (this.closed) {
      this.stopLocalTracks();
      return;
    }

    const pc = new RTCPeerConnection({ iceServers });
    this.pc = pc;

    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !this.muted;
      pc.addTrack(track, this.localStream);
    }

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || this.closed) return;
      this.cbs.onIceCandidate({
        candidate: ev.candidate.candidate,
        sdpMid: ev.candidate.sdpMid,
        sdpMLineIndex: ev.candidate.sdpMLineIndex,
        usernameFragment: ev.candidate.usernameFragment,
      });
    };

    pc.ontrack = (ev) => {
      if (this.closed) return;
      const stream = ev.streams[0] ?? new MediaStream([ev.track]);
      this.remoteStream = stream;
      this.cbs.onRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      if (this.closed || !this.pc) return;
      const state = this.pc.connectionState;
      this.cbs.onConnectionState(state);
      if (state === "failed") {
        this.cbs.onError("connection_failed");
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (this.closed || !this.pc) return;
      if (this.pc.iceConnectionState === "failed") {
        this.cbs.onError("connection_failed");
      }
    };
  }

  async createOffer(): Promise<string> {
    if (!this.pc) throw new Error("peer_not_ready");
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer.sdp || "";
  }

  async handleOffer(sdp: string): Promise<string> {
    if (!this.pc) throw new Error("peer_not_ready");
    await this.pc.setRemoteDescription({ type: "offer", sdp });
    this.remoteDescSet = true;
    await this.flushPendingCandidates();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer.sdp || "";
  }

  async handleAnswer(sdp: string): Promise<void> {
    if (!this.pc) throw new Error("peer_not_ready");
    await this.pc.setRemoteDescription({ type: "answer", sdp });
    this.remoteDescSet = true;
    await this.flushPendingCandidates();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit | null): Promise<void> {
    if (!this.pc || this.closed) return;
    if (!candidate || !candidate.candidate) return;
    if (!this.remoteDescSet) {
      this.pendingRemoteCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(candidate);
    } catch {
      // ignore late/invalid candidates after close or renegotiation races
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.localStream) return;
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !muted;
    }
  }

  cleanup() {
    if (this.closed) return;
    this.closed = true;
    this.pendingRemoteCandidates = [];
    this.remoteDescSet = false;

    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.oniceconnectionstatechange = null;
      try {
        this.pc.close();
      } catch {
        // ignore
      }
      this.pc = null;
    }

    this.stopLocalTracks();
    this.localStream = null;

    if (this.remoteStream) {
      for (const track of this.remoteStream.getTracks()) {
        track.stop();
      }
      this.remoteStream = null;
    }
    this.cbs.onRemoteStream(null);
  }

  private stopLocalTracks() {
    if (!this.localStream) return;
    for (const track of this.localStream.getTracks()) {
      track.stop();
    }
  }

  private async flushPendingCandidates() {
    if (!this.pc) return;
    const queued = this.pendingRemoteCandidates.splice(0);
    for (const c of queued) {
      try {
        await this.pc.addIceCandidate(c);
      } catch {
        // ignore
      }
    }
  }
}
