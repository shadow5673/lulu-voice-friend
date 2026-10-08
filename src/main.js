import { Conversation } from '@elevenlabs/client';
import './styles.css';

const AGENT_ID = 'agent_9601m4az1cw1eynvfgx9asmptgrk';

const body = document.body;
const callButton = document.querySelector('#callButton');
const callIcon = document.querySelector('#callIcon');
const callLabel = document.querySelector('#callLabel');
const muteButton = document.querySelector('#muteButton');
const muteIcon = document.querySelector('#muteIcon');
const status = document.querySelector('#status');
const hint = document.querySelector('#hint');
const parentDialog = document.querySelector('#parentDialog');

let conversation = null;
let muted = false;
let connecting = false;

function setVisualState(next) {
  body.dataset.state = next;
  if (next === 'speaking') {
    status.textContent = 'ルルがおはなししてるよ';
    hint.textContent = 'きいてみよう ✨';
  } else if (next === 'listening') {
    status.textContent = 'ルルがきいてるよ';
    hint.textContent = 'ゆっくり おはなししてね';
  } else if (next === 'connecting') {
    status.textContent = 'ルルをよんでるよ…';
    hint.textContent = 'ちょっとだけ まってね';
  } else if (next === 'error') {
    status.textContent = 'うまくつながらなかったよ';
    hint.textContent = 'もういちど ためしてね';
  } else {
    status.textContent = 'ルルに でんわしてみよう！';
    hint.textContent = 'おうちの人といっしょに、ボタンをおしてね';
  }
}

function setConnected(connected) {
  callButton.classList.toggle('hangup', connected);
  callIcon.textContent = connected ? '×' : '☎';
  callLabel.textContent = connected ? 'おしまい' : 'ルルに でんわ';
  muteButton.hidden = !connected;
  callButton.disabled = false;
}

async function startCall() {
  if (connecting || conversation) return;
  connecting = true;
  callButton.disabled = true;
  setVisualState('connecting');

  try {
    const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    permissionStream.getTracks().forEach((track) => track.stop());

    conversation = await Conversation.startSession({
      agentId: AGENT_ID,
      connectionType: 'webrtc',
      onConnect: () => {
        setConnected(true);
        setVisualState('listening');
      },
      onDisconnect: () => {
        conversation = null;
        muted = false;
        muteIcon.textContent = '🎙️';
        setConnected(false);
        setVisualState('idle');
      },
      onModeChange: (event) => {
        const mode = typeof event === 'string' ? event : event?.mode;
        setVisualState(mode === 'speaking' ? 'speaking' : 'listening');
      },
      onStatusChange: (event) => {
        const nextStatus = typeof event === 'string' ? event : event?.status;
        if (nextStatus === 'connecting') setVisualState('connecting');
      },
      onError: (error) => {
        console.error('ElevenLabs conversation error', error);
        setVisualState('error');
      },
    });

    setConnected(true);
    setVisualState('listening');
  } catch (error) {
    console.error('Could not start conversation', error);
    conversation = null;
    setConnected(false);
    setVisualState('error');
  } finally {
    connecting = false;
  }
}

async function endCall() {
  if (!conversation) return;
  const activeConversation = conversation;
  conversation = null;
  callButton.disabled = true;
  status.textContent = 'また おはなししようね！';
  hint.textContent = 'ばいばい ✨';
  body.dataset.state = 'idle';
  try {
    await activeConversation.endSession();
  } finally {
    setConnected(false);
  }
}

callButton.addEventListener('click', () => {
  if (conversation) endCall();
  else startCall();
});

muteButton.addEventListener('click', () => {
  if (!conversation) return;
  muted = !muted;
  conversation.setMicMuted(muted);
  muteIcon.textContent = muted ? '🔇' : '🎙️';
  muteButton.setAttribute('aria-label', muted ? 'マイクをつける' : 'マイクをおやすみ');
});

document.querySelector('#parentInfo').addEventListener('click', () => parentDialog.showModal());
document.querySelector('#closeDialog').addEventListener('click', () => parentDialog.close());

setVisualState('idle');
