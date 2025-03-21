import {
  ready,
  randomPasscode,
  SignifyClient,
  Tier,
  CreateIdentiferArgs,
  HabState,
  Contact,
} from "signify-ts";
import {
  IllegalArgumentException,
  IllegalStateException,
} from "@/modules/exception";
import {
  OobiIpexHandler,
  YourResponseValidator,
  MyResponseSender,
  AcdcIssuer,
  OobiIpexState,
  AdmitMarker,
  MyChallengeSentCallback,
} from "@/modules/oobi-ipex";
import {
  type KeriaRole,
  AID_NAME,
  KERIA_ROLE,
  QVI_SCHEMA_URL,
  VLEI_REGISTRY_NAME,
  QVI_SCHEMA_SAID,
} from "@/modules/const";
import { LogAllMethods } from "./decorator";

/**
 * A companion class for the SignifyRepository interface,
 * providing factory methods and more.
 */
export class Signifies {
  private static instances: Map<RepositoryImplType, SignifyRepository> =
    new Map();

  static {
    // ここでreadyすると、画面リロードでエラーになる。
    // (async () => {
    //   await signify.ready();
    // })();
  }

  private constructor() {}

  /**
   * Get a SignifyRepository instance.
   *
   * @param type Repository Impl Type
   * @returns SignifyRepository
   * @thows IllegalStateException when masterSecret is not set.
   */
  static getInstance = async (
    type: RepositoryImplType = "default",
  ): Promise<SignifyRepository> => {
    const masterSecret = Signifies.getMasterSecret();
    if (!masterSecret) {
      throw new IllegalStateException("masterSecret is not set.");
    }
    return Signifies.getInstanceWithSecret(masterSecret, type);
  };

  /**
   * Get a SignifyRepository instance with the master secret.
   *
   * @param masterSecret master secret
   * @param type Repository Impl Type
   * @returns SignifyRepository instance
   */
  static getInstanceWithSecret = async (
    masterSecret: string,
    type: RepositoryImplType = "default",
  ): Promise<SignifyRepository> => {
    // TODO: validation code for masterSecret

    Signifies.setMasterSecret(masterSecret);

    if (!Signifies.instances.has(type)) {
      switch (type) {
        case "default": {
          await ready();
          const client = new SignifyClient(
            import.meta.env.VITE_KERIA_ADMIN_INTERFACE_URL,
            masterSecret,
            Tier.low,
            import.meta.env.VITE_KERIA_BOOT_INTERFACE_URL,
          );

          // Mapping of oobi state to its handler
          const ipexHandlerMap: Map<OobiIpexState, OobiIpexHandler> = new Map();
          // oobi part
          ipexHandlerMap.set("1_init", new MyChallengeSentCallback());
          ipexHandlerMap.set(
            "2_2_response_received",
            new YourResponseValidator(),
          );
          ipexHandlerMap.set("3_1_challenge_received", new MyResponseSender());

          // ipex part
          ipexHandlerMap.set("3_3_response_validated", new AcdcIssuer());
          ipexHandlerMap.set("4_1_issuing_credential", new AdmitMarker());

          const defaultInstance = new SignifyRepositoryDefaultImpl(
            client,
            ipexHandlerMap,
          );
          await defaultInstance.connectToKeriaAgent();
          Signifies.instances.set(type, defaultInstance);
          break;
        }
      }
    }

    const repository = Signifies.instances.get(type);
    if (!repository) {
      throw new IllegalStateException("Repository instance is not set.");
    }

    return repository;
  };

  /**
   * Check if a init process is done.
   * @param type Repository Impl Type
   * @returns boolean
   */
  static isInitiationDone = (): boolean => {
    return !!this.getMasterSecret();
  };

  /**
   * Generate a master secret.
   * @returns master secret
   */
  static generateMasterSecret = async (): Promise<string> => {
    return randomPasscode();
  };

  /**
   * Set the master secret.
   *
   *
   * @param masterSecret
   */
  private static setMasterSecret = (masterSecret: string): void => {
    // Note: To hold the master secret even when the browser screen is reloaded, use sessionStorage.
    // If you want to empty the master secret when reloading the screen, change it to store it in memory.

    // Note: ブラウザ画面リロードでもmasterSecretを保持するため、sessionStorageを利用する。
    // リロードでmasterSecretを空にしたい場合は、メモリに保持するように変更する。
    sessionStorage.setItem("masterSecret", masterSecret);
  };

  /**
   * Get the master secret.
   * @returns master secret or null
   */
  private static getMasterSecret = (): string | null => {
    return sessionStorage.getItem("masterSecret");
  };
}

