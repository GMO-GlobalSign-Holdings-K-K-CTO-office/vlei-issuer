import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import sodium from 'libsodium-wrappers-sumo';

// Vite is not polyfilling Buffer, so we need to do it ourselves
import { Buffer } from 'buffer';
window.Buffer = Buffer;

async function init() {
  await sodium.ready;
  console.log('libsodium ready');
}

// Vuetify
import "@mdi/font/css/materialdesignicons.css";
import { registerPlugins } from "./plugins";

init().then(() => {

  const app = createApp(App);
  registerPlugins(app);

  app.config.errorHandler = (err, vm, info) => {
    console.error(`errorHandler: ${info}`, err);
    router.replace({ name: "ErrorDestination" });
  };
  app.mount("#app");

  window.document.title = "メモアプリ";
});