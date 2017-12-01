import React from 'react';
import PropTypes from 'prop-types';
import RecordRTC from 'recordrtc';
import { Countdown } from './Misc';
import RTCController from '../controllers/RTCController';
import { setTimeout } from 'timers';

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
            return this.state.recorder.startRecording({
                audio: true,
                video: true
            });
        }, 4000);
    };

    handleRecorderCommand = command => {
        const { recorder } = this.state;
        switch (command) {
            case 'start':
                return this.handleCountdownStart();
            case 'stop':
                return recorder[`${command}Recording`](() => {
                    const recording = new File([recorder.getBlob()], 'test');
                    this.setState(prevState => ({
                        recordings: prevState.recordings.concat(recording)
                    }));
                });
            case 'pause':
            case 'resume':
            default:
                return recorder[`${command}Recording`]();
        }
    };

    onCommandReceived = e => {
        if (e.data.type === 'command' && this.state.recorder) {
            this.handleRecorderCommand(e.data.text);
        }
    };

    onCommandSend = command => {
        RTCController.sendCommand(command);
        this.handleRecorderCommand(command);
    };

    render() {
        const { loading, recorderState } = this.state;
        if (loading) return null;
        return this.props.children({
            recorderState: recorderState,
            onCommandSend: this.onCommandSend,
            onCommandReceived: this.onCommandReceived
        });
    }
}

export default Room;

Room.propTypes = {
    children: PropTypes.func.isRequired
};
