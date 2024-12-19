import { defineStore } from "pinia";
import { type Memo } from "@/types";

// memo:useFavoriteTotalStoreはCallableな関数
// = defineStoreの戻り値
export const useFavTotalStore = defineStore({
  id: "favTotal",
  state: () => ({
    favTotal: 0,
  }),
  getters: {
    // sample code...
    timesTen: (state) => state.favTotal * 10,
  },
  actions: {
    set(memos: Memo[]) {
      this.favTotal = memos.filter((memo: Memo) => {
        return memo.favorite === true;
      }).length;
    },
  },
});
