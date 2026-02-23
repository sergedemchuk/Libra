import React, {useState} from 'react';
import data from "./TempAccountInfo.json";


function AccountInfo() {

    const[currentInfo, SetInfo] = useState(data);

    return (

        <div> 
            {currentInfo.map((info) => (
            <div className = "grid grid-cols-4 gap-x-20 text-sm font-semm-bold text-primary border border-[#753114]/20 m-1 rounded-s">

                {/* email */}
                <div className="text-left p-4">
                    {info.EMAIL}
                </div>

                {/* date Created */}
                <div className="text-center p-4">
                    {info.DATECREATED}
                </div>

                {/* last login */}
                <div className="text-center p-4">
                    {info.LASTLOGIN}
                </div>

                {/* Action - two buttons*/}
                <div className= "text-right mt-2 mb-1">
                    <button 
                        // onClick = { }
                        type="button" 
                        className="mr-3 p-2 border border-[#753114]/20 box-border rounded bg-brand-500 hover:bg-brand-gradient">
                        Edit
                    </button>

                    <button 
                        // onClick = { }
                        type="button" 
                        className="mr-3 p-2 border border-[#753114]/20 box-border rounded bg-brand-500 hover:bg-brand-gradient">
                        Delete
                    </button>

                </div>

            </div>

            ))}
        </div>

    );
}


export default AccountInfo;
