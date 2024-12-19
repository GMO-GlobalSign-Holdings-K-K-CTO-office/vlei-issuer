import type { Memo, MemoMeta, NewMemo, Schema } from "@/types";
import { Web5s } from "@/modules/web5";
import type {
  RecordsDeleteRequest,
  RecordsQueryRequest,
  RecordsQueryResponse,
  RecordsCreateRequest,
  RecordUpdateOptions,
} from "@web5/api";
import { DateSort } from "@tbd54566975/dwn-sdk-js";
import {
  isMemoBody,
  isResponseOk,
  handleCUDReponse,
  DwnAccessError,
} from "@/modules/common";

/**
 * 自分と相手のメッセージを取得する。
 *
 * @param option クエリオプション
 * @returns メモリスト
 * @throws DwnAccessError DWNアクセスで取得に失敗した場合
 * @throws Error 予期しないエラー
 */
export const getMemos = async (): Promise<Memo[]> => {
  const partnerDID = localStorage.getItem("partnerDid");
  if (!partnerDID) throw new Error("Partner DID is not set.");

  const myMemos = await queryMemos();
  const partnerMemos = await queryMemos(partnerDID);

  return [...myMemos, ...partnerMemos];
};

/**
 * メッセージを取得する。
 *
 * @param option クエリオプション
 * @param fromDID 取得対象のDID
 * @returns メモリスト
 * @throws DwnAccessError DWNアクセスで取得に失敗した場合
 * @throws Error 予期しないエラー
 */
const queryMemos = async (
  fromDID?: string, // options: GetMemosOptions = {},
): Promise<Memo[]> => {
  const web5 = await Web5s.getOrCreateInstance();

  // FUTURE: optionsの内容でQuery Paramを構築する(UI側で検索条件機能を実装できたら)
  const memoSchema: Schema = "https://gmogshd-cto-office/schema/memo";
  const queryRequest: RecordsQueryRequest = {
    from: fromDID,
    message: {
      filter: {
        protocol: Web5s.getProtocol(),
        // protooclPathはProtocol Definitionのstructureと同期している
        protocolPath: "memo",
        dataFormat: "application/json",
        schema: memoSchema,
      },
      dateSort: DateSort.CreatedDescending,
    },
  };

  // query/readメソッドは、自Remote Nodeまで行かない。
  // あくまで自Local Node内のデータを取得する。
  const queryResp: RecordsQueryResponse =
    await web5.dwn.records.query(queryRequest);
  console.debug(`Query Response: ${JSON.stringify(queryResp, null, 2)}`);

  if (!isResponseOk(queryResp)) {
    throw new DwnAccessError(
      `Failed to query memos, ${queryResp.status.detail}`,
    );
  }

  const memos: Memo[] = [];
  for (const record of queryResp.records ?? []) {
    const data = (await record.data.json()) as unknown;
    // Type Guard Check
    if (isMemoBody(data)) {
      const { id, author, recipient, dateCreated, dateModified }: MemoMeta =
        record;

      memos.push({
        ...data,
        id,
        author,
        recipient,
        dateCreated,
        dateModified,
      });
    } else {
      throw new Error("Invalid memo data");
    }
  }

  return memos;
};

/**
 * 新規メッセージを作り、自分のNodeに保管する。
 *
 * @param newMemo 新規メモ
 * @throws DwnAccessError DWNアクセスで作成に失敗した場合
 * @throws Error 予期しないエラー
 *
 */
export const postMemo = async (newMemo: NewMemo): Promise<void> => {
  const web5 = await Web5s.getOrCreateInstance();

  const partnerDID = localStorage.getItem("partnerDid");
  if (!partnerDID) {
    throw new Error("Partner DID is not set.");
  }

  const memoSchema: Schema = "https://gmogshd-cto-office/schema/memo";
  const request: RecordsCreateRequest = {
    data: { ...newMemo, favorite: false, done: false },
    message: {
      protocol: Web5s.getProtocol(),
      protocolPath: "memo",
      schema: memoSchema,
      dataFormat: "application/json",
      recipient: partnerDID,

      // trueにすると誰でもquery/readできるようになる。デフォルトはfalseでProtocolに従う。
      // published: false
    },
    // FYI: どのように作用するか不明だが、これがないとうまく同期できなかった。
    store: true,
  };

  // 自Local Nodeにレコードを作る。
  const createResp = await web5.dwn.records.create(request);
  handleCUDReponse(createResp, "Create");

  // FYI: 自分のRemote Nodeにも即時同期させたい場合
  // const immdiateSyncResp = await createResp.record?.send(Web5s.getMyDid());
  // handleCUDReponse(immdiateSyncResp, "Send");
};

/**
 * Post済みメッセージを更新する。
 *
 * @param memo 既存メモ
 * @throws DwnAccessError DWNアクセスで更新に失敗した場合
 * @throws Error 予期しないエラー
 */
export const updateMemo = async (memo: Memo): Promise<void> => {
  const web5 = await Web5s.getOrCreateInstance();

  const schema: Schema = "https://gmogshd-cto-office/schema/memo";
  const recordToUpdate = await web5.dwn.records.read({
    message: {
      filter: {
        protocol: Web5s.getProtocol(),
        protocolPath: "memo",
        schema: schema,
        dataFormat: "application/json",
        recordId: memo.id,
        author: Web5s.getMyDid(),
      },
    },
  });

  if (!recordToUpdate) {
    throw new Error("This memo is not found.");
  }

  if (!isResponseOk(recordToUpdate)) {
    throw new DwnAccessError(
      `Failed to read memo, ${recordToUpdate.status.detail}`,
    );
  }

  const updateOptions: RecordUpdateOptions = {
    data: {
      title: memo.title,
      text: memo.text,
      favorite: memo.favorite,
      done: memo.done,
    },
  };

  // FYI: web5.dwn.records.createFrom(..)は更新ではなく、既存レコードを元にした新規作成である。
  const updateResponse = await recordToUpdate.record.update(updateOptions);
  handleCUDReponse(updateResponse, "Update");
};

/**
 * Post済みメッセージを削除する。
 *
 * @param memoId メモID
 * @throws DwnAccessError DWNアクセスで削除に失敗した場合
 */
export const deleteMemo = async (memoId: string): Promise<void> => {
  const web5 = await Web5s.getOrCreateInstance();
  const request: RecordsDeleteRequest = {
    message: {
      recordId: memoId,
    },
  };
  const deleteResponse = await web5.dwn.records.delete(request);
  handleCUDReponse(deleteResponse, "Delete");
};

// FUTURE: Commonで各関数のパラメーターの空文字チェックを実装する
