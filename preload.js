// Expose a simple API to the renderer process if needed
window.myAPI = {
  sendMessage: (msg) => console.log(`Message from renderer: ${msg}`),
};
