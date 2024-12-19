export type PageName = "メモ";
export type PagePath = "/memos";

export type ValidationRule = (v: string) => boolean | ErrorMessage;

export type ErrorMessage =
  | "必須です"
  | "英字または数字のみにしてください"
  | "8文字以上にしてください"
  | "ログインまたはパスワードに誤りがあります。"
  | "タイトルは必須です。"
  | "タイトルは20文字以内で入力してください。"
  | "本文は必須です。"
  | "別名は必須です。"
  | "別名は20文字以内で入力してください。"
  | "DIDは必須です。";

export type ActionMessage = "このメモは完全に削除されます。よろしいですか？";

// FUTURE:
//ButtonLabel, Title, Subtitle Labelなど
