<template>
  <div>
    <template v-if="renderReady">
      <v-row justify="center" class="ma-5">
        <v-table class="elevation-2" style="width: 50%">
          <thead>
            <tr>
              <th class="text-left">Item</th>
              <th class="text-left">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(value, key) in contact" :key="key">
              <td>{{ key }}</td>
              <td>
                {{ value }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-row>

      <!-- Credential Revocation Part -->
      <template v-if="issuedCredentialFound">
        <credential-revocation-dialog
          @credentialRevoked="credentialRevoked"
          :credentialId="issuedCredentialId"
        />
        <v-snackbar
          v-model="credentialRevokedSnackbar"
          close-on-content-click
          color="accent"
          timeout="2000"
          variant="tonal"
        >
          <div class="d-flex justify-center">Credential Revoked</div>
        </v-snackbar>
      </template>

      <!-- Challenge Acceptance Part -->
      <challenge-acceptance-dialog
        :contactName="contact?.name ?? 'unknown'"
        :contactPrefix="contact?.pre ?? 'unknown'"
        @challengeAccepted="challengeAccepted"
      />
      <v-snackbar
        v-model="challengeAcceptedSnackbar"
        close-on-content-click
        color="accent"
        timeout="2000"
        variant="tonal"
      >
        <div class="d-flex justify-center">Challenge Accepted</div>
      </v-snackbar>

      <!-- Challenge Generation Part -->
      <div class="float-button-wrapper">
        <v-btn
          size="large"
          icon
          color="accent"
          class="mr-3 mb-3"
          @click="generateChallenge"
        >
          <v-icon>mdi-format-color-text</v-icon>
        </v-btn>
      </div>
      <v-snackbar
        v-model="challengeGenSnackbar"
        color="accent"
        multi-line
        vertical
        timeout="10000"
        variant="outlined"
      >
        {{ challengeWord }}
        <template v-slot:actions>
          <v-btn icon @click="copyChallengeText">
            <v-icon size="small">mdi-content-copy</v-icon>
          </v-btn>
          <v-btn
            color="accent"
            variant="text"
            @click="challengeGenSnackbar = false"
          >
            Close
          </v-btn>
        </template>
      </v-snackbar>
      <v-snackbar
        v-model="challengeCopiedSnackbar"
        location="center"
        color="accent"
        timeout="2000"
        variant="tonal"
      >
        <div class="d-flex justify-center">Challenge Word Copied!</div>
      </v-snackbar>
    </template>
    <template v-else>
      <v-progress-linear
        indeterminate
        color="accent-lighten-2"
      ></v-progress-linear>
    </template>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, type Ref } from "vue";
import { useRoute } from "vue-router";
import { Signifies, type Contact } from "@/modules/repository";
import ChallengeAcceptanceDialog from "@/components/ChallengeAcceptanceDialog.vue";
import CredentialRevocationDialog from "@/components/CredentialRevocationDialog.vue";
import { IllegalArgumentException } from "@/modules/exception";

const route = useRoute();
const renderReady = ref(false);
const contact: Ref<Contact | null> = ref(null);

const issuedCredentialFound = ref(false);
const issuedCredentialId = ref("");

const showDetail = async () => {
  const repository = await Signifies.getInstance();
  const prefix = route.params.pre;
  if (Array.isArray(prefix)) {
    throw new IllegalArgumentException("Invalid pre");
  } else {
    contact.value = await repository.getHolder(prefix);
    console.log(`Contact: ${JSON.stringify(contact.value, null, 2)}`);

    const credentialId = await repository.getIssuedCredentialId(
      contact.value.pre,
    );

    if (credentialId) {
      issuedCredentialFound.value = true;
      issuedCredentialId.value = credentialId;
    }
  }

  // for debugging purpose only
  // await repository.inspect();
};

// Credential Revocation Part
const credentialRevokedSnackbar = ref(false);
const credentialRevoked = async () => {
  renderReady.value = false;
  await showDetail();
  renderReady.value = true;
  credentialRevokedSnackbar.value = true;
};

// Challenge Acceptance Part
const challengeAcceptedSnackbar = ref(false);
const challengeAccepted = async () => {
  renderReady.value = false;
  await showDetail();
  renderReady.value = true;
  challengeAcceptedSnackbar.value = true;
};

// Challenge Generation Part
const challengeGenSnackbar = ref(false);
const challengeCopiedSnackbar = ref(false);
const challengeWord = ref("");

const generateChallenge = async () => {
  const repository = await Signifies.getInstance();
  challengeWord.value = await repository.generateChallenge();
  challengeGenSnackbar.value = true;
};

const copyChallengeText = () => {
  navigator.clipboard.writeText(challengeWord.value);
  challengeCopiedSnackbar.value = true;
};

const emit = defineEmits<{
  (e: "pageName", pageName: string): void;
}>();

onMounted(async () => {
  await showDetail();
  emit("pageName", "Holder Detail");
  renderReady.value = true;
});
</script>
<style scoped>
.float-button-wrapper {
  width: 5vw;
  left: 95vw;
  height: 5vh;
  top: 95vh;
  position: fixed;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
}
</style>
