import { createRouter, createWebHistory } from "vue-router";

import Content from "@/views/template/Content.vue";
import MemoList from "@/views/MemoList.vue";
import Init from "@/views/Init.vue";
import ErrorDestination from "@/views/ErrorDestination.vue";
import { isPartnerRegistered } from "@/modules/common";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: Content,
      meta: { requiresInit: true },
      redirect: () => {
        return { name: "Init" };
      },
      children: [
        {
          path: "/memos",
          name: "MemoList",
          component: MemoList,
          meta: { title: "一覧" },
        },
      ],
    },
    {
      path: "/init",
      name: "Init",
      meta: { title: "開始" },
      component: Init,
      // beforeEnter: async (to, from, next) => {
      //   // 初期化済みの場合はメモ一覧画面に遷移する
      //   if (Web5s.isInstanceCreated()) {
      //     next({
      //       path: "/memos",
      //     });
      //   } else {
      //     next();
      //   }
      // },
    },
    {
      path: "/error",
      name: "ErrorDestination",
      component: ErrorDestination,
    },
  ],
});

router.beforeEach(async (to, from, next) => {
  if (to.matched.some((record) => record.meta.requiresInit)) {
    if (isPartnerRegistered() || from.name === "Init") {
      next();
    } else {
      next({
        path: "/init",
      });
    }
  } else {
    next();
  }
});

export default router;
