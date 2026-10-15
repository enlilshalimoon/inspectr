import { NewInspectionForm } from "./new-inspection-form";

export default function NewInspectionPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">New inspection</h1>
        <p className="text-sm text-slate-500">
          Address is all you need to start. Just trying Lookover out? Use any
          address, even your own, and add a few photos you already have.
        </p>
      </div>
      <NewInspectionForm />
    </div>
  );
}
