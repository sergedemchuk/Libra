import React from 'react';

interface PriceAdjustmentBoxProps {
  label: string;
  descriptionEmpty: string;
  descriptionFilled: string;
}

const PriceAdjustmentBox: React.FC<PriceAdjustmentBoxProps> = ({ 
  label, 
  descriptionEmpty, 
  descriptionFilled
}) => {
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
      </div>
    </section>
  );
};

export default PriceAdjustmentBox;