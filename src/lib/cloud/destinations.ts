import type { DestinationId } from "./types";

export interface Destination {
  id: DestinationId;
  name: string;
  /** Short monogram shown in the brand-colored tile (we don't ship third-party logos). */
  mark: string;
  color: string;
  kind: "local" | "email" | "cloud-file" | "app";
  /** True when no real network call happens — surfaced in the UI. */
  simulated: boolean;
  requiresConnection: boolean;
  blurb: string;
  /** Output is native to the service rather than a CSV/JSON file. */
  nativeFormat?: string;
  /** Pipeline stage labels shown while a job runs. */
  stages: string[];
}

export const DESTINATIONS: Record<DestinationId, Destination> = {
  download: {
    id: "download",
    name: "This device",
    mark: "↓",
    color: "#0f172a",
    kind: "local",
    simulated: false,
    requiresConnection: false,
    blurb: "Save the file directly to your downloads folder.",
    stages: ["Building report", "Writing file", "Saving to device"],
  },
  email: {
    id: "email",
    name: "Email",
    mark: "@",
    color: "#2a78d6",
    kind: "email",
    simulated: true,
    requiresConnection: false,
    blurb: "Send the report as an attachment to one or more people.",
    stages: ["Building report", "Attaching file", "Sending email", "Confirming delivery"],
  },
  "google-sheets": {
    id: "google-sheets",
    name: "Google Sheets",
    mark: "GS",
    color: "#188038",
    kind: "app",
    simulated: true,
    requiresConnection: true,
    blurb: "Create a live spreadsheet or append rows to an existing one.",
    nativeFormat: "Spreadsheet",
    stages: ["Building report", "Authorizing with Google", "Creating spreadsheet", "Writing rows", "Formatting"],
  },
  dropbox: {
    id: "dropbox",
    name: "Dropbox",
    mark: "DB",
    color: "#0061fe",
    kind: "cloud-file",
    simulated: true,
    requiresConnection: true,
    blurb: "Upload files to a folder in your Dropbox.",
    stages: ["Building report", "Encrypting", "Uploading to Dropbox", "Verifying checksum"],
  },
  onedrive: {
    id: "onedrive",
    name: "OneDrive",
    mark: "OD",
    color: "#0364b8",
    kind: "cloud-file",
    simulated: true,
    requiresConnection: true,
    blurb: "Upload files to your OneDrive.",
    stages: ["Building report", "Encrypting", "Uploading to OneDrive", "Verifying checksum"],
  },
  notion: {
    id: "notion",
    name: "Notion",
    mark: "N",
    color: "#191919",
    kind: "app",
    simulated: true,
    requiresConnection: true,
    blurb: "Publish the report as a database in a Notion page.",
    nativeFormat: "Database",
    stages: ["Building report", "Creating database", "Adding rows"],
  },
  slack: {
    id: "slack",
    name: "Slack",
    mark: "#",
    color: "#611f69",
    kind: "app",
    simulated: true,
    requiresConnection: true,
    blurb: "Post a formatted summary to a channel.",
    nativeFormat: "Message",
    stages: ["Building report", "Formatting message", "Posting to channel"],
  },
};

export const DESTINATION_LIST = Object.values(DESTINATIONS);

/** Plausible account label for a simulated OAuth connection. */
export function simulatedAccount(id: DestinationId): string {
  switch (id) {
    case "slack":
      return "Personal workspace";
    case "notion":
      return "My workspace";
    default:
      return "you@example.com";
  }
}
