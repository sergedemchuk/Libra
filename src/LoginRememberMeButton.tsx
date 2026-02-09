import React, { useState } from 'react';


{/* Login screen, remember me checkbox button, title and description */}


interface LoginRememberMe {
    Title: String,
    Description: string,
    MainCheck: (isTrue: boolean) => void;
}


const RememberMeButton: React.FC<LoginRememberMe> =({ Title, Description, MainCheck}) => {

    {/* used to hold the scurrent state of checkedbox and update the state*/}
    const [CurrentCheck, SetCheck] = useState(false);


    {/* When used this function sets SetCheck to the opposite of whatever the current button is, unchecked=>checked, and checked=>unchekced */}
    const SwitchState = () => {

        {/* switched local checked state in this file*/}
        SetCheck(!CurrentCheck);
        {/* saves local checked state to the file where this file is used */}
        MainCheck(!CurrentCheck);
    };



    return (
        <section>
            <div className = "w-1/4 h-18 p-4 rounded-r-lg border-2 flex items-center mb-4 relative bg-white">

                <div>
                    {/* Title of the box */}
                    <p className = "font-bold text-foreground">
                        {Title}
                    </p>

                    {/* description */}
                    <h3 className = "text-muted-foreground">
                        {Description}
                    </h3>
                </div>


                <input
                    type="checkbox" 
                    value=""
                    className = "h-10 wid-10 border-2 border-default-medium items-center absolute right-4"
                    onChange={SwitchState}
                />

            </div>
        </section>

    );

}

export default RememberMeButton;



{/* Format for main file:

    1. in import
    import LoginRememberMe from "./LoginRememberMeButton";
    
    2. in const
    const [RememberMe, setRememberMe] = useState<boolean>(false);
    
    
    3. in const
    const RememberMeCheckbox = (remember: boolean) => {
    setRememberMe(remember);

    console.log("RememberMe:", remember);
    }
    
    4. in return
    <LoginRememberMe 
              Title = "Remember me"
              Description = ""
              MainCheck ={RememberMeCheckbox}
    />
*/}