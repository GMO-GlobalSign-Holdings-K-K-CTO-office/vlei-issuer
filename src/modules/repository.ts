import {
  ready,
  randomPasscode,
  SignifyClient,
  Tier,
  CreateIdentiferArgs,
  HabState,
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
} from "@/modules/oobi-ipex";
import {
  type KeriaRole,
  AID_NAME,
  KERIA_ROLE,
  QVI_SCHEMA_URL,
  VLEI_REGISTRY_NAME,
} from "@/modules/const";

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
          ipexHandlerMap.set(
            "2_2_response_received",
            new YourResponseValidator(),
          );
          ipexHandlerMap.set("3_1_challenge_received", new MyResponseSender());

          // ipex part
          ipexHandlerMap.set("3_3_response_validated", new AcdcIssuer());
          ipexHandlerMap.set("4_2_credential_accepted", new AdmitMarker());

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
  getHolders(): Promise<Contact[]>;

  /**
   * Get Holder.
   *
   * @param pre AID prefix
   */
  getHolder(pre: string): Promise<Contact>;

  /**
   * Add Holder.
   *
   * @param oobi Oobi
   * @param holderName Holder Name
   * @returns holder
   */
  addHolder(oobi: string, holderName: string): Promise<Contact>;

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
  progressIpex(holder: Contact): Promise<void>;

  /**
   * This method is for development only.
   */
  inspect(): Promise<void>;
}

