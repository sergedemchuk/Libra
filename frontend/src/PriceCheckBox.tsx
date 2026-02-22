import React, { useState } from 'react';

interface CheckboxProps {
  label: string;
  descriptionRounded: string;
  descriptionUnchanged: string;
  initialChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ 
  label,
  descriptionRounded, 
  descriptionUnchanged, 
  initialChecked = false, 
  onChange 
}) => {
  
  const [isChecked, setIsChecked] = useState<boolean>(initialChecked);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckedState = event.target.checked;
    setIsChecked(newCheckedState);
    if (onChange) {
      onChange(newCheckedState);
    }
  };

  return (
    <section className="rounded-xl border border-primary/20 bg-card/40 p-6 md:p-8">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{label}</h3>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{descriptionRounded}</p>
            <p className="text-sm text-muted-foreground">{descriptionUnchanged}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={handleChange}
            className="w-4 h-4 text-primary border-accent rounded focus:ring-primary focus:ring-2 cursor-pointer"
            style={{ accentColor: 'var(--primary)' }}
          />
          <label className="text-sm text-foreground cursor-pointer select-none font-medium">
            Round prices to nearest dollar
          </label>
        </div>
      </div>
    </section>
  );

};

export default Checkbox;