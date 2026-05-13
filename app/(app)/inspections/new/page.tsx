import { NewInspectionForm } from "./new-inspection-form";

export default function NewInspectionPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">New inspection</h1>
        <p className="text-sm text-slate-500">
          Property and client info. You can edit any of this later. Address is the only required field.
        </p>
      </div>
      <NewInspectionForm />
    </div>
  );
}
