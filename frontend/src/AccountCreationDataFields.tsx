import React, {useState} from 'react';

// input email password and confirm password
type props = {
    SetEmailString: (value: string) => void;
    SetPasswordString: (value: string) => void;
    SetPasswordConfirmString: (value: string) => void;
};

export default function CreateAccountFields({SetEmailString, SetPasswordString, SetPasswordConfirmString}: props) {

    const [Showpassword, SetPassword] = useState(false);
    const [ShowConfirmPassword, ShowSetPassword] = useState(false);

    function PasswordVisible() {
        SetPassword(!Showpassword);
    }

    function PasswordConfirmVisible() {
        ShowSetPassword(!ShowConfirmPassword);
    }


    return (
        //Email and address input for account creation withinaccount management NOT top right bar
        <div className = "p-4 ">

            {/*Email Address input*/}
            <div className="text-primary/70 text-serif font-semibold">

                <label
                    htmlFor="EmailAddress" className="block text-primary" 
                >
                    Email Address
                </label>

                <input
                    id="EmailAddress"
                    type="text"
                    className="rounded bg-[#753114]/5 border border-[#753114]/20 focus:outline-none focus:ring-2 w-full p-1 text-sm focus:ring-[#753114]/20 placeholder:text-body text-black/70 placeholder-black/30"
                    placeholder="exampleEmail@gmail.com"
                    onChange={(e) => SetEmailString(e.target.value)}
                >
                </input>

            </div>


            {/* Password input */}
            <div className="relative mt-2 font-semibold">

                <label
                    htmlFor="Password" className="block text-primary"
                >
                    Password
                </label>

                <input
                    id="Password"
                    type={Showpassword ? "text" : "password"}
                    className="rounded bg-[#753114]/5 border border-[#753114]/20 focus:outline-none focus:ring-2 w-full p-1 text-sm focus:ring-[#753114]/20 placeholder-black/30 text-black/70"
                    placeholder="**************"
                    onChange={(e) => SetPasswordString(e.target.value)}
                ></input>

                <button
                        type="button"
                        className="w-11 absolute right-2 background bg-primary #bg-[#753114]/10 rounded text-primary/70 text-sm font-semi-bold m-0.5 p-0.5 border border-black/10 right-0.5"
                        onClick={PasswordVisible}
                >
                    {Showpassword ? "Hide" : "Show"}
                </button>

            </div>






            {/* Password Confirm input */}
            <div className="relative mt-2 font-semibold">

                <label
                    htmlFor="PasswordConfirm" className="block text-primary"
                >
                    Confirm Password
                </label>

                <input
                    id="PasswordConfirm"
                    type={ShowConfirmPassword ? "text" : "password"}
                    className="rounded bg-[#753114]/5 border border-[#753114]/20 focus:outline-none focus:ring-2 w-full p-1 text-sm focus:ring-[#753114]/20 placeholder-black/30 text-black/70"
                    placeholder="**************"
                    onChange={(e) => SetPasswordConfirmString(e.target.value)}
                ></input>

                <button
                        type="button"
                        className="w-11 absolute right-2 background bg-primary #bg-[#753114]/10 rounded text-primary/70 text-sm font-semi-bold m-0.5 p-0.5 border border-black/10 right-0.5"
                        onClick={PasswordConfirmVisible}
                >
                    {ShowConfirmPassword ? "Hide" : "Show"}
                </button>

            </div>

        </div>
    );
}



// Import section
//
// import {useState} from "react";
// import CreateAccountFields from "./AccountCreationDataFields.tsx";

// export default section

// const[NewAccountEmail, SetNewAccountEmail] = useState("");
// const[NewAccountPassword, SetNewAccountPassword] = useState("");

// inside create new accoutn section
//  <CreateAccountFields 
//      SetEmailString={SetNewAccountEmail}
//      SetPasswordString={SetNewAccountPassword}
//  />

// add if possible add to CSS
// input[type="password"]::-ms-reveal {
// display: none;
// }