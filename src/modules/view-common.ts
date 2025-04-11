import { IllegalStateException } from "./exception";
import { OobiIpexState } from "./oobi-ipex";

type OobiIpexLabel = {
  statelabel: string;
  actionlabel?: string;
};

const oobiIpexLabelMap: Map<OobiIpexState, OobiIpexLabel> = new Map();

oobiIpexLabelMap.set("1_init", {
  statelabel: "Init",
  actionlabel: "Challenge Sent?",
});
oobiIpexLabelMap.set("2_1_challenge_sent", {
  statelabel: "My Challenge Sent / NONE",
});
oobiIpexLabelMap.set("2_2_response_received", {
  statelabel: "Your Response Received / NONE",
  actionlabel: "Verify Response",
});

oobiIpexLabelMap.set("2_3_response_validated", {
  statelabel: "Your Response Verified / NONE",
});

oobiIpexLabelMap.set("3_1_challenge_received", {
  statelabel: "Your Response Verified / Your Challenge Received",
  actionlabel: "Send Response",
});

oobiIpexLabelMap.set("3_2_response_sent", {
  statelabel: "Your Response Verified / My Response Sent",
});

oobiIpexLabelMap.set("3_3_response_validated", {
  statelabel: "Your Response Verified / My Response Verified",
  actionlabel: "Issue Credential",
});

oobiIpexLabelMap.set("4_1_issuing_credential", {
  statelabel: "Issuing Credential",
});
oobiIpexLabelMap.set("4_2_credential_issued", {
  statelabel: "Credential Issued",
});
oobiIpexLabelMap.set("5_1_credential_revoked", {
  statelabel: "Credential Revoked",
});

/**
 * Get the label of the state.
 *
 * @param state
 * @returns
 */
export const getStateLabel = (state: OobiIpexState): string => {
  const label = oobiIpexLabelMap.get(state);
  if (!label) {
    throw new IllegalStateException("State not found.");
  }
  return label.statelabel;
};

/**
 * Get the action label of the state.
 *
 * @param state
 * @returns
 */
export const getActionLabel = (state: OobiIpexState): string => {
  const label = oobiIpexLabelMap.get(state);
  if (!label || !label.actionlabel) {
    throw new IllegalStateException("State or Action Label not found.");
  }
  return label.actionlabel;
};

/**
 *  Check if the Ipex State can proceed.
 *
 * @param state Ipex State
 * @returns can proceed or not
 */
export const canIpexStateProceed = (state: OobiIpexState): boolean => {
  const label = oobiIpexLabelMap.get(state);
  if (!label) {
    throw new IllegalStateException("State not found.");
  }

  return !!label.actionlabel;
};
