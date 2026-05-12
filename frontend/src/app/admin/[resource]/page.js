import AdminResourcePage from "@/components/AdminResourcePage";
import { getAdminResource } from "@/lib/adminResources";

export default async function AdminResourceRoute({ params }) {
  const { resource } = await params;

  if (!getAdminResource(resource)) {
    return <AdminResourcePage resourceKey="users" />;
  }

  return <AdminResourcePage resourceKey={resource} />;
}
