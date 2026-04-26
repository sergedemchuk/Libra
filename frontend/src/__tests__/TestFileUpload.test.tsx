// Tests only the file upload capabilities, distinct from useFileUpload.test.ts

// Purpose: tests the ability of the file upload mechanism
// requirements: TODO


// -----Imports necessary for testing-----
//import React from 'react';
import { useState, useEffect, } from "react";
import { describe, it, expect, vi, beforeEach, test } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useFileUpload } from "../hooks/useFileUpload";
// -----Imports necessary for testing-----

// ─── Mock API client so the upload lifecycle completes ────────────────────────
vi.mock('../api/client', () => ({
  initiateUpload: vi.fn().mockResolvedValue({
    jobId: 'j1',
    uploadUrl: 'http://fake-s3.local/upload',
    expires: '2099-01-01T00:00:00Z',
  }),
  uploadFileToS3: vi.fn().mockResolvedValue(undefined),
  getJobStatus: vi.fn().mockResolvedValue({
    jobId: 'j1',
    status: 'COMPLETED',
    fileName: 'test1.csv',
    downloadUrl: 'http://fake-s3.local/download',
  }),
  loginAccount: vi.fn(),
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
}));



// -----Component being tested-----
import UploadImportCard from "../UploadImportCard";
import userEvent from "@testing-library/user-event";
// -----Component being tested-----


// ----- Component Wrapper -----
const ComponentTestWrapper = (overrides = {}) => {
    const TestComponent = () => {

        // Component Wrapper: UploadImportCard, requires a number of constants to function. these constants are declared in a wrapper
        // along with the component for the purpose of testing


        // -----constants necessary for testing-----

        // const 1: handles selected file
        const [selectedFile, setSelectedFile] = useState<File | null>(null);

        //const 2: Upload state
        const { state: uploadState, start: startUpload, reset: resetUpload } = useFileUpload();

        //const 3: necessary for handleProcessFile
        const [priceRounding, setPriceRounding] = useState<boolean>(false);

        //const 4: necessary for handleProcessFile
        const [priceAdjustment, setPriceAdjustment] = useState<number>(0.0);

        //const 5: handle process file
        const handleProcessFile = () => {
            if (!selectedFile) return;

            const settings = {
            priceRounding,              // const 3
            ...(priceAdjustment !== 0 && !Number.isNaN(priceAdjustment)
                ? { priceAdjustment }   // const 4
                : {}),
            };

            startUpload(selectedFile, settings);
        };

        //const 6:
        const handleFileSelected = (file: File | null) => {
            setSelectedFile(file);
            if (file) resetUpload();
        };

        // -----constants necessary for testing-----



        // -----Component being tested -----
        /*
            <UploadImportCard
                onFileSelect={handleFileSelected}   // const 6
                uploadState={uploadState}           // const 2 - state
                onProcessFile={handleProcessFile}   // const 5
                onReset={resetUpload}               // const 2 - reset
            />
        */
        // -----Component being tested -----



        const defaultInputs = {
            onFileSelect: handleFileSelected,   // const 6
            uploadState: uploadState,           // const 2 - state
            onProcessFile: handleProcessFile,   // const 5
            onReset: resetUpload              // const 2 - reset

        };
        //return render(<UploadImportCard {...defaultInputs} {...overrides}/>) 
        //return <UploadImportCard {...defaultInputs} {...overrides}/>;
        
        return (<UploadImportCard {...defaultInputs} {...overrides} onFileSelect={handleFileSelected} />);
    };

    return render(<TestComponent />);
};
// ----- Component Wrapper -----



// ----- Testing code -----

