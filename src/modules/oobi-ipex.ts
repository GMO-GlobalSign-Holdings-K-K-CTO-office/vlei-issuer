import * as signify from "signify/signify-ts.mjs";
import { Contact } from "@/modules/repository";
import { IllegalStateException } from "@/modules/exception";
import { AID_NAME, QVI_SCHEMA_SAID } from "@/modules/const";

export interface OobiIpexHandler {
  progress(client: signify.SignifyClient, holder: Contact): Promise<void>;
}

// Note: 現状、各Handlerの最後に状態を遷移させてはいない。
// フロントとAgentで二重管理にするのは避けたいので、Agent側の状態を確認して、逐次状態を反映させる。

// OOBI Part
export class MyChallengeSender implements OobiIpexHandler {
  async progress(client: signify.SignifyClient, holder: Contact) {
    console.log("ChallengeSender started.");

    // チャレンジ送信専用のメソッドがclientにない。
    // とりあえずlow-levelなexchangeを使って、チャレンジを送信するが、ここはGLEIFに問い合わせる。
    // Challengeをビデオチャット経由で送信してもいいのか？(そうするべきなら、Challenge生成のUIを作る。)
    const sender = await client.identifiers().get("aid");
    const challengeSmall = await client.challenges().generate(128);
    sessionStorage.setItem(
      `challenge-${holder.pre}`,
      JSON.stringify(challengeSmall),
    );

    const resp = await client
      .exchanges()
      .send(
        "aid",
        "challenge",
        sender,
        "/challenge",
        { words: challengeSmall.words },
        {},
        [holder.pre],
      );
    console.log(`Challenge Sent: ${JSON.stringify(resp, null, 2)}`);
    console.log("ChallengeSender finished.");
  }
}

export class YourResponseValidator implements OobiIpexHandler {
  async progress(client: signify.SignifyClient, holder: Contact) {
    console.log("ChallengeResponseValidator started.");

    const challengeWord = sessionStorage.getItem(`challenge-${holder.pre}`);
    if (!challengeWord) {
      throw new Error("Challenge not found.");
    }

    const verifyOperation = await client
      .challenges()
      .verify(holder.pre, JSON.parse(challengeWord).words);
    console.log(`VerifyOperation: ${JSON.stringify(verifyOperation, null, 2)}`);

    await client.operations().wait(verifyOperation);
    await client.operations().delete(verifyOperation.name);

    type VerifyResponse = {
      // exn = exchange
      exn: Record<string, unknown>;
    };
    const verifyResponse = verifyOperation.response as VerifyResponse;
    const serder = new signify.Serder(verifyResponse.exn);

    const resp = await client.challenges().responded(holder.pre, serder.ked.d);

    console.log(`Responsed Resp: ${JSON.stringify(resp, null, 2)}`);
    console.log("ChallengeResponseValidator finished.");
  }
}

export class MyResponseSender implements OobiIpexHandler {
  async progress(client: signify.SignifyClient, holder: Contact) {
    console.log("ResponseSender started.");

    const response = await client
      .challenges()
      .respond("aid", holder.pre, holder.challenge);
    console.log(`Response Sent: ${JSON.stringify(response, null, 2)}`);

    console.log("ResponseSender finished.");
  }
}

// IPEX Part
export class AcdcIssuer implements OobiIpexHandler {
  async progress(client: signify.SignifyClient, holder: Contact) {
    console.log("AcdcIssuer started.");

    const issuerAid = await client.identifiers().get(AID_NAME);
    const registries = await client.registries().list(issuerAid.name);

    type Registry = {
      name: string;
      regk: string;
    };
    const registry: Registry = registries[0];

    // Note: I want to make it more versatile, but for now, I'll keep it fixed.
    // もっと汎用的な作りにしたいが、とりあえずQVI vLEIに固定的にする。
    const vcdata = {
      LEI: holder.name,
    };

    // Note: MVPではQVI vLEI CredentialとChainさせて発行する。以下を参考にする。
    // In the MVP, it will be issued with chaining the QVI vLEI Credential. Refer to the following for reference.
    //   https://github.com/WebOfTrust/signify-ts/blob/main/examples/integration-scripts/credentials.test.ts#L498
    const issueResult = await client.credentials().issue(issuerAid.name, {
      ri: registry.regk,
      s: QVI_SCHEMA_SAID,
      a: {
        i: holder.pre,
        ...vcdata,
      },
    });
    console.log(`IssResult: ${JSON.stringify(issueResult, null, 2)}`);

    const issueOp = issueResult.op;
    client.operations().wait(issueOp);
    client.operations().delete(issueOp.name);

    //--------------------------

    // issueResultとCredentialの型が異なるので、一度Credentialをretrieveする。
    // Since the types of issueResult and Credential are different, Credential will be retrieved once.
    const credential = await client.credentials().get(issueResult.acdc.ked.d);

    const [grant, gsigs, gend] = await client.ipex().grant({
      senderName: issuerAid.name,
      acdc: new signify.Serder(credential.sad),
      anc: new signify.Serder(credential.anc),
      iss: new signify.Serder(credential.iss),
      ancAttachment: credential.ancAttachment,
      recipient: holder.pre,
      datetime: new Date().toISOString().replace("Z", "000+00:00"),
    });

    const grantOp = await client
      .ipex()
      .submitGrant(issuerAid.name, grant, gsigs, gend, [holder.pre]);

    client.operations().wait(grantOp);
    client.operations().delete(grantOp.name);

    console.log("AcdcIssuer finished.");
  }
}

export class AdmitMarker implements OobiIpexHandler {
  async progress(client: signify.SignifyClient, holder: Contact) {
    console.log("AdmitMarker started.");

    if (!holder.notification) {
      throw new IllegalStateException("Notification not found.");
    }

    await client.notifications().mark(holder.notification.i);
    await client.notifications().delete(holder.notification.i);

    console.log("AdmitResponder finished.");
  }
}

export type OobiIpexState =
  | "1_init" // 初期状態
  | "2_1_challenge_sent" // チャレンジ送信済み
  | "2_2_response_received" // レスポンス受理
  | "2_3_response_validated" // レスポンス検証済み
  | "3_1_challenge_received" // チャレンジ受理
  | "3_2_response_sent" // レスポンス送信済み
  | "3_3_response_validated" // 送信したレスポンスが検証済み
  | "4_1_issuing" // 発行中
  | "4_2_issue_accepted"; // 発行済み
