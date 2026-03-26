// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Default config so SW can initialize independent of the main app thread
firebase.initializeApp({
  apiKey: "AIzaSyApNLIjHWRc1eawliewl6KByPOKUxdOVHM",
  authDomain: "arena-clash-99bc1.firebaseapp.com",
  projectId: "arena-clash-99bc1",
  storageBucket: "arena-clash-99bc1.firebasestorage.app",
  messagingSenderId: "724797078880",
  appId: "1:724797078880:web:14236610af3b6d4c07f205"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png',
    image: payload.notification.imageUrl || undefined // Support for rich media
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
