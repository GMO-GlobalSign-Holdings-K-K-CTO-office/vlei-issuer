export type MemoBody = {
  title: string;
  text: string;
  favorite: boolean;
  done: boolean;
};
export type MemoMeta = {
  id: string;
  author: string;
  recipient: string;
  dateCreated: string;
  dateModified: string;
};
export type Memo = MemoBody & MemoMeta;
export type NewMemo = Pick<Memo, "title" | "text">;
export type GetMemosOptions = Partial<Memo>;

export type ProtocolURI = "https://gmogshd-cto-office/memo-protocol";
// FUTURE: 他にあればUnionで追加
export type Schema = "https://gmogshd-cto-office/schema/memo";