/**
 * The SignifyRepository interface.
 * (Holds business logic. It's like Service interface in the Service pattern, or
 * Repository interface in the UDF Architecture)
 */
export interface SignifyRepository {
  /**
   * Connect to the Keria Agent.
   */
  connectToKeriaAgent(): Promise<void>;

  /**
   * Retrieve AID. If not exists, create it.
   * @returns AID
   */
  createOrRetrieveAid(): Promise<string>;

  /**
   * Create Registry.
   */
  createVcRegistry(registryName?: string): Promise<void>;

  /**
   * Import VC Schema
   */
  importVcSchema(): Promise<void>;

  /**
   * Create Oobi.
   * @returns Oobi
   */
  createOobi(): Promise<string>;

  /**
   * Get Profile.
   */
  getProfile(): Promise<Profile>;

  /**
   * Rotate the key.
   */
  rotateKey(): Promise<void>;

  /**
   * Get Event History.
   */
  getEventHistory(): Promise<KeyEvent[]>;

  /**
   * Get Holders.
   */
  getHolders(): Promise<ExtendedContact[]>;

  /**
   * Get Holder.
   *
   * @param pre AID prefix
   */
  getHolder(pre: string): Promise<ExtendedContact>;

  /**
   * Add Holder.
   *
   * @param oobi Oobi
   * @param holderName Holder Name
   */
  addHolder(oobi: string, holderName: string): Promise<void>;

  /**
   * Generate Challenge.
   *
   * @returns challenge
   */
  generateChallenge(): Promise<string>;

  /**
   * Progress Ipex.
   *
   * @param holder
   */
  progressIpex(holder: ExtendedContact): Promise<void>;

  /**
   * Revoke Credential.
   */
  revokeCredential(credentialId: string): Promise<void>;

  /**
   * Get Issued Credential Id.
   *
   * @param holderAid
   */
  getIssuedCredentialId(holderAid: string): Promise<string | null>;

  /**
   * Get the Ipex State.
   *
   * @param holderAid
   * @returns Ipex State
   */
  getIpexState(holderAid: string): Promise<OobiIpexState>;

  /**
   * Set the Ipex State.
   *
   * @param state
   * @param holderAid
   */
  setIpexState(state: OobiIpexState, holderAid: string): Promise<void>;

  /**
   * This method is for development only.
   */
  inspect(): Promise<void>;
}

/**
 * The default implementation of the SignifyRepository interface.
 * Holds the SignifyClient instance and implements the interface methods.
 */
@LogAllMethods
class SignifyRepositoryDefaultImpl implements SignifyRepository {
  private client: SignifyClient;
  private ipexHandlers: Map<OobiIpexState, OobiIpexHandler> = new Map();

  constructor(
    client: SignifyClient,
    ipexHandlers: Map<OobiIpexState, OobiIpexHandler>,
  ) {
    this.client = client;
    this.ipexHandlers = ipexHandlers;
  }

  /**
   *  Connect to the Keria Agent.
   */
  public async connectToKeriaAgent(): Promise<void> {
    const bootResp = await this.client.boot();
    console.log(`signfy client booted: ${JSON.stringify(bootResp, null, 2)}`);

    await this.client.connect();
    console.log("signify client connected");
  }

  /**
   * Retrieve AID. If not exists, create it.
   * @returns AID
   */
  public async createOrRetrieveAid(): Promise<string> {
    let aid: HabState | null = null;

    try {
      aid = await this.client.identifiers().get(AID_NAME);
    } catch (e) {
      console.log(`AID not found: ${JSON.stringify(e, null, 2)}`);
    }

    if (!aid) {
      const inceptionEventArgs: CreateIdentiferArgs = {
        toad: 0,
      };

      // const inceptionEventArgs: CreateIdentiferArgs = {};
      // const witsUrls = import.meta.env.VITE_WITNESS_URLS;
      // if (witsUrls) {
      //   inceptionEventArgs.wits = [...witsUrls.split(",")];
      //   inceptionEventArgs.toad = 1;
      // } else {
      //   throw new IllegalStateException("WITNESS_URL is not set.");
      // }

      const inceptionEvent = await this.client
        .identifiers()
        .create(AID_NAME, inceptionEventArgs);
      console.log(
        `Inception Event: ${JSON.stringify(inceptionEvent, null, 2)}`,
      );

      // Wait for the asynchronous operation on the Keria Agent to complete.
      // Need this step when a operations's type is CUD.
      const inceptionOp = await inceptionEvent.op();
      await this.client.operations().wait(inceptionOp);
      await this.client.operations().delete(inceptionOp.name);

      const keriaRole: KeriaRole = "agent";
      // Authorize Keria as Agent
      const authorizedAgentResult = await this.client
        .identifiers()
        .addEndRole(AID_NAME, keriaRole, this.client.agent?.pre);
      console.log(
        `Authorized Agent Result: ${JSON.stringify(authorizedAgentResult, null, 2)}`,
      );

      const authzOp = await authorizedAgentResult.op();
      await this.client.operations().wait(authzOp);
      await this.client.operations().delete(authzOp.name);

      aid = await this.client.identifiers().get(AID_NAME);
    }

    console.log(`AID: ${JSON.stringify(aid, null, 2)}`);
    return aid.prefix;
  }

