/** Browser WebRTC 1-to-1 media session (audio or audio+video). */

import {
  classifyMediaError,
  isMediaSupported,
  mediaErrorToCode,
} from "@/lib/microphone";

export type IceCandidatePayload = {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string | null;
};

export type MediaCallSessionCallbacks = {
  onIceCandidate: (candidate: IceCandidatePayload) => void;
  onLocalStream: (stream: MediaStream | null) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
  onError: (message: string) => void;
};

/** @deprecated use MediaCallSessionCallbacks */
export type AudioCallSessionCallbacks = MediaCallSessionCallbacks;

export type MediaCallStartOptions = {
  withVideo?: boolean;
};

export class MediaCallSession {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingRemoteCandidates: RTCIceCandidateInit[] = [];
  private remoteDescSet = false;
  private closed = false;
  private muted = false;
  private cameraOff = false;
  private withVideo = false;
  private readonly cbs: MediaCallSessionCallbacks;

  constructor(cbs: MediaCallSessionCallbacks) {
    this.cbs = cbs;
  }

  get isMuted() {
    return this.muted;
  }

  get isCameraOff() {
    return this.cameraOff;
  }

  getLocalStream() {
    return this.localStream;
  }

  async start(iceServers: RTCIceServer[], options: MediaCallStartOptions = {}): Promise<void> {
    if (this.closed) return;

    this.withVideo = !!options.withVideo;

    if (!isMediaSupported()) {
      throw new Error(mediaErrorToCode("insecure_context", this.withVideo));
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: this.withVideo
          ? {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : false,
      });
    } catch (err) {
      throw new Error(mediaErrorToCode(classifyMediaError(err), this.withVideo));
    }

    if (this.closed) {
      this.stopLocalTracks();
      this.cbs.onLocalStream(null);
      return;
    }

    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !this.muted;
    }
    for (const track of this.localStream.getVideoTracks()) {
      track.enabled = !this.cameraOff;
    }
    this.cbs.onLocalStream(this.localStream);

    const pc = new RTCPeerConnection({ iceServers });
    this.pc = pc;

    for (const track of this.localStream.getTracks()) {
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
      let stream = this.remoteStream;
      if (!stream) {
        stream = ev.streams[0] ? new MediaStream(ev.streams[0].getTracks()) : new MediaStream();
        this.remoteStream = stream;
      }
      if (!stream.getTracks().some((t) => t.id === ev.track.id)) {
        stream.addTrack(ev.track);
      }
      ev.track.onended = () => {
        if (!this.remoteStream) return;
        this.remoteStream.removeTrack(ev.track);
        if (this.remoteStream.getTracks().length === 0) {
          this.remoteStream = null;
          this.cbs.onRemoteStream(null);
        } else {
          this.cbs.onRemoteStream(this.remoteStream);
        }
      };
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

  setCameraEnabled(enabled: boolean) {
    this.cameraOff = !enabled;
    if (!this.localStream) return;
    for (const track of this.localStream.getVideoTracks()) {
      track.enabled = enabled;
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
        this.pc.getSenders().forEach((sender) => {
          try {
            this.pc?.removeTrack(sender);
          } catch {
            // ignore
          }
        });
        this.pc.close();
      } catch {
        // ignore
      }
      this.pc = null;
    }

    this.stopLocalTracks();
    this.localStream = null;
    this.cbs.onLocalStream(null);

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

/** @deprecated use MediaCallSession */
export const AudioCallSession = MediaCallSession;
