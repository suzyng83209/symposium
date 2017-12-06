import React from 'react';
import PropTypes from 'prop-types';
import RecordRTC from 'recordrtc';
import { Countdown } from './Misc';
import RTCController from '../controllers/RTCController';
import { setTimeout } from 'timers';
import { b64toBlob, createAudio } from '../Utils';

class Room extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            countdown: '',
            recorder: null,
            recorderState: 'inactive',
            recordings: []
        };
    }

    componentDidMount() {
        RTCController.initialize().then(() => {
            RTCController.handleStream(this.onStream, this.onStreamEnded);
            this.setState({ loading: false });
        });
    }

    componentWillUnmount() {
        RTCController.close();
    }

    onStream = e => {
        var mediaElement = e.mediaElement;
        mediaElement.controls = false;
        document.getElementById('video-container').appendChild(mediaElement);
        if (e.type === 'local') {
            var recorder = RecordRTC(e.stream, { type: 'audio' });
            recorder.onStateChanged = state => {
                this.setState({ recorderState: state });
            };
            this.setState({ recorder });
        }
    };

    onStreamEnded = e => {
        var mediaElement = document.getElementById(e.streamid);
        if (mediaElement) {
            mediaElement.parentNode.removeChild(mediaElement);
        }
        RTCController.close();
    };

    handleCountdownStart = () => {
        var countdown = 3;
        const countdownTimer = setInterval(() => {
            this.setState({ countdown: countdown-- });
            if (countdown < 0) {
                clearInterval(countdownTimer);
            }
        }, 1000);

        setTimeout(() => {
            if (!this.state.recorder) return;
            console.log('RECORDER', this.state.recorder);
            return this.state.recorder.startRecording({
                audio: true,
                video: false
            });
        }, 4000);
    };

    handleRecorderCommand = command => {
        const { recorder } = this.state;
        switch (command) {
            case 'start':
                return this.handleCountdownStart();
            case 'stop':
                return recorder.stopRecording(() => {
                    recorder.getDataURL(dataUri => {
                        this.setState(prevState => ({
                            recordings: prevState.recordings.concat(dataUri)
                        }));
                    });
                });
            case 'pause':
            case 'resume':
                return recorder[`${command}Recording`]();
            default:
                return this[command]();
        }
    };

    onCommandReceived = e => {
        if (e.data.type === 'command' && this.state.recorder) {
            console.log('[COMMAND RECEIVED] ', e.data.text);
            this.handleRecorderCommand(e.data.text);
        }
    };

    onCommandSend = command => {
        console.log('COMMAND', command);
        RTCController.sendCommand(command);
        if (command !== 'send-audio') {
            this.handleRecorderCommand(command);
        }
    };

    onDataReceived = e => {
        var { type, data = [] } = e.data;
        if (type !== 'data' || typeof data !== 'object') {
            return;
        }
        if (data.length && data.length !== this.state.recordings.length) {
            throw new Error('Uneven number of recordings between local and remote streams');
        }
        var dataUris = this.state.recordings.map((l, i) => [l, data[i]]); // zipping the two arrays
        this.generateAudio(dataUris);
    };

    generateAudio = (recordings = []) => {
        var containerLocal = document.getElementById('local_assets');
        var containerRemote = document.getElementById('remote_assets');
        var containerCombined = document.getElementById('combined_assets');

        recordings.map(([local, remote]) => {
            const localFile = b64toBlob(local.slice(local.lastIndexOf(',') + 1));
            const remoteFile = remote ? b64toBlob(remote.slice(remote.lastIndexOf(',') + 1)) : null;

            // send to backend api

            const localAudio = createAudio(local);
            const remoteAudio = remote ? createAudio(remote) : document.createElement('div');

            containerLocal.appendChild(localAudio);
            containerRemote.appendChild(remoteAudio);
        });

        return;
    };

    'send-audio' = () => {
        RTCController.sendData(this.state.recordings);
    };

    render() {
        const { loading, recorderState } = this.state;
        if (loading) return null;
        return this.props.children({
            recorderState: recorderState,
            onCommandSend: this.onCommandSend,
            onCommandReceived: this.onCommandReceived,
            onDataReceived: this.onDataReceived
        });
    }
}

export default Room;

Room.propTypes = {
    children: PropTypes.func.isRequired
};