  /**
   * Create Oobi.
   * @returns Oobi
   */
  public async createOobi(): Promise<string> {
    const oobi = await this.client.oobis().get(AID_NAME, KERIA_ROLE);
    console.log(JSON.stringify(oobi, null, 2));

    return oobi.oobis[0];
  }

  /**
   * Import VC Schema
   */
  public async importVcSchema(
    schemaUrl: string = QVI_SCHEMA_URL,
  ): Promise<void> {
    const resolveResult = await this.client.oobis().resolve(schemaUrl);
    console.log(
      `Schema OOBI Resolution Result: ${JSON.stringify(resolveResult, null, 2)}`,
    );

    console.log("Schemas:", await this.client.schemas().list());

    const schemaOp = await this.client.operations().get(resolveResult.name);
    await this.client.operations().wait(schemaOp);
    await this.client.operations().delete(schemaOp.name);
  }

  /**
   * Create Registry.
   *
   * @param registryName Registry Name
   */
  public async createVcRegistry(
    registryName: string = VLEI_REGISTRY_NAME,
  ): Promise<void> {
    const holderAid = await this.client.identifiers().get(AID_NAME);
    console.log(`Holder AID: ${JSON.stringify(holderAid, null, 2)}`);

    // TODO: ログからRegistryの型を作る。
    const exisitingRegList: any[] = await this.client
      .registries()
      .list(holderAid.name);
    console.log(`RegList: ${JSON.stringify(exisitingRegList, null, 2)}`);

    const registryFound = exisitingRegList.some((registry) => {
      return registry.name === registryName;
    });

    if (!registryFound) {
      const registryCreationResult = await this.client
        .registries()
        .create({ name: holderAid.name, registryName });
      console.log(
        `Registry Creation Result: ${JSON.stringify(registryCreationResult, null, 2)}`,
      );

      const registryCreationOp = await registryCreationResult.op();
      await this.client.operations().wait(registryCreationOp);
      await this.client.operations().delete(registryCreationOp.name);
    }
  }

  /**
   * Get Profile.
   */
  public async getProfile(): Promise<Profile> {
    const aid = await this.client.identifiers().get(AID_NAME);
    const profile: Profile = {
      // TODO: Important! properties other thant aid should be fetched from the Backend App which
      // does not exist in this project.
      // TODO: 重要！aid以外のプロパティは、このプロジェクトには存在しないバックエンドアプリから取得する必要があります。
      name: "John Doe",
      position: "CTO",
      createdAt: "2024/01/01",
      aid: aid.prefix,
    };
    return profile;
  }

  /**
   * Rotate the key.
   */
  public async rotateKey(): Promise<void> {
    const rotateEvent = await this.client.identifiers().rotate(AID_NAME);
    console.log(`Rotate Event: ${JSON.stringify(rotateEvent, null, 2)}`);

    const rotateOp = await rotateEvent.op();
    await this.client.operations().wait(rotateOp);
    await this.client.operations().delete(rotateOp.name);
  }

  /**
   * Get Event History.
   */
  public async getEventHistory(): Promise<KeyEvent[]> {
    const aid = await this.client.identifiers().get(AID_NAME);
    const kel: KeyEvent[] = (await this.client
      .keyEvents()
      .get(aid.prefix)) as KeyEvent[];
    console.log(`KEL: ${JSON.stringify(kel, null, 2)}`);

    return kel;
  }

