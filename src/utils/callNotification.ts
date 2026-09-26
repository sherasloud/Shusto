// Web Audio API Ringtone generator and Push/System Notification helper for Video Calls

let audioCtx: AudioContext | null = null;
let ringtoneInterval: any = null;
let vibrationInterval: any = null;
let activeNotification: Notification | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a pleasant, modern phone/video call ringtone cycle
 */
function playRingToneBurst() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Dual-tone chime frequencies (similar to modern messenger / WhatsApp video call tone)
    const tones = [
      { freq1: 523.25, freq2: 659.25, start: 0, duration: 0.22 },   // C5 + E5
      { freq1: 659.25, freq2: 783.99, start: 0.25, duration: 0.22 }, // E5 + G5
      { freq1: 783.99, freq2: 1046.50, start: 0.50, duration: 0.35 },// G5 + C6
      { freq1: 523.25, freq2: 659.25, start: 0.95, duration: 0.22 }, 
      { freq1: 659.25, freq2: 783.99, start: 1.20, duration: 0.22 },
      { freq1: 783.99, freq2: 1046.50, start: 1.45, duration: 0.45 },
    ];

    tones.forEach(({ freq1, freq2, start, duration }) => {
      const startTime = now + start;
      const endTime = startTime + duration;

      // Oscillator 1
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq1, startTime);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq2, startTime);

      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.2, startTime + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(endTime);
      osc2.stop(endTime);
    });
  } catch (err) {
    console.warn("AudioContext ringtone error:", err);
  }
}

/**
 * Start incoming call ringtone, vibration, and background notification
 */
export function startIncomingCallAlert(doctorName?: string) {
  // 1. Play Ringtone Loop
  stopIncomingCallAlert(); // Clear any previous
  playRingToneBurst();
  ringtoneInterval = setInterval(() => {
    playRingToneBurst();
  }, 2600);

  // 2. Vibration for Mobile devices (WhatsApp style vibration)
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([400, 200, 400, 200, 800, 400]);
      vibrationInterval = setInterval(() => {
        if ('vibrate' in navigator) {
          navigator.vibrate([400, 200, 400, 200, 800, 400]);
        }
      }, 2600);
    } catch (e) {
      console.warn("Vibrate not supported or blocked:", e);
    }
  }

  // 3. System Notification (when app is in background or minimized)
  showBackgroundCallNotification(doctorName);
}

/**
 * Stop incoming call ringtone, vibration, and notification
 */
export function stopIncomingCallAlert() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch (e) {}
  }
  if (activeNotification) {
    try {
      activeNotification.close();
    } catch (e) {}
    activeNotification = null;
  }
}

/**
 * Request notification permission from user
 */
export async function requestCallNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch (e) {
      return false;
    }
  }
  return false;
}

/**
 * Show system notification for background/outside app (Video Calls)
 */
export function showBackgroundCallNotification(doctorName?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const title = `📞 Dr. ${doctorName || 'Consultant'} থেকে ইনকামিং ভিডিও কল`;
    const options: NotificationOptions = {
      body: 'জরুরী ভিডিও কনসাল্টেশন কল এসেছে। রিসিভ করতে ক্লিক করুন।',
      icon: '/favicon.ico',
      tag: 'shusto-incoming-call',
      requireInteraction: true,
      silent: false,
    };

    activeNotification = new Notification(title, options);

    activeNotification.onclick = () => {
      window.focus();
      activeNotification?.close();
    };
  } catch (e) {
    console.warn("Could not display background notification:", e);
  }
}

export function playNotificationChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const notes = [587.33, 880]; // D5, A5
    notes.forEach((freq, i) => {
      const startTime = now + i * 0.14;
      const endTime = startTime + 0.35;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, endTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(endTime);
    });
  } catch (e) {
    console.warn("Chime error:", e);
  }
}

/**
 * Show a general system notification for appointments, orders, etc.
 */
export function showAppNotification({
  title,
  body,
  tag = 'shusto-general-notification',
  playChime = true
}: {
  title: string;
  body: string;
  tag?: string;
  playChime?: boolean;
}) {
  if (playChime) {
    playNotificationChime();
  }

  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  }

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag,
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.warn("Could not display notification:", e);
  }
}

