<template>
  <!-- new memo dialog-->
  <v-dialog
    v-model="newMemo.dialog"
    fullscreen
    scrim="false"
    transition="dialog-bottom-transition"
  >
    <template v-slot:activator="{ props }">
      <div class="float-button-wrapper">
        <v-btn
          v-bind="props"
          size="large"
          icon
          color="accent"
          class="mr-3 mb-3"
        >
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </div>
    </template>
    <v-card>
      <v-toolbar color="primary" clipped-right>
        <v-btn icon @click="newMemo.dialog = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
        <v-app-bar-title class="white--text">新規メモ登録</v-app-bar-title>
      </v-toolbar>

      <v-container>
        <v-row>
          <v-card class="mx-auto my-10" style="width: 50vw">
            <v-card-subtitle class="mt-3"
              >タイトルと本文を記入してください。</v-card-subtitle
            >
            <v-spacer></v-spacer>
            <v-form ref="newMemoForm" class="px-4 py-2">
              <v-text-field
                prepend-icon="mdi-pencil"
                color="accent"
                v-model="newMemo.title"
                label="タイトル"
                :rules="newMemo.titleRule"
                variant="outlined"
              ></v-text-field>
              <v-textarea
                clearable
                label="本文"
                prepend-icon="mdi-pencil"
                variant="outlined"
                v-model="newMemo.text"
                :rules="newMemo.textRule"
                class="mt-4"
                color="accent"
              ></v-textarea>
            </v-form>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                :loading="newMemo.loader"
                class="white--text"
                color="accent"
                variant="outlined"
                @click="saveNewMemo()"
              >
                保存
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-row>
      </v-container>
    </v-card>
  </v-dialog>
</template>
<script setup lang="ts">
import { postMemo } from "@/modules/memo";
import { ref, reactive, type Ref } from "vue";
import { type ValidationRule } from "@/types";

const newMemoForm: Ref<any> = ref(null);
const newMemo: {
  dialog: boolean;
  loader: boolean;
  title: string;
  text: string;
  titleRule: ValidationRule[];
  textRule: ValidationRule[];
} = reactive({
  dialog: false,
  loader: false,
  title: "",
  text: "",
  titleRule: [
    (v: string) => !!v || "タイトルは必須です。",
    (v: string) => v.length <= 20 || "タイトルは20文字以内で入力してください。",
  ],
  textRule: [(v: string) => !!v || "本文は必須です。"],
});

// const emit = defineEmits<EmitPattern>();
const emit = defineEmits<{
  (e: "newMemoCreated"): void;
}>();
const saveNewMemo = async () => {
  if ((await newMemoForm.value.validate()).valid) {
    newMemo.loader = true;
    await postMemo({
      title: newMemo.title,
      text: newMemo.text,
    });
    newMemo.title = "";
    newMemo.text = "";
    newMemo.loader = false;
    newMemo.dialog = false;
    emit("newMemoCreated");
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