  /**
   * Get Holders.
   */
  public async getHolders(): Promise<ExtendedContact[]> {
    const holders = await this.client.contacts().list();
    console.log(`Holders: ${JSON.stringify(holders, null, 2)}`);

    // TODO: Temporal codes
    const notificationList = await this.client.notifications().list();
    console.log(
      `Notification List: ${JSON.stringify(notificationList, null, 2)}`,
    );
    console.log("Schemas:", await this.client.schemas().list());
    console.log(
      `Schema: ${JSON.stringify(await this.client.schemas().get(QVI_SCHEMA_SAID), null, 2)}`,
    );

    const extendHolders = async (holder: Contact): Promise<ExtendedContact> => {
      let currentState = await this.getIpexState(holder.id);
      let notification: AdmitNotification | undefined = undefined;
      const tmpHolder: ExtendedContact = {
        ...holder,
        state: currentState,
        // TODO: Type Guard実行
        challenges: holder.challenges as string[],
        notification,
      };

      // TODO: Important!!!
      // 各種NotificationHandlerを用意し、それをMapに格納する。
      // 各種NotificationHandlerは、IpexStateを受け取り、そのStateに対応する処理を行う。
      // 具体的には、parameterのstateに応じたNotificationの取得にトライし、存在すればStateを変更する。
      // setState,getState含めてStateManagerを作り、その中でNotificationHandlerを呼び出すのもあり。
      if (currentState === "2_1_challenge_sent") {
        // TODO: key存在の確認とType Guard実行
        const challengesInContact = holder.challenges as object[];
        if (challengesInContact.length > 0) {
          currentState = "2_2_response_received";
          await this.setIpexState(currentState, holder.id);
        }
      } else if (currentState === "4_1_issuing_credential") {
        const notifyResponse = (await this.client.notifications().list()) as {
          notes: AdmitNotification[];
        };

        const noteList = notifyResponse.notes.filter(
          (note) => note.a.r === "/exn/ipex/admit" && note.r === false,
        );
        console.log("filtered noteList:", noteList);

        if (noteList.length) {
          if (noteList.length === 1) {
            // OOBI Sessionが終わるとシステム全体でAdmitのNotificationが0になるため、ここは1で固定で。
            await this.setIpexState(currentState, holder.id);
            notification = noteList[0];
            tmpHolder.notification = notification;
            await this.progressIpex(tmpHolder);
          }
        }
      }

      return tmpHolder;
    };

    const extendedHolders = await Promise.all(holders.map(extendHolders));
    return extendedHolders;

    // (1)-c. My ResponseのValidate状態を取得する。
    //     Statusの設定の中で、ResponseのNotification情報を取得して、存在すればStatusに3_3_response_validatedを設定する。
    //     Contatに対しNotificationを設定し画面に返し、ボタンが活性化される。(Issueへ)

    // (1)-d. Issueの最後のステップ
    //     Statusの設定の中で、AdmitのNotificationの情報を取得して、存在すればStatusに6_issue_acceptedを設定する。
    //     そして、ooib-ipex.tsのAdmitMarkerを呼び出す。
    // 参考: github.com/WebOfTrust/signify-ts/blob/cddb00713ce7b09b3f18acdaae559703759369bc/examples/integration-scripts/utils/test-util.ts#L479
  }

  /**
   * Get Holder.
   *
   * @param pre AID prefix
   */
  public async getHolder(aid: string): Promise<ExtendedContact> {
    if (!aid) {
      throw new IllegalStateException("AID is not set.");
    }

    const holder = await this.client.contacts().get(aid);
    console.log("Holder: ", holder);

    // TODO: Type Guard
    const challenges = holder.challenges as any[] | undefined;

    const extendedHolder: ExtendedContact = {
      ...holder,
      state: await this.getIpexState(holder.id),
      challenges:
        challenges && challenges.length > 0
          ? (challenges[0].words as string[])
          : [],
    };

    return extendedHolder;
  }

  /**
   * add Holder.
   *
   * @param oobi Oobi
   * @param holderName Holder Name
   * @returns holder
   */
  public async addHolder(oobi: string, holderName: string): Promise<void> {
    if (!oobi || !holderName) {
      throw new IllegalArgumentException("oobi or holderName is not set.");
    }

    const resolveResult = await this.client.oobis().resolve(oobi, holderName);
    console.log(
      `Oobi Resolution Result: ${JSON.stringify(resolveResult, null, 2)}`,
    );

    const resolveOp = await this.client.operations().get(resolveResult.name);
    console.log(`Resolve Operation: ${JSON.stringify(resolveOp, null, 2)}`);
    await this.client.operations().wait(resolveOp);
    await this.client.operations().delete(resolveOp.name);

    const oobiUrl = resolveResult.metadata?.oobi as string;
    if (!oobiUrl) {
      throw new IllegalStateException("oobiUrl is not set.");
    }

    const aidInOobi = oobiUrl.match(/oobi\/([^/]+)\/agent/);
    console.log(`AID in Oobi: ${aidInOobi}`);
    if (!aidInOobi) {
      throw new IllegalStateException("oobiUrl is invalid.");
    }

    this.setIpexState("1_init", aidInOobi[1]);
  }

