export type PageName =
  | "Profile"
  | "Holder List"
  | "Holder Detail"
  | "Event History";
export type PagePath =
  | "/"
  | "/profile"
  | "/holder-list"
  | "/holder-detail"
  | "/event-history";

export type ValidationRule = (v: string) => boolean | ErrorMessage;

export type ErrorMessage = "Master secret is required";

// FUTURE:
//ButtonLabel, Title, Subtitle Labelなど
