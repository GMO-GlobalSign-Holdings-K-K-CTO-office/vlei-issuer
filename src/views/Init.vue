<template>
  <div class="d-flex justify-center align-center login-container">
    <v-card rounded="lg">
      <v-img
        src="/login-img.jpg"
        width="30rem"
        class="text-white align-end"
        gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)"
      >
        <v-card-title>メモDWA</v-card-title>
      </v-img>

      <v-card-actions class="d-flex align-center flex-column">
        <v-btn
          class="my-5"
          variant="outlined"
          color="accent"
          @click="init"
          :loading="initLoader"
          >始める</v-btn
        >
      </v-card-actions>
    </v-card>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Web5s } from "@/modules/web5";
const router = useRouter();

const initLoader = ref(false);
const init = async () => {
  initLoader.value = true;
  await Web5s.getOrCreateInstance();
  router.push({ path: "/memos" });
};
</script>
<style scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(to left, rgb(var(--v-theme-on-primary)), #4bbfc3);
}
</style>
