import {
  Web5,
  type Web5ConnectOptions,
} from "https://cdn.jsdelivr.net/npm/@web5/api@0.8.4/dist/browser.mjs";
// もしくは
// import { Web5, type Web5ConnectOptions } from "@web5/api/browser";
import type { ProtocolDefinition } from "@tbd54566975/dwn-sdk-js";
import type { ProtocolURI } from "@/types";
import { isResponseOk } from "./common";

/**
 * Web5クラスに対するユーティティクラス
 */

// FYI: FUTURE:
// Web5インスタンスを何で識別するのかが不明。Optionの内容で識別する可能性がある。
// つまり、Option単位でプロファイルを持つか。
// とりあえず1App:1Web5インスタンス(1DID)の前提でシンプルにしている。
// 無駄にWeb5インスタンスを作らないようにするため、アプリケーションスコープで1つにしている。

// Optionの内容でプロファイルを識別する場合、
// つまり1Appで、オプション(DIDやDWN Endpoints...)やProtocol構成を変えた複数のWeb5インスタンスを取り扱う場合は、
// このモジュールにWeb5Provider IFを作り、このクラスにproviders: Map<string, Web5Providers>を持たせる。
// そして、Providerの中でWeb5フィールドをPopulateする。 Provider#getInstance("providerName")で取得できるようにする。
export class Web5s {
  static #web5: Web5;
  static #myDid: string;
  static #protocol: ProtocolURI = "https://gmogshd-cto-office/memo-protocol";

  private constructor() {}

  // Factory Method
  public static getOrCreateInstance = async (): Promise<Web5> => {
    if (!Web5s.#web5) {
      console.debug(
        `DWN Endpoint: ${import.meta.env.VITE_REMOTE_DWN_ENDPOINT}`,
      );
      const options: Web5ConnectOptions = {
        // 20sec (default: 2min)
        sync: "20s",
        techPreview: {
          dwnEndpoints: [`${import.meta.env.VITE_REMOTE_DWN_ENDPOINT}`],
        },
      };
      const { web5, did } = await Web5.connect(options);
      Web5s.#web5 = web5;
      Web5s.#myDid = did;
      console.debug("created web5 instance");
      console.debug(`my DID: ${did}`);

      const protocolDef: ProtocolDefinition = {
        protocol: Web5s.#protocol,
        // 他者がweb5.protocol.query(..)でこのDefinitionをとることが可能になるか否か
        published: false,
        types: {
          memo: { schema: "https://gmogshd-cto-office/schema/memo" },
        },
        structure: {
          memo: {
            $actions: [
              { who: "author", of: "memo", can: "write" },
              { who: "recipient", of: "memo", can: "read" },
              { who: "author", of: "memo", can: "update" },
              { who: "author", of: "memo", can: "delete" },
            ],
          },
        },
      };

      const protocolConfigureResponse =
        await Web5s.#web5.dwn.protocols.configure({
          message: {
            definition: protocolDef,
          },
        });

      if (!isResponseOk(protocolConfigureResponse)) {
        throw new Error(
          `Failed to configure protocol, ${protocolConfigureResponse.status.detail}`,
        );
      }

      // FYI: 自Remote Nodeに即時同期したい場合
      // Record新規作成などで即時同期したい場合は、以下で先んじてProtocol Definitionを同期させた方が良い。
      // protocolConfigureResponse.protocol?.send(Web5s._myDid);
    }

    return Web5s.#web5;
  };

  public static getMyDid = (): string => {
    if (!Web5s.#myDid) {
      throw new Error("Web5 instance is not created yet.");
    }
    return Web5s.#myDid;
  };

  public static getProtocol = (): string => {
    return Web5s.#protocol;
  };

  public static isInstanceCreated = (): boolean => {
    return !!Web5s.#web5;
  };
}

// TODO: Map<DID, Alias>を作って、DIDをAliasに変換するユーティリティを作る(UIに作成者を出す)
