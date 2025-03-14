<template>
  <template v-if="renderReady">
    <v-list>
      <v-list-item
        class="my-2"
        v-for="(holder, i) in holders"
        :key="`list-${i}`"
      >
        <v-list-item-title>
          {{ holder.alias }}
        </v-list-item-title>
        <v-list-item-subtitle> {{ holder.id }}</v-list-item-subtitle>
        <template v-slot:append>
          <v-chip color="primary">{{ formatState(holder.state) }}</v-chip>
          <v-list-item-action class="ml-3">
            <v-btn
              variant="outlined"
              color="accent"
              @click="navigateToHolderDetail(holder)"
              >Detail</v-btn
            >
          </v-list-item-action>
          <template v-if="canIpexStateProceed(holder.state)">
            <v-list-item-action class="ml-3">
              <v-btn
                variant="outlined"
                color="accent"
                :loading="ipexProgressing"
                @click="progressIpex(holder)"
                >{{ oobiIpexButtonTextMap.get(holder.state) }}</v-btn
              >
            </v-list-item-action>
          </template>

          <!-- TODO: 後でprogressIpexにYes/No Dialogつける -->
          <!-- <v-list-item-action>
            <v-dialog v-model="deletionDialogShown" max-width="30%">
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" icon variant="flat">
                  <v-icon color="secondary">mdi-delete</v-icon>
                </v-btn>
              </template>
              <v-card>
                <v-toolbar color="accent" class="px-4 text-white"
                  >Warn!</v-toolbar
                >
                <v-card-text class="pa-4">
                  <span class="text-glay">{{ MESSAGE_ON_DELETION }}</span>
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn
                    :loading="removeLoader"
                    color="accent"
                    variant="flat"
                    @click="removeArchive(i)"
                  >
                    OK
                  </v-btn>
                  <v-btn
                    color="accent"
                    variant="text"
                    @click="cancelDeletion()"
                  >
                    キャンセル
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-list-item-action> -->
        </template>
        <v-divider class="mt-2"></v-divider>
      </v-list-item>
    </v-list>
    <div class="float-button-wrapper">
      <v-btn
        size="large"
        icon
        color="accent"
        class="mr-3 mb-3"
        @click="refreshHolderList()"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>
    <holder-register-dialog @holderRegistered="holderRegistered" />
    <v-snackbar
      :timeout="2000"
      v-model="noticeAfterIpex"
      centered
      variant="tonal"
      location="center"
      close-on-content-click
      color="primary"
    >
      {{ MESSAGE_ON_IPEX_PROGRESS }}
    </v-snackbar>
    <v-snackbar
      :timeout="2000"
      v-model="noticeAfterHolderRegistered"
      centered
      variant="tonal"
      location="center"
      close-on-content-click
      color="primary"
    >
      {{ MESSAGE_ON_HOLDER_REGISTERED }}
    </v-snackbar>
  </template>
  <template v-else>
    <v-progress-linear
      indeterminate
      color="accent-lighten-2"
    ></v-progress-linear>
  </template>
</template>
<script setup lang="ts">
import { Signifies, type ExtendedContact } from "@/modules/repository";
import { ref, onMounted, type Ref } from "vue";
import { useRouter } from "vue-router";
import HolderRegisterDialog from "@/components/HolderRegisterDialog.vue";
import { type OobiIpexState, formatState } from "@/modules/oobi-ipex";

const renderReady = ref(false);
const holders: Ref<ExtendedContact[]> = ref([]);

const emit = defineEmits<{
  (e: "pageName", pageName: string): void;
}>();

onMounted(async () => {
  await showHolders();
  emit("pageName", "Holder List");
  renderReady.value = true;
});

const showHolders = async () => {
  const repository = await Signifies.getInstance();
  holders.value = await repository.getHolders();

  // for debugging purpose only
  // repository.inspect();
};

const refreshHolderList = async () => {
  renderReady.value = false;
  setTimeout(async () => {
    await showHolders();
    renderReady.value = true;
  }, 700);
};

const router = useRouter();
const navigateToHolderDetail = async (holder: ExtendedContact) => {
  router.push({ name: "HolderDetail", params: { aid: holder.id } });
};

const noticeAfterIpex = ref(false);
const ipexProgressing = ref(false);
const MESSAGE_ON_IPEX_PROGRESS = "Done processing.";
const progressIpex = async (holder: ExtendedContact) => {
  ipexProgressing.value = true;
  const repository = await Signifies.getInstance();
  await repository.progressIpex(holder);

  await showHolders();
  ipexProgressing.value = false;
  noticeAfterIpex.value = true;

  // for debugging purpose only
  // repository.inspect();
};

const noticeAfterHolderRegistered = ref(false);
const MESSAGE_ON_HOLDER_REGISTERED = "New holder has been registered.";
const holderRegistered = async () => {
  noticeAfterHolderRegistered.value = true;
  await showHolders();
};

const oobiIpexButtonTextMap: Map<OobiIpexState, string> = new Map();
oobiIpexButtonTextMap.set("2_2_response_received", "Validate Response"); // active
oobiIpexButtonTextMap.set("3_1_challenge_received", "Send Response"); // active
oobiIpexButtonTextMap.set("3_3_response_validated", "Issue Credential"); // active

/**
 *  Check if the Ipex State can proceed.
 *
 * @param state Ipex State
 * @returns can proceed or not
 */
const canIpexStateProceed = (state: OobiIpexState): boolean => {
  return (
    state === "2_2_response_received" ||
    state === "3_1_challenge_received" ||
    state === "3_3_response_validated"
  );
};
</script>
<style scoped>
.float-button-wrapper {
  width: 5vw;
  left: 90vw;
  height: 5vh;
  top: 95vh;
  position: fixed;
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
}
</style>