describe("Upload Import Card", () => {

    test("component renders", () => {

        //renders component with defualt values
        ComponentTestWrapper();
        
        const instructions = screen.getByText(/Click to upload or drag and drop/);

        const fileTypes = screen.getByText(/CSV, Excel, or TSV files only/);

        // tests if instructions are rendered
        expect(instructions).toBeInTheDocument();

        // tests if file type info is rendered
        expect(fileTypes).toBeInTheDocument();

    });

    describe("Valid file types are supported", () => {

        //file types supported
        // .csv
        // .xlsx
        // .xls
        // .tsv
        //beforeEach(() => {
            //ComponentTestWrapper();
        //});

        //tests .csv file 
        // --COMPLETE--
        test("filetype .csv     (CSV)", async () => {

            // Test file
            //const user = userEvent.setup();
            const csvFile = new File(['test1'], 'test1.csv', {
                type: 'text/csv',
            });


            //load container for the wrapper
            const { container } = ComponentTestWrapper();

            const input = container.querySelector('input[type="file"]');
            expect(input).not.toBeNull();
            
            await userEvent.upload(input, csvFile);

            //tests that the file uploads
            expect(input.files[0]).toBe(csvFile);
            expect(input.files).toHaveLength(1);

            //tests that File Uploads
            const ProcessButton = await screen.findByRole('button', { name: 'Process File'});
            expect(ProcessButton).toBeInTheDocument(); //Start Over // Processing complete! // ✓ Processing complete!

            //tests button click
            await userEvent.click(ProcessButton);

            //test file loads correctly
            await waitFor(() => {
            const Done = screen.getByText("✓ Processing complete!");
            expect(Done).toBeInTheDocument();

            }, { timeout: 5000 });
            //const button = await screen.findByRole('button', { name: 'Start Over'});

            //const Done = await screen.findByText(/✓ Processing complete!/i);
            //expect(Done).toBeInTheDocument();

            //fireEvent.change(input, {
                //target: {
                    //files:[csvFile],
                //},
            //});



        });
        
        //tests excsl files
        test("filetype .xlsx    (Excel)", async () => {

            // Test file
            const xlsxFile = new File(['test2'], 'test2.csv', {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            //load container for the wrapper
            const { container } = ComponentTestWrapper();// ComponentTestWrapper();

            // input
            const input = container.querySelector('input[type="file"]');
            expect(input).not.toBeNull();

            //uploads file
            await userEvent.upload(input, xlsxFile);


            expect(input.files[0]).toBe(xlsxFile);
            expect(input.files).toHaveLength(1);

            //tests that File Uploads
            const ProcessButton = await screen.findByRole('button', { name: 'Process File'});
            expect(ProcessButton).toBeInTheDocument(); //Start Over // Processing complete! // ✓ Processing complete!

            //tests button click
            await userEvent.click(ProcessButton);

            //test file loads correctly
            await waitFor(() => {
            const Done = screen.getByText("✓ Processing complete!");
            expect(Done).toBeInTheDocument();

            }, { timeout: 10000 });

        });

        //tests excsl files
        test("filetype .xls     (Excel)", async () => {

            const xlsFile = new File(['test2'], 'test2.csv', {
                type: 'application/vnd.ms-excel',
            });

            //load container for the wrapper
            const { container } = ComponentTestWrapper();

            // input
            const input = container.querySelector('input[type="file"]');
            expect(input).not.toBeNull();
            
            //uploads file
            await userEvent.upload(input, xlsFile);


            expect(input.files[0]).toBe(xlsFile);
            expect(input.files).toHaveLength(1);

            //tests that File Uploads
            const ProcessButton = await screen.findByRole('button', { name: 'Process File'});
            expect(ProcessButton).toBeInTheDocument(); //Start Over // Processing complete! // ✓ Processing complete!

            //tests button click
            await userEvent.click(ProcessButton);

            //test file loads correctly
            await waitFor(() => {
            const Done = screen.getByText("✓ Processing complete!");
            expect(Done).toBeInTheDocument();

            }, { timeout: 15000 });

        });

        //tezts tab seperated files
        test("filetype .tsv     (Tab seperated)", async () => {

            const tsvFile = new File(['test2'], 'test2.csv', {
                type: 'text/tab-seperated-values',
            });

            //load container for the wrapper
            const { container } = ComponentTestWrapper();

            // input
            const input = container.querySelector('input[type="file"]');
            expect(input).not.toBeNull();
            
            //uploads file
            await userEvent.upload(input, tsvFile);


            expect(input.files[0]).toBe(tsvFile);
            expect(input.files).toHaveLength(1);

            //tests that File Uploads
            const ProcessButton = await screen.findByRole('button', { name: 'Process File'});
            expect(ProcessButton).toBeInTheDocument(); //Start Over // Processing complete! // ✓ Processing complete!

            //tests button click
            await userEvent.click(ProcessButton);

            //test file loads correctly
            await waitFor(() => {
            const Done = screen.getByText("✓ Processing complete!");
            expect(Done).toBeInTheDocument();

            }, { timeout: 20000 });

        });
    });

    
    describe("invalid file types arn't accepted", () => {

        //tests pdf files
        test("filetype .pdf", async () => {

            const pdfFile = new File(['test1'], 'test1.pdf', {
                type: 'text/pdf',
            });

            /*
            const { container } = ComponentTestWrapper({
                uploadState: {
                    errorMessage: 'invalid file',
                },
            }); */

            //load container for the wrapper
            const { container } = ComponentTestWrapper();

            // input
            const input = container.querySelector('input[type="file"]');
            expect(input).not.toBeNull();
            
            //uploads file
            await userEvent.upload(input, pdfFile);

            //tests that File Uploads
            const ProcessButton = screen.queryByRole('button', { name: 'Process File'});
            expect(ProcessButton!).not.toBeInTheDocument();

        });

    });
    

});