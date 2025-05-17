class WebRTCService {
    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this.screenStream = null;
        this.onTrackCallback = null;
        this.onIceCandidateCallback = null;
    }

    async initializePeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        this.peerConnection.onicecandidate = (event) => {
            if (this.onIceCandidateCallback) {
                this.onIceCandidateCallback(event.candidate);
            }
        };

        this.peerConnection.ontrack = (event) => {
            if (this.onTrackCallback) {
                this.onTrackCallback(event.streams[0]);
            }
        };
    }

    async startLocalStream(video = true, audio = true) {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video,
                audio
            });

            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            return this.localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }

    async startScreenShare() {
        try {
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true
            });

            const videoTrack = this.screenStream.getVideoTracks()[0];
            const sender = this.peerConnection.getSenders().find(s => s.track.kind === 'video');
            
            if (sender) {
                sender.replaceTrack(videoTrack);
            } else {
                this.peerConnection.addTrack(videoTrack, this.screenStream);
            }

            videoTrack.onended = () => {
                this.stopScreenShare();
            };

            return this.screenStream;
        } catch (error) {
            console.error('Error sharing screen:', error);
            throw error;
        }
    }

    async stopScreenShare() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;

            // Restore video track if local stream exists
            if (this.localStream) {
                const videoTrack = this.localStream.getVideoTracks()[0];
                const sender = this.peerConnection.getSenders().find(s => s.track.kind === 'video');
                if (sender && videoTrack) {
                    sender.replaceTrack(videoTrack);
                }
            }
        }
    }

    async createOffer() {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        return offer;
    }

    async handleAnswer(answer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    async handleOffer(offer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return answer;
    }

    async addIceCandidate(candidate) {
        if (candidate) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    setOnTrack(callback) {
        this.onTrackCallback = callback;
    }

    setOnIceCandidate(callback) {
        this.onIceCandidateCallback = callback;
    }

    stopLocalStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }

    close() {
        this.stopLocalStream();
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
    }
}

export default new WebRTCService(); 