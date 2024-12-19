<template>
  <template v-if="renderReady">
    <v-container fluid>
      <v-row dense>
        <v-col v-for="(memo, i) in memos" :key="i" cols="12" sm="4">
          <v-card
            :color="isMemoMine(memo) ? 'primary' : 'accent'"
            variant="outlined"
          >
            <v-card-title
              class="text-black"
              :class="{ 'text-decoration-line-through': memo.done }"
              >{{ memo.title }}</v-card-title
            >
            <v-card-subtitle class="text-black"
              >作成日:
              {{ correctDateFormat(memo.dateCreated) }}</v-card-subtitle
            >
            <v-card-text
              class="text-black"
              :class="{ 'text-decoration-line-through': memo.done }"
            >
              {{ memo.text }}
            </v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <!-- <v-btn
                :disabled="!isMemoMine(memo)"
                icon
                color="secondary"
                @click="toggleTodoCheckmark(memo)"
              >
                <v-icon v-if="memo.done">mdi-checkbox-outline</v-icon>
                <v-icon v-else>mdi-checkbox-blank-outline</v-icon>
              </v-btn> -->
              <v-btn
                :disabled="!isMemoMine(memo)"
                icon
                @click="toggleFavorite(memo)"
              >
                <v-icon color="secondary" v-show="!memo.favorite"
                  >mdi-heart-outline</v-icon
                >
                <v-icon color="secondary" v-show="memo.favorite"
                  >mdi-heart</v-icon
                >
              </v-btn>
              <v-btn
                :disabled="!isMemoMine(memo)"
                icon
                @click="removeMemo(memo)"
              >
                <v-icon color="secondary">mdi-delete-outline</v-icon>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
    <!-- TODO: このボタンをヘッダー部に置く-->
    <div class="float-button-wrapper">
      <v-btn @click="refresh" size="large" icon class="mr-4 mb-3">
        <v-icon color="accent">mdi-refresh</v-icon>
      </v-btn>
    </div>
    <NewMemoDialog @newMemoCreated="showMemos()" />
    <PartnerRegisterDialog @partnerRegistered="partnerRegistered()" />
    <v-snackbar
      :timeout="2000"
      v-model="noticeAfterPartnerRegistered"
      centered
      variant="tonal"
      location="center"
      close-on-content-click
      color="primary"
    >
      パートナーが登録されました。
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
import { getMemos, updateMemo, deleteMemo } from "@/modules/memo";
import { onMounted, ref, computed, type Ref } from "vue";
import { useFavTotalStore } from "@/stores/favoriteTotal";
import NewMemoDialog from "@/components/NewMemoDialog.vue";
import type { Memo, PageName } from "@/types";
import { Web5s } from "@/modules/web5";
import {
  DwnAccessError,
  isMemoMine,
  isPartnerRegistered,
} from "@/modules/common";
import PartnerRegisterDialog from "@/components/PartnerRegisterDialog.vue";

const renderReady = ref(false);
const memos: Ref<Memo[]> = ref([]);

const emit = defineEmits<{
  (e: "todoDone", percentage: number): void;
  (e: "pageName", pageName: PageName): void;
  (e: "myDid", did: string): void;
}>();
const favTotalStore = useFavTotalStore();

// read section
const showMemos = async () => {
  try {
    memos.value = await getMemos();
    favTotalStore.set(memos.value);
    emit("todoDone", todoDonePercentage.value);
    emit("pageName", "メモ");
  } catch (e) {
    if (e instanceof DwnAccessError) {
      // TODO: 画面にsnackbarか何かでエラーメッセージを表示する。
    } else {
      // 予期しないエラー
      throw e;
    }
  }
};

// update section
const toggleFavorite = async (currentMemo: Memo) => {
  currentMemo.favorite = !currentMemo.favorite;

  try {
    await updateMemo(currentMemo);
    // FYI: favだけpiniaを使っている。
    favTotalStore.set(memos.value);
  } catch (e) {
    if (e instanceof DwnAccessError) {
      // TODO: 画面にsnackbarか何かでエラーメッセージを表示する。
    } else {
      throw e;
    }
  }
};

const todoDonePercentage = computed(() => {
  const todoDoneTotal = memos.value.filter((memo) => {
    return memo.done === true;
  }).length;
  return (todoDoneTotal / memos.value.length) * 100;
});

// const toggleTodoCheckmark = async (currentMemo: Memo) => {
//   currentMemo.done = !currentMemo.done;

//   try {
//     await updateMemo(currentMemo);
//     emit("todoDone", todoDonePercentage.value);
//   } catch (e) {
//     if (e instanceof DwnAccessError) {
//       //TODO: 画面にsnackbarか何かでエラーメッセージを表示する。
//     } else {
//       throw e;
//     }
//   }
// };

// delete section
const removeMemo = async (memo: Memo) => {
  try {
    await deleteMemo(memo.id);
    await showMemos();
  } catch (e) {
    if (e instanceof DwnAccessError) {
      // TODO: 画面にsnackbarか何かでエラーメッセージを表示する。
    } else {
      throw e;
    }
  }
};

// lifecycle events and others
onMounted(async () => {
  // TODO: パートナー登録ダイアログにしているが、ページに変えて初期ページとMemoページの間に挟む。
  if (isPartnerRegistered()) {
    await showMemos();
  }
  emit("myDid", Web5s.getMyDid());
  renderReady.value = true;
});

const noticeAfterPartnerRegistered = ref(false);
const partnerRegistered = async () => {
  noticeAfterPartnerRegistered.value = true;
  await showMemos();
};

const refresh = async () => {
  await showMemos();
};

// TODO:  util作って移動する。
const correctDateFormat = (date: string) => {
  return new Date(date).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });
};
</script>

<style scoped>
.prog-circ-on-init {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

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
