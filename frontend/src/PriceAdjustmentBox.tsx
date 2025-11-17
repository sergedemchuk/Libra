import React, { useState } from 'react';

interface PriceAdjustmentBoxProps {
  label: string;
  descriptionEmpty: string;
  descriptionFilled: string;
  value?: number;
  onChange?: (value: number) => void;
}

const PriceAdjustmentBox: React.FC<PriceAdjustmentBoxProps> = ({ 
  label, 
  descriptionEmpty, 
  descriptionFilled,
  value = 0,
  onChange
}) => {
  const [inputValue, setInputValue] = useState<string>(value.toString());
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    setError(null);

    // Allow empty string (will default to 0)
    if (newValue === '') {
      onChange?.(0);
      return;
    }

    // Parse and validate number
    const numericValue = parseFloat(newValue);
    
    if (isNaN(numericValue)) {
      setError('Please enter a valid number');
      return;
    }

    if (numericValue < -1000 || numericValue > 1000) {
      setError('Adjustment must be between -$1000 and $1000');
      return;
    }

    // Round to 2 decimal places
    const roundedValue = Math.round(numericValue * 100) / 100;
    onChange?.(roundedValue);
  };

  const handleInputBlur = () => {
    // Clean up the input value on blur
    if (inputValue === '') {
      setInputValue('0');
    } else {
      const numericValue = parseFloat(inputValue);
      if (!isNaN(numericValue)) {
        setInputValue(numericValue.toFixed(2));
      }
    }
  };

  const isEmpty = value === 0;

  return (
    <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{label}</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{descriptionEmpty}</p>
            <p className="text-sm text-muted-foreground">{descriptionFilled}</p>
          </div>
        </div>

        {/* Input Field */}
        <div className="space-y-2">
          <label htmlFor="price-adjustment" className="text-sm font-medium text-foreground">
            Price Adjustment Amount
          </label>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-muted-foreground text-sm">$</span>
            </div>
            
            <input
              id="price-adjustment"
              type="number"
              step="0.01"
              min="-1000"
              max="1000"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder="0.00"
              className={`
                w-full pl-7 pr-3 py-2 text-sm border rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                transition-colors
                ${error 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-accent bg-input-background hover:border-primary/50'
                }
              `}
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Helper Text */}
          <p className="text-xs text-muted-foreground">
            Enter a positive number to increase prices or negative to decrease. 
            Leave blank or zero for no adjustment.
          </p>
        </div>

        {/* Example */}
        {!isEmpty && !error && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-foreground">
              <strong>Example:</strong> A book priced at $25.00 will become{' '}
              <span className="font-semibold">
                ${(25.00 + value).toFixed(2)}
              </span>
              {value > 0 ? ' (increased)' : ' (decreased)'}
            </p>
          </div>
        )}

        {/* Current Status */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current adjustment:</span>
            <span className={`text-sm font-medium ${
              isEmpty ? 'text-muted-foreground' : value > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {isEmpty ? 'None' : `${value > 0 ? '+' : ''}$${value.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PriceAdjustmentBox;
