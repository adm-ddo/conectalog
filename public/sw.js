// Service worker do ConectaLog — só existe pra receber push (notificação
// real no celular, mesmo com o app fechado) e abrir a tela certa quando
// o motoboy toca nela. De propósito NÃO faz cache/offline (nada de
// workbox) — o app precisa sempre buscar dado fresco do servidor.

self.addEventListener("push", (event) => {
  let dados = { titulo: "ConectaLog", corpo: "Você tem uma novidade.", url: "/app/inicio" };
  try {
    if (event.data) dados = { ...dados, ...event.data.json() };
  } catch {
    // payload não veio em JSON — usa o texto cru como corpo.
    if (event.data) dados.corpo = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [200, 100, 200],
      data: { url: dados.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/app/inicio";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (janela.url.includes(url) && "focus" in janela) return janela.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
