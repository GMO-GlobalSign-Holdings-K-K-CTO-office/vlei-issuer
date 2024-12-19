<template>
  <v-dialog
    v-model="partner.dialog"
    persistent
    transition="dialog-bottom-transition"
    width="60vw"
  >
    <v-card>
      <v-toolbar color="accent" clipped-right>
        <v-app-bar-title class="white--text"
          >パートナーDIDの登録</v-app-bar-title
        >
      </v-toolbar>

      <v-container>
        <v-row>
          <v-card class="mx-auto my-10" variant="flat" style="width: 50vw">
            <v-card-subtitle class="mt-3"
              >相手のDIDと別名を登録してください。</v-card-subtitle
            >
            <v-spacer></v-spacer>
            <v-form ref="partnerRegisterForm" class="px-4 py-2">
              <v-text-field
                prepend-icon="mdi-pencil"
                color="accent"
                v-model="partner.alias"
                label="別名"
                :rules="partner.aliasRule"
                variant="outlined"
              ></v-text-field>
              <v-textarea
                clearable
                label="DID"
                prepend-icon="mdi-pencil"
                variant="outlined"
                v-model="partner.did"
                :rules="partner.didRule"
                class="mt-4"
                color="accent"
              ></v-textarea>
            </v-form>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                :loading="partner.loader"
                class="white--text"
                color="accent"
                variant="outlined"
                @click="registerPartner()"
              >
                登録
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-row>
      </v-container>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
import { ref, reactive, type Ref } from "vue";
import { type ValidationRule } from "@/types";
import { isPartnerRegistered } from "@/modules/common";

const partnerRegisterForm: Ref<any> = ref(null);
const partner: {
  dialog: boolean;
  loader: boolean;
  alias: string;
  did: string;
  aliasRule: ValidationRule[];
  didRule: ValidationRule[];
} = reactive({
  dialog: !isPartnerRegistered(),
  loader: false,
  alias: "",
  did: "",
  aliasRule: [
    (v: string) => !!v || "別名は必須です。",
    (v: string) => v.length <= 20 || "別名は20文字以内で入力してください。",
  ],
  didRule: [(v: string) => !!v || "DIDは必須です。"],
});

const emit = defineEmits<{
  (e: "partnerRegistered"): void;
}>();
const registerPartner = async () => {
  if ((await partnerRegisterForm.value.validate()).valid) {
    partner.loader = true;
    localStorage.setItem("partnerAlias", partner.alias);
    localStorage.setItem("partnerDid", partner.did);
    partner.loader = false;
    partner.dialog = false;
    emit("partnerRegistered");
  }
};
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
