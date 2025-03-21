import { SignifyClient, Serder } from "signify-ts";
import { Signifies, type ExtendedContact } from "@/modules/repository";
import { IllegalStateException } from "@/modules/exception";
import { AID_NAME, QVI_SCHEMA_SAID } from "@/modules/const";
import { LogAllMethods } from "./decorator";

export interface OobiIpexHandler {
  progress(client: SignifyClient, holder: ExtendedContact): Promise<void>;
}

export class MyChallengeSentCallback implements OobiIpexHandler {
  async progress(client: SignifyClient, holder: ExtendedContact) {
    const repository = await Signifies.getInstance();
    await repository.setIpexState("2_1_challenge_sent", holder.id);
  }
}

@LogAllMethods
export class YourResponseValidator implements OobiIpexHandler {
  async progress(client: SignifyClient, holder: ExtendedContact) {
    // TODO: Signifiesに移行する
    const challengeWord = sessionStorage.getItem(`challenge-${holder.id}`);
    if (!challengeWord) {
      throw new Error("Challenge not found.");
    }

    const verifyOperation = await client
      .challenges()
      .verify(holder.id, challengeWord.split(","));
    console.log(`VerifyOperation: ${JSON.stringify(verifyOperation, null, 2)}`);

    // TODO: Waitが終わらない。原因調査中。
    try {
      await client
        .operations()
        .wait(verifyOperation, { signal: AbortSignal.timeout(10000) });
      console.log("Done verify op waiting");
      await client.operations().delete(verifyOperation.name);
      console.log("Done verify op deleting");

      type VerifyResponse = {
        // exn = exchange
        exn: Record<string, unknown>;
      };
      const verifyResponse = verifyOperation.response as VerifyResponse;
      const serder = new Serder(verifyResponse.exn);

      const resp = await client.challenges().responded(holder.id, serder.ked.d);

      console.log(`Responsed Resp: ${JSON.stringify(resp, null, 2)}`);
    } catch (e) {
      console.log("Verify Operation Waitng or Deleting Error: ", e);
      alert(
        "Verification timeout. We're investigating the issue. Please go to the next step.",
      );

      const repository = await Signifies.getInstance();
      await repository.setIpexState("2_3_response_validated", holder.id);
    }
  }
}

@LogAllMethods
export class MyResponseSender implements OobiIpexHandler {
  async progress(client: SignifyClient, holder: ExtendedContact) {
    if (!holder.challenges) {
      throw new IllegalStateException("Challenges are not set.");
    }

    const response = await client
      .challenges()
      .respond("aid", holder.id, holder.challenges);
    console.log(`Response Sent: ${JSON.stringify(response, null, 2)}`);

    const repository = await Signifies.getInstance();
    await repository.setIpexState("3_2_response_sent", holder.id);

    // TODO: Temporary
    // verifyが終わらないため、とりあえず次のステップに進む
    setTimeout(async () => {
      await repository.setIpexState("3_3_response_validated", holder.id);
    }, 10000);
  }
}

