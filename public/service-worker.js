self.addEventListener('push', event => {
  const payload = event.data.json();
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/logo.png' // Make sure you have a logo.png in your public folder
    })
  );
});
