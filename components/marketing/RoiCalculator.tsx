"use client";

import { useState, useMemo } from "react";

const SUBSCRIPTION_MONTHLY = 129;
// What Lookover's workflow actually takes: review & approve the drafts. ~30 minutes
// per report on average. This is our value claim — the customer enters their current
// time and the calculator shows the delta.
const LOOKOVER_HOURS_PER_REPORT = 0.5;

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const formatHours = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 1 });

export function RoiCalculator() {
  const [inspectionsPerMonth, setInspectionsPerMonth] = useState(20);
  const [hoursPerReportToday, setHoursPerReportToday] = useState(3);
  const [hourlyRate, setHourlyRate] = useState(50);

  const {
    hoursSavedPerInspection,
    hoursSavedPerMonth,
    dollarsSavedPerMonth,
    netBenefit,
    multiplier,
  } = useMemo(() => {
    const hoursSavedPerInspection = Math.max(
      0,
      hoursPerReportToday - LOOKOVER_HOURS_PER_REPORT,
    );
    const hoursSavedPerMonth = inspectionsPerMonth * hoursSavedPerInspection;
    const dollarsSavedPerMonth = hoursSavedPerMonth * hourlyRate;
    const netBenefit = dollarsSavedPerMonth - SUBSCRIPTION_MONTHLY;
    const multiplier = dollarsSavedPerMonth / SUBSCRIPTION_MONTHLY;
    return {
      hoursSavedPerInspection,
      hoursSavedPerMonth,
      dollarsSavedPerMonth,
      netBenefit,
      multiplier,
    };
  }, [inspectionsPerMonth, hoursPerReportToday, hourlyRate]);

  return (
    <section className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="max-w-3xl mb-10 space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
            ROI calculator
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            How many hours would Lookover give you back?
          </h2>
          <p className="text-lg text-slate-600">
            Enter what your week looks like today. Lookover cuts report writing from a few
            hours of typing down to about{" "}
            <span className="font-medium text-slate-900">30 minutes of reviewing</span> —
            you approve drafts instead of building them from scratch.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 bg-slate-50 rounded-2xl ring-1 ring-slate-200 p-6 sm:p-10">
          <div className="lg:col-span-3 space-y-7">
            <Slider
              label="Inspections per month"
              value={inspectionsPerMonth}
              min={5}
              max={60}
              step={1}
              onChange={setInspectionsPerMonth}
              display={inspectionsPerMonth.toString()}
            />
            <Slider
              label="Hours per report today"
              hint="Your current report-writing time, on average"
              value={hoursPerReportToday}
              min={1}
              max={6}
              step={0.5}
              onChange={setHoursPerReportToday}
              display={`${hoursPerReportToday} hrs`}
            />
            <Slider
              label="Your hourly rate"
              hint="What your time is worth — billable or opportunity cost"
              value={hourlyRate}
              min={25}
              max={200}
              step={5}
              onChange={setHourlyRate}
              display={`$${hourlyRate}`}
            />
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl ring-1 ring-slate-200 p-6 flex flex-col gap-5">
            <div>
              <p className="text-sm text-slate-500">Per inspection</p>
              <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                {formatHours(hoursSavedPerInspection)} hrs saved
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {formatHours(hoursPerReportToday)} hrs today → ~30 min with Lookover
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">Time back per month</p>
              <p className="text-3xl font-semibold text-slate-900 tabular-nums">
                {formatHours(hoursSavedPerMonth)} hours
              </p>
              <p className="text-sm text-slate-600 mt-1">
                worth{" "}
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatCurrency(dollarsSavedPerMonth)}
                </span>
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 flex items-baseline justify-between text-sm">
              <span className="text-slate-600">Lookover subscription</span>
              <span className="font-medium text-slate-900 tabular-nums">
                −{formatCurrency(SUBSCRIPTION_MONTHLY)}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">Net benefit</p>
              <p className="text-3xl font-semibold text-slate-900 tabular-nums">
                {formatCurrency(netBenefit)}
                <span className="text-base font-normal text-slate-500"> / mo</span>
              </p>
              {multiplier >= 2 && (
                <p className="text-sm font-medium text-orange-600 mt-1">
                  {multiplier.toFixed(0)}× return
                </p>
              )}
            </div>
          </div>
        </div>

        {netBenefit > 0 ? (
          <p className="mt-8 text-base text-slate-600 max-w-3xl">
            Or: every month you don&apos;t switch, you&apos;re paying yourself{" "}
            <span className="font-medium text-slate-900 tabular-nums">
              {formatCurrency(netBenefit)}
            </span>{" "}
            to keep typing.
          </p>
        ) : (
          <p className="mt-8 text-base text-slate-600 max-w-3xl">
            At this volume, Lookover doesn&apos;t pay off yet — the math works best for
            inspectors doing 10+ reports a month or charging $40/hr and up.
          </p>
        )}
      </div>
    </section>
  );
}

function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-2xl font-semibold text-slate-900 tabular-nums">
          {display}
        </span>
      </div>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-orange-500"
        aria-label={label}
      />
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
