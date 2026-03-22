import React, { useState, useEffect, FormEvent } from "react";
import { Account, listAccounts, createAccount } from "./api/client";


type props = {
    EmailString: string,
    PasswordString: string,
    PasswordConfirmString: string;
};


export default function CreateAccountMainPage({EmailString, PasswordString, PasswordConfirmString}: props) {

    // message to be displayed on unsuccesful account creation, set to "" by default
    const[AccountCreationMessage, SetAccountCreationMessage] = useState("");


    // verifies correct email format: name@service.domain i.e myadress@gmail.com as well as other services
    function verifyEmail() {

        // regex expression for email
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (regex.test(EmailString)) {
            SetAccountCreationMessage("");
            return true;
        } else {
            return false;
        }

    }

    // verifies correct password length and matching passwords
    function verifyPassword() {

        if ((PasswordString == PasswordConfirmString) && (PasswordString.length >= 8)) {
            SetAccountCreationMessage("");
            return true;
        } else {
            return false;
        }
    }


    function CreateAccount() {

        SetAccountCreationMessage("");

        try {
            // creates new account
            createAccount(EmailString, PasswordString);
            EmailString = ""; // resets email string
            PasswordString = "";// resets password string
        } catch (error) {
            SetAccountCreationMessage("Failed to create account");
        } finally {
            SetAccountCreationMessage("Account Creation finish");
        }
            
    }

    

    const VerifyButton = () => {

        if ((!verifyEmail()) && (!verifyPassword())) {
            //incorrect email, passwords do not match
            SetAccountCreationMessage("Your email address is invalid and your passwords do not match");
            EmailString = "";
            PasswordString = "";

        } else if ((!verifyEmail()) && (verifyPassword())) {
            //incorrect email
            SetAccountCreationMessage("Your email address is invalid: Please Input a valid email address");
            EmailString = "";
            PasswordString = "";

        } else if ((verifyEmail()) && (!verifyPassword())) {
            //passwords do not match
            SetAccountCreationMessage("Your passwords do not match or are to short: please input matching passwords of correct length");
            EmailString = "";
            PasswordString = "";

        } else if ((verifyEmail()) && (verifyPassword())) {
            // everything is correct, create password
            SetAccountCreationMessage("Valid credentials");

            //Account creation
            CreateAccount();

        } else {
            SetAccountCreationMessage("unknown error");
            EmailString = "";
            PasswordString = "";
        }

    }

        return (
            <div className ="border-primary/20">
                {/*Button to create account*/}
                <button
                    className = "text-primary-foreground font-medium"
                    onClick={VerifyButton}>
                    Create Account
                </button>

                {/*Message to be displayed on account creation*/}
                <div className = "font-semm-bold text-red-500">
                    {AccountCreationMessage}
                </div>
            </div>
        );
};



// import section:
// import CreateAccountMainPage from "./MainPageAccountCreation.tsx";

// line 84-95
//
/*

          <div
            className="relative absolute lef-20 text-center w-full px-4 py-2.5 center-item rounded-lg bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
          >

          <CreateAccountMainPage 
            EmailString = {NewAccountEmail}
            PasswordString = {NewAccountPassword}
            PasswordConfirmString = {NewPasswordConfirm}
          />

          </div>

          */
