"use client";

import { useState, useMemo } from "react";

const SUBSCRIPTION_MONTHLY = 129;

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const formatHours = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function RoiCalculator() {
  const [inspectionsPerMonth, setInspectionsPerMonth] = useState(20);
  const [hoursSavedPerInspection, setHoursSavedPerInspection] = useState(2.5);
  const [hourlyRate, setHourlyRate] = useState(50);

  const { hoursSaved, dollarsSaved, netBenefit, multiplier } = useMemo(() => {
    const hoursSaved = inspectionsPerMonth * hoursSavedPerInspection;
    const dollarsSaved = hoursSaved * hourlyRate;
    const netBenefit = dollarsSaved - SUBSCRIPTION_MONTHLY;
    const multiplier = dollarsSaved / SUBSCRIPTION_MONTHLY;
    return { hoursSaved, dollarsSaved, netBenefit, multiplier };
  }, [inspectionsPerMonth, hoursSavedPerInspection, hourlyRate]);

  return (
    <section className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="max-w-3xl mb-10">
          <p className="text-sm font-medium uppercase tracking-wider text-orange-600">
            ROI calculator
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            What&apos;s your report-writing hour worth?
          </h2>
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
              label="Hours saved per inspection"
              value={hoursSavedPerInspection}
              min={1}
              max={4}
              step={0.5}
              onChange={setHoursSavedPerInspection}
              display={hoursSavedPerInspection.toString()}
            />
            <Slider
              label="Your hourly rate"
              value={hourlyRate}
              min={25}
              max={150}
              step={5}
              onChange={setHourlyRate}
              display={`$${hourlyRate}`}
            />
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl ring-1 ring-slate-200 p-6 flex flex-col justify-center space-y-5">
            <Result
              label="You'd save"
              value={`~${formatHours(hoursSaved)} hours`}
              sub="per month"
            />
            <Result
              label="That's worth"
              value={formatCurrency(dollarsSaved)}
              sub="per month"
            />
            <Result
              label="Lookover costs"
              value={formatCurrency(SUBSCRIPTION_MONTHLY)}
              sub="per month"
            />
            <div className="border-t border-slate-200 pt-5 space-y-1">
              <p className="text-sm text-slate-500">Net benefit</p>
              <p className="text-3xl font-semibold text-slate-900">
                {formatCurrency(netBenefit)}
                <span className="text-base font-normal text-slate-500"> / mo</span>
              </p>
              <p className="text-sm font-medium text-orange-600">
                {multiplier.toFixed(0)}× return
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-base text-slate-600 max-w-3xl">
          Or: every month you don&apos;t switch, you&apos;re paying yourself{" "}
          <span className="font-medium text-slate-900">
            {formatCurrency(netBenefit)}
          </span>{" "}
          to keep typing.
        </p>
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-2xl font-semibold text-slate-900 tabular-nums">
          {display}
        </span>
      </div>
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

function Result({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 tabular-nums">
        {value}{" "}
        <span className="text-sm font-normal text-slate-500">{sub}</span>
      </p>
    </div>
  );
}
