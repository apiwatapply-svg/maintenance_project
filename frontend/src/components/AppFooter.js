export default function AppFooter({ label = "Maintenance Project" }) {
  return (
    <footer className="mt-auto border-t border-slate-200 py-4 text-center text-xs font-bold text-slate-500">
      <span>{label}</span>
      <span className="mx-2 text-slate-300">|</span>
      <span>Factory Management System</span>
    </footer>
  );
}
