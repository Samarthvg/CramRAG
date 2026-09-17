import { StatusPanel } from "@/features/status/StatusPanel";

export default function DevStatusPage() {
  return (
    <>
      <h1>API status</h1>
      <p>
        Development check against the FastAPI health and capabilities endpoints.
      </p>
      <StatusPanel />
    </>
  );
}
