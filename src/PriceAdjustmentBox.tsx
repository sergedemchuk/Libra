import React from 'react';

interface PriceAdjustmentBoxProps {
  label: string;
  descriptionEmpty: string;
  descriptionFilled: string;
  value: number;
  onChange?: (next: number) => void;
  step?: number;
  precision?: number;
}

const PriceAdjustmentBox: React.FC<PriceAdjustmentBoxProps> = ({ 
  label, 
  descriptionEmpty, 
  descriptionFilled,
  value,
  onChange,
  step = 0.01,
  precision = 2
}) => {

  const toUnits = (n: number) => Math.round(n * Math.pow(10, precision));
  const fromUnits = (n: number) => n / Math.pow(10, precision);

  const bump = (dir: 1 | -1) => {
    const vUnits = toUnits(value || 0);
    const stepUnits = toUnits(step);
    const next = fromUnits(vUnits + dir * stepUnits);
    if (onChange) {
      onChange(Number(next.toFixed(precision)));
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (raw.trim() === "") {
      if (onChange) {
        onChange(NaN);
      }
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      if (onChange) {
        onChange(Number(parsed.toFixed(precision)));
      }
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      bump(1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      bump(-1);
    }
  };

    const display = Number.isNaN(value) ? "" : value.toFixed(precision);

  
  return (
    <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
      <div className="flex flex-col space-y-3">
        <label className="text-lg font-medium text-foreground">{label}</label>
        <p className="text-sm text-muted-foreground">{descriptionEmpty}</p>
        <p className="text-sm text-muted-foreground">{descriptionFilled}</p>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-stretch rounded-lg border border-gray-300 bg-white">
            <span className="px-2 flex items-center text-gray-600 font-medium select-none">
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={display}
              onChange={handleInput}
              onKeyDown={handleKey}
              className="w-24 px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm text-gray-700"
              aria-label={label}
            />
            <div className="flex flex-col border-l border-gray-300">
              <button
                type="button"
                onClick={() => bump(1)}
                className="px-2 py-1 hover:bg-gray-50 active:bg-gray-100 text-sm rounded-br-lg"
                aria-label={`Increase ${label} by ${step.toFixed(precision)}`}
                title={`Increase by ${step.toFixed(precision)}`}
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => bump(-1)}
                className="px-2 py-1 hover:bg-gray-50 active:bg-gray-100 text-sm rounded-br-lg"
                aria-label={`Decrease ${label} by ${step.toFixed(precision)}`}
                title={`Decrease by ${step.toFixed(precision)}`}
              >
                ▼
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
  //return (
  //  <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
  //    <div className="space-y-4">
  //      {/* Header */}
  //      <div>
  //        <h3 className="text-lg font-semibold text-foreground mb-2">{label}</h3>
  //        <div className="space-y-2">
  //          <p className="text-sm text-muted-foreground">{descriptionEmpty}</p>
  //          <p className="text-sm text-muted-foreground">{descriptionFilled}</p>
  //        </div>
  //      </div>
  //    </div>
  //  </section>
  //);
  
};

export default PriceAdjustmentBox;