// IPEX Part
@LogAllMethods
export class AcdcIssuer implements OobiIpexHandler {
  async progress(client: SignifyClient, holder: ExtendedContact) {
    const issuerAid = await client.identifiers().get(AID_NAME);
    const registries = await client.registries().list(issuerAid.name);

    type Registry = {
      name: string;
      regk: string;
    };
    const registry: Registry = registries[0];

    // Note: MVPではQVI vLEI CredentialとChainさせて発行する。以下を参考にする。
    // In the MVP, it will be issued with chaining the QVI vLEI Credential. Refer to the following for reference.
    //   https://github.com/WebOfTrust/signify-ts/blob/main/examples/integration-scripts/credentials.test.ts#L498
    const issueResult = await client.credentials().issue(issuerAid.name, {
      ri: registry.regk,
      s: QVI_SCHEMA_SAID,
      a: {
        i: holder.id,
        LEI: holder.alias,
      },
    });
    console.log(`IssResult: ${JSON.stringify(issueResult, null, 2)}`);

    const issueOp = issueResult.op;
    const issueOpWaitResult = await client.operations().wait(issueOp);
    console.log(
      `IssueOperationWaitResult: ${JSON.stringify(issueOpWaitResult, null, 2)}`,
    );

    await client.operations().delete(issueOp.name);

    //--------------------------

    // issueResultとCredentialの型が異なるので、一度Credentialをretrieveする。
    // Since the types of issueResult and Credential are different, Credential will be retrieved once.
    const credential = await client.credentials().get(issueResult.acdc.ked.d);
    console.log(`Retrieved Credential: ${JSON.stringify(credential, null, 2)}`);

    const [grant, gsigs, gend] = await client.ipex().grant({
      senderName: issuerAid.name,
      acdc: new Serder(credential.sad),
      anc: new Serder(credential.anc),
      iss: new Serder(credential.iss),
      ancAttachment: credential.ancAttachment,
      recipient: holder.id,
      datetime: new Date().toISOString().replace("Z", "000+00:00"),
    });
    console.log(`grant: ${JSON.stringify(grant, null, 2)}`);
    console.log(`gsigs: ${JSON.stringify(gsigs, null, 2)}`);
    console.log(`gend: ${JSON.stringify(gend, null, 2)}`);

    const grantOp = await client
      .ipex()
      .submitGrant(issuerAid.name, grant, gsigs, gend, [holder.id]);
    console.log(`GrantSubmissionResponse: ${JSON.stringify(grantOp, null, 2)}`);

    const grantOpWaitDone = await client.operations().wait(grantOp);
    console.log(
      `GrantOperationWaitDone: ${JSON.stringify(grantOpWaitDone, null, 2)}`,
    );
    await client.operations().delete(grantOp.name);

    const repository = await Signifies.getInstance();
    await repository.setIpexState("4_1_issuing_credential", holder.id);
  }
}

@LogAllMethods
export class AdmitMarker implements OobiIpexHandler {
  async progress(client: SignifyClient, holder: ExtendedContact) {
    if (!holder.notification) {
      throw new IllegalStateException("Notification not found.");
    }

    await client.notifications().mark(holder.notification.i);
    await client.notifications().delete(holder.notification.i);
    console.log("Done Notification Mark and Delete for Credential Issuance");

    const repository = await Signifies.getInstance();
    await repository.setIpexState("4_2_credential_issued", holder.id);
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
  | "4_1_issuing_credential" // 発行中
  | "4_2_credential_issued" // 発行済み
  | "5_1_credential_revoked"; // 通知受理

// TODO: common.tsを作り移動する(bob=holde対応済みなのでそっちみてやる)
const formatStateMap: Map<OobiIpexState, string> = new Map();
formatStateMap.set("1_init", "Init");
formatStateMap.set("2_1_challenge_sent", "My Challenge Sent / NONE");
formatStateMap.set("2_2_response_received", "Your Response Received / NONE");
formatStateMap.set("2_3_response_validated", "Your Response Verified / NONE");
formatStateMap.set(
  "3_1_challenge_received",
  "Your Response Verified / Your Challenge Received",
);
formatStateMap.set(
  "3_2_response_sent",
  "Your Response Verified / My Response Sent",
);
formatStateMap.set(
  "3_3_response_validated",
  "Your Response Verified / My Response Verified",
);
formatStateMap.set("4_1_issuing_credential", "Issuing Credential...");
formatStateMap.set("4_2_credential_issued", "Credential Issued");
formatStateMap.set("5_1_credential_revoked", "Credential Revoked");

export const formatState = (state: OobiIpexState) => {
  const formatted = formatStateMap.get(state);
  if (!formatted) {
    throw new IllegalStateException("State not found.");
  }
  return formatted;
};