  /**
   * Progress Ipex.
   *
   * @param holder
   */
  public async progressIpex(holder: ExtendedContact): Promise<void> {
    const ipexHandler = this.ipexHandlers.get(holder.state);
    if (!ipexHandler) {
      throw new IllegalStateException(`Ipex State is invalid. ${holder.state}`);
    }
    await ipexHandler.progress(this.client, holder);
  }

  /**
   * Generate Challenge.
   *
   * @returns challenge
   */
  public async generateChallenge(): Promise<string> {
    const challenge = await this.client.challenges().generate(128);
    console.log(`Challenge: ${JSON.stringify(challenge, null, 2)}`);
    // TODO: 仮の実装。実際のSDK戻り値を確認して修正する。
    return challenge.words.toString();
  }

  /**
   * Revoke Credential.
   */
  public async revokeCredential(credentialId: string): Promise<void> {
    const revocationResult = await this.client
      .credentials()
      .revoke(AID_NAME, credentialId);
    console.log(`Revocation Result:`, revocationResult);

    const revocationOp = revocationResult.op;
    await this.client.operations().wait(revocationOp);
    await this.client.operations().delete(revocationOp.name);
  }

  /**
   * Get Issued Credential Id.
   *
   * @param holderAid
   */
  public async getIssuedCredentialId(
    holderAid: string,
  ): Promise<string | null> {
    const myAid = this.createOrRetrieveAid();
    const credentials = (await this.client.credentials().list({
      filter: {
        "-i": myAid,
        "-s": QVI_SCHEMA_SAID,
        "-a-i": holderAid,
      },
    })) as any[];
    console.log(`Issued Credentials for Holder {}`, credentials);

    if (!credentials || credentials.length === 0) {
      return null;
    } else {
      // Holderに対し発行VC数は、1つの前提
      return credentials[0].id;
    }
  }

  /**
   * Get the Ipex State.
   *
   * @param holderAid
   * @returns Ipex State
   */
  public async getIpexState(holderAid: string): Promise<OobiIpexState> {
    // TODO: ここの実装が1つキモになる。
    // とりあえず仮の実装として、localStorageを使うが、
    // App Backendから取得するのか、またはAgentから取得するのか
    // このままでいいのか、検討が必要。

    const state = localStorage.getItem(
      `IpexState + ${holderAid}`,
    ) as OobiIpexState | null;
    if (!state) {
      throw new IllegalStateException("Ipex State is not set.");
    }

    return state;
  }

  /**
   * Set the Ipex State.
   *
   * @param state
   * @param holderAid
   */
  public async setIpexState(
    state: OobiIpexState,
    holderAid: string,
  ): Promise<void> {
    // TODO: ここの実装が1つキモになる。
    // とりあえず仮の実装として、localStorageを使うが、
    // App Backendから取得するのか、またはAgentから取得するのか
    // このままでいいのか、検討が必要。

    localStorage.setItem(`IpexState + ${holderAid}`, state);
  }

  /**
   * Logging useful information of the Signify Client.
   * 有益そうなSignify Clientの情報をロギングする。
   * This method is for development only.
   */
  public async inspect(): Promise<void> {
    const states = await this.client.state();
    console.log(`states: ${JSON.stringify(states, null, 2)}`);

    const keyStates = this.client.keyStates();
    console.log(`keyStates: ${JSON.stringify(keyStates, null, 2)}`);

    const operation = this.client.operations();
    console.log(`operation: ${JSON.stringify(operation, null, 2)}`);

    const notification = this.client.notifications();
    console.log(`notification: ${JSON.stringify(notification, null, 2)}`);

    const exchanges = this.client.exchanges();
    console.log(`exchanges: ${JSON.stringify(exchanges, null, 2)}`);

    const registries = this.client.registries();
    console.log(`registries: ${JSON.stringify(registries, null, 2)}`);
  }
}

export type RepositoryImplType = "default";
export type Profile = {
  name: string;
  position: string;
  createdAt: string;
  aid: string;
};

export type RotationHistory = {
  publicKey: string;
  createdDate: string;
};

export type KeyEvent = {
  ked: {
    // Public Key List
    k: string[];
    // Sequence
    s: string;
    // Key Event Type
    t: KeyEventType;
  };
};

export type KeyEventType =
  // inception
  | "icp"
  // interaction
  | "ixn"
  // rotation
  | "rot";

export type ExtendedContact = Contact & {
  state: OobiIpexState;
  challenges?: string[];
  notification?: AdmitNotification;
};

export type Notification = {
  i: string;
  dt: string;
  r: boolean;
  a: { r: string; d?: string; m?: string };
};

export type AdmitNotification = Notification;
