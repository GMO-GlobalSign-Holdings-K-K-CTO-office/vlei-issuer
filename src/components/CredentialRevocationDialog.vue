<template>
  <v-dialog v-model="revocationDialog" max-width="30%">
    <template v-slot:activator="{ props }">
      <div class="float-button-wrapper">
        <v-btn
          v-bind="props"
          size="large"
          icon
          color="accent"
          class="mr-3 mb-3"
        >
          <v-icon>mdi-file-document-remove</v-icon>
        </v-btn>
      </div>
    </template>
    <v-card>
      <v-toolbar color="accent" class="px-4 text-white">{{
        TITLE_ON_REVOCATION
      }}</v-toolbar>
      <v-card-text class="pa-4">
        <span class="text-glay">{{ MESSAGE_ON_REVOCATION }}</span>
      </v-card-text>
      <v-card-actions class="mb-1">
        <v-spacer></v-spacer>
        <v-btn
          :loading="revocationLoader"
          color="accent"
          variant="flat"
          @click="revokeCredential()"
        >
          OK
        </v-btn>
        <v-btn color="accent" variant="text" @click="cancelRevocation()">
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { Signifies } from "@/modules/repository";

const TITLE_ON_REVOCATION = "Credential Revocation";
const MESSAGE_ON_REVOCATION = "Are you sure to revoke this credential?";

const props = defineProps({
  credentialId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits<{
  (e: "credentialRevoked"): void;
}>();

const revocationDialog = ref(false);
const revocationLoader = ref(false);
const revocationSnackbar = ref(false);

const revokeCredential = async () => {
  revocationLoader.value = true;

  const repository = await Signifies.getInstance();
  await repository.revokeCredential(props.credentialId);

  revocationLoader.value = false;
  revocationDialog.value = false;
  revocationSnackbar.value = true;
  emit("credentialRevoked");
};

const cancelRevocation = () => {
  revocationDialog.value = false;
};
</script>
<style scoped>
.float-button-wrapper {
  width: 5vw;
  left: 85vw;
  height: 5vh;
  top: 95vh;
  position: fixed;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
}
</style>
