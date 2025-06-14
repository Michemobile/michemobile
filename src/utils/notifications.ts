import axios from 'axios';
import { supabase } from '@/lib/supabase';

// utils/notifications.ts
export const subscribeToPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported');
    alert('Push messaging is not supported by this browser.');
    return;
  }

  try {
    // Ensure service worker is registered and active
    const swRegistration = await navigator.serviceWorker.register('/service-worker.js');
    // It's good practice to wait for the SW to be active, especially before pushManager.subscribe
    // However, .ready usually suffices as it resolves when the SW is active and controlling the page.
    await navigator.serviceWorker.ready; 
    console.log('ServiceWorker registration successful and ready for push:', swRegistration);

    const VAPID_PUBLIC_KEY = import.meta.env.VITE_APP_VAPID_PUBLIC_KEY;

    if (!VAPID_PUBLIC_KEY) {
      console.error('VITE_APP_VAPID_PUBLIC_KEY is not set. Please set it in your .env file.');
      alert('Push notification setup is incomplete. Missing VAPID public key.');
      return;
    }

    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: VAPID_PUBLIC_KEY
    });

    // Send subscription to backend using Supabase Edge Function
    await supabase.functions.invoke('store-push-subscription', {
      body: { subscription }
    });
    
    console.log('User is subscribed:', subscription);
    alert('Push notifications enabled!');
  } catch (error) {
    console.error('Failed to subscribe the user: ', error);
    if (Notification.permission === 'denied') {
      alert('Push notification permission was denied. Please enable it in your browser settings.');
    } else {
      alert('Failed to enable push notifications. Check console for details.');
    }
  }
};

export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(error => {
          console.log('ServiceWorker registration failed: ', error);
        });
    });
  }
};
