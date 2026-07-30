(function () {
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function activarNotificaciones() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      window.showToast("Este dispositivo no soporta notificaciones push.", "warning");
      return;
    }

    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        window.showToast("No se activaron las notificaciones.", "warning");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const { publicKey } = await fetch("/push/public-key").then((r) => r.json());

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      window.showToast("Notificaciones activadas.", "success");
      ocultarBotonActivar();
    } catch (error) {
      window.showToast("No se pudieron activar las notificaciones.", "error");
    }
  }

  function ocultarBotonActivar() {
    const btn = document.getElementById("activarNotificaciones");
    if (btn) btn.style.display = "none";
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(function () {});

    const btn = document.getElementById("activarNotificaciones");
    if (btn) {
      btn.addEventListener("click", activarNotificaciones);
    }

    navigator.serviceWorker.ready
      .then(function (registration) {
        return registration.pushManager.getSubscription();
      })
      .then(function (suscripcionExistente) {
        if (suscripcionExistente) ocultarBotonActivar();
      })
      .catch(function () {});
  });
})();
