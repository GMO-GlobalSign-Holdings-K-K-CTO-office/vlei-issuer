import type { MemoBody, Memo } from "@/types";
import { Web5s } from "@/modules/web5";
import type { ResponseStatus } from "@web5/api";

/**
 * Type Guard Check
 *
 * @param value unkonwnな値
 * @returns MemoBody型か否か
 */
export const isMemoBody = (value: unknown): value is MemoBody => {
  return (
    typeof value === "object" &&
    value !== null &&
    value !== undefined &&
    "title" in value &&
    typeof value.title === "string" &&
    "text" in value &&
    typeof value.text === "string" &&
    "favorite" in value &&
    typeof value.favorite === "boolean" &&
    "done" in value &&
    typeof value.done === "boolean"
  );
};

export const isPartnerRegistered = (): boolean => {
  return (
    !!localStorage.getItem("partnerAlias") &&
    !!localStorage.getItem("partnerDid")
  );
};

export const isMemoMine = (memo: Memo): boolean => {
  return memo.author === Web5s.getMyDid();
};

export const isResponseOk = (resp: ResponseStatus): boolean => {
  return resp.status.code >= 200 && resp.status.code <= 299;
};

export const handleCUDReponse = (
  resp: ResponseStatus | undefined,
  type: "Create" | "Update" | "Delete" | "Send",
) => {
  if (!resp) {
    const message = `Failed to ${type} memo, Response is undefined`;
    console.error(message);
    throw new DwnAccessError(message);
  }

  console.debug(`${type} Response: ${JSON.stringify(resp, null, 2)}`);

  if (!isResponseOk(resp)) {
    const message = `Failed to ${type} memo, ${resp.status.detail}`;
    console.error(message);
    throw new DwnAccessError(message);
  }
};

export class DwnAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DWNAccessError";
  }
}