/**
 * The default implementation of the SignifyRepository interface.
 * Holds the SignifyClient instance and implements the interface methods.
 */
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
    console.log("connectToKeriaAgent started");
    const bootResp = await this.client.boot();
    console.log(`signfy client booted: ${JSON.stringify(bootResp, null, 2)}`);

    await this.client.connect();
    console.log("signify client connected");
    console.log("connectToKeriaAgent finished");
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
      // const inceptionEventArgs: CreateIdentiferArgs = {
      //   toad: 0,
      // };

      const inceptionEventArgs: CreateIdentiferArgs = {};
      const witsAids = import.meta.env.VITE_WITNESS_AIDS;
      if (witsAids) {
        inceptionEventArgs.wits = [...witsAids.split(",")];
        inceptionEventArgs.toad = 1;
      } else {
        throw new IllegalStateException("WITNESS_AIDS is not set.");
      }

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
      console.log("createOrRetrieveAid finished");
    }
    return aid.prefix;
  }

  /**
   * Create Oobi.
   * @returns Oobi
   */
  public async createOobi(): Promise<string> {
    console.log("createOobi started");

    const oobi = await this.client.oobis().get(AID_NAME, KERIA_ROLE);
    console.log(JSON.stringify(oobi, null, 2));

    console.log("createOobi finished");
    return oobi.oobis[0];
  }

  /**
   * Import VC Schema
   */
  public async importVcSchema(
    schemaUrl: string = QVI_SCHEMA_URL,
  ): Promise<void> {
    console.log("importVcSchema started");

    const resolveResult = await this.client.oobis().resolve(schemaUrl);
    console.log(
      `Schema OOBI Resolution Result: ${JSON.stringify(resolveResult, null, 2)}`,
    );

    const resolveOp = await resolveResult.op();
    await this.client.operations().wait(resolveOp);
    await this.client.operations().delete(resolveOp.name);

    console.log("importVcSchema finished");
  }

  /**
   * Create Registry.
   *
   * @param registryName Registry Name
   */
  public async createVcRegistry(
    registryName: string = VLEI_REGISTRY_NAME,
  ): Promise<void> {
    console.log("createVcRegistry started");

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
    console.log("createVcRegistry finished");
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
    console.log("rotateKey started");

    const rotateEvent = await this.client.identifiers().rotate(AID_NAME);
    console.log(`Rotate Event: ${JSON.stringify(rotateEvent, null, 2)}`);

    const rotateOp = await rotateEvent.op();
    await this.client.operations().wait(rotateOp);
    await this.client.operations().delete(rotateOp.name);

    console.log("rotateKey finished");
  }

  /**
   * Get Event History.
   */
  public async getEventHistory(): Promise<KeyEvent[]> {
    console.log("getEventHistory started");

    const aid = await this.client.identifiers().get(AID_NAME);
    const kel: KeyEvent[] = (await this.client
      .keyEvents()
      .get(aid.prefix)) as KeyEvent[];
    console.log(`KEL: ${JSON.stringify(kel, null, 2)}`);

    console.log("getEventHistory finished");
    return kel;
  }

  /**
   * Get Holders.
   */
  public async getHolders(): Promise<Contact[]> {
    // TODO: Anyで帰ってきてしまっている。ログから型を特定する。
    // とりあえず仮定の型でモックデータを返す。

    const holders = await this.client.contacts().list();
    console.log(`Holders: ${JSON.stringify(holders, null, 2)}`);

    // TODO: Important!! ここでStatusの設定を行う。(1)

    // TODO: **Notification**の取得
    // (1)-a. Holder Responseの取得を行う。
    //    Statusの設定の中で、Response受信のNotification情報を取得して、存在すればStatusに2_2_response_receivedを設定する。
    //    Contatに対しNotificationを設定し画面に返し、ボタンが活性化される。(Validateへ)
    // 参考: github.com/WebOfTrust/signify-ts/blob/cddb00713ce7b09b3f18acdaae559703759369bc/examples/integration-scripts/utils/test-util.ts#L479

    // (1)-b. Holder Challengeを取得する。
    //     Statusの設定の中で、ChallengeのNotification情報を取得して、存在すればStatusに3_1_challenge_receivedを設定する。
    //     Contatに対しNotificationを設定し画面に返し、ボタンが活性化される。(Responseの送信へ)

    // (1)-c. My ResponseのValidate状態を取得する。
    //     Statusの設定の中で、ResponseのNotification情報を取得して、存在すればStatusに3_3_response_validatedを設定する。
    //     Contatに対しNotificationを設定し画面に返し、ボタンが活性化される。(Issueへ)

    // (1)-d. Issueの最後のステップ
    //     Statusの設定の中で、AdmitのNotificationの情報を取得して、存在すればStatusに6_issue_acceptedを設定する。
    //     そして、ooib-ipex.tsのAdmitMarkerを呼び出す。
    // 参考: github.com/WebOfTrust/signify-ts/blob/cddb00713ce7b09b3f18acdaae559703759369bc/examples/integration-scripts/utils/test-util.ts#L479

    return [
      {
        name: "John Doe",
        pre: "pre1",
        state: "2_1_challenge_sent",
        challenge: ["challenge1", "challenge2"],
      },
      {
        name: "Jane Doe",
        pre: "pre2",
        state: "2_1_challenge_sent",
        challenge: ["challenge1", "challenge2"],
      },
    ];
  }

  /**
   * Get Holder.
   *
   * @param pre AID prefix
   */
  public async getHolder(pre: string): Promise<Contact> {
    // TODO: Anyで帰ってきてしまっている。ログから型を特定する。
    // とりあえず仮定の型でモックデータを返す。
    if (!pre) {
      throw new IllegalStateException("pre is not set.");
    }

    // const holder = await this.client.contacts().get(pre);
    // console.log(`Holder: ${JSON.stringify(holder, null, 2)}`);

    // TODO: Important!! getHolders(..)同様に、ここでStatusの設定を行う。

    return {
      name: "John Doe",
      pre: "pre1",
      state: "2_1_challenge_sent",
      challenge: ["challenge1", "challenge2"],
    };
  }

  /**
   * add Holder.
   *
   * @param oobi Oobi
   * @param holderName Holder Name
   * @returns holder
   */
  public async addHolder(oobi: string, holderName: string): Promise<Contact> {
    if (!oobi || !holderName) {
      throw new IllegalArgumentException("oobi or holderName is not set.");
    }

    const resolveResult = await this.client.oobis().resolve(oobi, holderName);
    console.log(
      `Oobi Resolution Result: ${JSON.stringify(resolveResult, null, 2)}`,
    );

    const resolveOp = await resolveResult.op();
    await this.client.operations().wait(resolveOp);
    await this.client.operations().delete(resolveOp.name);

    const holdertoAdd: Contact = {
      // TODO: oobiから取得できるかもしれない。確認して修正する。
      pre: resolveResult.pre,
      state: "1_init",
      name: holderName,
      challenge: ["challenge1", "challenge2"],
    };
    this.progressIpex(holdertoAdd);

    return {
      name: "John Doe",
      pre: "pre1",
      state: "2_1_challenge_sent",
      challenge: ["challenge1", "challenge2"],
    };
  }

  /**
   * Progress Ipex.
   *
   * @param holder
   */
  public async progressIpex(holder: Contact): Promise<void> {
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

// TODO: 仮の型定義。実際のSDK戻り値を確認して修正する。
export type Contact = {
  name: string; // lei
  pre: string; // prefix
  state: OobiIpexState;
  challenge: string[];
  notification?: AdmitNotification;
};

export type Notification = {
  i: string;
  dt: string;
  r: boolean;
  a: { r: string; d?: string; m?: string };
};

export type AdmitNotification = Notification;
