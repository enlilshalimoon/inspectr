import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Company info, logo, default disclaimer, signature. Coming in week 7 of the build.
        </p>
      </div>
      <Card>
        <CardContent className="p-10 text-center text-sm text-slate-500">
          Settings UI not yet built.
        </CardContent>
      </Card>
    </div>
  );
}
