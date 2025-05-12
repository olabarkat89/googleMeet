import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WebRTCService {
  private localStream: MediaStream | null = null;
  private peerConnections: { [socketId: string]: RTCPeerConnection } = {};

  async startLocalStream(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (error) {
      console.error('Error accessing media devices.', error);
    }
  }

  getLocalStream(): MediaStream {
    if (!this.localStream) throw new Error('Local stream not initialized');
    return this.localStream;
  }

  createPeerConnection(socketId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // SignalingService should handle sending candidate
        // Implement externally with event
      }
    };

    pc.ontrack = (event) => {
      // Handle ontrack externally using signaling.onTrack
    };

    this.peerConnections[socketId] = pc;
    return pc;
  }

  async createOffer(socketId: string): Promise<RTCSessionDescriptionInit> {
    const pc = this.createPeerConnection(socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(socketId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.createPeerConnection(socketId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  setRemoteDescription(socketId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections[socketId];
    if (pc) {
      pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  addIceCandidate(socketId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections[socketId];
    if (pc) {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  removePeerConnection(socketId: string) {
    const pc = this.peerConnections[socketId];
    if (pc) {
      pc.close();
      delete this.peerConnections[socketId];
    }
  }
}
