<template>
  <div>
    <!--  ヘッダー -->
    <v-app-bar color="primary" app>
      <v-app-bar-nav-icon
        color="white"
        @click.stop="navDrawn = !navDrawn"
      ></v-app-bar-nav-icon>
      <v-toolbar-title class="white--text">{{ pageName }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <span class="white--text">{{ myDid }}</span>
      <v-btn color="success" icon v-show="pageName === 'メモ'">
        <v-progress-circular
          :model-value="todoDonePercentage"
          color="white"
        ></v-progress-circular>
      </v-btn>
      <v-btn color="white" icon v-show="pageName === 'メモ'">
        <v-icon class="white--text">mdi-heart</v-icon>
        <span class="white--text">{{ favTotal }} </span>
      </v-btn>
    </v-app-bar>

    <!-- サイドバー -->
    <v-navigation-drawer v-model="navDrawn" app temporary>
      <v-list-item class="my-3">
        <v-list-item-title class="text-h6"
          >シンプルメモアプリ</v-list-item-title
        >
        <v-list-item-subtitle>Decentralized Web App</v-list-item-subtitle>
      </v-list-item>
      <v-divider></v-divider>

      <v-list nav dense>
        <v-list-item
          v-for="(menu, i) in menus"
          :key="`menu-${i}`"
          link
          @click="closeMenu()"
          :to="menu.to"
          :prepend-icon="menu.icon"
          color="primary"
        >
          <v-list-item-title>{{ menu.text }}</v-list-item-title>
        </v-list-item>
      </v-list>
      <template v-slot:append>
        <v-list>
          <v-list-item>
            <v-switch
              @click="toggleTheme"
              inset
              label="テーマを変更する"
            ></v-switch>
          </v-list-item>
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- メインエリア -->
    <v-main>
      <router-view
        @todoDone="setDonePercentage"
        @pageName="setPageName"
        @myDid="setMyDid"
      />
    </v-main>
  </div>
</template>
<script setup lang="ts">
import { useTheme } from "vuetify";
import { ref, onMounted, type Ref } from "vue";
import { useFavTotalStore } from "@/stores/favoriteTotal";
import { storeToRefs } from "pinia";
import { type PageName, type PagePath } from "@/types";

// theme section
const theme = useTheme();
const toggleTheme = (): void => {
  theme.global.name.value =
    theme.global.name.value === "lightTheme" ? "darkTheme" : "lightTheme";
};

// navigation section
const menusRaw: { icon: string; text: PageName; to: PagePath }[] = [
  { icon: "mdi-collage", text: "メモ", to: "/memos" },
];

const menus = ref(menusRaw);

const navDrawn = ref(false);
const closeMenu = () => {
  navDrawn.value = false;
};

// 画面上部の共通セクション
const pageName: Ref<string | null> = ref(null);
// emitハンドリング
const setPageName = (pageNameHandled: string) => {
  pageName.value = pageNameHandled;
};

// storeの取得
const favTotalStore = useFavTotalStore();
// storeから値を取得してrefに格納
const { favTotal } = storeToRefs(favTotalStore);

const todoDonePercentage: Ref<number> = ref(0);
// emitハンドリング
const setDonePercentage = (percentageHandled: number) => {
  todoDonePercentage.value = percentageHandled;
};

const myDid: Ref<string | null> = ref(null);
const setMyDid = (myDidHandled: string) => {
  // とりあえず
  myDid.value = myDidHandled.substring(0, 30).concat("...");
};

onMounted(async () => {});
</script>
<style scoped></style>
