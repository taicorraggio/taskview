"use client";

/**
 * Segmented control built from real radio inputs (natively keyboard
 * accessible, no custom arrow-key handling needed).
 */
export function SegmentedRadio<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-medium text-neutral-700">
        {legend}
      </legend>
      <div className="inline-flex rounded-lg border border-neutral-300 bg-neutral-50 p-0.5">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors has-checked:bg-lavender-600 has-checked:text-white has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-lavender-600 ${
              value === opt.value ? "" : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
