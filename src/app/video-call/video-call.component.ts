import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MediaServiceService } from '../services/media-service.service';
import { CommonModule } from '@angular/common';
import { SignalingService } from '../services/signaling.service';
import { WebRTCService } from '../services/webrtc.service';
import { ActivatedRoute, Router } from '@angular/router';


@Component({
  selector: 'app-video-call',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-call.component.html',
  styleUrl: './video-call.component.css'
})
export class VideoCallComponent  {
  @ViewChild('myVideo') myVideo!: ElementRef<HTMLVideoElement>;

  localStream!: MediaStream;
  remoteStreams: { socketId: string, stream: MediaStream, isMicMuted: boolean, isVideoMuted: boolean }[] = [];
  peers: { [id: string]: RTCPeerConnection } = {};

  isMicMuted = false;
  isVideoMuted = false;
  roomId = 'test-room';
  userId = 'user-' + Math.floor(Math.random() * 10000);

  constructor(private signaling: SignalingService,private router: Router) {}

  ngOnInit(): void {
    this.startConnection();
  }

  async startConnection() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  this.myVideo.nativeElement.srcObject = this.localStream;

  // قراءة الإعدادات من localStorage
  // const muteMic = localStorage.getItem('isMicMuted') === 'true';
  // const muteVideo = localStorage.getItem('isVideoMuted') === 'true';

  // تطبيق كتم الصوت والصورة حسب القيمة المخزنة
  // this.localStream.getAudioTracks().forEach(track => {
  //   track.enabled = !muteMic;
  // });

  // this.localStream.getVideoTracks().forEach(track => {
  //   track.enabled = !muteVideo;
  // });

  // this.isMicMuted = muteMic;
  // this.isVideoMuted = muteVideo;

    // Get local camera and mic stream
    // this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    // this.myVideo.nativeElement.srcObject = this.localStream;

    // Join the room
    this.signaling.joinRoom(this.roomId, this.userId);

    // Handle signaling events
    this.signaling.on('all-users', (users: any[]) => {
      users.forEach(user => this.callUser(user.socketId));
    });

    this.signaling.on('user-joined', ({ socketId, userId }) => {
      console.log('User joined:', userId);
    });

    this.signaling.on('offer', async ({ sdp, caller }) => {
      const pc = this.createPeerConnection(caller);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.signaling.emit('answer', { target: caller, sdp: answer });
    });

    this.signaling.on('answer', async ({ sdp, responder }) => {
      const pc = this.peers[responder];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    this.signaling.on('ice-candidate', ({ candidate, from }) => {
      const pc = this.peers[from];
      if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    this.signaling.on('user-disconnected', (socketId: string) => {
      const pc = this.peers[socketId];
      if (pc) {
        pc.close();
        delete this.peers[socketId];
        this.remoteStreams = this.remoteStreams.filter(s => s.socketId !== socketId);
      }
    });
  }

  createPeerConnection(socketId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection();
    this.peers[socketId] = pc;

    this.localStream.getTracks().forEach(track => {
      pc.addTrack(track, this.localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.emit('ice-candidate', {
          target: socketId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const alreadyAdded = this.remoteStreams.some(s => s.socketId === socketId);
      if (!alreadyAdded) {
        this.remoteStreams.push({
          socketId,
          stream: event.streams[0],
          isMicMuted: false,
          isVideoMuted: false,
        });
      }
    };

    return pc;
  }

  async callUser(socketId: string) {
    const pc = this.createPeerConnection(socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signaling.emit('offer', { target: socketId, sdp: offer });
  }

  // Toggle microphone mute/unmute for specific user
  toggleMic(socketId: string) {
    if (socketId === 'local') {
      this.isMicMuted = !this.isMicMuted;
    localStorage.setItem('isMicMuted', JSON.stringify(this.isMicMuted));

  // Apply the mic state to the local stream
  this.localStream.getAudioTracks().forEach(track => track.enabled = !this.isMicMuted);

  // Save the mic state (optional: you could save this state in localStorage, sessionStorage, or on a server for persistence across sessions)
  localStorage.setItem('isMicMuted', JSON.stringify(this.isMicMuted));
      
    } else {
      const remote = this.remoteStreams.find(r => r.socketId === socketId);
      if (remote) {
        // remote.isMicMuted = !remote.isMicMuted;
        // remote.stream.getAudioTracks().forEach(track => track.enabled = !remote.isMicMuted);
        remote.isMicMuted = !remote.isMicMuted;
console.log("test",remote.isMicMuted)
  // Apply the mic state to the local stream
  this.localStream.getAudioTracks().forEach(track => track.enabled = !remote.isMicMuted);

  // Save the mic state (optional: you could save this state in localStorage, sessionStorage, or on a server for persistence across sessions)
  // localStorage.setItem('isMicMuted', JSON.stringify(remote.isMicMuted));
      }
    }
  }

  // Toggle video mute/unmute for specific user
  toggleVideo(socketId: string) {
    if (socketId === 'local') {
      this.isVideoMuted = !this.isVideoMuted;
      this.localStream.getVideoTracks().forEach(track => track.enabled = !this.isVideoMuted);
        localStorage.setItem('isVideoMuted', JSON.stringify(this.isMicMuted));

    } else {
      const remote = this.remoteStreams.find(r => r.socketId === socketId);
      if (remote) {
        remote.isVideoMuted = !remote.isVideoMuted;
        remote.stream.getVideoTracks().forEach(track => track.enabled = !remote.isVideoMuted);
      }
    }
  }

  // Share screen for specific user
  async shareScreen(socketId: string) {
    if (socketId === 'local') {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = screenStream.getVideoTracks()[0];
          if (this.localStream && screenTrack) {
            this.localStream.getVideoTracks().forEach(track => this.localStream.removeTrack(track));
            this.localStream.addTrack(screenTrack);
            this.myVideo.nativeElement.srcObject = screenStream;
          }
        } catch (e) {
          console.error('Error sharing screen', e);
        }
      }
    } else {
      // Handle screen share for remote users if required
    }
  }

  copyLink() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    } else {
      alert('Clipboard not supported.');
    }
  }

 closeMeeting(socketId?: string) {
  if (socketId === 'local') {
    // Close local stream and peer connections
    this.localStream.getTracks().forEach(track => track.stop());
    Object.keys(this.peers).forEach(id => {
      this.peers[id].close();
      delete this.peers[id];
    });
    this.signaling.emit('leave-room', { roomId: this.roomId, userId: this.userId });
  } else if (socketId) {
    // Check if the remote stream exists and handle disconnection
    const remote = this.remoteStreams.find(r => r.socketId === socketId);
    if (remote) {
      console.log('Stopping remote stream for socketId:', socketId);  // Debugging log
      remote.stream.getTracks().forEach(track => track.stop());

      const pc = this.peers[socketId];
      if (pc) {
        pc.close();
        delete this.peers[socketId];
      }

      // Remove remote stream from the list
      this.remoteStreams = this.remoteStreams.filter(r => r.socketId !== socketId);
          this.router.navigate(['/']);

    } else {
      console.error('Remote stream not found for socketId:', socketId);  // Error log for debugging
    }
  }
}

}