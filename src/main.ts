import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

import "@mdi/font/css/materialdesignicons.css";
import { registerPlugins } from "./plugins";

// Vite is not polyfilling Buffer, so we need to do it ourselves
import { Buffer } from "buffer";
window.Buffer = Buffer;

const app = createApp(App);
registerPlugins(app);

app.config.errorHandler = (err) => {
  console.error(err);
  router.push({ name: "ErrorDestination" });
};
app.mount("#app");

window.document.title = "ACDC Holder";
