import ToolingStoreShell from "@/components/ToolingStoreShell";
import { getToolingPage } from "@/lib/toolingResources";

export default async function ToolingStoreResourcePage({ params }) {
  const { page } = await params;

  if (!getToolingPage(page)) {
    return <ToolingStoreShell />;
  }

  return <ToolingStoreShell pageKey={page} />;
}
