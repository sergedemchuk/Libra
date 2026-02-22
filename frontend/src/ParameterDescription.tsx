import React from 'react';


{/*Title of the main box and the general description for it*/}
interface ParameterTitleAndDescription {
    Description: String;
}


const ParameterTitle: React.FC<ParameterTitleAndDescription> = ({
    Description
}) => {
    return (
        <section className = "rounded-xl border border-primary/20 bg-card/40 p-4 md:p-4">
            <div>
                {/*parameter Settings Title */}
                <h4 className = "text-lg font-bold text-foreground mb-2">
                    Parameter Settings
                </h4>
                {/*Description text*/}
                <h3 className = "text-muted-foreground">
                    {Description}
                </h3>
            </div>
        </section>
    );
};


export default ParameterTitle;